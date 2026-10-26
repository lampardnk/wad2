// Getting from one place to the next (the itinerary's travel strips and "Other journeys").
// GET /api/travel/leg?from=34.6937,135.5023&to=34.6650,135.4320
//   -> { walk: { min, km }, bike: {...}, taxi: {...}, transit: {...} }  (only the ones we could look up)
// Real routes come from Geoapify (needs GEOAPIFY_KEY). Without it, or if a lookup fails, the answer
// has fewer modes (or none) and the app shows its own estimate instead. Answers are kept on disk.
import express from 'express'
import { requireAuth } from './auth.js'
import { geoapifyReady, geoapifyRoute } from '../geoapify.js'
import { diskMap } from '../diskCache.js'

const router = express.Router()
const legs = diskMap('travel-legs', 8000)
const running = new Map() // the same leg asked for twice at once is looked up once

// Our names -> Geoapify's
const MODES = { walk: 'walk', bike: 'bicycle', taxi: 'drive', transit: 'approximated_transit' }

function point(text) {
  const parts = String(text || '').split(',').map(Number)
  if (parts.length !== 2 || !parts.every(Number.isFinite)) return null
  const [lat, lon] = parts
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 } // about 10 m
}

async function lookUp(from, to) {
  const out = {}
  const answers = await Promise.allSettled(Object.keys(MODES).map((m) => geoapifyRoute(from, to, MODES[m])))
  const names = Object.keys(MODES)
  for (let i = 0; i < names.length; i++) {
    if (answers[i].status === 'fulfilled' && answers[i].value) out[names[i]] = answers[i].value
  }
  return out
}

router.get('/leg', requireAuth, async (req, res) => {
  const from = point(req.query.from)
  const to = point(req.query.to)
  if (!from || !to) return res.status(400).json({ message: 'Where from and to?' })
  if (!geoapifyReady()) return res.json({}) // the app estimates by itself
  const key = from.lat + ',' + from.lon + '>' + to.lat + ',' + to.lon
  if (legs.has(key)) return res.json(legs.get(key))
  let job = running.get(key)
  if (!job) {
    job = lookUp(from, to).finally(() => running.delete(key))
    running.set(key, job)
  }
  const found = await job
  if (Object.keys(found).length) legs.set(key, found) // nothing found = try again next time
  res.json(found)
})

export default router
