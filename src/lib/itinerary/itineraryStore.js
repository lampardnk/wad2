// Shared itinerary state, same idea as auth.js and preferences.js.
// ItineraryView, PlacesVoting, WishlistView and TripView use this.
import { reactive } from 'vue'
import axios from 'axios'

export function newId(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Turn a saved stop into a live one (adds the fields the screen needs)
export function runtimeStop(s) {
  return {
    id: s.id, name: s.name, date: s.date, hour: s.hour,
    duration: s.duration ?? null,
    address: s.address || null,
    outdoor: !!s.outdoor,
    locked: !!s.locked,
    travel: s.travel || null, // how the group chose to get here: { mode, from (stop id), by }
    lat: s.lat ?? null, lon: s.lon ?? null, // where it is on the map (null = location not set yet)
    kind: s.kind || null,     // 'flight' | 'hotel' | null (a place)
    flight: s.flight || null, // { from: { name, lat, lon }, to: {...}, dep: 'HH:mm', arr: 'HH:mm', number, intl }
    forecast: null, bestTime: null, loading: false, error: '', highlight: false, dataFrom: '',
    replacedFrom: null
  }
}

export const trip = reactive({
  stops: [],     // every stop of the open trip, all days (each has a date)
  wishlist: []   // [{ id, name, address, outdoor: false }]
})

// A saved trip from the server
export function loadFromServer(saved) {
  trip.version = saved.version || 0 // sent back when saving, so we never overwrite someone else's changes
  trip.stops = (saved.stops || []).map(runtimeStop)
  trip.wishlist = (saved.wishlist || []).map((w) => ({
    id: w.id, name: w.name, address: w.address || null, outdoor: !!w.outdoor,
    type: w.type || null, city: w.city || null, votes: Array.isArray(w.votes) ? w.votes : [],
    duration: w.duration || null, bookedVia: w.bookedVia || null, link: w.link || null,
    lat: w.lat ?? null, lon: w.lon ?? null // where it is (null = location not set yet)
  }))
}

// Only the fields worth saving (no crowd data, loading flags, etc.)
export function savedShape() {
  return {
    stops: trip.stops.map((s) => ({ id: s.id, name: s.name, address: s.address, date: s.date, hour: s.hour, duration: s.duration, outdoor: s.outdoor, locked: s.locked, travel: s.travel || null, lat: s.lat ?? null, lon: s.lon ?? null, kind: s.kind || null, flight: s.flight || null })),
    wishlist: trip.wishlist.map((w) => ({ id: w.id, name: w.name, address: w.address, outdoor: !!w.outdoor, type: w.type || null, city: w.city || null, votes: w.votes || [], duration: w.duration || null, bookedVia: w.bookedVia || null, link: w.link || null, lat: w.lat ?? null, lon: w.lon ?? null }))
  }
}
// Save the open trip's stops + wishlist (for pages that don't show the itinerary, e.g. trip setup)
export async function saveTrip(tripId) {
  if (!tripId) return
  try {
    const res = await axios.put('/api/trips/' + tripId + '/itinerary', { ...savedShape(), version: trip.version })
    trip.version = res.data.version
  } catch (err) {
    // 409: someone else saved first. Show their version instead of overwriting it.
    if (err.response && err.response.status === 409) loadFromServer(err.response.data.trip)
    throw err
  }
}
