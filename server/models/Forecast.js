import mongoose from 'mongoose'

// One saved BestTime forecast per place, so each place only costs credits once.
const forecastSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // "name|address" in lowercase
  name: String,
  address: String,
  found: Boolean,          // false = BestTime couldn't forecast this place (no crowd data is shown)
  message: String,         // BestTime's reason when found is false
  venueType: String,
  durationDefault: Number, // hours: BestTime's average visit length, or null
  days: mongoose.Schema.Types.Mixed, // { Monday: { open, close, closed, raw: [24 numbers] }, ... } (only when found)
  // Saved by older versions (made-up patterns and name guesses). Never sent; cleared when the entry is refreshed.
  estimated: Boolean,
  category: String,
  nearby: [String],
  bestTimeDefault: String,
  fetchedAt: { type: Date, default: Date.now }
})

export default mongoose.model('Forecast', forecastSchema)
