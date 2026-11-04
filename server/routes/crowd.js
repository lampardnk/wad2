import express from 'express'
import Forecast from '../models/Forecast.js'
import { requireAuth } from './auth.js'

const router = express.Router()
const CACHE_DAYS = 30 // BestTime forecasts stay accurate for several weeks
const NO_DATA_CACHE_DAYS = 1 // "BestTime has no data for this place": ask again tomorrow

// ---------- Turn BestTime's big response into the small shape our app needs ----------
function simplify(name, address, data) {
  const venueTypes = (data.venue_info && data.venue_info.venue_types) || []

  // BestTime's average visit length, if it has one (minutes -> hours, rounded to 0.5)
  const dwell = data.venue_info && data.venue_info.venue_dwell_time_avg
  const durationDefault = dwell > 0 ? Math.max(0.5, Math.round(dwell / 30) / 2) : null

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
    venueType: venueTypes[0] || (data.venue_info && data.venue_info.venue_type) || 'unknown',
    durationDefault,
    days
  }
}

// What we send to the browser
function toClient(doc) {
  return {
    name: doc.name,
    address: doc.address,
    found: doc.found,
    message: doc.message,
    venueType: doc.venueType,
    // Saved before this version (bestTimeDefault set): its visit length may be a name guess, so leave it out
    durationDefault: doc.bestTimeDefault ? null : doc.durationDefault ?? null,
    days: doc.found ? doc.days : null, // older saved entries may hold a made-up pattern: never send it
    fetchedAt: doc.fetchedAt
  }
}

// GET /api/crowd?name=N Seoul Tower&address=105 Namsangongwon-gil, Seoul&lat=37.55&lon=126.99
// Only for places with a map point (picked from search, a pin or a Maps link); the address is the one that came with it.
// Logged-in users only, so strangers can't spend our BestTime credits.
router.get('/', requireAuth, async (req, res) => {
  const name = (req.query.name || '').trim()
  const address = (req.query.address || '').trim()
  const point = { lat: Number(req.query.lat), lon: Number(req.query.lon) }
  if (!name || !address) {
    return res.status(400).json({ message: 'Please give both a place name and an address.' })
  }
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) {
    return res.status(400).json({ message: 'This place has no location yet. Set its location first.' })
  }

  const key = (name + '|' + address).toLowerCase()

  // 1. Already saved and still fresh? Return it (free).
  const cached = await Forecast.findOne({ key })
  const ageDays = cached ? (Date.now() - cached.fetchedAt.getTime()) / 86400000 : Infinity
  if (cached && ageDays < (cached.found ? CACHE_DAYS : NO_DATA_CACHE_DAYS)) {
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
    // No made-up pattern: the app shows "No crowd data" for this place
    result = { found: false, message: msg, venueType: null, durationDefault: null, days: null }
  }

  // 3. Save it (note: BestTime echoes our private key back - we never store the raw response)
  const saved = await Forecast.findOneAndUpdate(
    { key },
    // $unset clears what older versions saved (made-up patterns, name-guessed best times)
    { $set: { key, name, address, ...result, fetchedAt: new Date() }, $unset: { estimated: 1, category: 1, nearby: 1, bestTimeDefault: 1 } },
    { upsert: true, new: true }
  )
  res.json(toClient(saved))
})

export default router

// Exported so it can be unit-tested without calling BestTime
export { simplify }
