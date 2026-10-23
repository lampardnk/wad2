import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import Trip from '../models/trip.js'
import Group from '../models/Group.js'
import Photo from '../models/Photo.js'
import { mailReady, sendEmail } from '../mailer.js'

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

// POST /api/auth/login  { username, password }  (username can also be the account's email)
router.post('/login', async (req, res) => {
  const { password } = req.body
  const username = (req.body.username || '').trim().toLowerCase()

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' })
  }

  const user = username.includes('@') ? await User.findOne({ email: username }) : await User.findOne({ username })
  // Same message for "no such user" and "wrong password" so attackers can't guess usernames
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid username/email or password.' })
  }

  res.json({
    token: makeToken(user),
    user: { id: user._id, name: user.name, username: user.username, email: user.email }
  })
})

// ---------- Forgot password ----------
// 1. POST /api/auth/forgot { email }  -> emails a 6-digit code (valid 15 min)
// 2. POST /api/auth/reset  { email, code, password } -> sets the new password
// The answer to step 1 is the same whether or not the email has an account, so nobody can use it to check emails.
const RESET_MINUTES = 15
const SAME_ANSWER = { message: 'If an account uses that email, we\'ve sent it a 6-digit code. It works for ' + RESET_MINUTES + ' minutes.' }

router.post('/forgot', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Please enter the email you signed up with.' })
  }
  if (!mailReady()) {
    return res.status(503).json({ message: 'Password reset by email isn\'t set up on this server yet. Ask the app owner to add the email settings.' })
  }

  const user = await User.findOne({ email })
  if (!user) return res.json(SAME_ANSWER)

  // One email a minute per account, so the button can't be used to spam someone
  if (user.reset && user.reset.sentAt && Date.now() - user.reset.sentAt.getTime() < 60 * 1000) {
    return res.json(SAME_ANSWER)
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0') // "042917"
  try {
    await sendEmail({
      to: user.email,
      subject: 'Your Chui-se Your Trip reset code: ' + code,
      text: 'Hi ' + user.name + ',\n\nYour code to reset your password is ' + code + '. It works for ' + RESET_MINUTES +
        ' minutes.\n\nIf you didn\'t ask for this, you can ignore this email: your password stays the same.',
      html: '<div style="font-family:Arial,sans-serif;color:#001d2c;max-width:440px">' +
        '<p>Hi ' + escapeHtml(user.name) + ',</p><p>Your code to reset your password is:</p>' +
        '<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;color:#003d5b">' + code + '</p>' +
        '<p>It works for ' + RESET_MINUTES + ' minutes.</p>' +
        '<p style="color:#5b6b75;font-size:13px">If you didn\'t ask for this, you can ignore this email: your password stays the same.</p></div>'
    })
  } catch (err) {
    console.error('Could not send the reset email:', err.message)
    return res.status(502).json({ message: 'We couldn\'t send the email just now. Please try again in a minute.' })
  }

  user.reset = {
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
    sentAt: new Date(),
    attempts: 0
  }
  await user.save()
  res.json(SAME_ANSWER)
})

router.post('/reset', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase()
  const code = String(req.body.code || '').replace(/\D/g, '')
  const password = req.body.password || ''

  if (code.length !== 6) return res.status(400).json({ message: 'The code is the 6 digits in the email.' })
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' })

  const user = await User.findOne({ email })
  const r = user && user.reset
  if (!r || !r.codeHash || !r.expiresAt || r.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'That code has expired. Tap "Send a new code" to get another.' })
  }
  if (r.attempts >= 5) {
    return res.status(429).json({ message: 'Too many wrong codes. Tap "Send a new code" to get another.' })
  }
  if (!(await bcrypt.compare(code, r.codeHash))) {
    user.reset.attempts = r.attempts + 1
    await user.save()
    const left = 5 - user.reset.attempts
    return res.status(400).json({ message: 'That code isn\'t right. ' + (left > 0 ? left + ' tries left.' : 'Tap "Send a new code" to get another.') })
  }

  user.passwordHash = await bcrypt.hash(password, 10)
  user.reset = undefined // the code only works once
  await user.save()
  res.json({ message: 'Password updated. You can log in with it now.', username: user.username })
})

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// What /me sends back
const CURRENCY_CODES = ['SGD', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'HKD', 'THB', 'MYR', 'IDR', 'PHP', 'INR', 'AUD', 'NZD', 'CAD', 'CHF', 'TRY']
function meJson(user) {
  const s = user.settings || {}
  return {
    id: user._id, name: user.name, username: user.username, email: user.email,
    diet: user.diet || [], phone: user.phone || '',
    shortlist: user.discoverShortlist || [],
    settings: {
      currency: s.currency || 'SGD',
      units: s.units === 'imperial' ? 'imperial' : 'metric',
      hazardAlerts: s.hazardAlerts !== false,
      expenseAlerts: s.expenseAlerts !== false
    }
  }
}

// GET /api/auth/me  (needs token) — returns the logged-in user
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  res.json(meJson(user))
})

// PUT /api/auth/me  — Settings. Send only what changed:
// { email?, diet?, phone?, settings?: { currency?, units?, hazardAlerts?, expenseAlerts? } }
router.put('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  const b = req.body || {}

  if (typeof b.email === 'string') {
    const email = b.email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ message: 'Please enter a valid email.' })
    if (email !== user.email && await User.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    user.email = email
  }

  if (Array.isArray(b.diet)) {
    const diet = []
    for (const d of b.diet) {
      const tag = typeof d === 'string' ? d.trim().slice(0, 30) : ''
      if (tag && !diet.includes(tag) && diet.length < 8) diet.push(tag)
    }
    user.diet = diet
    user.contactSaved = true
  }

  if (typeof b.phone === 'string') {
    user.phone = b.phone.trim().slice(0, 20).replace(/[^\d+ ]/g, '')
    user.contactSaved = true
  }

  // Discover shortlist: city ids like 'kyoto-japan'
  if (Array.isArray(b.shortlist)) {
    const list = []
    for (const id of b.shortlist) {
      if (typeof id === 'string' && /^[a-z0-9-]{2,60}$/.test(id) && !list.includes(id) && list.length < 50) list.push(id)
    }
    user.discoverShortlist = list
  }

  if (b.settings && typeof b.settings === 'object') {
    const next = { ...meJson(user).settings }
    const s = b.settings
    if (CURRENCY_CODES.includes(s.currency)) next.currency = s.currency
    if (s.units === 'metric' || s.units === 'imperial') next.units = s.units
    if (typeof s.hazardAlerts === 'boolean') next.hazardAlerts = s.hazardAlerts
    if (typeof s.expenseAlerts === 'boolean') next.expenseAlerts = s.expenseAlerts
    user.settings = next
  }

  await user.save()
  res.json(meJson(user))
})


// PUT /api/auth/password  { currentPassword, newPassword }  -> change password while logged in
router.put('/password', requireAuth, async (req, res) => {
  const current = req.body.currentPassword || ''
  const next = req.body.newPassword || ''
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return res.status(400).json({ message: 'Your current password isn\'t right.' })
  }
  if (next.length < 8) return res.status(400).json({ message: 'The new password must be at least 8 characters.' })
  if (next === current) return res.status(400).json({ message: 'The new password is the same as the old one.' })
  user.passwordHash = await bcrypt.hash(next, 10)
  user.reset = undefined // an old emailed code can't be used any more
  await user.save()
  res.json({ message: 'Password changed.' })
})

// DELETE /api/auth/me  { password }  -> delete my account for good
//  - Trips I organise: the next person who joined becomes the organiser. Trips nobody else joined are deleted.
//  - Trips I joined: I'm taken off the members, but my name stays as a traveller (so expenses still add up).
//  - Family groups: groups I own are deleted, I leave the others. Friends and requests are removed.
router.delete('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  if (!(await bcrypt.compare(req.body.password || '', user.passwordHash))) {
    return res.status(400).json({ message: 'That password isn\'t right.' })
  }
  const me = String(user._id)

  const trips = await Trip.find({ $or: [{ owner: user._id }, { 'members.user': user._id }, { 'pendingInvites.user': user._id }] })
  let deletedTrips = 0
  for (const trip of trips) {
    const others = []
    for (const m of trip.members || []) {
      if (String(m.user) !== me) others.push(m)
    }
    if (String(trip.owner) === me && !others.length) {
      await Photo.deleteMany({ trip: trip._id })
      await Trip.deleteOne({ _id: trip._id })
      deletedTrips++
      continue
    }
    if (String(trip.owner) === me) {
      others.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)) // longest on the trip first
      others[0].role = 'owner'
      trip.owner = others[0].user
    }
    trip.members = others
    const invites = []
    for (const p of trip.pendingInvites || []) {
      if (String(p.user) !== me) invites.push(p)
    }
    trip.pendingInvites = invites
    await trip.save()
  }

  const owned = await Group.find({ owner: user._id }).select('_id')
  const ownedIds = owned.map((g) => g._id)
  await Trip.updateMany({ group: { $in: ownedIds } }, { group: null })
  await Group.deleteMany({ _id: { $in: ownedIds } })
  await Group.updateMany({ members: user._id }, { $pull: { members: user._id } })

  await User.updateMany({}, { $pull: { friends: user._id, friendRequests: { from: user._id } } })
  await User.deleteOne({ _id: user._id })
  res.json({ ok: true, deletedTrips })
})

export default router
