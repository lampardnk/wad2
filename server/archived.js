// A trip that has ended is archived: it can be looked at, but not changed.
// Deleting the trip and leaving it still work (they take it off your list, they don't edit it).
import mongoose from 'mongoose'
import Trip from './models/trip.js'

// Ended = the last day is before yesterday (UTC). The extra day covers time zones behind UTC,
// so a trip is never locked on the server while it's still on somewhere in the world.
export function hasEnded(trip, now = new Date()) {
  const last = trip.endDate || trip.startDate
  if (!last) return false
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  return last < yesterday
}

// Mounted at /api/trips/:tripId
export async function blockArchivedWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next()
  const rest = req.path.replace(/\/+$/, '')
  if (req.method === 'DELETE' && (rest === '' || /^\/members\/[^/]+$/.test(rest))) return next()
  if (!mongoose.isValidObjectId(req.params.tripId)) return next()
  try {
    const trip = await Trip.findById(req.params.tripId).select('startDate endDate').lean()
    if (trip && hasEnded(trip)) {
      return res.status(403).json({ message: 'This trip has ended and is archived, so it can no longer be changed.', archived: true })
    }
    next()
  } catch (err) {
    next(err)
  }
}
