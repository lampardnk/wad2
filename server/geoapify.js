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
  const res = await fetch(url, { signal: AbortSignal.timeout(ms || 8000) })
  if (!res.ok) throw new Error('Geoapify ' + res.status)
  return res.json()
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
    elements.push({ tags })
  }
  return { elements }
}

// How long a route takes: { min, km } or null. from/to = { lat, lon }.
// mode: 'walk' | 'bicycle' | 'drive' | 'approximated_transit' (public transport worked out from
// OpenStreetMap's bus/train lines; no timetables, so it's an estimate).
export async function geoapifyRoute(from, to, mode) {
  const data = await getJson('/v1/routing', {
    waypoints: from.lat + ',' + from.lon + '|' + to.lat + ',' + to.lon,
    mode
  }, 10000)
  const p = data.features && data.features[0] && data.features[0].properties
  if (!p || p.time == null) return null
  return { min: Math.max(1, Math.round(p.time / 60)), km: Math.round((p.distance || 0) / 100) / 10 }
}
