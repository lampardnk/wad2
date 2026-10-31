// Travel Twin on the server.
//   GET  /api/avatar/me              -> my look, saved outfits, trip outfits, picture version, what I've seen unlocked
//   GET  /api/avatar/progress        -> my XP, tier, souvenirs and how I earned them (worked out here, so it can't be faked)
//   PUT  /api/avatar                 { look, snapshot }  -> save my look (locked items are refused)
//   PUT  /api/avatar/seen            -> "I've seen everything that's unlocked" (stops the celebration / New tags)
//   PUT  /api/avatar/outfits         { outfits: [{ name, look, snapshot }] }  (up to 3)
//   PUT  /api/avatar/trip/:tripId    { look, snapshot }  -> what my twin wears on that trip   (DELETE removes it)
//   GET  /api/avatar/:userId/picture[?trip=id]  -> the face picture (public: <img> tags can't send the login token)
import express from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Trip from '../models/trip.js'
import Photo from '../models/Photo.js'
import { requireAuth } from './auth.js'
import {
  XP, TROPICAL, COLD, CATALOG, cleanLook, lockedIn, unlockedIds, tierOf, nextTier
} from '../../shared/avatarCatalog.js'

const router = express.Router()
const PICTURE = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/
const MAX_PICTURE = 60000 // characters (~45 KB)

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
function dayOf(date) {
  const d = new Date(date)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
// "Kyoto, Japan" -> "japan"
function countryOf(place) {
  const parts = String(place || '').split(',')
  return parts[parts.length - 1].trim().toLowerCase()
}
function cleanPicture(p) {
  return typeof p === 'string' && PICTURE.test(p) && p.length <= MAX_PICTURE ? p : ''
}

// ---------- XP: everything comes from the trips themselves ----------
export async function progressFor(userId) {
  const trips = await Trip.find({ $or: [{ owner: userId }, { 'members.user': userId }] })
    .select('name destination destinations startDate endDate createdAt stops packing expenses')
  const end = today()
  const finished = []
  for (const t of trips) {
    // Counts once it's over, had something planned, and was made before it ended (no back-dated trips)
    if (t.endDate && t.endDate < end && (t.stops || []).length > 0 && dayOf(t.createdAt) <= t.endDate) finished.push(t)
  }
  // Photos per trip, in one query
  const photoCount = {}
  if (finished.length) {
    const rows = await Photo.aggregate([
      { $match: { trip: { $in: finished.map((t) => t._id) } } },
      { $group: { _id: '$trip', n: { $sum: 1 } } }
    ])
    for (const r of rows) photoCount[String(r._id)] = r.n
  }

  let xp = 0
  const log = [] // [{ label, xp }] newest trips first
  const countries = []
  const souvenirs = { country: false, tropics: false, cold: false }
  finished.sort((a, b) => (a.endDate < b.endDate ? -1 : 1)) // oldest first, so "new country" goes to the first trip there
  for (const t of finished) {
    const lines = [{ label: 'Finished ' + t.name, xp: XP.trip }]
    const places = t.destinations && t.destinations.length ? t.destinations : [t.destination]
    for (const p of places) {
      const c = countryOf(p)
      if (!c || countries.includes(c)) continue
      countries.push(c)
      lines.push({ label: 'New country: ' + c.replace(/\b\w/g, (m) => m.toUpperCase()), xp: XP.country })
      souvenirs.country = true
      if (TROPICAL.includes(c)) souvenirs.tropics = true
      if (COLD.includes(c)) souvenirs.cold = true
    }
    if ((t.stops || []).length >= 5) lines.push({ label: 'Planned 5+ stops', xp: XP.planner })
    const ticked = t.packing && t.packing.checked ? Object.keys(t.packing.checked).length : 0
    if (ticked >= 5) lines.push({ label: 'Packed 5+ items', xp: XP.packer })
    const spent = t.expenses && t.expenses.items ? t.expenses.items.length : 0
    if (spent >= 3) lines.push({ label: 'Logged 3+ expenses', xp: XP.banker })
    if ((photoCount[String(t._id)] || 0) >= 3) lines.push({ label: 'Shared 3+ photos', xp: XP.photographer })
    for (const l of lines) xp += l.xp
    log.unshift({ trip: t.name, endDate: t.endDate, lines })
  }
  const tier = tierOf(xp)
  const next = nextTier(xp)
  return { xp, tier: tier.tier, tierName: tier.name, next: next ? { tier: next.tier, name: next.name, min: next.min } : null, trips: finished.length, countries, souvenirs, log }
}

function avatarOf(user) {
  const a = user.avatar && typeof user.avatar === 'object' ? user.avatar : {}
  return {
    look: a.look || null,
    picture: a.picture || a.snapshot || '', // (older saves called it snapshot)
    seen: Array.isArray(a.seen) ? a.seen : null,
    outfits: Array.isArray(a.outfits) ? a.outfits : [],
    tripLooks: a.tripLooks && typeof a.tripLooks === 'object' ? a.tripLooks : {}
  }
}
async function saveAvatar(user, a) {
  user.avatar = a
  user.avatarVersion = (user.avatarVersion || 0) + 1 // new picture link, so browsers fetch the new one
  user.markModified('avatar')
  await user.save()
}

// ---------- routes ----------
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const a = avatarOf(user)
  const tripLooks = {}
  for (const id in a.tripLooks) tripLooks[id] = { look: cleanLook(a.tripLooks[id].look) }
  res.json({
    look: a.look ? cleanLook(a.look) : null,
    version: a.picture ? user.avatarVersion || 0 : 0,
    seen: a.seen,
    outfits: a.outfits.map((o) => ({ name: o.name, look: cleanLook(o.look), picture: o.picture || '' })),
    tripLooks
  })
})

router.get('/progress', requireAuth, async (req, res) => {
  res.json(await progressFor(req.userId))
})

router.put('/', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const look = cleanLook(req.body.look)
  const progress = await progressFor(req.userId)
  const locked = lockedIn(look, progress)
  if (locked.length) return res.status(403).json({ message: 'Not unlocked yet: ' + locked.join(', ') + '.' })
  const a = avatarOf(user)
  a.look = look
  const pic = cleanPicture(req.body.snapshot)
  if (pic) a.picture = pic
  delete a.snapshot
  if (!a.seen) a.seen = unlockedIds(progress) // first save: nothing to celebrate yet
  await saveAvatar(user, a)
  res.json({ version: user.avatarVersion })
})

router.put('/seen', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const a = avatarOf(user)
  a.seen = unlockedIds(await progressFor(req.userId))
  user.avatar = a
  user.markModified('avatar')
  await user.save()
  res.json({ seen: a.seen })
})

router.put('/outfits', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const list = Array.isArray(req.body.outfits) ? req.body.outfits.slice(0, 3) : []
  const outfits = []
  for (const o of list) {
    if (!o || typeof o !== 'object') continue
    outfits.push({ name: String(o.name || 'Outfit').trim().slice(0, 24) || 'Outfit', look: cleanLook(o.look), picture: cleanPicture(o.snapshot || o.picture) })
  }
  const a = avatarOf(user)
  a.outfits = outfits
  user.avatar = a
  user.markModified('avatar')
  await user.save()
  res.json({ outfits: outfits.map((o) => ({ name: o.name, look: o.look, picture: o.picture })) })
})

// What my twin wears on one trip (the Crew tab shows it)
router.put('/trip/:tripId', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.tripId)) return res.status(404).json({ message: 'Trip not found.' })
  const trip = await Trip.findOne({ _id: req.params.tripId, $or: [{ owner: req.userId }, { 'members.user': req.userId }] }).select('_id')
  if (!trip) return res.status(404).json({ message: 'Trip not found.' })
  const user = await User.findById(req.userId)
  const look = cleanLook(req.body.look)
  const locked = lockedIn(look, await progressFor(req.userId))
  if (locked.length) return res.status(403).json({ message: 'Not unlocked yet: ' + locked.join(', ') + '.' })
  const a = avatarOf(user)
  const ids = Object.keys(a.tripLooks)
  if (!a.tripLooks[req.params.tripId] && ids.length >= 20) delete a.tripLooks[ids[0]] // keep the 20 newest
  a.tripLooks[req.params.tripId] = { look, picture: cleanPicture(req.body.snapshot) }
  await saveAvatar(user, a)
  res.json({ version: user.avatarVersion })
})
router.delete('/trip/:tripId', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const a = avatarOf(user)
  delete a.tripLooks[req.params.tripId]
  await saveAvatar(user, a)
  res.json({ version: user.avatarVersion })
})

// The picture itself. ?trip=<id> gives that trip's outfit if they made one.
router.get('/:userId/picture', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(404).end()
  const user = await User.findById(req.params.userId).select('avatar')
  if (!user) return res.status(404).end()
  const a = avatarOf(user)
  let pic = a.picture
  const t = String(req.query.trip || '')
  if (t && a.tripLooks[t] && a.tripLooks[t].picture) pic = a.tripLooks[t].picture
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(pic || '')
  if (!m) return res.status(404).end()
  res.set('Cache-Control', 'public, max-age=86400') // links change (?v=) whenever the picture does
  res.type(m[1]).send(Buffer.from(m[2], 'base64'))
})

export default router

// (for tests)
export { CATALOG }
