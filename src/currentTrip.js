// The trip that is open right now (trip page or trip setup), shared with the profile menu
// and the crew drawer. Also tells the server every 30 seconds that you're here, and what
// you're looking at, so your crew sees "Active now · Viewing Day 2".
import { reactive } from 'vue'
import axios from 'axios'

export const currentTrip = reactive({
  id: '',
  name: '',
  role: 'member',  // 'owner' | 'member'
  me: '',          // my traveller name on this trip
  members: [],     // people with an account (from the server, with lastSeenAt / viewing / diet)
  travellers: [],  // everyone going, with or without an account
  code: '',        // invite code, fetched the first time it's needed
  viewing: '',     // what I have open, e.g. 'Day 2' or 'Packing'
  day: '',         // the itinerary's selected day, e.g. 'Day 2' (set by ItineraryView)
  crewOpen: false  // the crew drawer
})

const PING_EVERY = 30 * 1000
let timer = null
let sendSoon = null

// A trip page opened (t = the trip from GET /api/trips/:id)
export function openTrip(t) {
  if (currentTrip.id !== String(t.id)) currentTrip.code = ''
  currentTrip.id = String(t.id)
  currentTrip.name = t.name
  currentTrip.role = t.role || 'member'
  currentTrip.me = t.me || ''
  currentTrip.members = t.members || []
  currentTrip.travellers = t.travellers || []
  clearInterval(timer)
  timer = setInterval(ping, PING_EVERY)
  ping()
}

// The trip page closed (only if it's still the same trip: the next page may have opened it already)
export function closeTrip(id) {
  if (currentTrip.id !== String(id)) return
  clearInterval(timer)
  clearTimeout(sendSoon)
  currentTrip.id = ''
  currentTrip.name = ''
  currentTrip.members = []
  currentTrip.travellers = []
  currentTrip.code = ''
  currentTrip.viewing = ''
  currentTrip.day = ''
  currentTrip.crewOpen = false
}

// What I'm looking at changed: tell the crew a moment later (quick tab switching = one request)
export function setViewing(text) {
  if (currentTrip.viewing === text) return
  currentTrip.viewing = text
  clearTimeout(sendSoon)
  sendSoon = setTimeout(ping, 1500)
}

// "I'm here" + get everyone's latest status back
export async function ping() {
  const id = currentTrip.id
  if (!id || id === 'seoul' || document.hidden) return // the demo trip isn't on the server
  try {
    const res = await axios.post('/api/trips/' + id + '/presence', { viewing: currentTrip.viewing })
    if (currentTrip.id !== id) return // left the trip while waiting
    currentTrip.members = res.data.members
    currentTrip.travellers = res.data.travellers
  } catch (err) {
    // offline for a moment: try again on the next tick
  }
}

// The invite code (any member may ask; the server makes one if the trip has none yet)
export async function loadCode() {
  if (currentTrip.code || !currentTrip.id || currentTrip.id === 'seoul') return currentTrip.code
  const res = await axios.post('/api/trips/' + currentTrip.id + '/invite', {})
  currentTrip.code = res.data.code
  return currentTrip.code
}

// "Active now" = sent a ping in the last 75 seconds
export function isActive(m) {
  return !!m.lastSeenAt && Date.now() - new Date(m.lastSeenAt).getTime() < 75 * 1000
}

// Copy text; falls back to the old way on http:// pages where the Clipboard API is blocked
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    const box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.position = 'fixed'
    box.style.opacity = '0'
    document.body.appendChild(box)
    box.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch (e) {
      ok = false
    }
    box.remove()
    return ok
  }
}
