import express from 'express'
import mongoose from 'mongoose'
import Trip from '../models/trip.js'
import User from '../models/User.js'
import Group from '../models/Group.js'
import { requireAuth } from './auth.js'

const router = express.Router()
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function toClient(t, userId) {
  return {
    id: t._id,
    name: t.name,
    destination: t.destination,
    startDate: t.startDate,
    endDate: t.endDate,
    travellers: t.travellers,
    stops: t.stops || [],
    wishlist: t.wishlist || [],
    group: t.group,
    version: t.version || 0,
    isOwner: String(t.owner) === String(userId)
  }
}

// ---------- who may open a trip ----------
// The ids of every group this user is in
async function myGroupIds(userId) {
  const groups = await Group.find({ members: userId }).select('_id')
  return groups.map((g) => g._id)
}

// Only returns the trip if the user owns it OR it is shared with a group they are in
async function findAccessibleTrip(tripId, userId) {
  const groupIds = await myGroupIds(userId)
  return Trip.findOne({ _id: tripId, $or: [{ owner: userId }, { group: { $in: groupIds } }] })
}

// For shared trips, swap the saved travellers for the group's CURRENT member names
async function toClientList(trips, userId) {
  const groupIds = trips.filter((t) => t.group).map((t) => t.group)
  const groups = await Group.find({ _id: { $in: groupIds } }).populate('members', 'name')

  const namesByGroup = {}
  for (const g of groups) {
    namesByGroup[String(g._id)] = g.members.map((m) => m.name)
  }

  return trips.map((t) => {
    const data = toClient(t, userId)
    if (t.group && namesByGroup[String(t.group)]) {
      data.travellers = namesByGroup[String(t.group)]
    }
    return data
  })
}

// Clean the stops sent by the browser. Returns null if anything is invalid.
function cleanStops(list) {
  if (!Array.isArray(list) || list.length > 100) return null
  const out = []
  for (const s of list) {
    if (!s || typeof s !== 'object') return null
    const name = typeof s.name === 'string' ? s.name.trim() : ''
    if (!name || name.length > 120) return null
    if (typeof s.date !== 'string' || !DATE_PATTERN.test(s.date)) return null
    const hour = Number(s.hour)
    if (!Number.isFinite(hour) || hour < 0 || hour >= 24) return null
    let duration = null
    if (s.duration !== null && s.duration !== undefined) {
      duration = Number(s.duration)
      if (!Number.isFinite(duration) || duration <= 0 || duration > 24) return null
    }
    const address = typeof s.address === 'string' && s.address.trim() ? s.address.trim().slice(0, 200) : null
    out.push({
      id: String(s.id || new mongoose.Types.ObjectId()).slice(0, 40),
      name, address, date: s.date, hour, duration,
      outdoor: !!s.outdoor, locked: !!s.locked
    })
  }
  return out
}

function cleanWishlist(list) {
  if (!Array.isArray(list) || list.length > 30) return null
  const out = []
  for (const w of list) {
    if (!w || typeof w !== 'object') return null
    const name = typeof w.name === 'string' ? w.name.trim() : ''
    if (!name || name.length > 120) return null
    const address = typeof w.address === 'string' && w.address.trim() ? w.address.trim().slice(0, 200) : null
    out.push({ id: String(w.id || new mongoose.Types.ObjectId()).slice(0, 40), name, address })
  }
  return out
}

// GET /api/trips -> my own trips plus trips shared with my groups, newest first
router.get('/', requireAuth, async (req, res) => {
  const groupIds = await myGroupIds(req.userId)
  const trips = await Trip.find({ $or: [{ owner: req.userId }, { group: { $in: groupIds } }] }).sort({ createdAt: -1 })
  res.json(await toClientList(trips, req.userId))
})

// POST /api/trips  { name, destination, startDate?, endDate?, travellers?, group? }
router.post('/', requireAuth, async (req, res) => {
  const name = (req.body.name || '').trim()
  const destination = (req.body.destination || '').trim()
  const startDate = req.body.startDate || ''
  const endDate = req.body.endDate || ''

  if (!name || !destination) return res.status(400).json({ message: 'Trip name and destination are required.' })
  if (name.length > 80 || destination.length > 80) return res.status(400).json({ message: 'Name and destination must be 80 characters or fewer.' })
  if ((startDate && !DATE_PATTERN.test(startDate)) || (endDate && !DATE_PATTERN.test(endDate))) {
    return res.status(400).json({ message: 'Dates must look like 2026-10-12.' })
  }
  if (startDate && endDate && endDate < startDate) {
    return res.status(400).json({ message: 'The end date must be on or after the start date.' })
  }

  let travellers = Array.isArray(req.body.travellers) ? req.body.travellers : []
  travellers = travellers.map((n) => String(n).trim()).filter(Boolean).slice(0, 10)

  // Sharing with a group: only allowed if I am a member of it
  let groupId = null
  if (req.body.group) {
    if (!mongoose.isValidObjectId(req.body.group)) return res.status(400).json({ message: 'That group is not valid.' })
    const group = await Group.findOne({ _id: req.body.group, members: req.userId }).populate('members', 'name')
    if (!group) return res.status(403).json({ message: 'You are not a member of that group.' })
    groupId = group._id
    // No names typed in? Use the group members' names
    if (!travellers.length) travellers = group.members.map((m) => m.name).slice(0, 10)
  }

  if (!travellers.length) {
    const user = await User.findById(req.userId)
    if (user) travellers = [user.name] // default: just the creator
  }

  const trip = await Trip.create({ owner: req.userId, name, destination, startDate, endDate, travellers, group: groupId })
  res.status(201).json((await toClientList([trip], req.userId))[0])
})

// GET /api/trips/:id
router.get('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' })
  const trip = await findAccessibleTrip(req.params.id, req.userId)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  res.json((await toClientList([trip], req.userId))[0])
})

// PUT /api/trips/:id/itinerary  { stops: [...], wishlist: [...], version }
// "version" is the version the browser last saw. If someone else saved in between,
// the numbers no longer match and we answer 409 with the latest trip instead of overwriting it.
router.put('/:id/itinerary', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' })
  const stops = cleanStops(req.body.stops)
  const wishlist = cleanWishlist(req.body.wishlist)
  if (!stops || !wishlist) return res.status(400).json({ message: 'Some itinerary details are invalid.' })

  const sentVersion = Number(req.body.version)
  if (!Number.isInteger(sentVersion) || sentVersion < 0) {
    return res.status(400).json({ message: 'Missing trip version. Please refresh the page.' })
  }

  const trip = await findAccessibleTrip(req.params.id, req.userId)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })

  // Trips saved before this feature have no version field, so 0 also matches "missing"
  const versionFilter = sentVersion === 0 ? { $in: [0, null] } : sentVersion

  // One atomic step: "save only if the version still matches, and add 1 to it"
  const updated = await Trip.findOneAndUpdate(
    { _id: trip._id, version: versionFilter },
    { $set: { stops, wishlist }, $inc: { version: 1 } },
    { new: true }
  )
  if (!updated) {
    const latest = await Trip.findById(trip._id)
    return res.status(409).json({ message: 'Someone else changed this trip.', trip: toClient(latest, req.userId) })
  }
  res.json({ ok: true, version: updated.version })
})

// DELETE /api/trips/:id  (owner only, even for shared trips)
router.delete('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' })
  const result = await Trip.deleteOne({ _id: req.params.id, owner: req.userId })
  if (!result.deletedCount) return res.status(404).json({ message: 'Trip not found.' })
  res.json({ ok: true })
})

export default router