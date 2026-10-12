import mongoose from 'mongoose'

// One shared trip photo. The image itself is stored here (original + small thumbnail),
// so the group can always download the original file.
const photoSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  album: { type: String, default: '' },          // '' = Trip highlights, otherwise an album id
  uploadedBy: { type: String, required: true },  // traveller name
  fileName: { type: String, default: 'photo.jpg' },
  mime: { type: String, required: true },
  size: { type: Number, default: 0 },
  width: Number,
  height: Number,
  data: { type: Buffer, required: true },        // original file
  thumb: { type: Buffer, default: null },        // ~480px JPEG made in the browser
  reactions: { type: mongoose.Schema.Types.Mixed, default: {} } // { '❤️': ['Sarah', 'Amy'], '🔥': ['John'] }
}, { timestamps: true })

export default mongoose.model('Photo', photoSchema)
