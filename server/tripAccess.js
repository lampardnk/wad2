// Who can open a trip: its owner and anyone who joined with the invite link.
import mongoose from 'mongoose'
import crypto from 'crypto'
import Trip from './models/trip.js'
import User from './models/User.js'

// Older trips were made before members existed: add the owner as the first member
export async function ensureMembers(trip) {
  if (trip.members && trip.members.length) return trip
  const owner = await User.findById(trip.owner)
  let name = owner ? owner.name : 'Organiser'
  // Use the matching traveller name if the owner is one of the travellers
  for (const t of trip.travellers || []) {
    if (owner && t.toLowerCase() === owner.name.toLowerCase()) name = t
  }
  trip.members = [{ user: trip.owner, name, role: 'owner', joinedAt: trip.createdAt }]
  if (!trip.travellers.includes(name)) trip.travellers.unshift(name)
  await trip.save()
  return trip
}

// The trip if this user is its owner or a member, otherwise null.
// ownerOnly: only the owner may (delete the trip, remove people, reset the link).
export async function findTripFor(userId, tripId, ownerOnly = false) {
  if (!mongoose.isValidObjectId(tripId)) return null
  const query = ownerOnly
    ? { _id: tripId, owner: userId }
    : { _id: tripId, $or: [{ owner: userId }, { 'members.user': userId }] }
  const trip = await Trip.findOne(query)
  return trip ? ensureMembers(trip) : null
}

// The traveller name this user has on the trip
export function memberName(trip, userId) {
  for (const m of trip.members || []) {
    if (String(m.user) === String(userId)) return m.name
  }
  return null
}

// 'owner' | 'member' | null
export function roleOf(trip, userId) {
  if (String(trip.owner) === String(userId)) return 'owner'
  return memberName(trip, userId) ? 'member' : null
}

// Short, hard-to-guess code for invite links, e.g. "k7Fq2xPa"
export function newInviteCode() {
  return crypto.randomBytes(6).toString('base64url')
}
