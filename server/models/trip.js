import mongoose from 'mongoose'

const tripSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  destination: { type: String, required: true, trim: true, maxlength: 80 }, // first/main destination (used by weather etc.)
  destinations: [{ type: String, trim: true, maxlength: 80 }],                 // all destinations, in travel order
  startDate: { type: String, default: '' }, // 'YYYY-MM-DD' (a string avoids timezone shifts)
  endDate: { type: String, default: '' },
  travellers: [{ type: String, trim: true, maxlength: 40 }], // everyone going, with or without an account
  // People with an account who can open the trip. name = their traveller name on this trip.
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastSeenAt: Date // for the "active now" dot on the Crew page
  }],
  inviteCode: { type: String, index: true, sparse: true }, // for /join/<code> links
  // People invited by username who haven't answered yet
  pendingInvites: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedBy: String,                                   // traveller name of whoever invited them
    invitedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  // Asked when creating the trip; used to build the packing list (keys from src/tripOptions.js)
  activities: [String],
  weather: [String],
  extras: [String],
  // Packing progress: { checked: { itemId: true }, qty: { itemId: 3 }, removed: [itemId], custom: [{ id, category, name, qty }] }
  packing: { type: mongoose.Schema.Types.Mixed, default: null },
  // Expenses & Split: { homeCurrency, budget, items: [...], settlements: [...] } (see src/expenses.js)
  expenses: { type: mongoose.Schema.Types.Mixed, default: null },
  // Optional: the family group this trip is shared with (null = not shared with a group).
  // Everyone in the group can open the trip (they are added as members the first time they do).
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },
  // Goes up by 1 on every itinerary save. Stops two people overwriting each other's stops.
  version: { type: Number, default: 0 },
  // Crew profiles, by traveller name: { persona, flight, arrival 'YYYY-MM-DDTHH:mm', arriveAt, departFlight, departure, departFrom, diet: [...], dietNote, phone }
  crew: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Where the group is staying (Safety tab taxi card): { name, address, nameLocal, addressLocal, lat, lon }
  stay: { type: mongoose.Schema.Types.Mixed, default: null },
  // Photo albums for spots: [{ id, name, icon }]. Photos without an album are "Trip highlights".
  photoAlbums: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // Itinerary: validated and cleaned in routes/trips.js before saving
  // stop = { id, name, address|null, date 'YYYY-MM-DD', hour, duration|null, outdoor, locked, travel|null }
  stops: { type: [mongoose.Schema.Types.Mixed], default: [] },
  // wishlist item = { id, name, address|null }  (indoor backups for rainy days)
  wishlist: { type: [mongoose.Schema.Types.Mixed], default: [] },
  // Where the group sleeps, one per city (set from the itinerary): { city, name, address, lat, lon, by }
  stays: { type: [mongoose.Schema.Types.Mixed], default: [] },
  // "Other journeys" (Getting around tab): { id, from, to, mode, min, date, by }
  journeys: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // Notes the crew leave on a stop ("book ahead, it sells out"). Kept apart from the stops,
  // so saving the itinerary never touches them. Removed when their stop is removed.
  comments: [new mongoose.Schema({
    stopId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,                              // traveller name of whoever wrote it
    text: { type: String, trim: true, maxlength: 500 },
    editedAt: Date
  }, { timestamps: true })]
}, { timestamps: true })

// Indexes for the lookups the app makes often (without them MongoDB reads every trip)
tripSchema.index({ 'members.user': 1 })        // "trips I'm on"
tripSchema.index({ 'pendingInvites.user': 1 }) // "trips I'm invited to"

export default mongoose.model('Trip', tripSchema)