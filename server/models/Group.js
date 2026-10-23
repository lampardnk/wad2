import mongoose from 'mongoose'

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  inviteCode: { type: String, required: true, unique: true }, // e.g. "K7TQ2M"
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })

groupSchema.index({ members: 1 }) // "groups I'm in" (checked when opening a shared trip)

export default mongoose.model('Group', groupSchema)