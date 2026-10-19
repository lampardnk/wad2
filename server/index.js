import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

// Models
import User from './models/User.js'

// Existing Routes
import authRoutes from './routes/auth.js'
import crowdRoutes from './routes/crowd.js'
import preferenceRoutes from './routes/preferences.js'
import tripRoutes from './routes/trips.js'
import weatherRoutes from './routes/weather.js'
import distanceRoutes from './routes/distance.js'
import flightRoutes from './routes/flights.js'
import directionsRouter from './routes/directions.js'

// Additional Routes (Add these files if they exist in server/routes/)
import photoRoutes from './routes/photos.js'
import expenseRoutes from './routes/expenses.js'
import joinRoutes from './routes/join.js'
import inviteRoutes from './routes/invites.js'
import friendRoutes from './routes/friends.js'
import groupRoutes from './routes/groups.js'

const app = express()
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/crowd', crowdRoutes)
app.use('/api/preferences', preferenceRoutes)

// Comment out any route lines below if you haven't created those route files in server/routes/ yet
app.use('/api/trips/:tripId/photos', photoRoutes) 
app.use('/api/trips/:tripId/expenses', expenseRoutes)
app.use('/api/join', joinRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/distance-matrix', distanceRoutes)
app.use('/api/directions', directionsRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Catch any unexpected error so the server doesn't crash
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on the server.' })
})

// Connect to MongoDB, then start the server
const PORT = process.env.PORT || 3000

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB')
    await User.syncIndexes()
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })