// Friends list: search people, send / accept / decline requests, unfriend, and who's online.
// A friendship is stored on both users (each has the other in "friends").
// A request is stored on the person who has to answer it (their "friendRequests").
import express from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Trip from '../models/trip.js'
import { requireAuth } from './auth.js'
import { accessQuery } from '../tripAccess.js'

const router = express.Router()
const ONLINE_FOR = 3 * 60 * 1000 // seen in the last 3 minutes = online
const MAX_FRIENDS = 300

function isOnline(u) {
  return !!u.lastActiveAt && Date.now() - new Date(u.lastActiveAt).getTime() < ONLINE_FOR
}
function person(u) {
  return { id: u._id, name: u.name, username: u.username, online: isOnline(u), lastActiveAt: u.lastActiveAt || null }
}
function sameId(a, b) {
  return String(a) === String(b)
}

// POST /api/friends/ping -> "I'm here" + the numbers for the profile menu badge
router.post('/ping', requireAuth, async (req, res) => {
  const me = await User.findByIdAndUpdate(req.userId, { $set: { lastActiveAt: new Date() } }, { new: true }).select('friends friendRequests')
  if (!me) return res.status(404).json({ message: 'User not found.' })
  const online = await User.countDocuments({ _id: { $in: me.friends }, lastActiveAt: { $gte: new Date(Date.now() - ONLINE_FOR) } })
  res.json({ requests: me.friendRequests.length, online })
})

// GET /api/friends -> { friends, incoming, outgoing }
router.get('/', requireAuth, async (req, res) => {
  const me = await User.findById(req.userId).select('friends friendRequests')
  if (!me) return res.status(404).json({ message: 'User not found.' })

  const friends = await User.find({ _id: { $in: me.friends } }).select('name username lastActiveAt')
  const incomingUsers = await User.find({ _id: { $in: me.friendRequests.map((r) => r.from) } }).select('name username lastActiveAt')
  const outgoingUsers = await User.find({ 'friendRequests.from': me._id }).select('name username lastActiveAt')

  // How many trips I share with each friend
  const trips = await Trip.find(await accessQuery(req.userId)).select('members.user')
  const shared = {}
  for (const t of trips) {
    for (const m of t.members || []) shared[String(m.user)] = (shared[String(m.user)] || 0) + 1
  }

  const list = []
  for (const f of friends) list.push({ ...person(f), sharedTrips: shared[String(f._id)] || 0 })
  // Online first, then A to Z
  list.sort((a, b) => (a.online === b.online ? a.name.localeCompare(b.name) : a.online ? -1 : 1))

  const incoming = []
  for (const r of me.friendRequests) {
    const u = incomingUsers.find((x) => sameId(x._id, r.from))
    if (u) incoming.push({ ...person(u), at: r.at })
  }
  const outgoing = []
  for (const u of outgoingUsers) outgoing.push(person(u))

  res.json({ friends: list, incoming, outgoing })
})

// GET /api/friends/search?q=mei -> up to 6 accounts whose username starts with "mei" (3+ letters, so nobody can browse everyone)
router.get('/search', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, '').toLowerCase()
  if (q.length < 3 || q.length > 20 || !/^[a-z0-9._]+$/.test(q)) return res.json([])
  const me = await User.findById(req.userId).select('friends friendRequests')
  const users = await User.find({ username: { $regex: '^' + q.replace(/[.]/g, '\\.') }, _id: { $ne: req.userId } })
    .select('name username friendRequests').limit(6)
  const out = []
  for (const u of users) {
    let status = 'none'
    if (me.friends.some((id) => sameId(id, u._id))) status = 'friend'
    else if (me.friendRequests.some((r) => sameId(r.from, u._id))) status = 'incoming' // they asked me
    else if (u.friendRequests.some((r) => sameId(r.from, req.userId))) status = 'outgoing' // I asked them
    out.push({ id: u._id, name: u.name, username: u.username, status })
  }
  res.json(out)
})

// Make two people friends (and clear any requests between them)
async function befriend(aId, bId) {
  await User.updateOne({ _id: aId }, { $addToSet: { friends: bId }, $pull: { friendRequests: { from: bId } } })
  await User.updateOne({ _id: bId }, { $addToSet: { friends: aId }, $pull: { friendRequests: { from: aId } } })
}

// POST /api/friends/requests { userId } -> send a request (if they already asked me, we're friends straight away)
router.post('/requests', requireAuth, async (req, res) => {
  const userId = String(req.body.userId || '')
  if (!mongoose.isValidObjectId(userId) || sameId(userId, req.userId)) return res.status(400).json({ message: 'Pick someone to add.' })
  const me = await User.findById(req.userId)
  const them = await User.findById(userId)
  if (!me || !them) return res.status(404).json({ message: 'That account does not exist.' })
  if (me.friends.some((id) => sameId(id, userId))) return res.status(400).json({ message: 'You are already friends with ' + them.name + '.' })
  if (me.friends.length >= MAX_FRIENDS) return res.status(400).json({ message: 'Your friends list is full.' })

  if (me.friendRequests.some((r) => sameId(r.from, userId))) {
    await befriend(me._id, them._id)
    return res.json({ status: 'friend', message: 'You and ' + them.name + ' are now friends.' })
  }
  if (them.friendRequests.some((r) => sameId(r.from, req.userId))) return res.json({ status: 'outgoing', message: 'Request already sent.' })
  if (them.friendRequests.length >= 100) return res.status(400).json({ message: them.name + ' has too many requests waiting.' })
  await User.updateOne({ _id: them._id }, { $push: { friendRequests: { from: me._id, at: new Date() } } })
  res.status(201).json({ status: 'outgoing', message: 'Request sent to ' + them.name + '.' })
})

// POST /api/friends/requests/:userId/accept
router.post('/requests/:userId/accept', requireAuth, async (req, res) => {
  const userId = req.params.userId
  if (!mongoose.isValidObjectId(userId)) return res.status(404).json({ message: 'Request not found.' })
  const me = await User.findById(req.userId)
  if (!me || !me.friendRequests.some((r) => sameId(r.from, userId))) return res.status(404).json({ message: 'That request is no longer there.' })
  await befriend(me._id, userId)
  res.json({ ok: true })
})

// DELETE /api/friends/requests/:userId -> decline their request, or cancel mine
router.delete('/requests/:userId', requireAuth, async (req, res) => {
  const userId = req.params.userId
  if (!mongoose.isValidObjectId(userId)) return res.status(404).json({ message: 'Request not found.' })
  await User.updateOne({ _id: req.userId }, { $pull: { friendRequests: { from: userId } } })
  await User.updateOne({ _id: userId }, { $pull: { friendRequests: { from: req.userId } } })
  res.json({ ok: true })
})

// DELETE /api/friends/:userId -> unfriend (both sides)
router.delete('/:userId', requireAuth, async (req, res) => {
  const userId = req.params.userId
  if (!mongoose.isValidObjectId(userId)) return res.status(404).json({ message: 'Friend not found.' })
  await User.updateOne({ _id: req.userId }, { $pull: { friends: userId } })
  await User.updateOne({ _id: userId }, { $pull: { friends: req.userId } })
  res.json({ ok: true })
})

export default router
