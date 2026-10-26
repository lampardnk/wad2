import express from 'express'
import User from '../models/User.js'
import { requireAuth } from './auth.js'

const router = express.Router()

function toClient(p) {
  return {
    dayStart: p.dayStart,
    dayEnd: p.dayEnd,
    crowdSensitivity: p.crowdSensitivity,
    travelBuffer: p.travelBuffer,
    travelModes: p.travelModes && p.travelModes.length ? p.travelModes : ['walk', 'transit', 'taxi'],
    maxWalk: p.maxWalk || 20,
    travelPriority: p.travelPriority || 'balanced'
  }
}
const TRAVEL_MODES = ['walk', 'transit', 'taxi', 'bike']

// GET /api/preferences  -> the logged-in user's trip preferences
router.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  res.json(toClient(user.preferences))
})

// PUT /api/preferences  { dayStart, dayEnd, crowdSensitivity, travelBuffer, travelModes?, maxWalk?, travelPriority? }
// (the Transport ones are optional: left out = keep what's saved)
router.put('/', requireAuth, async (req, res) => {
  const dayStart = Number(req.body.dayStart)
  const dayEnd = Number(req.body.dayEnd)
  const crowdSensitivity = req.body.crowdSensitivity
  const travelBuffer = Number(req.body.travelBuffer)

  // Check everything before saving
  if (!Number.isInteger(dayStart) || dayStart < 0 || dayStart > 23) {
    return res.status(400).json({ message: 'Day start must be an hour from 0 to 23.' })
  }
  if (!Number.isInteger(dayEnd) || dayEnd < 1 || dayEnd > 24) {
    return res.status(400).json({ message: 'Day end must be an hour from 1 to 24.' })
  }
  if (dayEnd - dayStart < 4) {
    return res.status(400).json({ message: 'Your day needs to be at least 4 hours long.' })
  }
  if (!['low', 'medium', 'high'].includes(crowdSensitivity)) {
    return res.status(400).json({ message: 'Crowd sensitivity must be low, medium or high.' })
  }
  if (![0, 0.25, 0.5, 1].includes(travelBuffer)) {
    return res.status(400).json({ message: 'Travel buffer must be 0, 15, 30 or 60 minutes.' })
  }

  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const before = toClient(user.preferences || {})
  let travelModes = before.travelModes
  if (req.body.travelModes !== undefined) {
    if (!Array.isArray(req.body.travelModes)) return res.status(400).json({ message: 'Pick at least one way to get around.' })
    travelModes = []
    for (const m of req.body.travelModes) if (TRAVEL_MODES.includes(m) && !travelModes.includes(m)) travelModes.push(m)
    if (!travelModes.length) return res.status(400).json({ message: 'Pick at least one way to get around.' })
  }
  let maxWalk = before.maxWalk
  if (req.body.maxWalk !== undefined) {
    maxWalk = Number(req.body.maxWalk)
    if (![10, 15, 20, 30, 45].includes(maxWalk)) return res.status(400).json({ message: 'Longest walk must be 10, 15, 20, 30 or 45 minutes.' })
  }
  let travelPriority = before.travelPriority
  if (req.body.travelPriority !== undefined) {
    travelPriority = req.body.travelPriority
    if (!['balanced', 'fastest', 'cheapest'].includes(travelPriority)) return res.status(400).json({ message: 'Choose balanced, fastest or cheapest.' })
  }
  user.preferences = { dayStart, dayEnd, crowdSensitivity, travelBuffer, travelModes, maxWalk, travelPriority }
  await user.save()
  res.json(toClient(user.preferences))
})

export default router
