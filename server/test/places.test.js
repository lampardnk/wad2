// Places are kept as map points. Run: pnpm test (in server/)
// Geoapify is replaced by a fake fetch, so these run offline and without a key.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pointFromMapsLink, isGoogleMapsLink } from '../mapsLink.js'

let db, app, auth, tripId
const realFetch = globalThis.fetch

before(async () => {
  db = await MongoMemoryServer.create()
  process.env.MONGODB_URI = db.getUri()
  process.env.JWT_SECRET = 'test-secret'
  process.env.GEOAPIFY_KEY = 'test-key'
  process.env.CACHE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'places-test-'))
  // Fake Geoapify: knows only "Kinkaku-ji"; anything else matches nothing
  globalThis.fetch = async (url, opts) => {
    const u = new URL(String(url))
    if (u.hostname !== 'api.geoapify.com') return realFetch(url, opts)
    const text = (u.searchParams.get('text') || '').toLowerCase()
    const results = text.startsWith('kinkaku')
      ? [{ name: 'Kinkaku-ji', address_line2: 'Kita Ward, Kyoto, Japan', lat: 35.0394, lon: 135.7292, category: 'tourism.sights', city: 'Kyoto', country_code: 'jp' }]
      : []
    return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  app = (await import('../app.js')).default
  const user = await request(app).post('/api/auth/register')
    .send({ name: 'Ben Lee', username: 'benlee', email: 'ben@example.com', password: 'Travel#2026ok' })
  auth = { Authorization: 'Bearer ' + user.body.token }
  const trip = await request(app).post('/api/trips').set(auth)
    .send({ name: 'Kyoto', destinations: ['Kyoto, Japan'], startDate: '2026-12-10', endDate: '2026-12-12' })
  tripId = String(trip.body.id)
})

after(async () => {
  globalThis.fetch = realFetch
  await mongoose.disconnect()
  await db.stop()
})

test('typed text that matches no real place gives no suggestions', async () => {
  for (const q of ['aa', 'asdfgh']) {
    const res = await request(app).get('/api/place/suggest').set(auth).query({ q, near: '35.01,135.77' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, [], q + ' should match nothing')
  }
})

test('a real place comes back with its map point', async () => {
  const res = await request(app).get('/api/place/suggest').set(auth).query({ q: 'kinkakuji', near: '35.01,135.77' })
  assert.equal(res.body[0].name, 'Kinkaku-ji')
  assert.equal(res.body[0].lat, 35.0394)
  assert.equal(res.body[0].lon, 135.7292)
})

test('a wishlist place keeps its map point after saving', async () => {
  const wishlist = [{ id: 'w1', name: 'Kinkaku-ji', address: 'Kita Ward, Kyoto', lat: 35.0394, lon: 135.7292 }, { id: 'w2', name: 'Old place' }]
  const res = await request(app).put('/api/trips/' + tripId + '/itinerary').set(auth).send({ stops: [], wishlist, version: 0 })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  const trip = await request(app).get('/api/trips/' + tripId).set(auth)
  const saved = trip.body.wishlist
  assert.equal(saved[0].lat, 35.0394)
  assert.equal(saved[0].lon, 135.7292)
  assert.equal(saved[1].lat, null, 'a place without a point is kept, marked as not set')
})

test('Google Maps links: the point is read from the numbers, never guessed from the text', () => {
  const place = pointFromMapsLink('https://www.google.com/maps/place/Kinkaku-ji/@35.0393,135.7270,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d35.0394!4d135.7292')
  assert.deepEqual(place, { lat: 35.0394, lon: 135.7292, name: 'Kinkaku-ji' })
  assert.deepEqual(pointFromMapsLink('https://maps.google.com/?q=35.0116,135.7681'), { lat: 35.0116, lon: 135.7681, name: '' })
  assert.equal(pointFromMapsLink('https://www.google.com/maps/search/?api=1&query=Kinkakuji'), null)
  assert.equal(isGoogleMapsLink('https://evil.example.com/maps/place/x/@1,2'), false)
  assert.equal(isGoogleMapsLink('https://maps.app.goo.gl/abc123'), true)
})

test('a pasted link with no location is refused with a clear message', async () => {
  const res = await request(app).get('/api/place/from-link').set(auth).query({ url: 'https://www.google.com/maps/search/?api=1&query=Kinkakuji' })
  assert.equal(res.status, 422)
  assert.match(res.body.message, /no location/)
})
