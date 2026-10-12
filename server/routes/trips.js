import express from 'express'
import mongoose from 'mongoose'
import Trip from '../models/trip.js'
import User from '../models/User.js'
import Photo from '../models/Photo.js'
import { requireAuth } from './auth.js'
import { findTripFor, memberName, roleOf, ensureMembers, newInviteCode } from '../tripAccess.js'

const router = express.Router()
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Same keys as src/tripOptions.js
const ACTIVITY_KEYS = ['sightseeing', 'food', 'shopping', 'beach', 'hiking', 'snow', 'themepark', 'nightlife', 'business', 'camping']
const WEATHER_KEYS = ['hot', 'mild', 'cold', 'rain']
const EXTRA_KEYS = ['laundry', 'carryon', 'kids', 'flight']
const PACKING_CATEGORIES = ['docs', 'clothes', 'toiletries', 'health', 'tech', 'gear', 'other']

// Keep only known keys, no repeats
function pickKeys(list, allowed) {
  const out = []
  if (!Array.isArray(list)) return out
  for (const k of list) {
    if (allowed.includes(k) && !out.includes(k)) out.push(k)
  }
  return out
}

// Clean the packing progress sent by the browser. Returns null if anything is invalid.
function cleanPacking(p) {
  if (!p || typeof p !== 'object') return null
  const id = (v) => String(v || '').slice(0, 60)
  const checked = {}
  const qty = {}
  if (p.checked && typeof p.checked === 'object') {
    const keys = Object.keys(p.checked).slice(0, 300)
    for (const k of keys) if (p.checked[k]) checked[id(k)] = true
  }
  if (p.qty && typeof p.qty === 'object') {
    const keys = Object.keys(p.qty).slice(0, 300)
    for (const k of keys) {
      const n = Math.floor(Number(p.qty[k]))
      if (n >= 0 && n <= 99) qty[id(k)] = n
    }
  }
  const removed = Array.isArray(p.removed) ? p.removed.slice(0, 300).map(id) : []
  const custom = []
  if (Array.isArray(p.custom)) {
    for (const c of p.custom.slice(0, 100)) {
      const name = c && typeof c.name === 'string' ? c.name.trim().slice(0, 80) : ''
      if (!name) return null
      const category = PACKING_CATEGORIES.includes(c.category) ? c.category : 'other'
      const n = Math.min(99, Math.max(1, Math.floor(Number(c.qty) || 1)))
      custom.push({ id: id(c.id), category, name, qty: n })
    }
  }
  return { checked, qty, removed, custom }
}

function toClient(t, userId) {
  return {
    role: userId ? roleOf(t, userId) : null,   // 'owner' | 'member'
    me: userId ? memberName(t, userId) : null, // my traveller name on this trip
    members: (t.members || []).map((m) => ({ id: m.user, name: m.name, role: m.role })),
    // Only filled in when the users were looked up (populate), e.g. on GET /api/trips/:id
    pendingInvites: (t.pendingInvites || []).map((p) => ({
      id: p.user && p.user._id ? p.user._id : p.user,
      name: p.user && p.user.name ? p.user.name : '',
      username: p.user && p.user.username ? p.user.username : '',
      invitedBy: p.invitedBy,
      invitedById: p.invitedById
    })),
    id: t._id,
    name: t.name,
    destination: t.destination,
    // Older trips only have one destination
    destinations: t.destinations && t.destinations.length ? t.destinations : [t.destination],
    startDate: t.startDate,
    endDate: t.endDate,
    travellers: t.travellers,
    activities: t.activities || [],
    weather: t.weather || [],
    extras: t.extras || [],
    packing: t.packing || null,
    expenses: t.expenses || null,
    photoAlbums: t.photoAlbums || [],
    stops: t.stops || [],
    wishlist: t.wishlist || []
  }
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
  if (!Array.isArray(list) || list.length > 100) return null
  const out = []
  for (const w of list) {
    if (!w || typeof w !== 'object') return null
    const name = typeof w.name === 'string' ? w.name.trim() : ''
    if (!name || name.length > 120) return null
    const address = typeof w.address === 'string' && w.address.trim() ? w.address.trim().slice(0, 200) : null
    const type = typeof w.type === 'string' ? w.type.slice(0, 20) : null
    const city = typeof w.city === 'string' && w.city.trim() ? w.city.trim().slice(0, 80) : null // e.g. 'Kyoto, Japan'
    // votes = names of the travellers who want to go, e.g. ['Sarah', 'Amy']
    const votes = []
    if (Array.isArray(w.votes)) {
      for (const v of w.votes.slice(0, 20)) {
        const voter = String(v).trim().slice(0, 40)
        if (voter && !votes.includes(voter)) votes.push(voter)
      }
    }
    out.push({ id: String(w.id || new mongoose.Types.ObjectId()).slice(0, 40), name, address, outdoor: !!w.outdoor, type, city, votes })
  }
  return out
}

// GET /api/trips -> the logged-in user's trips, newest first
router.get('/', requireAuth, async (req, res) => {
  const trips = await Trip.find({ $or: [{ owner: req.userId }, { 'members.user': req.userId }] }).sort({ createdAt: -1 })
  for (const t of trips) await ensureMembers(t)
  res.json(trips.map((t) => toClient(t, req.userId)))
})

// POST /api/trips  { name, destinations: ['Kyoto, Japan', 'Osaka, Japan'], startDate?, endDate?, travellers? }
// (a single { destination } still works)
router.post('/', requireAuth, async (req, res) => {
  const name = (req.body.name || '').trim()

  // Build the destinations list: trimmed, no blanks, no repeats, max 10
  const raw = Array.isArray(req.body.destinations) ? req.body.destinations : [req.body.destination]
  const destinations = []
  for (const d of raw) {
    const clean = String(d || '').trim()
    if (clean && !destinations.includes(clean)) destinations.push(clean)
  }
  if (destinations.length > 10) return res.status(400).json({ message: 'A trip can have up to 10 destinations.' })
  for (const d of destinations) {
    if (d.length > 80) return res.status(400).json({ message: 'Each destination must be 80 characters or fewer.' })
  }
  const destination = destinations[0] || ''
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
  // The creator is a traveller too: use their name from the list if it's there, otherwise add it first
  const user = await User.findById(req.userId)
  let myName = user ? user.name : 'Organiser'
  for (const t of travellers) {
    if (t.toLowerCase() === myName.toLowerCase()) myName = t
  }
  if (!travellers.includes(myName)) travellers.unshift(myName)
  const members = [{ user: req.userId, name: myName, role: 'owner' }]

  const activities = pickKeys(req.body.activities, ACTIVITY_KEYS)
  const weather = pickKeys(req.body.weather, WEATHER_KEYS)
  const extras = pickKeys(req.body.extras, EXTRA_KEYS)

  const trip = await Trip.create({ owner: req.userId, members, name, destination, destinations, startDate, endDate, travellers, activities, weather, extras })
  res.status(201).json(toClient(trip, req.userId))
})

// GET /api/trips/:id
router.get('/:id', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  await trip.populate('pendingInvites.user', 'name username')
  res.json(toClient(trip, req.userId))
})

// PUT /api/trips/:id/itinerary  { stops: [...], wishlist: [...] }
router.put('/:id/itinerary', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' })
  const stops = cleanStops(req.body.stops)
  const wishlist = cleanWishlist(req.body.wishlist)
  if (!stops || !wishlist) return res.status(400).json({ message: 'Some itinerary details are invalid.' })

  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  trip.stops = stops
  trip.wishlist = wishlist
  trip.markModified('stops')
  trip.markModified('wishlist')
  await trip.save()
  res.json({ ok: true })
})

// PUT /api/trips/:id/packing  { activities, weather, extras, packing: { checked, qty, removed, custom } }
router.put('/:id/packing', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' })
  const packing = cleanPacking(req.body.packing)
  if (!packing) return res.status(400).json({ message: 'Some packing details are invalid.' })

  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  trip.activities = pickKeys(req.body.activities, ACTIVITY_KEYS)
  trip.weather = pickKeys(req.body.weather, WEATHER_KEYS)
  trip.extras = pickKeys(req.body.extras, EXTRA_KEYS)
  trip.packing = packing
  trip.markModified('packing')
  await trip.save()
  res.json({ ok: true })
})

// PUT /api/trips/:id/albums  [{ id, name, icon }]  -> the trip's photo albums
router.put('/:id/albums', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !Array.isArray(req.body) || req.body.length > 50) {
    return res.status(400).json({ message: 'Albums are invalid.' })
  }
  const albums = []
  for (const a of req.body) {
    const name = a && typeof a.name === 'string' ? a.name.trim().slice(0, 60) : ''
    if (!name) return res.status(400).json({ message: 'Every album needs a name.' })
    albums.push({ id: String(a.id || new mongoose.Types.ObjectId()).slice(0, 40), name, icon: String(a.icon || '📍').slice(0, 8) })
  }
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  trip.photoAlbums = albums
  trip.markModified('photoAlbums')
  await trip.save()
  // Photos in a deleted album go back to Trip highlights
  const ids = albums.map((a) => a.id)
  await Photo.updateMany({ trip: trip._id, album: { $nin: ids.concat('') } }, { album: '' })
  res.json({ ok: true })
})

// ---------- Sharing ----------

// POST /api/trips/:id/invite  -> { code }  (any member can share the link; reset=true makes a new one, owner only)
router.post('/:id/invite', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  if (req.body.reset && roleOf(trip, req.userId) !== 'owner') return res.status(403).json({ message: 'Only the organiser can reset the link.' })
  if (!trip.inviteCode || req.body.reset) {
    trip.inviteCode = newInviteCode()
    await trip.save()
  }
  res.json({ code: trip.inviteCode })
})

// POST /api/trips/:id/invites  { userId }  -> invite an account by username (any member can)
router.post('/:id/invites', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  const userId = String(req.body.userId || '')
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'Pick someone to invite.' })
  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ message: 'That account does not exist.' })
  if (memberName(trip, userId)) return res.status(400).json({ message: user.name + ' is already on this trip.' })
  if (trip.pendingInvites.some((p) => String(p.user) === userId)) return res.status(400).json({ message: user.name + ' is already invited.' })
  if (trip.pendingInvites.length >= 30) return res.status(400).json({ message: 'Too many invites waiting. Cancel some first.' })
  trip.pendingInvites.push({ user: userId, invitedBy: memberName(trip, req.userId), invitedById: req.userId })
  // The invite card opens the join page, which needs a code
  if (!trip.inviteCode) trip.inviteCode = newInviteCode()
  await trip.save()
  await trip.populate('pendingInvites.user', 'name username')
  res.status(201).json(toClient(trip, req.userId).pendingInvites)
})

// DELETE /api/trips/:id/invites/:userId  -> cancel (the organiser, or whoever sent it)
router.delete('/:id/invites/:userId', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  const invite = trip.pendingInvites.find((p) => String(p.user) === String(req.params.userId))
  if (!invite) return res.status(404).json({ message: 'That invite was already answered.' })
  if (roleOf(trip, req.userId) !== 'owner' && String(invite.invitedById) !== String(req.userId)) {
    return res.status(403).json({ message: 'Only the organiser or whoever sent it can cancel this invite.' })
  }
  trip.pendingInvites = trip.pendingInvites.filter((p) => p !== invite)
  await trip.save()
  await trip.populate('pendingInvites.user', 'name username')
  res.json(toClient(trip, req.userId).pendingInvites)
})

// POST /api/trips/:id/guests  { name }  -> someone going who won't make an account (kids, parents...)
router.post('/:id/guests', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  const name = String(req.body.name || '').trim().slice(0, 40)
  if (!name) return res.status(400).json({ message: 'Type their name.' })
  if (trip.travellers.some((t) => t.toLowerCase() === name.toLowerCase())) return res.status(400).json({ message: name + ' is already on this trip.' })
  if (trip.travellers.length >= 20) return res.status(400).json({ message: 'A trip can have up to 20 people.' })
  trip.travellers.push(name)
  await trip.save()
  res.status(201).json({ travellers: trip.travellers })
})

// DELETE /api/trips/:id/guests/:name  -> only names without an account, and not used in any expense
router.delete('/:id/guests/:name', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  const name = req.params.name
  if (trip.members.some((m) => m.name === name)) return res.status(400).json({ message: name + ' has an account. Remove them as a member instead.' })
  const e = trip.expenses || {}
  let used = false
  for (const x of e.items || []) {
    if (x.paidBy === name || (x.people || []).includes(name) || (x.exact && x.exact[name])) used = true
  }
  for (const p of e.settlements || []) {
    if (p.from === name || p.to === name) used = true
  }
  if (used) return res.status(400).json({ message: name + ' is in some expenses, so they can\'t be removed.' })
  trip.travellers = trip.travellers.filter((t) => t !== name)
  await trip.save()
  res.json({ travellers: trip.travellers })
})

// DELETE /api/trips/:id/members/:userId  -> the owner removes someone, or you leave
// Their traveller name stays on the trip (as a guest) so past expenses still add up.
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  const trip = await findTripFor(req.userId, req.params.id)
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  const leaving = String(req.params.userId) === String(req.userId)
  if (!leaving && roleOf(trip, req.userId) !== 'owner') return res.status(403).json({ message: 'Only the organiser can remove people.' })
  if (String(req.params.userId) === String(trip.owner)) return res.status(400).json({ message: 'The organiser cannot leave their own trip.' })
  trip.members = trip.members.filter((m) => String(m.user) !== String(req.params.userId))
  await trip.save()
  res.json({ ok: true })
})

// DELETE /api/trips/:id  (its photos too)
router.delete('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Trip not found.' })
  const result = await Trip.deleteOne({ _id: req.params.id, owner: req.userId })
  if (!result.deletedCount) return res.status(404).json({ message: 'Trip not found.' })
  await Photo.deleteMany({ trip: req.params.id })
  res.json({ ok: true })
})

export default router