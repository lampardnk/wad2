import express from 'express'
import { requireAuth } from './auth.js'
import Attraction from '../models/Attraction.js'

const router = express.Router()

// Remember recent searches so typing the same letters again is instant and free
const cache = new Map()
const CACHE_LIMIT = 300

// Place types we want to suggest (cities, towns, regions, countries...)
const WANTED = ['city', 'town', 'village', 'country', 'state', 'province', 'region', 'island', 'county', 'municipality']

// GET /api/places?q=kyo  -> [{ label: 'Kyoto, Japan', name, country, countryCode: 'JP', type }]
// Uses Photon (photon.komoot.io): a free place search built for type-ahead, based on OpenStreetMap.
router.get('/', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim()
  if (q.length < 2 || q.length > 60) return res.json([])

  const key = q.toLowerCase()
  if (cache.has(key)) return res.json(cache.get(key))

  let data
  try {
    const url = 'https://photon.komoot.io/api/?' + new URLSearchParams({ q, limit: '15', lang: 'en', osm_tag: 'place' })
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ChuiseYourTrip/1.0 (SMU IS216 student project)' },
      signal: AbortSignal.timeout(5000)
    })
    data = await response.json()
  } catch (err) {
    return res.status(502).json({ message: 'Place search is unavailable right now.' })
  }

  // Keep the useful fields, skip duplicates, max 6 results
  const results = []
  const seen = []
  for (const f of data.features || []) {
    const p = f.properties || {}
    if (!p.name || !WANTED.includes(p.osm_value)) continue
    const label = p.osm_value === 'country' || !p.country ? p.name : p.name + ', ' + p.country
    if (seen.includes(label)) continue
    seen.push(label)
    results.push({ label, name: p.name, country: p.country || '', countryCode: (p.countrycode || '').toUpperCase(), type: p.osm_value })
    if (results.length === 6) break
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value) // forget the oldest
  cache.set(key, results)
  res.json(results)
})

// ---------------------------------------------------------------------
// GET /api/places/attractions?destination=Kyoto, Japan
// -> up to 100 popular attractions there: [{ name, type, indoor, address }]
//
// 1. Photon finds the destination (city or country).
// 2. Overpass (OpenStreetMap) lists named tourist places inside it.
// 3. "Popular" = places important enough to have a Wikipedia/Wikidata page.
// Results are saved in MongoDB, so each destination is only looked up once.
// ---------------------------------------------------------------------
const HEADERS = { 'User-Agent': 'ChuiseYourTrip/1.0 (SMU IS216 student project)' }
const TYPES = 'attraction|museum|gallery|viewpoint|zoo|theme_park|aquarium'
const INDOOR_TYPES = ['museum', 'gallery', 'aquarium']
const CACHE_DAYS = 30
// Two public Overpass servers: if the first is busy or slow, try the second
// Public Overpass servers: if one is busy, down or rate-limiting us, the next one is tried
const OVERPASS_SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

export async function askOverpass(query, waitSeconds) {
  let lastError = null
  for (const server of OVERPASS_SERVERS) {
    try {
      const response = await fetch(server, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout((waitSeconds + 5) * 1000)
      })
      const text = await response.text()
      if (!response.ok) throw new Error('Overpass ' + response.status + ' (' + server + ')')
      const data = JSON.parse(text) // throws if Overpass sent an HTML error page
      // When busy, Overpass can answer "OK" with no places and a remark like "Query timed out"
      if (data.remark && !(data.elements || []).length) throw new Error('Overpass: ' + data.remark)
      return data
    } catch (err) {
      lastError = err
      console.error('Overpass attempt failed:', err.message)
    }
  }
  throw lastError
}

// Same as askOverpass, but asks every server at once and takes the first good answer
// (the others are cancelled). Much faster when one server is busy: no waiting for it to time out first.
export async function askOverpassFast(query, waitSeconds) {
  const stop = new AbortController()
  const tries = OVERPASS_SERVERS.map(async (server) => {
    // Stops when time runs out, or when another server already answered
    const own = new AbortController()
    const timer = setTimeout(() => own.abort(), waitSeconds * 1000)
    stop.signal.addEventListener('abort', () => own.abort())
    try {
      const response = await fetch(server, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: own.signal
      })
      if (!response.ok) throw new Error('Overpass ' + response.status + ' (' + server + ')')
      const data = JSON.parse(await response.text())
      if (data.remark && !(data.elements || []).length) throw new Error('Overpass: ' + data.remark)
      return data
    } finally {
      clearTimeout(timer)
    }
  })
  try {
    const data = await Promise.any(tries)
    stop.abort() // cancel the slower servers
    return data
  } catch (err) {
    throw new Error('All Overpass servers failed: ' + (err.errors || []).map((e) => e.message).join('; '))
  }
}

// Backup source: Wikipedia articles within 10 km that look like places to visit
// (titles are checked for words like museum, park, mosque, so streets and schools are left out)
const WIKI_KINDS = [
  { words: ['museum'], type: 'museum', indoor: true },
  { words: ['gallery'], type: 'gallery', indoor: true },
  { words: ['zoo'], type: 'zoo', indoor: false },
  { words: ['aquarium'], type: 'aquarium', indoor: true },
  { words: ['theatre', 'theater', 'opera', 'philharmonic', 'circus'], type: 'attraction', indoor: true },
  { words: ['bazaar', 'market', 'mall'], type: 'shop', indoor: true },
  { words: ['mosque', 'church', 'cathedral', 'temple', 'shrine', 'monastery', 'synagogue'], type: 'heritage', indoor: true },
  { words: ['park', 'garden', 'lake', 'gorge', 'waterfall', 'canyon', 'national park', 'reserve'], type: 'park', indoor: false },
  { words: ['monument', 'memorial', 'square', 'palace', 'tower', 'fortress', 'castle', 'statue', 'gate'], type: 'attraction', indoor: false }
]

async function wikiNearby(lat, lon, destination) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', list: 'geosearch', gscoord: lat + '|' + lon, gsradius: '10000', gslimit: '100', format: 'json'
  })
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
  const data = await response.json()
  const out = []
  for (const g of (data.query && data.query.geosearch) || []) {
    const title = g.title.toLowerCase()
    let kind = null
    for (const k of WIKI_KINDS) {
      for (const w of k.words) {
        if (!kind && title.includes(w)) kind = k
      }
    }
    if (kind) out.push({ name: g.title, type: kind.type, indoor: kind.indoor, address: g.title + ', ' + destination })
  }
  return out
}

router.get('/attractions', requireAuth, async (req, res) => {
  const destination = (req.query.destination || '').trim()
  if (!destination || destination.length > 80) return res.json([])

  const key = destination.toLowerCase()
  const saved = await Attraction.findOne({ key })
  // Use the saved list if it is recent and not empty (an empty list means an earlier lookup went wrong)
  if (saved && saved.items.length && (Date.now() - saved.fetchedAt.getTime()) / 86400000 < CACHE_DAYS) return res.json(saved.items)

  try {
    // 1. Where is it?
    const geoUrl = 'https://photon.komoot.io/api/?' + new URLSearchParams({ q: destination, limit: '1', lang: 'en', osm_tag: 'place' })
    const geoRes = await fetch(geoUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
    const geo = await geoRes.json()
    const place = geo.features && geo.features[0]
    if (!place) return res.json([])
    const props = place.properties || {}
    const [lon, lat] = place.geometry.coordinates
    const isCountry = props.osm_value === 'country'

    // 2. Ask OpenStreetMap (Overpass). Each try can fail (busy servers), so we fall back step by step:
    //    a) inside the boundary, famous places only   b) 15 km around the centre, any named tourist place
    //    c) if Overpass is down completely: Wikipedia articles near the centre (see wikiNearby)
    const famous = isCountry ? '["wikipedia"]' : '["wikidata"]'
    const waitSeconds = isCountry ? 90 : 25
    let osm = { elements: [] }
    try {
      const where = props.osm_type === 'R'
        ? 'area(' + (3600000000 + Number(props.osm_id)) + ')->.a;(nwr(area.a)'
        : '(nwr(around:15000,' + lat + ',' + lon + ')'
      const query = '[out:json][timeout:' + waitSeconds + '];' + where +
        '["tourism"~"^(' + TYPES + ')$"]["name"]' + famous + ';);out tags center 300;'
      osm = await askOverpass(query, waitSeconds)
    } catch (err) {
      console.error('Overpass step a failed for "' + destination + '":', err.message)
    }
    if (!(osm.elements || []).length && !isCountry) {
      try {
        const nearby = '[out:json][timeout:25];(nwr(around:15000,' + lat + ',' + lon + ')' +
          '["tourism"~"^(' + TYPES + ')$"]["name"];);out tags center 300;'
        osm = await askOverpass(nearby, 25)
      } catch (err) {
        console.error('Overpass step b failed for "' + destination + '":', err.message)
      }
    }

    // 3. Score: has a Wikipedia article (+2), well-known types first
    const typeScore = { attraction: 3, museum: 3, theme_park: 3, zoo: 2, aquarium: 2, viewpoint: 2, gallery: 1 }
    const list = []
    const seen = []
    for (const el of osm.elements || []) {
      const t = el.tags || {}
      const name = t['name:en'] || t.name
      if (!name || seen.includes(name)) continue
      seen.push(name)

      // Build an address the crowd tracker can use later
      const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
      const address = street ? street + ', ' + (t['addr:city'] || destination) : name + ', ' + destination

      list.push({
        name,
        type: t.tourism,
        indoor: INDOOR_TYPES.includes(t.tourism),
        address,
        score: (t.wikipedia ? 2 : 0) + (typeScore[t.tourism] || 0)
      })
    }
    list.sort((a, b) => b.score - a.score)

    const top = []
    for (const item of list.slice(0, 100)) {
      top.push({ name: item.name, type: item.type, indoor: item.indoor, address: item.address })
    }
    // c) Still nothing: famous places from Wikipedia near the centre
    if (!top.length) {
      try {
        for (const item of await wikiNearby(lat, lon, destination)) top.push(item)
      } catch (err) {
        console.error('Wikipedia fallback failed for "' + destination + '":', err.message)
      }
    }
    if (!top.length) throw new Error('no source answered')

    // Only save real results, so an empty answer is tried again next time
    if (top.length) await Attraction.findOneAndUpdate({ key }, { key, items: top, fetchedAt: new Date() }, { upsert: true })
    res.json(top)
  } catch (err) {
    console.error('Attractions lookup failed for "' + destination + '":', err.message)
    res.status(502).json({ message: 'Could not load popular places right now. Try again in a minute.' })
  }
})

// ---------------------------------------------------------------------
// GET /api/places/search?q=fam&near=Kyoto, Japan
// -> places in that destination matching what's typed, with chains grouped:
//    [{ name: 'FamilyMart', type: 'shop', kind: 'Convenience store', indoor: true,
//       branches: [{ address: '12 Shijo-dori, Shimogyo, Kyoto' }, ...] }]
// Photon searches any named place (shops, restaurants, temples...) inside a box around the destination.
// ---------------------------------------------------------------------
const centres = new Map()   // destination -> { lat, lon }
const searches = new Map()  // 'near|q' -> results

// OpenStreetMap tag -> one of our card types (see src/placeStyle.js)
const FOOD = ['restaurant', 'cafe', 'fast_food', 'food_court', 'bar', 'pub', 'ice_cream', 'bakery']
const PARKS = ['park', 'garden', 'nature_reserve', 'beach_resort']
const STATIONS = ['station', 'subway_entrance', 'stop', 'halt', 'bus_station', 'aerodrome', 'terminal']
const WORSHIP = ['place_of_worship', 'shrine', 'temple', 'monastery']

function cardType(key, value) {
  if (key === 'tourism' && ['museum', 'gallery', 'viewpoint', 'zoo', 'theme_park', 'aquarium'].includes(value)) return value
  if (FOOD.includes(value)) return 'food'
  if (key === 'shop' || value === 'marketplace' || value === 'mall') return 'shop'
  if (PARKS.includes(value)) return 'park'
  if (STATIONS.includes(value) || key === 'railway' || key === 'public_transport') return 'transport'
  if (WORSHIP.includes(value) || key === 'historic') return 'heritage'
  if (key === 'tourism') return 'attraction'
  return 'custom'
}

// 'fast_food' -> 'Fast food'
function prettyKind(value) {
  if (value === 'convenience') return 'Convenience store'
  if (value === 'yes') return 'Place'
  const text = String(value || 'place').replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

async function findCentre(destination) {
  if (centres.has(destination)) return centres.get(destination)
  const url = 'https://photon.komoot.io/api/?' + new URLSearchParams({ q: destination, limit: '1', lang: 'en', osm_tag: 'place' })
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) })
  const data = await response.json()
  const f = data.features && data.features[0]
  if (!f) return null
  const centre = { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], isCountry: f.properties.osm_value === 'country' }
  centres.set(destination, centre)
  return centre
}

router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim()
  const near = (req.query.near || '').trim()
  if (q.length < 2 || q.length > 80 || !near || near.length > 80) return res.json([])

  const key = near.toLowerCase() + '|' + q.toLowerCase()
  if (searches.has(key)) return res.json(searches.get(key))

  let data
  try {
    const centre = await findCentre(near)
    if (!centre) return res.json([])
    const params = { q, limit: '40', lang: 'en', lat: String(centre.lat), lon: String(centre.lon) }
    // Cities: only look about 30 km around the centre. Countries: just prefer places near the middle.
    if (!centre.isCountry) {
      const d = 0.3
      params.bbox = [centre.lon - d, centre.lat - d, centre.lon + d, centre.lat + d].join(',')
    }
    const response = await fetch('https://photon.komoot.io/api/?' + new URLSearchParams(params), {
      headers: HEADERS, signal: AbortSignal.timeout(6000)
    })
    data = await response.json()
  } catch (err) {
    return res.status(502).json({ message: 'Place search is unavailable right now.' })
  }

  // Group by name, so a chain like FamilyMart is one row with many branches
  const groups = []
  for (const f of data.features || []) {
    const p = f.properties || {}
    if (!p.name || ['place', 'boundary', 'highway', 'landuse'].includes(p.osm_key)) continue

    const street = [p.housenumber, p.street].filter(Boolean).join(' ')
    const address = [street, p.district || p.locality, p.city].filter(Boolean).join(', ') || p.name + ', ' + near

    let group = null
    for (const g of groups) {
      if (g.name.toLowerCase() === p.name.toLowerCase()) group = g
    }
    if (!group) {
      const type = cardType(p.osm_key, p.osm_value)
      group = {
        name: p.name,
        type,
        kind: prettyKind(p.osm_value),
        indoor: ['museum', 'gallery', 'aquarium', 'food', 'shop'].includes(type),
        branches: []
      }
      groups.push(group)
    }
    if (!group.branches.some((b) => b.address === address)) group.branches.push({ address })
  }
  const results = groups.slice(0, 8)

  if (searches.size >= CACHE_LIMIT) searches.delete(searches.keys().next().value)
  searches.set(key, results)
  res.json(results)
})

// ---------------------------------------------------------------------
// GET /api/places/photo?destination=Tokyo, Japan[&size=small]   (small = 960px wide, for cards)
// -> { url, page } a landscape photo of the place from Wikipedia (free, no key), or { url: null }
// Tries the city's article, then "Tourism in <country>", then the country.
// Flags and maps (usually .svg) are skipped so we get a real photo.
// ---------------------------------------------------------------------
const photos = new Map() // destination -> result

async function wikiPhoto(title, width) {
  const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'))
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) })
  if (!response.ok) return null
  const data = await response.json()
  if (data.type === 'disambiguation') return null
  const original = data.originalimage
  const thumb = data.thumbnail
  if (!original || !thumb) return null
  const file = original.source.toLowerCase()
  if (file.endsWith('.svg') || file.endsWith('.png') || file.includes('flag_of') || file.includes('map')) return null
  if (original.width < original.height) return null // portrait photos look bad as a wide banner
  // Ask Wikimedia for a smaller copy instead of the (often huge) original.
  // (Wikimedia only makes thumbnails in standard widths like 960, 1280 and 1920.)
  let src = original.source
  if (original.width > width) src = thumb.source.replace(/\/\d+px-/, '/' + width + 'px-')
  return { url: src, page: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : null }
}

// Backup: any wide photo from the article (e.g. when its main picture is a tall collage, like New York City)
async function wikiGalleryPhoto(title, width) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', generator: 'images', titles: title, gimlimit: '40', redirects: '1',
    prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: String(width), format: 'json'
  })
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
  const data = await response.json()
  const pages = (data.query && data.query.pages) || {}
  const skip = ['map', 'flag', 'logo', 'seal', 'icon', 'coat', 'locator', 'symbol', 'diagram', 'chart', 'signature']
  for (const id in pages) {
    const info = pages[id].imageinfo && pages[id].imageinfo[0]
    if (!info || info.mime !== 'image/jpeg') continue
    const name = pages[id].title.toLowerCase()
    if (skip.some((w) => name.includes(w))) continue
    if (info.width < 1200 || info.width < info.height * 1.3) continue // wide photos only
    return { url: info.thumburl || info.url, page: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')) }
  }
  return null
}

router.get('/photo', requireAuth, async (req, res) => {
  const destination = (req.query.destination || '').trim()
  if (!destination || destination.length > 80) return res.json({ url: null })
  const width = req.query.size === 'small' ? 960 : 1920
  const key = width + '|' + destination.toLowerCase()
  if (photos.has(key)) return res.json(photos.get(key))

  const parts = destination.split(',').map((x) => x.trim()).filter(Boolean)
  const place = parts[0]
  const country = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  // e.g. "New York" is the state's article (map), but "New York City" has a skyline photo
  const titles = [place, place + ' City', 'Tourism in ' + place, 'Tourism in ' + country, country]

  let result = { url: null }
  for (const title of titles) {
    try {
      const found = await wikiPhoto(title, width)
      if (found) {
        result = found
        break
      }
    } catch (err) {
      console.error('Wikipedia photo lookup failed for "' + title + '":', err.message)
    }
  }
  // No usable main picture anywhere: look through the city's other photos
  if (!result.url) {
    for (const title of [place + ' City', place]) {
      try {
        const found = await wikiGalleryPhoto(title, width)
        if (found) {
          result = found
          break
        }
      } catch (err) {
        console.error('Wikipedia gallery lookup failed for "' + title + '":', err.message)
      }
    }
  }
  // Only remember found photos, so a miss (or a network hiccup) is tried again next time
  if (result.url) {
    if (photos.size >= CACHE_LIMIT) photos.delete(photos.keys().next().value)
    photos.set(key, result)
  }
  res.json(result)
})

export default router
