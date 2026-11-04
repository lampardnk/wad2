// Clear values older versions guessed and saved into trips, so the app stops treating them as facts.
// Run from the server folder:
//   node scripts/clear-guesses.js           (only lists what would change)
//   node scripts/clear-guesses.js --apply   (saves the changes)
//
// What it clears:
//  1. Indoor/outdoor on every stop and saved place. Older versions guessed it from the place's
//     type and saved it, and a guess can't be told apart from a choice, so all are reset to "not set".
//  2. Visit lengths that came from a guess: 1.5 h (the old fallback) and the old name-based
//     estimates (Forecast entries marked estimated). Locked stops and tours keep theirs: people typed those.
//     A 1.5 h someone picked by hand is cleared too; the stop then shows "How long?" to set it again.
import 'dotenv/config'
import mongoose from 'mongoose'
import Trip from '../models/trip.js'
import Forecast from '../models/Forecast.js'

const apply = process.argv.includes('--apply')

await mongoose.connect(process.env.MONGODB_URI)

// Old guessed visit lengths, by place ("name|address", lowercase, the same key the crowd route uses)
const guessedLength = new Map()
for (const f of await Forecast.find({ estimated: true }, { key: 1, durationDefault: 1 }).lean()) {
  if (f.durationDefault != null) guessedLength.set(f.key, f.durationDefault)
}

let tripsChanged = 0
let outdoorCleared = 0
let lengthsCleared = 0
for (const trip of await Trip.find({}, { name: 1, stops: 1, wishlist: 1 }).lean()) {
  let changed = false
  const stops = (trip.stops || []).map((s) => {
    const next = { ...s }
    if (typeof s.outdoor === 'boolean') { next.outdoor = null; outdoorCleared++; changed = true }
    if (s.duration != null && !s.locked && s.type !== 'tour') {
      const key = ((s.name || '') + '|' + (s.address || '')).toLowerCase()
      if (s.duration === 1.5 || guessedLength.get(key) === s.duration) {
        console.log('  ' + trip.name + ': "' + s.name + '" ' + s.duration + ' h -> not set')
        next.duration = null; lengthsCleared++; changed = true
      }
    }
    return next
  })
  const wishlist = (trip.wishlist || []).map((w) => {
    if (typeof w.outdoor !== 'boolean') return w
    outdoorCleared++; changed = true
    return { ...w, outdoor: null }
  })
  if (!changed) continue
  tripsChanged++
  // version + 1: a page still holding the old copy must reload before it can save over this
  if (apply) await Trip.updateOne({ _id: trip._id }, { $set: { stops, wishlist }, $inc: { version: 1 } })
}

console.log((apply ? 'Changed ' : 'Would change ') + tripsChanged + ' trip(s): ' +
  outdoorCleared + ' indoor/outdoor value(s) and ' + lengthsCleared + ' visit length(s) cleared.')
if (!apply && tripsChanged) console.log('Run again with --apply to save.')
await mongoose.disconnect()
