import express from 'express'
import User from '../models/User.js'
import { requireAuth } from './auth.js'

const router = express.Router()

function toClient(p) {
  return {
    dayStart: p.dayStart,
    dayEnd: p.dayEnd,
    crowdSensitivity: p.crowdSensitivity,
    travelBuffer: p.travelBuffer
  }
}

// GET /api/preferences  -> the logged-in user's trip preferences
router.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  res.json(toClient(user.preferences))
})

// PUT /api/preferences  { dayStart, dayEnd, crowdSensitivity, travelBuffer }
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
  if (![0, 0.5, 1].includes(travelBuffer)) {
    return res.status(400).json({ message: 'Travel buffer must be 0, 30 or 60 minutes.' })
  }

  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  user.preferences = { dayStart, dayEnd, crowdSensitivity, travelBuffer }
  await user.save()
  res.json(toClient(user.preferences))
})

export default router
