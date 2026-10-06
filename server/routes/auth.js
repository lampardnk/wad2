import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

// Make a login token that lasts 7 days
function makeToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Middleware: only lets the request through if it has a valid token.
// Use it on any route that needs a logged-in user, e.g. router.get('/trips', requireAuth, ...)
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''   // "Bearer <token>"
  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.id
    next()
  } catch (err) {
    res.status(401).json({ message: 'Please log in again.' })
  }
}

// Usernames: 3-20 characters, letters, numbers, dots and underscores only
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/

// Simple email check: something@something.something
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/auth/register  { name, username, email, password }
router.post('/register', async (req, res) => {
  const { name, password } = req.body
  const username = (req.body.username || '').trim().toLowerCase()
  const email = (req.body.email || '').trim().toLowerCase()

  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: 'Name, username, email and password are required.' })
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email.' })
  }
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ message: 'Username must be 3-20 characters: letters, numbers, . or _ only.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' })
  }

  if (await User.findOne({ username })) {
    return res.status(409).json({ message: 'That username is already taken.' })
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, username, email, passwordHash })

  res.status(201).json({
    token: makeToken(user),
    user: { id: user._id, name: user.name, username: user.username, email: user.email }
  })
})

// POST /api/auth/login  { username, password }
router.post('/login', async (req, res) => {
  const { password } = req.body
  const username = (req.body.username || '').trim().toLowerCase()

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' })
  }

  const user = await User.findOne({ username })
  // Same message for "no such user" and "wrong password" so attackers can't guess usernames
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username or password.' })
  }

  res.json({
    token: makeToken(user),
    user: { id: user._id, name: user.name, username: user.username, email: user.email }
  })
})

// GET /api/auth/me  (needs token) — returns the logged-in user
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  res.json({ id: user._id, name: user.name, username: user.username, email: user.email })
})

export default router
