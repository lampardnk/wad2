import express from 'express'
import Forecast from '../models/Forecast.js'
import { requireAuth } from './auth.js'

const router = express.Router()
const CACHE_DAYS = 30 // BestTime forecasts stay accurate for several weeks

// ---------- Guess a sensible default from the place's name/type ----------
// Checked in order; first match wins.
// [words to look for, best time, typical hours spent, category for the typical pattern]
const PLACE_RULES = [
  [['night market'], 'night', 2, 'nightMarket'],
  [['night_club', 'bar', 'itaewon', 'nightlife'], 'night', 2, 'evening'],
  [['street', 'shopping district'], 'night', 2, 'shopping'],
  [['tower', 'observation', 'skypark', 'sky park', 'skydeck', 'viewpoint'], 'sunset', 1.5, 'evening'],
  [['great wall', 'hike', 'hiking', 'trail', 'mountain', 'natural_feature'], 'morning', 3, 'nature'],
  [['zoo', 'aquarium', 'amusement_park', 'theme park'], 'morning', 4, 'museum'],
  [['park', 'garden', 'beach', 'palace', 'temple', 'shrine'], 'morning', 1.5, 'park'],
  [['museum', 'art_gallery', 'gallery'], 'any', 2, 'museum'],
  [['shopping_mall', 'mall', 'market', 'store'], 'afternoon', 2, 'shopping'],
  [['restaurant', 'cafe', 'food'], 'any', 1.5, 'restaurant']
]

function guessDefaults(name, venueTypes) {
  const text = (name + ' ' + venueTypes.join(' ')).toLowerCase()
  for (const [words, bestTime, hours, category] of PLACE_RULES) {
    for (const word of words) {
      if (text.includes(word)) return { bestTimeDefault: bestTime, durationDefault: hours, category }
    }
  }
  return { bestTimeDefault: 'any', durationDefault: 1.5, category: 'general' }
}

// ---------- Typical crowd patterns, for places BestTime can't forecast ----------
// open/close hours, and how busy (0-100) each clock hour usually is on a weekday.
// Hours not listed are 0. Weekends are made busier below.
const TYPICAL = {
  park:        { open: 6,  close: 22, busy: { 6: 15, 7: 25, 8: 30, 9: 35, 10: 40, 11: 45, 12: 45, 13: 45, 14: 50, 15: 55, 16: 60, 17: 60, 18: 55, 19: 45, 20: 35, 21: 20 } },
  museum:      { open: 10, close: 18, busy: { 10: 30, 11: 50, 12: 60, 13: 65, 14: 70, 15: 65, 16: 50, 17: 35 } },
  evening:     { open: 10, close: 23, busy: { 10: 20, 11: 25, 12: 30, 13: 35, 14: 40, 15: 45, 16: 50, 17: 60, 18: 75, 19: 85, 20: 80, 21: 65, 22: 40 } },
  nightMarket: { open: 17, close: 24, busy: { 17: 30, 18: 55, 19: 75, 20: 85, 21: 80, 22: 60, 23: 35 } },
  nature:      { open: 6,  close: 18, busy: { 6: 20, 7: 30, 8: 40, 9: 50, 10: 60, 11: 65, 12: 60, 13: 55, 14: 50, 15: 40, 16: 30, 17: 20 } },
  shopping:    { open: 10, close: 22, busy: { 10: 20, 11: 35, 12: 50, 13: 55, 14: 55, 15: 55, 16: 60, 17: 65, 18: 70, 19: 70, 20: 60, 21: 40 } },
  restaurant:  { open: 11, close: 22, busy: { 11: 30, 12: 70, 13: 60, 14: 30, 15: 20, 16: 20, 17: 35, 18: 65, 19: 75, 20: 55, 21: 30 } },
  general:     { open: 9,  close: 21, busy: { 9: 20, 10: 30, 11: 40, 12: 50, 13: 55, 14: 60, 15: 60, 16: 55, 17: 50, 18: 45, 19: 35, 20: 25 } }
}
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_BOOST = { Friday: 1.1, Saturday: 1.3, Sunday: 1.3 } // weekends are busier

// Build the same { Monday: { open, close, closed, raw } } shape BestTime data uses
function typicalDays(category) {
  const t = TYPICAL[category] || TYPICAL.general
  const days = {}
  for (const dayName of DAY_NAMES) {
    const boost = DAY_BOOST[dayName] || 1
    const raw = []
    for (let i = 0; i < 24; i++) {
      const clockHour = (i + 6) % 24 // raw index 0 = 6am, like BestTime
      const value = t.busy[clockHour] || 0
      raw.push(Math.min(100, Math.round(value * boost)))
    }
    days[dayName] = { open: t.open, close: t.close, closed: false, raw }
  }
  return days
}

// ---------- Find nearby landmarks (free OpenStreetMap services, no key) ----------
// Used when BestTime has no data, e.g. Namsan Park -> N Seoul Tower.
const OSM_HEADERS = { 'User-Agent': 'ChuiseYourTrip/1.0 (SMU IS216 student project)' }

async function findNearby(name, address, lat, lon) {
  try {
    // 1. Get coordinates if BestTime didn't give them
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      const url = 'https://nominatim.openstreetmap.org/search?' +
        new URLSearchParams({ q: name + ', ' + address, format: 'json', limit: '1' })
      const geo = await (await fetch(url, { headers: OSM_HEADERS, signal: AbortSignal.timeout(8000) })).json()
      if (!geo.length) return []
      lat = Number(geo[0].lat)
      lon = Number(geo[0].lon)
    }

    // 2. Named attractions within 1 km
    const query = '[out:json][timeout:10];(' +
      'nwr(around:1000,' + lat + ',' + lon + ')["tourism"~"attraction|viewpoint|museum|zoo|theme_park"]["name"];' +
      ');out tags 30;'
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { ...OSM_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(12000)
    })
    const osm = await resp.json()

    // 3. Keep up to 3 names, preferring English names, skipping the place itself
    const names = []
    for (const el of osm.elements || []) {
      const tags = el.tags || {}
      const n = tags['name:en'] || tags.name
      if (!n || names.includes(n) || n.toLowerCase() === name.toLowerCase()) continue
      names.push(n)
      if (names.length === 3) break
    }
    return names
  } catch (err) {
    console.error('Nearby lookup failed:', err.message)
    return [] // not important enough to break the page
  }
}

// Everything we save for a place BestTime can't forecast
async function buildFallback(name, address, venueInfo) {
  const defaults = guessDefaults(name, [])
  const lat = venueInfo && venueInfo.venue_lat
  const lon = venueInfo && venueInfo.venue_lon
  return {
    found: false,
    estimated: true,
    message: 'Not enough visitor data for this place, so this is a typical ' + defaults.category + ' pattern.',
    ...defaults,
    days: typicalDays(defaults.category),
    nearby: await findNearby(name, address, lat, lon)
  }
}

// ---------- Turn BestTime's big response into the small shape our app needs ----------
function simplify(name, address, data) {
  const venueTypes = (data.venue_info && data.venue_info.venue_types) || []
  const defaults = guessDefaults(name, venueTypes)

  // Use BestTime's average visit length if it has one (minutes -> hours, rounded to 0.5)
  const dwell = data.venue_info && data.venue_info.venue_dwell_time_avg
  if (dwell > 0) defaults.durationDefault = Math.max(0.5, Math.round(dwell / 30) / 2)

  const days = {}
  for (const a of data.analysis) {
    const info = a.day_info
    const v2 = info.venue_open_close_v2
    let open = null
    let close = null

    if (v2 && v2.open_24h) {
      open = 0
      close = 24
    } else if (v2 && v2['24h'] && v2['24h'].length > 0) {
      const first = v2['24h'][0]
      const last = v2['24h'][v2['24h'].length - 1]
      open = first.opens + (first.opens_minutes || 0) / 60
      close = last.closes + (last.closes_minutes || 0) / 60
      if (close <= open) close += 24 // closes after midnight
    } else if (v2) {
      // v2 present but no opening times listed = closed all day (e.g. palace on Tuesdays)
      open = null
    } else if (typeof info.venue_open === 'number' && typeof info.venue_closed === 'number' && info.venue_open !== info.venue_closed) {
      open = info.venue_open
      close = info.venue_closed <= open ? info.venue_closed + 24 : info.venue_closed
    }

    days[info.day_text] = {
      open,
      close,
      closed: open === null,
      raw: a.day_raw // 24 values, index 0 = 6am
    }
  }

  return {
    found: true,
    estimated: false,
    nearby: [],
    venueType: venueTypes[0] || (data.venue_info && data.venue_info.venue_type) || 'unknown',
    ...defaults,
    days
  }
}

// What we send to the browser
function toClient(doc) {
  return {
    name: doc.name,
    address: doc.address,
    found: doc.found,
    estimated: !!doc.estimated,
    category: doc.category,
    nearby: doc.nearby || [],
    message: doc.message,
    venueType: doc.venueType,
    bestTimeDefault: doc.bestTimeDefault,
    durationDefault: doc.durationDefault,
    days: doc.days,
    fetchedAt: doc.fetchedAt
  }
}

// GET /api/crowd?name=N Seoul Tower&address=105 Namsangongwon-gil, Seoul
// Logged-in users only, so strangers can't spend our BestTime credits.
router.get('/', requireAuth, async (req, res) => {
  const name = (req.query.name || '').trim()
  const address = (req.query.address || '').trim()
  if (!name || !address) {
    return res.status(400).json({ message: 'Please give both a place name and an address.' })
  }

  const key = (name + '|' + address).toLowerCase()

  // 1. Already saved and still fresh? Return it (free).
  const cached = await Forecast.findOne({ key })
  const ageDays = cached ? (Date.now() - cached.fetchedAt.getTime()) / 86400000 : Infinity
  if (cached && ageDays < CACHE_DAYS) {
    // Older "no data" entries were saved before estimates existed - add them now (free)
    if (!cached.found && !cached.estimated) {
      const fallback = await buildFallback(name, address, null)
      Object.assign(cached, fallback)
      await cached.save()
    }
    return res.json(toClient(cached))
  }

  // 2. Otherwise ask BestTime (costs credits)
  if (!process.env.BESTTIME_PRIVATE_KEY) {
    return res.status(503).json({ message: 'Crowd data is not set up yet (BESTTIME_PRIVATE_KEY missing in server/.env).' })
  }

  const params = new URLSearchParams({
    api_key_private: process.env.BESTTIME_PRIVATE_KEY,
    venue_name: name,
    venue_address: address
  })

  let data
  try {
    const response = await fetch('https://besttime.app/api/v1/forecasts?' + params, {
      method: 'POST',
      signal: AbortSignal.timeout(20000)
    })
    data = await response.json()
  } catch (err) {
    return res.status(502).json({ message: 'Could not reach the crowd data service. Try again later.' })
  }

  let result
  if (data.status === 'OK') {
    result = simplify(name, address, data)
  } else {
    const msg = data.message || 'No crowd data for this place.'
    // Only remember "this place has no data" - NOT problems with our key or credits
    const isPlaceProblem = /venue/i.test(msg) && !/api.?key|credit/i.test(msg)
    if (!isPlaceProblem) {
      console.error('BestTime error:', msg)
      return res.status(502).json({ message: 'Crowd data service error. Try again later.' })
    }
    result = await buildFallback(name, address, data.venue_info)
  }

  // 3. Save it (note: BestTime echoes our private key back - we never store the raw response)
  const saved = await Forecast.findOneAndUpdate(
    { key },
    { key, name, address, ...result, fetchedAt: new Date() },
    { upsert: true, new: true }
  )
  res.json(toClient(saved))
})

export default router

// Exported so it can be unit-tested without calling BestTime
export { simplify, guessDefaults, typicalDays, findNearby, buildFallback }
