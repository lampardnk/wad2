import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

// Routes
import authRoutes from './routes/auth.js'
import crowdRoutes from './routes/crowd.js'
import preferenceRoutes from './routes/preferences.js'
import tripRoutes from './routes/trips.js'
import weatherRoutes from './routes/weather.js'
import distanceRoutes from './routes/distance.js'
import flightRoutes from './routes/flights.js'
import placeRoutes from './routes/places.js'
import rateRoutes from './routes/rates.js'
import photoRoutes from './routes/photos.js'
import expenseRoutes from './routes/expenses.js'
import joinRoutes from './routes/join.js'
import inviteRoutes from './routes/invites.js'
import friendRoutes from './routes/friends.js'
import safetyRoutes from './routes/safety.js'
import groupRoutes from './routes/groups.js'
import mapRoutes from './routes/maps.js'
import eatRoutes from './routes/eat.js'
import discoverRoutes from './routes/discover.js'
import { imageRoute, flagRoute } from './images.js'
import travelRoutes from './routes/travel.js'
import { rateLimit } from './rateLimit.js'

const app = express()
app.use(cors())
app.use(express.json())

// ---------- Database ----------
// Connect once and reuse it. On Vercel each request may land on a fresh copy of the server,
// so every request waits for the (cached) connection instead of connecting at start-up.
let connecting = null
export function connectDb() {
  if (!connecting) {
    connecting = mongoose.connect(process.env.MONGODB_URI).catch((err) => {
      connecting = null // try again on the next request
      throw err
    })
  }
  return connecting
}
app.use('/api', async (req, res, next) => {
  try {
    await connectDb()
    next()
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message)
    res.status(503).json({ message: 'The database is not reachable right now. Please try again in a minute.' })
  }
})

// Request limits per IP address, per minute (see rateLimit.js)
app.use('/api', rateLimit({ max: 600 })) // everything together: far above normal use
const loginLimit = rateLimit({ max: 10, message: 'Too many sign-in attempts. Please wait a minute and try again.' })
app.post('/api/auth/login', loginLimit)
app.post('/api/auth/register', loginLimit)
app.post('/api/auth/forgot', loginLimit)
app.post('/api/auth/reset', loginLimit)
const searchLimit = rateLimit({ max: 60, message: 'Searching too fast. Please wait a moment.' })
app.use('/api/invites/users', searchLimit)
app.use('/api/friends/search', searchLimit)
// Routes that call outside services (weather, maps, crowds...) which have their own quotas
const outsideLimit = rateLimit({ max: 120, message: 'Too many lookups. Please wait a moment and try again.' })
for (const path of ['/api/crowd', '/api/weather', '/api/distance-matrix', '/api/travel', '/api/flights', '/api/places', '/api/rates', '/api/safety', '/api/maps', '/api/eat', '/api/discover']) {
  app.use(path, outsideLimit)
}

app.use('/api/auth', authRoutes)
app.use('/api/crowd', crowdRoutes)
app.use('/api/preferences', preferenceRoutes)
app.use('/api/trips/:tripId/photos', photoRoutes) // before trips, so /photos is not read as a trip id
app.use('/api/trips/:tripId/expenses', expenseRoutes)
app.use('/api/join', joinRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/distance-matrix', distanceRoutes)
app.use('/api/flights', flightRoutes)
app.use('/api/places', placeRoutes)
app.use('/api/travel', travelRoutes) // travel times between stops (itinerary, Other journeys)
app.use('/api/rates', rateRoutes)
app.use('/api/safety', safetyRoutes)
app.use('/api/maps', mapRoutes)
app.use('/api/eat', eatRoutes)
app.use('/api/discover', discoverRoutes)
app.get('/api/flag/:code', flagRoute) // country flags from our disk (Discover's country banners)
app.get('/api/img', imageRoute) // Wikimedia photos from our disk cache (no lookup limit: a page shows ~200)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Catch any unexpected error so the server doesn't crash
// (Express 5 sends errors from async routes here automatically)
app.use((err, req, res, next) => {
  // Two devices saved the same trip at the same moment: the second save is refused (see models/trip.js)
  // instead of quietly overwriting the first. The page reloads the trip and the person tries again.
  if (err.name === 'VersionError') {
    return res.status(409).json({ conflict: true, message: 'Someone else changed this trip at the same moment, so your change was not saved. The latest version is loaded: please try again.' })
  }
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on the server.' })
})

export default app

