import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }, // never store the plain password

  // Forgot password: a 6-digit code emailed to them (only its hash is stored), valid for 15 minutes
  reset: {
    codeHash: String,
    expiresAt: Date,
    sentAt: Date,
    attempts: { type: Number, default: 0 } // wrong guesses; after 5 they need a new code
  },

  // Set once in Settings, shown on the Crew tab of every trip they're on
  diet: { type: [String], default: [] }, // preset keys like 'halal' or short custom tags like 'No spicy food'
  phone: { type: String, default: '' },  // WhatsApp, e.g. '+65 9123 4567'
  contactSaved: { type: Boolean, default: false }, // saved Settings at least once (empty diet then means "no restrictions")

  // Discover shortlist (city ids), so a guest's picks follow them into their account
  discoverShortlist: { type: [String], default: [] },

  // Friends (both people list each other) and requests waiting for MY answer
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  lastActiveAt: Date, // the app sends a ping every minute while open: "Online" on friends' lists

  // App settings (Settings page)
  settings: {
    currency: { type: String, default: 'SGD' },    // base currency for new trips' expenses
    units: { type: String, default: 'metric' },    // 'metric' (km, °C) | 'imperial' (mi, °F)
    hazardAlerts: { type: Boolean, default: true }, // earthquake / storm warnings
    expenseAlerts: { type: Boolean, default: true } // bill splits and settlements
  },

  // Trip preferences used by the crowd tracker's suggestions
  preferences: {
    dayStart: { type: Number, default: 8 },                // earliest start (hour)
    dayEnd: { type: Number, default: 23 },                 // finish by (hour)
    crowdSensitivity: { type: String, default: 'medium' }, // 'low' | 'medium' | 'high'
    travelBuffer: { type: Number, default: 0 }             // hours kept free between stops
  }
}, { timestamps: true })

userSchema.index({ 'friendRequests.from': 1 }) // requests I've sent (Friends → Requests → Sent)

export default mongoose.model('User', userSchema)
