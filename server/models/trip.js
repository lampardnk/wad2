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
    joinedAt: { type: Date, default: Date.now }
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
  // Photo albums for spots: [{ id, name, icon }]. Photos without an album are "Trip highlights".
  photoAlbums: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // Itinerary: validated and cleaned in routes/trips.js before saving
  // stop = { id, name, address|null, date 'YYYY-MM-DD', hour, duration|null, outdoor, locked }
  stops: { type: [mongoose.Schema.Types.Mixed], default: [] },
  // wishlist item = { id, name, address|null }  (indoor backups for rainy days)
  wishlist: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true })

export default mongoose.model('Trip', tripSchema)