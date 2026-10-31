import express from 'express'
import Trip from '../models/trip.js'
import User from '../models/User.js'
import { requireAuth } from './auth.js'
import { ensureMembers, memberName } from '../tripAccess.js'

const router = express.Router()

async function tripForCode(code) {
  if (typeof code !== 'string' || !/^[\w-]{6,20}$/.test(code)) return null
  const trip = await Trip.findOne({ inviteCode: code })
  return trip ? ensureMembers(trip) : null
}

// Travellers listed on the trip who haven't joined with an account yet
function guestsOf(trip) {
  const taken = (trip.members || []).map((m) => m.name)
  return trip.travellers.filter((t) => !taken.includes(t))
}

// GET /api/join/:code/preview -> just enough to say "you're invited to ..." before signing in (no login needed)
router.get('/:code/preview', async (req, res) => {
  const trip = await tripForCode(req.params.code)
  if (!trip) return res.status(404).json({ message: "That code doesn't match a trip. Check it, or ask for a new one." })
  const owner = trip.members.find((m) => m.role === 'owner')
  res.json({
    name: trip.name,
    destinations: trip.destinations && trip.destinations.length ? trip.destinations : [trip.destination],
    startDate: trip.startDate,
    endDate: trip.endDate,
    invitedBy: owner ? owner.name : '',
    memberCount: trip.members.length
  })
})

// Members with their Travel Twin picture version (0 = no picture, show the initial)
async function membersWithFaces(trip) {
  const users = await User.find({ _id: { $in: trip.members.map((m) => m.user) } }).select('avatarVersion')
  const v = {}
  for (const u of users) v[String(u._id)] = u.avatarVersion || 0
  return trip.members.map((m) => ({ id: m.user, name: m.name, role: m.role, avatarV: v[String(m.user)] || 0 }))
}

// GET /api/join/:code -> a preview of the trip before joining
router.get('/:code', requireAuth, async (req, res) => {
  const trip = await tripForCode(req.params.code)
  if (!trip) return res.status(404).json({ message: 'This invite link is not valid any more. Ask for a new one.' })
  const owner = trip.members.find((m) => m.role === 'owner')
  res.json({
    id: trip._id,
    name: trip.name,
    destinations: trip.destinations && trip.destinations.length ? trip.destinations : [trip.destination],
    startDate: trip.startDate,
    endDate: trip.endDate,
    invitedBy: owner ? owner.name : '',
    members: await membersWithFaces(trip),
    guests: guestsOf(trip),
    alreadyMember: !!memberName(trip, req.userId)
  })
})

// POST /api/join/:code  { as: 'Sarah' }  -> join, taking over a listed name, or as yourself ({ as: '' })
router.post('/:code', requireAuth, async (req, res) => {
  const trip = await tripForCode(req.params.code)
  if (!trip) return res.status(404).json({ message: 'This invite link is not valid any more. Ask for a new one.' })
  if (memberName(trip, req.userId)) return res.json({ id: trip._id })
  // Joining answers any username invite too
  trip.pendingInvites = (trip.pendingInvites || []).filter((p) => String(p.user) !== String(req.userId))

  const user = await User.findById(req.userId)
  if (!user) return res.status(401).json({ message: 'Please log in again.' })
  if (trip.members.length >= 20) return res.status(400).json({ message: 'This trip is full (20 people).' })

  let name = typeof req.body.as === 'string' ? req.body.as : ''
  if (name && !guestsOf(trip).includes(name)) return res.status(400).json({ message: 'That name has already been taken. Pick another.' })
  if (!name) {
    // Join under your own name; add a number if someone on the trip already has it
    name = user.name.slice(0, 36)
    let n = 2
    while (trip.travellers.includes(name)) name = user.name.slice(0, 36) + ' ' + n++
    trip.travellers.push(name)
  }
  trip.members.push({ user: req.userId, name, role: 'member' })
  await trip.save()
  res.json({ id: trip._id })
})

export default router
