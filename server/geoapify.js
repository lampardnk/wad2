// Geoapify (geoapify.com): hosted OpenStreetMap search with our own free allowance (3,000 requests a day),
// so it doesn't turn us away when the free public servers are busy.
// Used first when GEOAPIFY_KEY is set in server/.env; Photon, Nominatim and Overpass stay as backups.
// Their terms ask for a "Powered by Geoapify" link next to what it found (see the Places tab).

const BASE = 'https://api.geoapify.com'

function apiKey() {
  return (process.env.GEOAPIFY_KEY || '').trim()
}
export function geoapifyReady() {
  return !!apiKey()
}

async function getJson(path, params, ms) {
  const url = BASE + path + '?' + new URLSearchParams({ ...params, apiKey: apiKey() })
  // Too many requests at once (429): wait a moment and ask again, twice at most
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms || 8000) })
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw Object.assign(new Error('Geoapify ' + res.status), { status: res.status })
    return res.json()
  }
}

// Find a place by text. Answers in Photon's shape ({ features: [...] }), so code written for Photon works with it.
// lat/lon = prefer results near there. Without them, no country is preferred
// (by default Geoapify prefers the country our server is in).
export async function geoapifySearch({ q, limit = 5, lat, lon, type }) {
  const params = { text: q, format: 'json', limit: String(limit), lang: 'en' }
  if (type) params.type = type
  params.bias = lat != null && lon != null ? 'proximity:' + lon + ',' + lat : 'countrycode:none'
  const data = await getJson('/v1/geocode/search', params)
  const features = []
  for (const r of data.results || []) {
    features.push({
      geometry: { coordinates: [r.lon, r.lat] },
      properties: {
        name: r.name || r.address_line1 || '',
        housenumber: r.housenumber, street: r.street, district: r.district || r.suburb,
        city: r.city, postcode: r.postcode,
        countrycode: (r.country_code || '').toUpperCase(), country: r.country || '',
        osm_value: r.result_type, // 'city', 'country', 'amenity'...
        place_id: r.place_id      // its boundary, for searching places inside it
      }
    })
  }
  return { features }
}

// Tourist places inside a city/country boundary (placeId) or a circle around a point.
// Answers like Overpass ({ elements: [{ tags }] }), so the existing attraction code can use it as it is.
const CATEGORIES = [
  'tourism.attraction', 'tourism.sights', 'entertainment.museum', 'entertainment.zoo', 'entertainment.aquarium',
  'entertainment.theme_park', 'national_park', 'heritage', 'leisure.park'
].join(',')

export async function geoapifyAttractions({ placeId, lat, lon, radius, tourismTypes }) {
  const filter = placeId ? 'place:' + placeId : 'circle:' + lon + ',' + lat + ',' + radius
  const data = await getJson('/v2/places', {
    categories: CATEGORIES, filter, bias: 'proximity:' + lon + ',' + lat, limit: '500', lang: 'en'
  }, 15000)
  const elements = []
  for (const f of data.features || []) {
    const p = f.properties || {}
    const raw = (p.datasource && p.datasource.raw) || {} // the OpenStreetMap tags, when Geoapify includes them
    const cats = p.categories || []
    const has = (prefix) => cats.some((c) => c === prefix || c.startsWith(prefix + '.'))
    const tags = { ...raw }
    tags.name = raw.name || p.name
    if (!tags.name) continue
    // An ordinary park with no Wikipedia/Wikidata entry is usually just a local green space: skip it
    const onlyPark = has('leisure.park') && !has('tourism') && !has('entertainment') && !has('heritage') && !has('national_park')
    if (onlyPark && !raw.wikidata && !raw.wikipedia) continue
    // The kind of place, from its OpenStreetMap tag if it's one we know, otherwise from Geoapify's categories
    if (!tourismTypes.includes(tags.tourism)) delete tags.tourism
    if (!tags.tourism && !tags.leisure && !tags.historic) {
      if (has('entertainment.museum')) tags.tourism = 'museum'
      else if (has('entertainment.zoo')) tags.tourism = 'zoo'
      else if (has('entertainment.aquarium')) tags.tourism = 'aquarium'
      else if (has('entertainment.theme_park')) tags.tourism = 'theme_park'
      else if (has('tourism.attraction.viewpoint')) tags.tourism = 'viewpoint'
      else if (has('national_park') || has('leisure.park')) tags.leisure = 'park'
      else if (has('heritage') || has('tourism.sights')) tags.historic = 'yes'
      else tags.tourism = 'attraction'
    }
    if (!tags['addr:street'] && p.street) tags['addr:street'] = p.street
    if (!tags['addr:housenumber'] && p.housenumber) tags['addr:housenumber'] = p.housenumber
    if (!tags['addr:city'] && p.city) tags['addr:city'] = p.city
    const c = f.geometry && f.geometry.coordinates
    elements.push({ tags, lat: c ? c[1] : p.lat, lon: c ? c[0] : p.lon })
  }
  return { elements }
}

// Is km (a route's length) under half the straight-line distance? Only checked past 300 m,
// where rounding can't explain it. Used for fresh routes and for ones saved before this check.
export function tooShort(from, to, km) {
  const r = Math.PI / 180
  const x = Math.sin((to.lat - from.lat) * r / 2) ** 2 + Math.cos(from.lat * r) * Math.cos(to.lat * r) * Math.sin((to.lon - from.lon) * r / 2) ** 2
  const straight = 2 * 6371 * Math.asin(Math.sqrt(x))
  return straight > 0.3 && km < straight / 2
}

// How long a route takes: { min, km } or null. from/to = { lat, lon }.
// mode: 'walk' | 'bicycle' | 'drive' | 'approximated_transit' (public transport worked out from
// OpenStreetMap's bus/train lines; no timetables, so it's an estimate).
// null = Geoapify says there's no route this way (e.g. no road to that point); a failed request throws
// withPath: also return the route's points, path: [{ lat, lon }, ...] from start to end
export async function geoapifyRoute(from, to, mode, { withPath = false } = {}) {
  let data
  try {
    data = await getJson('/v1/routing', {
      waypoints: from.lat + ',' + from.lon + '|' + to.lat + ',' + to.lon,
      mode
    }, 10000)
  } catch (err) {
    if (err.status === 400) return null // "No path could be found for input"
    throw err
  }
  const f = data.features && data.features[0]
  const p = f && f.properties
  if (!p || p.time == null) return null
  // A route much shorter than the straight line isn't real (Geoapify's transit sometimes answers 0 m, 1 min)
  if (tooShort(from, to, (p.distance || 0) / 1000)) return null
  const route = { min: Math.max(1, Math.round(p.time / 60)), km: Math.round((p.distance || 0) / 100) / 10 }
  if (withPath && f.geometry) {
    // LineString: [[lon, lat], ...]; MultiLineString (one line per leg): [[[lon, lat], ...], ...]
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates
    route.path = lines.flat().map(([lon, lat]) => ({ lat, lon }))
  }
  return route
}

// One place as the app stores it: { name, address, lat, lon, kind, city, countryCode }
function toPlace(r) {
  return {
    name: r.name || r.address_line1 || r.formatted || '',
    address: r.name ? (r.address_line2 || r.formatted || '') : (r.formatted || ''),
    lat: r.lat,
    lon: r.lon,
    kind: r.category || r.result_type || '',
    city: r.city || '',
    countryCode: (r.country_code || '').toUpperCase()
  }
}

// Type-ahead: real places that match what was typed. near = { lat, lon } keeps results within 60 km.
// Text that matches nothing gives an empty list (no guessing).
export async function geoapifyAutocomplete({ q, near, limit = 8 }) {
  const params = { text: q, format: 'json', limit: String(limit), lang: 'en' }
  if (near) {
    params.bias = 'proximity:' + near.lon + ',' + near.lat
    params.filter = 'circle:' + near.lon + ',' + near.lat + ',60000'
  }
  const data = await getJson('/v1/geocode/autocomplete', params)
  return (data.results || []).map(toPlace).filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon))
}

// What is at this point (for a dropped pin or a Maps link without a name). null = nothing known there.
export async function geoapifyReverse(lat, lon) {
  const data = await getJson('/v1/geocode/reverse', { lat: String(lat), lon: String(lon), format: 'json', lang: 'en' })
  const r = data.results && data.results[0]
  return r ? toPlace(r) : null
}
