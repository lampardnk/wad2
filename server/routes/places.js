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
const OVERPASS_SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

async function askOverpass(query, waitSeconds) {
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
      return JSON.parse(text) // throws if Overpass sent an HTML error page
    } catch (err) {
      lastError = err
      console.error('Overpass attempt failed:', err.message)
    }
  }
  throw lastError
}

router.get('/attractions', requireAuth, async (req, res) => {
  const destination = (req.query.destination || '').trim()
  if (!destination || destination.length > 80) return res.json([])

  const key = destination.toLowerCase()
  const saved = await Attraction.findOne({ key })
  if (saved && (Date.now() - saved.fetchedAt.getTime()) / 86400000 < CACHE_DAYS) return res.json(saved.items)

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

    // 2. Search inside its boundary if OpenStreetMap has one, otherwise within 15 km.
    // A whole country is big, so there we only take places with a Wikipedia article (fewer, more famous).
    let where
    if (props.osm_type === 'R') {
      where = 'area(' + (3600000000 + Number(props.osm_id)) + ')->.a;(nwr(area.a)'
    } else {
      where = '(nwr(around:15000,' + lat + ',' + lon + ')'
    }
    const famous = isCountry ? '["wikipedia"]' : '["wikidata"]'
    const waitSeconds = isCountry ? 90 : 30
    const query = '[out:json][timeout:' + waitSeconds + '];' + where +
      '["tourism"~"^(' + TYPES + ')$"]["name"]' + famous + ';);out tags center 300;'
    const osm = await askOverpass(query, waitSeconds)

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
    await Attraction.findOneAndUpdate({ key }, { key, items: top, fetchedAt: new Date() }, { upsert: true })
    res.json(top)
  } catch (err) {
    console.error('Attractions lookup failed for "' + destination + '":', err.message)
    res.status(502).json({ message: 'Could not load popular places right now. Try again in a minute.' })
  }
})

export default router
