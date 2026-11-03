// Answers from outside services are kept in the database, so every server instance shares them.
// Run: pnpm test (in server/)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { sharedCache } from '../sharedCache.js'
import CacheEntry from '../models/CacheEntry.js'

let db

before(async () => {
  db = await MongoMemoryServer.create()
  await mongoose.connect(db.getUri())
  await CacheEntry.syncIndexes()
})

after(async () => {
  await mongoose.disconnect()
  await db.stop()
})

test('an answer saved by one server instance is found by another', async () => {
  const first = sharedCache('travel-legs-test', { keepDays: 90 })
  assert.equal(await first.get('a>b'), null)
  await first.set('a>b', { walk: { min: 12, km: 1 } })

  const second = sharedCache('travel-legs-test') // a new instance: nothing in its memory
  const found = await second.get('a>b')
  assert.deepEqual(found.value, { walk: { min: 12, km: 1 } })
  assert.ok(Date.now() - found.at < 5000, 'says when it was looked up')
})

test('saving again replaces the answer, and old answers are set to expire', async () => {
  const rates = sharedCache('rates-test', { keepDays: 14 })
  await rates.set('SGD', { v: 1 })
  await rates.set('SGD', { v: 2 })
  const rows = await CacheEntry.find({ name: 'rates-test', key: 'SGD' }).lean()
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].value, { v: 2 })
  const days = (rows[0].expiresAt - rows[0].at) / 86400000
  assert.equal(Math.round(days), 14)
})

test('different caches keep their own answers', async () => {
  await sharedCache('one-test').set('k', 'from one')
  await sharedCache('two-test').set('k', 'from two')
  assert.equal((await sharedCache('one-test').get('k')).value, 'from one')
  assert.equal((await sharedCache('two-test').get('k')).value, 'from two')
})
