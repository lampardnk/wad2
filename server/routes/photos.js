import express from 'express'
import mongoose from 'mongoose'
import Trip from '../models/trip.js'
import Photo from '../models/Photo.js'
import { requireAuth } from './auth.js'
import { findTripFor, memberName } from '../tripAccess.js'

// Mounted at /api/trips/:tripId/photos
const router = express.Router({ mergeParams: true })

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB per photo
const REACTIONS = ['❤️', '🔥', '😂', '😍', '👏']

// Images are sent as raw bytes (no extra upload library needed)
const rawImage = express.raw({ type: TYPES, limit: MAX_BYTES })

// Every route: the trip must exist and belong to the logged-in user
async function loadTrip(req, res) {
  const trip = await findTripFor(req.userId, req.params.tripId)
  if (!trip) res.status(404).json({ message: 'Trip not found.' })
  return trip
}

async function loadPhoto(req, res) {
  if (!mongoose.isValidObjectId(req.params.photoId)) {
    res.status(404).json({ message: 'Photo not found.' })
    return null
  }
  const photo = await Photo.findOne({ _id: req.params.photoId, trip: req.params.tripId })
  if (!photo) res.status(404).json({ message: 'Photo not found.' })
  return photo
}

function toClient(p) {
  return {
    id: p._id, album: p.album, uploadedBy: p.uploadedBy, fileName: p.fileName,
    size: p.size, width: p.width, height: p.height, reactions: p.reactions || {}, createdAt: p.createdAt
  }
}

// GET /api/trips/:tripId/photos -> details of every photo (no image bytes)
router.get('/', requireAuth, async (req, res) => {
  if (!(await loadTrip(req, res))) return
  const photos = await Photo.find({ trip: req.params.tripId }).select('-data -thumb').sort({ createdAt: -1 })
  res.json(photos.map(toClient))
})

// POST /api/trips/:tripId/photos?by=Sarah&album=a1&name=IMG_01.jpg&w=4032&h=3024   body = the image file
router.post('/', requireAuth, rawImage, async (req, res) => {
  const trip = await loadTrip(req, res)
  if (!trip) return
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ message: 'Photos must be JPEG, PNG, WebP or GIF, up to 10 MB.' })
  }
  const by = memberName(trip, req.userId) // photos are always added as yourself
  const album = String(req.query.album || '')
  const albumIds = (trip.photoAlbums || []).map((a) => a.id)
  const photo = await Photo.create({
    trip: trip._id,
    album: albumIds.includes(album) ? album : '',
    uploadedBy: by,
    fileName: String(req.query.name || 'photo.jpg').replace(/[^\w.\- ]/g, '_').slice(0, 100),
    mime: req.headers['content-type'],
    size: req.body.length,
    width: Number(req.query.w) || undefined,
    height: Number(req.query.h) || undefined,
    data: req.body
  })
  res.status(201).json(toClient(photo))
})

// PUT /api/trips/:tripId/photos/:photoId/thumb   body = small JPEG made in the browser
router.put('/:photoId/thumb', requireAuth, express.raw({ type: 'image/jpeg', limit: 1024 * 1024 }), async (req, res) => {
  if (!(await loadTrip(req, res))) return
  const photo = await loadPhoto(req, res)
  if (!photo) return
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ message: 'Thumbnail must be a JPEG.' })
  photo.thumb = req.body
  await photo.save()
  res.json({ ok: true })
})

// GET /api/trips/:tripId/photos/:photoId/file?size=thumb  -> the image itself
router.get('/:photoId/file', requireAuth, async (req, res) => {
  if (!(await loadTrip(req, res))) return
  const photo = await loadPhoto(req, res)
  if (!photo) return
  const wantThumb = req.query.size === 'thumb' && photo.thumb
  res.set('Content-Type', wantThumb ? 'image/jpeg' : photo.mime)
  res.set('Cache-Control', 'private, max-age=86400')
  res.send(wantThumb ? photo.thumb : photo.data)
})

// PATCH /api/trips/:tripId/photos/:photoId  { album }  -> move to another album
router.patch('/:photoId', requireAuth, async (req, res) => {
  const trip = await loadTrip(req, res)
  if (!trip) return
  const photo = await loadPhoto(req, res)
  if (!photo) return
  const album = String(req.body.album || '')
  const albumIds = (trip.photoAlbums || []).map((a) => a.id)
  photo.album = albumIds.includes(album) ? album : ''
  await photo.save()
  res.json(toClient(photo))
})

// POST /api/trips/:tripId/photos/:photoId/react  { emoji, by }  -> add or remove that person's reaction
router.post('/:photoId/react', requireAuth, async (req, res) => {
  const trip = await loadTrip(req, res)
  if (!trip) return
  const photo = await loadPhoto(req, res)
  if (!photo) return
  const { emoji } = req.body
  const by = memberName(trip, req.userId) // you can only react as yourself
  if (!REACTIONS.includes(emoji)) return res.status(400).json({ message: 'Invalid reaction.' })
  const reactions = { ...(photo.reactions || {}) }
  const people = reactions[emoji] || []
  reactions[emoji] = people.includes(by) ? people.filter((p) => p !== by) : people.concat(by)
  if (!reactions[emoji].length) delete reactions[emoji]
  photo.reactions = reactions
  photo.markModified('reactions')
  await photo.save()
  res.json(toClient(photo))
})

// DELETE /api/trips/:tripId/photos/:photoId
router.delete('/:photoId', requireAuth, async (req, res) => {
  if (!(await loadTrip(req, res))) return
  const result = await Photo.deleteOne({ _id: req.params.photoId, trip: req.params.tripId })
  if (!result.deletedCount) return res.status(404).json({ message: 'Photo not found.' })
  res.json({ ok: true })
})

export default router
