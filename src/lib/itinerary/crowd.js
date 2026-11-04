// =====================================================================
// Crowd helper - shared by any page that shows places or itineraries.
// getForecast asks our server for BestTime's crowd forecast; the rest read it.
// (Placing stops at good times is done by dayOptimizer.js.)
// =====================================================================
import axios from 'axios'

export const DEFAULT_PREFS = {
  dayStart: 8,                // earliest start the user wants
  dayEnd: 23,                 // everything should finish by this hour
  crowdSensitivity: 'medium', // 'low' | 'medium' | 'high'
  travelBuffer: 0,            // hours kept free between stops (0, 0.5 or 1)
  // Transport (Settings): ways to travel we suggest, the longest walk (min), and what matters most
  travelModes: ['walk', 'transit', 'taxi'],
  maxWalk: 20,
  travelPriority: 'balanced'  // 'balanced' | 'fastest' | 'cheapest'
}

// Ask our server for a place's forecast (the server caches it in MongoDB)
// place = { name, address, lat, lon }: only places with a map point have crowd data
export async function getForecast(place) {
  const res = await axios.get('/api/crowd', { params: { name: place.name, address: place.address, lat: place.lat, lon: place.lon }, background: true })
  return res.data
}

// Badge text + Bootstrap colour for a crowd %
export function crowdLevel(busyness) {
  if (busyness < 35) return { label: 'Quiet', badgeClass: 'bg-success' }
  if (busyness < 70) return { label: 'Moderate', badgeClass: 'bg-warning text-dark' }
  return { label: 'Busy', badgeClass: 'bg-danger' }
}

// Crowd % at an hour. BestTime's day starts at 6am, so index 0 = 6am.
export function busynessAt(forecast, dayName, hour) {
  const day = forecast.days[dayName]
  return day.raw[(Math.floor(hour) - 6 + 48) % 24]
}

export function formatHour(h) {
  const hour = Math.floor(h) % 24
  const minutes = Math.round((h - Math.floor(h)) * 60) // 13.25 -> 15 (the day optimizer uses 15-minute steps)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return h12 + ':' + String(minutes).padStart(2, '0') + ' ' + suffix
}
