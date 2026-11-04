// Getting from one place to the next (the itinerary's travel strips and "Other journeys").
// GET /api/travel/leg?from=34.6937,135.5023&to=34.6650,135.4320
//   -> { walk: { min, km }, bike: {...}, taxi: {...}, transit: {...} }  (only the ones we could look up)
// Real routes come from Geoapify (needs GEOAPIFY_KEY). Without it, or if a lookup fails, the answer
// has fewer modes (or none) and the app says it has no route. Complete answers are kept in the database.
import express from 'express'
import { requireAuth } from './auth.js'
import { geoapifyReady, geoapifyRoute } from '../geoapify.js'
import { sharedCache } from '../sharedCache.js'

const router = express.Router()
const legs = sharedCache('travel-legs', { keepDays: 90 }) // roads rarely change
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

// -> { found: { walk: {...}, ... }, complete: every way got an answer (a route, or "no route") }
// A failed request (e.g. too many at once) is not an answer: that way is just missing this time.
async function lookUp(from, to) {
  const found = {}
  const names = Object.keys(MODES)
  const answers = await Promise.allSettled(names.map((m) => geoapifyRoute(from, to, MODES[m], { withPath: m === 'walk' })))
  for (let i = 0; i < names.length; i++) {
    if (answers[i].status === 'fulfilled' && answers[i].value) found[names[i]] = answers[i].value
  }
  let complete = answers.every((a) => a.status === 'fulfilled')

  // No road or line reaches one end (e.g. a pin inside palace grounds or a park), but you can walk there:
  // ride to the closest point on the walking route that a taxi / train reaches, and walk the rest
  const walk = found.walk
  if (walk && walk.path) {
    const missing = ['taxi', 'transit'].filter((m) => answers[names.indexOf(m)].status === 'fulfilled' && !found[m])
    const tries = await Promise.allSettled(missing.map((m) => rideThenWalk(from, to, m, walk)))
    tries.forEach((t, i) => {
      if (t.status === 'rejected') complete = false
      else if (t.value) found[missing[i]] = t.value
    })
    delete walk.path
  }
  if (found.walk && !found.taxi) found.triedNearby = true // (so it isn't looked up again below)
  return { found, complete }
}

// ---------- riding as close as you can, then walking ----------
const NEARBY_KM = [0.15, 0.4, 0.8] // how much walking we try, least first

function distKm(a, b) {
  const r = Math.PI / 180
  const x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(x))
}

// The first point at least km along the path: { lat, lon, km } (km = how far along it really is)
function along(path, km) {
  let done = 0
  for (let i = 1; i < path.length; i++) {
    done += distKm(path[i - 1], path[i])
    if (done >= km) return { lat: path[i].lat, lon: path[i].lon, km: done }
  }
  return null
}

// Ride, then walk the rest: { min, km, walkMin } or null. Tries walking the last bit, the first bit, or both.
// The walk part takes its share of the walking route's time (walk.min × walked km / route km).
async function rideThenWalk(from, to, mode, walk) {
  const path = walk.path
  let total = 0
  for (let i = 1; i < path.length; i++) total += distKm(path[i - 1], path[i])
  const back = path.slice().reverse()
  for (const km of NEARBY_KM) {
    if (2 * km >= total) break // that much walking is most of the way
    const nearEnd = along(back, km)
    const nearStart = along(path, km)
    for (const [a, b, walked] of [[from, nearEnd, nearEnd.km], [nearStart, to, nearStart.km], [nearStart, nearEnd, nearStart.km + nearEnd.km]]) {
      const ride = await geoapifyRoute(a, b, MODES[mode])
      if (ride) {
        const walkMin = Math.max(1, Math.round(walk.min * walked / total))
        return { min: ride.min + walkMin, km: Math.round((ride.km + walked) * 10) / 10, walkMin }
      }
    }
  }
  return null
}

router.get('/leg', requireAuth, async (req, res) => {
  const from = point(req.query.from)
  const to = point(req.query.to)
  if (!from || !to) return res.status(400).json({ message: 'Where from and to?' })
  if (!geoapifyReady()) return res.json({}) // the app estimates by itself
  const key = from.lat + ',' + from.lon + '>' + to.lat + ',' + to.lon
  const saved = await legs.get(key)
  // Saved before rides could end with a short walk (a walk but no taxi): looked up once more
  const walkOnly = saved && saved.value.walk && !saved.value.taxi && !saved.value.triedNearby
  if (saved && !walkOnly) return res.json(saved.value)
  let job = running.get(key)
  if (!job) {
    job = lookUp(from, to).finally(() => running.delete(key))
    running.set(key, job)
  }
  const { found, complete } = await job
  // Kept only when every way got an answer (a failed request is asked again next time)
  if (complete && Object.keys(found).length) await legs.set(key, found)
  // A second look that didn't finish: keep what was saved, plus anything new
  res.json(saved && !complete ? { ...saved.value, ...found } : found)
})

export default router
