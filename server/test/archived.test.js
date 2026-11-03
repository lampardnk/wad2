// Trips that have ended are read only. Run: pnpm test (in server/)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { hasEnded } from '../archived.js'

let db, app, auth, endedId, liveId

before(async () => {
  db = await MongoMemoryServer.create()
  process.env.MONGODB_URI = db.getUri()
  process.env.JWT_SECRET = 'test-secret'
  app = (await import('../app.js')).default
  const user = await request(app).post('/api/auth/register')
    .send({ name: 'Ann Tan', username: 'anntan', email: 'ann@example.com', password: 'Travel#2026ok' })
  auth = { Authorization: 'Bearer ' + user.body.token }
  const ended = await request(app).post('/api/trips').set(auth)
    .send({ name: 'Old trip', destinations: ['Kyoto, Japan'], startDate: '2026-12-10', endDate: '2026-12-12' })
  endedId = String(ended.body.id)
  const live = await request(app).post('/api/trips').set(auth)
    .send({ name: 'Next trip', destinations: ['Kyoto, Japan'], startDate: '2099-01-10', endDate: '2099-01-12' })
  liveId = String(live.body.id)
  // Move the first trip into the past (the create form may not accept past dates)
  await mongoose.connection.collection('trips').updateOne({ _id: new mongoose.Types.ObjectId(endedId) }, { $set: { startDate: '2020-01-10', endDate: '2020-01-12' } })
})

after(async () => {
  await mongoose.disconnect()
  await db.stop()
})

test('a trip has ended once its last day is before yesterday (UTC)', () => {
  const now = new Date('2026-11-03T12:00:00Z')
  assert.equal(hasEnded({ startDate: '2026-10-30', endDate: '2026-11-01' }, now), true)
  assert.equal(hasEnded({ startDate: '2026-10-30', endDate: '2026-11-02' }, now), false, 'yesterday is still allowed for time zones behind UTC')
  assert.equal(hasEnded({ startDate: '', endDate: '' }, now), false, 'no dates = still planning')
})

test('an ended trip can be read but not changed', async () => {
  const read = await request(app).get('/api/trips/' + endedId).set(auth)
  assert.equal(read.status, 200)
  const writes = [
    request(app).put('/api/trips/' + endedId + '/itinerary').set(auth).send({ stops: [], wishlist: [], version: 0 }),
    request(app).put('/api/trips/' + endedId + '/packing').set(auth).send({ packing: {} }),
    request(app).post('/api/trips/' + endedId + '/expenses/items').set(auth).send({ title: 'Taxi', amount: 10 }),
    request(app).put('/api/trips/' + endedId).set(auth).send({ name: 'Renamed' })
  ]
  for (const res of await Promise.all(writes)) {
    assert.equal(res.status, 403)
    assert.equal(res.body.archived, true)
  }
})

test('a trip that has not ended can still be changed', async () => {
  const res = await request(app).put('/api/trips/' + liveId + '/itinerary').set(auth).send({ stops: [], wishlist: [], version: 0 })
  assert.equal(res.status, 200)
})

test('an ended trip says so on its invite link, and nobody new can join', async () => {
  await mongoose.connection.collection('trips').updateOne({ _id: new mongoose.Types.ObjectId(endedId) }, { $set: { inviteCode: 'OLDTRIP1' } })
  const other = await request(app).post('/api/auth/register')
    .send({ name: 'Bea Lim', username: 'bealim', email: 'bea@example.com', password: 'Travel#2026ok' })
  const bea = { Authorization: 'Bearer ' + other.body.token }
  const preview = await request(app).get('/api/join/OLDTRIP1').set(bea)
  assert.equal(preview.status, 200)
  assert.equal(preview.body.ended, true)
  const join = await request(app).post('/api/join/OLDTRIP1').set(bea).send({ as: '' })
  assert.equal(join.status, 403)
  assert.equal(join.body.archived, true)
})

test('an ended trip can still be deleted', async () => {
  const res = await request(app).delete('/api/trips/' + endedId).set(auth)
  assert.equal(res.status, 200)
})
