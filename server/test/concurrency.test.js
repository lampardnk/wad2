// Two devices editing the same trip at the same time. Run: pnpm test (in server/)
// Uses a throwaway in-memory MongoDB, so no real data is touched.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'

let db, app, Trip, token, tripId

before(async () => {
  db = await MongoMemoryServer.create()
  process.env.MONGODB_URI = db.getUri()
  process.env.JWT_SECRET = 'test-secret'
  app = (await import('../app.js')).default
  Trip = (await import('../models/trip.js')).default
  const user = await request(app).post('/api/auth/register')
    .send({ name: 'Ann Tan', username: 'anntan', email: 'ann@example.com', password: 'Travel#2026ok' })
  assert.equal(user.status, 201, JSON.stringify(user.body))
  token = user.body.token
  const trip = await request(app).post('/api/trips').set('Authorization', 'Bearer ' + token)
    .send({ name: 'Kyoto', destinations: ['Kyoto, Japan'], startDate: '2026-12-10', endDate: '2026-12-12' })
  assert.equal(trip.status, 201, JSON.stringify(trip.body))
  tripId = String(trip.body.id)
})

after(async () => {
  await mongoose.disconnect()
  await db.stop()
})

test('a save based on an old copy of the trip is refused, not written over the newer one', async () => {
  const phone = await Trip.findById(tripId)
  const laptop = await Trip.findById(tripId)
  phone.endDate = '2026-12-13'
  await phone.save()
  laptop.endDate = '2026-12-14'
  await assert.rejects(laptop.save(), { name: 'VersionError' })
  assert.equal((await Trip.findById(tripId)).endDate, '2026-12-13')
})

test('itinerary saved from an out-of-date page gets a 409 with a clear message and the latest trip', async () => {
  const auth = { Authorization: 'Bearer ' + token }
  const first = await request(app).put('/api/trips/' + tripId + '/itinerary').set(auth).send({ stops: [], wishlist: [], version: 0 })
  assert.equal(first.status, 200, JSON.stringify(first.body))
  // the other device still thinks the version is 0
  const second = await request(app).put('/api/trips/' + tripId + '/itinerary').set(auth).send({ stops: [], wishlist: [], version: 0 })
  assert.equal(second.status, 409)
  assert.match(second.body.message, /someone else/i)
  assert.ok(second.body.trip, 'sends the latest trip so the page can show it')
})

test('saves that happen at the same moment never lose an expense', async () => {
  const auth = { Authorization: 'Bearer ' + token }
  const add = (title) => request(app).post('/api/trips/' + tripId + '/expenses/items').set(auth)
    .send({ title, amount: 10, currency: 'SGD', paidBy: 'Ann Tan', date: '2026-12-10', splitType: 'equal', people: ['Ann Tan'] })
  const results = await Promise.all([add('Lunch'), add('Taxi'), add('Tickets')])
  for (const r of results) assert.equal(r.status, 201, JSON.stringify(r.body))
  const items = (await Trip.findById(tripId)).expenses.items
  assert.equal(items.length, 3)
})
