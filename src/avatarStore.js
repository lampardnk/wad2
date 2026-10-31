// Travel Twin: the 3D character in Settings that earns new clothes and gear as you travel.
// Shared state (like auth.js): any component showing avatar.picture or avatar.progress updates by itself.
//
// The catalogue and unlock rules live in shared/avatarCatalog.js (the server uses the same file to
// check that nobody saves locked items). XP is worked out on the server from your trips.
import { reactive } from 'vue'
import axios from 'axios'
import { auth } from './auth.js'
import {
  TIERS, TABS, SLOTS, CATALOG, DEFAULT_LOOK, SOUVENIRS, XP, itemOf, tierOf, nextTier, isUnlocked as unlockedFor,
  lockText as lockTextFor, unlockedIds, cleanLook, lockedIn
} from '../shared/avatarCatalog.js'

export { TIERS, TABS, SLOTS, CATALOG, DEFAULT_LOOK, SOUVENIRS, XP, itemOf, tierOf, nextTier, cleanLook, lockedIn }

export const avatar = reactive({
  look: { ...DEFAULT_LOOK, gear: [] }, // saved look
  version: 0,      // picture version (0 = no picture yet: show the initial)
  picture: '',     // link to my face picture
  seen: null,      // unlocked item ids I've already been shown (null = never saved yet)
  outfits: [],     // up to 3 saved looks: [{ name, look, picture }]
  tripLooks: {},   // tripId -> { look }
  progress: { xp: 0, tier: 1, tierName: 'Day Tripper', next: null, trips: 0, countries: [], souvenirs: {}, log: [] },
  progressLoaded: false
})

// ---------- helpers that use my progress ----------
export function isUnlocked(item) {
  return unlockedFor(item, avatar.progress)
}
export function lockText(item) {
  return lockTextFor(item, avatar.progress)
}
// Unlocked, but not shown to me yet
export function isNew(slot, item) {
  return !!avatar.seen && isUnlocked(item) && !avatar.seen.includes(slot + ':' + item.id)
}
export function newUnlocks() {
  if (!avatar.seen || !avatar.progressLoaded) return []
  const list = []
  for (const slot in CATALOG) {
    for (const it of CATALOG[slot]) if (isNew(slot, it)) list.push(it)
  }
  return list
}
// Picture link for anyone (version 0 = none). trip = that trip's outfit if they made one.
export function pictureUrl(userId, version, tripId) {
  if (!userId || !version) return ''
  return '/api/avatar/' + userId + '/picture?v=' + version + (tripId ? '&trip=' + tripId : '')
}

// ---------- loading ----------
let loadedFor = null
// Once per signed-in user (call it again with force after logging in as someone else)
export async function loadAvatar(force) {
  if (!auth.user) return
  if (loadedFor === auth.user.id && !force) return
  loadedFor = auth.user.id
  avatar.look = { ...DEFAULT_LOOK, gear: [] }
  avatar.version = 0
  avatar.picture = ''
  avatar.seen = null
  avatar.outfits = []
  avatar.tripLooks = {}
  avatar.progressLoaded = false
  try {
    const res = await axios.get('/api/avatar/me')
    if (res.data.look) avatar.look = cleanLook(res.data.look)
    setVersion(res.data.version || 0)
    avatar.seen = res.data.seen
    avatar.outfits = res.data.outfits || []
    avatar.tripLooks = res.data.tripLooks || {}
  } catch (err) {
    loadedFor = null // try again next time
  }
}
export async function loadProgress() {
  if (!auth.user) return
  try {
    const res = await axios.get('/api/avatar/progress')
    avatar.progress = res.data
    avatar.progressLoaded = true
  } catch (err) {
    // keep the last numbers
  }
}
function setVersion(v) {
  avatar.version = v
  avatar.picture = pictureUrl(auth.user && auth.user.id, v)
}

// ---------- saving ----------
// Throws with the server's message if something isn't unlocked
export async function saveAvatar(look, snapshot) {
  const clean = cleanLook(look)
  const res = await axios.put('/api/avatar', { look: clean, snapshot: snapshot || '' })
  avatar.look = clean
  if (snapshot) setVersion(res.data.version)
  if (!avatar.seen) avatar.seen = unlockedIds(avatar.progress)
}
export async function saveOutfits(list) {
  const res = await axios.put('/api/avatar/outfits', { outfits: list })
  avatar.outfits = res.data.outfits
}
export async function saveTripLook(tripId, look, snapshot) {
  const clean = cleanLook(look)
  const res = await axios.put('/api/avatar/trip/' + tripId, { look: clean, snapshot: snapshot || '' })
  avatar.tripLooks = { ...avatar.tripLooks, [tripId]: { look: clean } }
  setVersion(res.data.version)
}
export async function removeTripLook(tripId) {
  const res = await axios.delete('/api/avatar/trip/' + tripId)
  const next = { ...avatar.tripLooks }
  delete next[tripId]
  avatar.tripLooks = next
  setVersion(res.data.version)
}
// I've seen all current unlocks (no more "New" tags or celebration for them)
export async function markSeen() {
  if (!avatar.progressLoaded) return
  avatar.seen = unlockedIds(avatar.progress)
  try {
    await axios.put('/api/avatar/seen')
  } catch (err) {
    // shown again next time: harmless
  }
}
