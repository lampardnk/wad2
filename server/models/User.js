import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }, // never store the plain password

  // Trip preferences used by the crowd tracker's suggestions
  preferences: {
    dayStart: { type: Number, default: 8 },                // earliest start (hour)
    dayEnd: { type: Number, default: 23 },                 // finish by (hour)
    crowdSensitivity: { type: String, default: 'medium' }, // 'low' | 'medium' | 'high'
    travelBuffer: { type: Number, default: 0 }             // hours kept free between stops
  }
}, { timestamps: true })

export default mongoose.model('User', userSchema)
