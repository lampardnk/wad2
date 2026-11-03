// Answers from outside services (places, travel times, weather, rates...), kept in the database.
// On Vercel every server instance starts empty and its files are wiped, so a cache kept only in memory
// or in /tmp is asked for again and again. Kept in MongoDB, an answer looked up once is there for every
// instance and every visitor. A copy is also kept in memory, so the same instance doesn't ask the
// database twice.
//
//   const legs = sharedCache('travel-legs', { keepDays: 90 })
//   const saved = await legs.get(key)          // { value, at } or null
//   if (saved && Date.now() - saved.at < DAY) return res.json(saved.value)
//   await legs.set(key, answer)
//
// get() returns old answers too (with when they were looked up): each route decides what is fresh
// enough, and can still use an old answer when the outside service is down.
import mongoose from 'mongoose'
import CacheEntry from './models/CacheEntry.js'

const DAY = 24 * 60 * 60 * 1000
const MEMORY_LIMIT = 2000 // answers kept in memory per cache

const dbReady = () => mongoose.connection.readyState === 1

export function sharedCache(name, { keepDays = 30 } = {}) {
  const memory = new Map() // key -> { value, at }

  function remember(key, entry) {
    if (!memory.has(key) && memory.size >= MEMORY_LIMIT) memory.delete(memory.keys().next().value) // drop the oldest
    memory.set(key, entry)
  }

  return {
    async get(key) {
      if (memory.has(key)) return memory.get(key)
      if (!dbReady()) return null
      try {
        const saved = await CacheEntry.findOne({ name, key }).lean()
        if (!saved) return null
        const entry = { value: saved.value, at: new Date(saved.at).getTime() }
        remember(key, entry)
        return entry
      } catch (err) {
        console.warn('Could not read the ' + name + ' cache:', err.message)
        return null
      }
    },

    async set(key, value) {
      const at = Date.now()
      remember(key, { value, at })
      if (!dbReady()) return
      try {
        await CacheEntry.updateOne(
          { name, key },
          { $set: { value, at: new Date(at), expiresAt: new Date(at + keepDays * DAY) } },
          { upsert: true }
        )
      } catch (err) {
        console.warn('Could not save the ' + name + ' cache:', err.message)
      }
    }
  }
}
