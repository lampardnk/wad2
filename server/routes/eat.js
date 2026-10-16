import express from 'express'
import { requireAuth } from './auth.js'
import { askOverpassFast } from './places.js'

// GET /api/eat?lat=30.66&lon=104.06
// -> places to eat within about 1.2 km (OpenStreetMap):
//    [{ id, name, kind, cuisine[], lat, lon, openingHours, diet: { vegetarian, vegan, halal, glutenFree }, address, website }]
// Backup: Photon (OpenStreetMap search) when Overpass is busy. Answers are cached for a day per ~100 m.
const router = express.Router()
const HEADERS = { 'User-Agent': 'ChuiseYourTrip/1.0 (SMU IS216 student project)' }
const DAY = 24 * 60 * 60 * 1000
const cache = new Map()

const round3 = (n) => Math.round(Number(n) * 1000) / 1000
const yes = (v) => v === 'yes' || v === 'only'

function fromTags(id, t, lat, lon) {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  const city = t['addr:city'] || ''
  return {
    id,
    name: t['name:en'] || t.name,
    nameLocal: t['name:en'] && t.name !== t['name:en'] ? t.name : '',
    kind: t.amenity || 'restaurant', // restaurant | cafe | fast_food | food_court
    cuisine: String(t.cuisine || '').split(/[;,]/).map((c) => c.trim().toLowerCase()).filter(Boolean),
    lat,
    lon,
    openingHours: t.opening_hours || null,
    diet: {
      vegetarian: yes(t['diet:vegetarian']) || yes(t['diet:vegan']),
      vegan: yes(t['diet:vegan']),
      halal: yes(t['diet:halal']),
      glutenFree: yes(t['diet:gluten_free'])
    },
    address: [street, city].filter(Boolean).join(', '),
    website: t.website || t['contact:website'] || null
  }
}

async function fromOverpass(lat, lon) {
  const q = '[out:json][timeout:10];nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"](around:1200,' + lat + ',' + lon + ');out tags center 120;'
  const data = await askOverpassFast(q, 12)
  const out = []
  for (const el of data.elements || []) {
    const pLat = el.lat !== undefined ? el.lat : el.center && el.center.lat
    const pLon = el.lon !== undefined ? el.lon : el.center && el.center.lon
    if (pLat === undefined || !el.tags || !el.tags.name) continue
    out.push(fromTags(el.type + el.id, el.tags, pLat, pLon))
  }
  return out
}

async function fromPhoton(lat, lon) {
  const out = []
  for (const kind of ['restaurant', 'cafe', 'fast_food']) {
    const url = 'https://photon.komoot.io/api/?' + new URLSearchParams({ q: kind.replace('_', ' '), lat, lon, osm_tag: 'amenity:' + kind, limit: '15', lang: 'en' })
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      for (const f of data.features || []) {
        const p = f.properties || {}
        if (!p.name) continue
        const item = fromTags((p.osm_type || 'x') + p.osm_id, { name: p.name, amenity: kind, 'addr:street': p.street, 'addr:housenumber': p.housenumber, 'addr:city': p.city }, f.geometry.coordinates[1], f.geometry.coordinates[0])
        out.push(item)
      }
    } catch (err) {
      // try the next kind
    }
  }
  return out
}

router.get('/', requireAuth, async (req, res) => {
  const lat = round3(req.query.lat)
  const lon = round3(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ message: 'Invalid location.' })
  }
  const key = lat + ',' + lon
  const saved = cache.get(key)
  if (saved && Date.now() - saved.time < DAY) return res.json(saved.places)
  let places = []
  try {
    places = await fromOverpass(lat, lon)
  } catch (err) {
    console.error('Eat search (Overpass) failed:', err.message)
    places = await fromPhoton(lat, lon)
  }
  if (!places.length && saved) return res.json(saved.places)
  if (cache.size > 300) cache.delete(cache.keys().next().value)
  if (places.length) cache.set(key, { time: Date.now(), places })
  res.json(places)
})

export default router
