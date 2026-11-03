import mongoose from 'mongoose'

// One saved answer from an outside service (see server/sharedCache.js)
const cacheEntrySchema = new mongoose.Schema({
  name: { type: String, required: true },  // which cache, e.g. 'travel-legs'
  key: { type: String, required: true },   // what was asked, e.g. '35.011,135.768|34.987,135.759'
  value: mongoose.Schema.Types.Mixed,      // the answer
  at: { type: Date, default: Date.now },   // when it was looked up
  expiresAt: Date                          // MongoDB deletes the entry after this (old answers don't pile up)
})
cacheEntrySchema.index({ name: 1, key: 1 }, { unique: true })
cacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('CacheEntry', cacheEntrySchema)
