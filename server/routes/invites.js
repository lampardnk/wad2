import express from 'express'
import mongoose from 'mongoose'
import Trip from '../models/trip.js'
import User from '../models/User.js'
import { requireAuth } from './auth.js'
import { findTripFor } from '../tripAccess.js'

const router = express.Router()

// GET /api/invites -> trips I've been invited to by username and haven't answered
router.get('/', requireAuth, async (req, res) => {
  const trips = await Trip.find({ 'pendingInvites.user': req.userId }).sort({ updatedAt: -1 })
  const list = []
  for (const t of trips) {
    const invite = t.pendingInvites.find((p) => String(p.user) === String(req.userId))
    list.push({
      tripId: t._id,
      name: t.name,
      destinations: t.destinations && t.destinations.length ? t.destinations : [t.destination],
      startDate: t.startDate,
      endDate: t.endDate,
      invitedBy: invite.invitedBy,
      people: (t.members || []).length,
      code: t.inviteCode // the card opens /join/<code> to pick your name
    })
  }
  res.json(list)
})

// POST /api/invites/:tripId/decline
router.post('/:tripId/decline', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.tripId)) return res.status(404).json({ message: 'Invite not found.' })
  await Trip.updateOne({ _id: req.params.tripId }, { $pull: { pendingInvites: { user: req.userId } } })
  res.json({ ok: true })
})

// GET /api/invites/users?q=mei&trip=<id> -> up to 5 accounts whose username starts with "mei"
// Only usernames are searched (not emails), and at least 3 letters are needed, so accounts can't be browsed.
router.get('/users', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, '').toLowerCase()
  if (q.length < 3 || q.length > 20 || !/^[a-z0-9._]+$/.test(q)) return res.json([])
  const escaped = q.replace(/[.]/g, '\\.')
  const users = await User.find({ username: { $regex: '^' + escaped }, _id: { $ne: req.userId } }).select('name username').limit(5)

  // Mark people already on / invited to this trip
  let trip = null
  if (req.query.trip) trip = await findTripFor(req.userId, req.query.trip) // only your own trips
  const out = []
  for (const u of users) {
    let status = ''
    if (trip && trip.members.some((m) => String(m.user) === String(u._id))) status = 'member'
    else if (trip && trip.pendingInvites.some((p) => String(p.user) === String(u._id))) status = 'invited'
    out.push({ id: u._id, name: u.name, username: u.username, status })
  }
  res.json(out)
})

export default router
