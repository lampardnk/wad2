import mongoose from 'mongoose'

// One saved BestTime forecast per place, so each place only costs credits once.
const forecastSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // "name|address" in lowercase
  name: String,
  address: String,
  found: Boolean,          // false = BestTime couldn't forecast this place
  estimated: Boolean,      // true = 'days' is a typical pattern for this kind of place, not real data
  category: String,        // e.g. 'park', 'museum' - used for the typical pattern
  nearby: [String],        // nearby landmarks that might have real data (only when found is false)
  message: String,         // BestTime's reason when found is false
  venueType: String,
  bestTimeDefault: String, // 'any' | 'morning' | 'afternoon' | 'sunset' | 'night'
  durationDefault: Number, // hours
  days: mongoose.Schema.Types.Mixed, // { Monday: { open, close, closed, raw: [24 numbers] }, ... }
  fetchedAt: { type: Date, default: Date.now }
})

export default mongoose.model('Forecast', forecastSchema)
