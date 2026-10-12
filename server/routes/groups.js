import express from 'express'
import mongoose from 'mongoose'
import Group from '../models/Group.js'
import Trip from '../models/trip.js'
import { requireAuth } from './auth.js'

const router = express.Router()
const MAX_MEMBERS = 10
// No 0/O or 1/I, so invite codes are easy to read out loud
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
  }
  return code
}

// members must be populated (so we have their names)
function toClient(group, userId) {
  return {
    id: group._id,
    name: group.name,
    inviteCode: group.inviteCode,
    isOwner: String(group.owner) === String(userId),
    members: group.members.map((m) => ({ id: m._id, name: m.name }))
  }
}

function populated(id) {
  return Group.findById(id).populate('members', 'name')
}

// GET /api/groups -> the groups this user is in
router.get('/', requireAuth, async (req, res) => {
  const groups = await Group.find({ members: req.userId }).populate('members', 'name').sort({ createdAt: -1 })
  res.json(groups.map((g) => toClient(g, req.userId)))
})

// POST /api/groups  { name }
router.post('/', requireAuth, async (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return res.status(400).json({ message: 'Please enter a group name.' })
  if (name.length > 60) return res.status(400).json({ message: 'Group name must be 60 characters or fewer.' })

  let code = makeCode()
  while (await Group.findOne({ inviteCode: code })) code = makeCode()

  const group = await Group.create({ name, inviteCode: code, owner: req.userId, members: [req.userId] })
  res.status(201).json(toClient(await populated(group._id), req.userId))
})

// POST /api/groups/join  { code }
router.post('/join', requireAuth, async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase()
  if (!code) return res.status(400).json({ message: 'Please enter an invite code.' })

  const group = await Group.findOne({ inviteCode: code })
  if (!group) return res.status(404).json({ message: 'No group has that invite code.' })

  const alreadyIn = group.members.some((m) => String(m) === String(req.userId))
  if (!alreadyIn) {
    if (group.members.length >= MAX_MEMBERS) {
      return res.status(400).json({ message: 'That group is full (' + MAX_MEMBERS + ' members).' })
    }
    group.members.push(req.userId)
    await group.save()
  }
  res.json(toClient(await populated(group._id), req.userId))
})

// POST /api/groups/:id/leave  (the owner can't leave, they delete the group instead)
router.post('/:id/leave', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Group not found.' })
  const group = await Group.findOne({ _id: req.params.id, members: req.userId })
  if (!group) return res.status(404).json({ message: 'Group not found.' })
  if (String(group.owner) === String(req.userId)) {
    return res.status(400).json({ message: 'The owner cannot leave. Delete the group instead.' })
  }
  group.members.pull(req.userId)
  await group.save()
  res.json({ ok: true })
})

// DELETE /api/groups/:id  (owner only). Its trips become private to their owners again.
router.delete('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Group not found.' })
  const group = await Group.findOne({ _id: req.params.id, owner: req.userId })
  if (!group) return res.status(404).json({ message: 'Group not found.' })
  await Trip.updateMany({ group: group._id }, { group: null })
  await Group.deleteOne({ _id: group._id })
  res.json({ ok: true })
})

export default router