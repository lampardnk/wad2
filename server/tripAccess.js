// Who can open a trip: its owner and anyone who joined with the invite link.
import mongoose from 'mongoose'
import crypto from 'crypto'
import Trip from './models/trip.js'
import User from './models/User.js'
import Group from './models/Group.js'

// The ids of every family group this user is in (Gladys's groups feature)
export async function myGroupIds(userId) {
  const groups = await Group.find({ members: userId }).select('_id')
  return groups.map((g) => g._id)
}

// Who can see a trip: owner, a member who joined, or someone in the trip's family group
export async function accessQuery(userId) {
  return { $or: [{ owner: userId }, { 'members.user': userId }, { group: { $in: await myGroupIds(userId) } }] }
}

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

// The trip if this user is its owner, a member, or in its family group, otherwise null.
// ownerOnly: only the owner may (delete the trip, remove people, reset the link).
export async function findTripFor(userId, tripId, ownerOnly = false) {
  if (!mongoose.isValidObjectId(tripId)) return null
  const query = ownerOnly ? { _id: tripId, owner: userId } : { _id: tripId, ...(await accessQuery(userId)) }
  const trip = await Trip.findOne(query)
  if (!trip) return null
  await ensureMembers(trip)
  await addGroupMember(trip, userId)
  return trip
}

// Someone from the trip's family group opening it for the first time becomes a member,
// so expenses, photos and votes know who they are
export async function addGroupMember(trip, userId) {
  if (!trip.group || memberName(trip, userId)) return
  const user = await User.findById(userId)
  if (!user) return
  let name = user.name.slice(0, 36)
  // Use their name if the organiser already listed it, otherwise add it
  const listed = trip.travellers.find((t) => t.toLowerCase() === name.toLowerCase() && !trip.members.some((m) => m.name === t))
  if (listed) name = listed
  else {
    let n = 2
    while (trip.travellers.includes(name)) name = user.name.slice(0, 36) + ' ' + n++
    trip.travellers.push(name)
  }
  trip.members.push({ user: userId, name, role: 'member' })
  await trip.save()
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
