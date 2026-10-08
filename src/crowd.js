// =====================================================================
// Crowd helper - shared by any page that shows places or itineraries.
//
// How to use (example for the itinerary / saved-places pages):
//
//   import { getForecast, suggestSlot, crowdLevel } from '../crowd.js'
//
//   const forecast = await getForecast('N Seoul Tower', '105 Namsangongwon-gil, Seoul')
//   const result = suggestSlot({
//     forecast,
//     dayName: 'Tuesday',
//     currentHour: 14,                  // when it's planned now (or null if not planned yet)
//     duration: 1.5,                    // hours (leave out to use the place's default)
//     bestTime: 'sunset',               // 'any' | 'morning' | 'afternoon' | 'sunset' | 'night'
//     takenSlots: [{ start: 10, duration: 1, name: 'Breakfast' }, { start: 18, duration: 1.5, name: 'Dinner' }],
//   })
//   // result.hour       -> suggested start hour, e.g. 18 (or null if none fits)
//   // result.busyness   -> crowd % at that hour
//   // result.reason     -> sentence to show the user
//   // result.swap       -> { index, name, hour } if swapping with another stop gives the preferred time
// =====================================================================
import axios from 'axios'

// Start hours that count as each "best visited" choice
export const TIME_WINDOWS = {
  any: [0, 24],
  morning: [6, 11],
  afternoon: [12, 16],
  sunset: [17, 19],
  night: [19, 23]
}

// Nicer text for the "Preference" (time of day) dropdown
export const TIME_LABELS = {
  any: 'Any time',
  morning: 'Morning',
  afternoon: 'Afternoon',
  sunset: 'Sunset',
  night: 'Night'
}

export const DEFAULT_PREFS = {
  dayStart: 8,                // earliest start the user wants
  dayEnd: 23,                 // everything should finish by this hour
  crowdSensitivity: 'medium', // 'low' | 'medium' | 'high'
  travelBuffer: 0             // hours kept free between stops (0, 0.5 or 1)
}

// Ask our server for a place's forecast (the server caches it in MongoDB)
export async function getForecast(name, address) {
  const res = await axios.get('/api/crowd', { params: { name, address } })
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
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return h12 + ':00 ' + suffix
}

// Score one place at one start hour (lower = better), or null if it can't go there.
// score = crowd% x crowd weight + 40 if outside the preferred time of day
export function scoreAt(forecast, dayName, hour, duration, bestTime, prefs = DEFAULT_PREFS) {
  if (hour < prefs.dayStart || hour + duration > prefs.dayEnd) return null
  if (!forecast || !forecast.days) return 0 // untracked stop (e.g. a meal): any time inside the day is fine
  const day = forecast.days[dayName]
  if (!day || day.closed || hour < day.open || hour + duration > day.close) return null
  const window = TIME_WINDOWS[bestTime || forecast.bestTimeDefault]
  const weight = { low: 0.5, medium: 1, high: 2 }[prefs.crowdSensitivity]
  const penalty = hour >= window[0] && hour <= window[1] ? 0 : 40
  return busynessAt(forecast, dayName, hour) * weight + penalty
}

// Do two time ranges overlap? (buffer = travel time kept free between stops)
function overlaps(startA, durA, startB, durB, buffer) {
  return startA < startB + durB + buffer && startB < startA + durA + buffer
}

// Pick the best start hour for one stop, and the best swap with another stop.
// takenSlots = the day's OTHER stops: { start, duration, name, index, forecast?, bestTime?, locked? }
// Hard rules: open long enough, inside the user's day, no overlap (incl. travel buffer).
export function suggestSlot({ forecast, dayName, currentHour = null, duration, bestTime, takenSlots = [], prefs = DEFAULT_PREFS }) {
  const result = { hour: null, busyness: null, currentBusyness: null, currentProblem: null, reason: '', swap: null }

  // Works with real data AND with estimates (found: false but days filled in)
  if (!forecast || !forecast.days) {
    result.reason = 'No crowd data for this place.'
    return result
  }
  const day = forecast.days[dayName]
  if (!day || day.closed) {
    result.reason = 'Closed on ' + dayName + '.'
    return result
  }

  const hours = duration || forecast.durationDefault
  const timePref = bestTime || forecast.bestTimeDefault
  const window = TIME_WINDOWS[timePref]
  const buffer = prefs.travelBuffer || 0

  // How good is the current time? (a time that breaks the rules counts as very bad)
  let currentScore = 999
  if (currentHour !== null) {
    result.currentBusyness = busynessAt(forecast, dayName, currentHour)
    const s = scoreAt(forecast, dayName, currentHour, hours, timePref, prefs)
    if (s === null) {
      result.currentProblem = currentHour < day.open || currentHour + hours > day.close
        ? 'Closed at ' + formatHour(currentHour)
        : 'Outside your day'
    } else {
      currentScore = s
    }
  }

  // ---- 1. Best FREE hour to move to ----
  let best = null
  let blocked = null // best preferred-time hour that ONE other stop is sitting on
  for (let h = 0; h < 24; h++) {
    const score = scoreAt(forecast, dayName, h, hours, timePref, prefs)
    if (score === null) continue

    const clashes = []
    for (let k = 0; k < takenSlots.length; k++) {
      const t = takenSlots[k]
      if (overlaps(h, hours, t.start, t.duration, buffer)) clashes.push(k)
    }
    if (clashes.length > 0) {
      const inWindow = timePref !== 'any' && h >= window[0] && h <= window[1]
      if (inWindow && clashes.length === 1 && (blocked === null || score < blocked.score)) {
        blocked = { hour: h, score, slotIndex: clashes[0] }
      }
      continue
    }
    if (best === null || score < best.score) best = { hour: h, busyness: busynessAt(forecast, dayName, h), score }
  }

  // ---- 2. Best SWAP with another stop (both stops trade start times) ----
  if (currentHour !== null) {
    let bestSwap = null
    for (let j = 0; j < takenSlots.length; j++) {
      const other = takenSlots[j]
      if (other.locked) continue // never move a locked stop
      const myNew = scoreAt(forecast, dayName, other.start, hours, timePref, prefs)
      const theirOld = scoreAt(other.forecast, dayName, other.start, other.duration, other.bestTime, prefs)
      const theirNew = scoreAt(other.forecast, dayName, currentHour, other.duration, other.bestTime, prefs)
      if (myNew === null || theirNew === null) continue

      // After the swap, neither stop may overlap the remaining stops
      let ok = true
      for (let k = 0; k < takenSlots.length; k++) {
        if (k === j) continue
        const t = takenSlots[k]
        if (overlaps(other.start, hours, t.start, t.duration, buffer)) ok = false
        if (overlaps(currentHour, other.duration, t.start, t.duration, buffer)) ok = false
      }
      // ...or each other
      if (overlaps(other.start, hours, currentHour, other.duration, buffer)) ok = false
      if (!ok) continue

      // Total improvement for BOTH stops (the other stop may get worse)
      const gain = (currentScore - myNew) - (theirNew - (theirOld === null ? 999 : theirOld))
      if (bestSwap === null || gain > bestSwap.gain) {
        bestSwap = { index: other.index, name: other.name, hour: other.start, otherNewHour: currentHour, busyness: busynessAt(forecast, dayName, other.start), gain }
      }
    }
    if (bestSwap && bestSwap.gain >= 15) result.swap = bestSwap
  }

  // ---- 3. Decide what to suggest ----
  const moveGain = best ? currentScore - best.score : -1
  if (moveGain < 15 && !result.swap) {
    result.reason = best || currentHour === null ? 'Already a good time.' : 'No free time slot fits while it is open.'
    if (currentHour === null && best) {
      // Not planned yet: always give the best hour
      result.hour = best.hour
      result.busyness = best.busyness
      result.reason = best.busyness + '% busy · last entry ' + formatHour(Math.floor(Math.min(day.close, prefs.dayEnd) - hours))
    }
    return result
  }

  // Explain why
  const parts = []
  if (moveGain >= 15) {
    result.hour = best.hour
    result.busyness = best.busyness
    if (result.currentProblem) parts.push(result.currentProblem)
    else if (currentHour !== null) parts.push('quieter than ' + formatHour(currentHour) + ' (' + best.busyness + '% vs ' + result.currentBusyness + '%)')
    else parts.push(best.busyness + '% busy')

    const label = TIME_LABELS[timePref].toLowerCase()
    if (timePref !== 'any') {
      if (best.hour >= window[0] && best.hour <= window[1]) parts.push('matches ' + label)
      else if (blocked) {
        const blocker = takenSlots[blocked.slotIndex]
        parts.push((blocker.name || 'Another stop') + ' at ' + formatHour(blocker.start) + ' takes the ' + label + ' slot')
      } else parts.push('no free ' + label + ' slot that day')
    }
  } else if (result.currentProblem) {
    parts.push(result.currentProblem)
  }
  parts.push('last entry ' + formatHour(Math.floor(Math.min(day.close, prefs.dayEnd) - hours)))
  if (buffer > 0) parts.push(buffer * 60 + ' min travel kept free')
  if (forecast.estimated) parts.unshift('estimate')
  result.reason = parts.join(' · ')

  return result
}

// =====================================================================
// Plan my day: give every stop of one day a start time at once.
//
// stops: [{ index, name, hour, duration, forecast?, bestTime?, locked? }]
//   locked = keep this time (e.g. a dinner reservation)
// Returns { rows: [{ index, name, oldHour, newHour, oldBusyness, newBusyness, locked, noData, oldProblem }],
//           unplaced: [{ index, name, reason }], avgBefore, avgAfter, fixedProblems }
//
// How it works (easy to explain):
//  1. Locked stops keep their times. So do stops without crowd data (e.g. meals):
//     we can't judge crowds there, so we don't move them.
//  2. The other stops are placed one by one, the HARDEST to fit first
//     (fewest possible start hours), each at its lowest-score free hour.
//  3. Then it keeps trying to move one stop, or swap two stops,
//     whenever that lowers the day's total score - until nothing improves.
// =====================================================================
export function planDay({ stops, dayName, prefs = DEFAULT_PREFS }) {
  const buffer = prefs.travelBuffer || 0

  // Cost of stop s starting at hour h (lower = better, null = not allowed)
  function cost(s, h) {
    return scoreAt(s.forecast, dayName, h, s.duration, s.bestTime, prefs)
  }

  // Would stop s at hour h overlap any other placed stop?
  function fits(s, h, hoursById) {
    for (const other of stops) {
      if (other === s || hoursById[other.index] === undefined) continue
      if (overlaps(h, s.duration, hoursById[other.index], other.duration, buffer)) return false
    }
    return true
  }

  const hoursById = {} // stop index -> chosen start hour
  const unplaced = []

  // 1. Fixed stops first: locked, or no crowd data
  function isFixed(s) {
    return s.locked || !s.forecast || !s.forecast.days
  }
  for (const s of stops) {
    if (isFixed(s)) hoursById[s.index] = s.hour
  }

  // 2. Flexible stops, hardest first
  const flexible = []
  for (const s of stops) {
    if (isFixed(s)) continue
    let options = 0
    for (let h = 0; h < 24; h++) if (cost(s, h) !== null) options++
    flexible.push({ stop: s, options })
  }
  flexible.sort((a, b) => a.options - b.options)

  for (const f of flexible) {
    let bestHour = null
    let bestCost = null
    for (let h = 0; h < 24; h++) {
      const c = cost(f.stop, h)
      if (c === null || !fits(f.stop, h, hoursById)) continue
      if (bestCost === null || c < bestCost) {
        bestCost = c
        bestHour = h
      }
    }
    if (bestHour === null) {
      const day = f.stop.forecast.days[dayName]
      const reason = !day || day.closed
        ? 'closed all day on ' + dayName + 's - move it to another day.'
        : 'no free time while it is open. Try a longer day, less travel time, or unlocking a stop.'
      unplaced.push({ index: f.stop.index, name: f.stop.name, reason })
    }
    else hoursById[f.stop.index] = bestHour
  }

  // 3. Improve: move one stop, or swap two, while the total score drops
  let improved = true
  let rounds = 0
  while (improved && rounds < 10) {
    improved = false
    rounds++
    for (const f of flexible) {
      const s = f.stop
      if (hoursById[s.index] === undefined) continue
      const now = cost(s, hoursById[s.index])

      // a) move to a better free hour
      for (let h = 0; h < 24; h++) {
        const c = cost(s, h)
        if (c !== null && c < now - 0.01 && fits(s, h, hoursById)) {
          hoursById[s.index] = h
          improved = true
          break
        }
      }

      // b) swap with another flexible stop
      for (const g of flexible) {
        const t = g.stop
        if (t === s || hoursById[t.index] === undefined) continue
        const hs = hoursById[s.index]
        const ht = hoursById[t.index]
        const before = cost(s, hs) + cost(t, ht)
        const cs = cost(s, ht)
        const ct = cost(t, hs)
        if (cs === null || ct === null || cs + ct >= before - 0.01) continue

        // try it, and undo if it causes an overlap
        hoursById[s.index] = ht
        hoursById[t.index] = hs
        if (fits(s, ht, hoursById) && fits(t, hs, hoursById)) {
          improved = true
        } else {
          hoursById[s.index] = hs
          hoursById[t.index] = ht
        }
      }
    }
  }

  // Build the result, with average crowd before vs after (stops with crowd data only)
  const rows = []
  let sumBefore = 0
  let sumAfter = 0
  let tracked = 0
  let fixedProblems = 0
  for (const s of stops) {
    const newHour = hoursById[s.index]
    const row = { index: s.index, name: s.name, oldHour: s.hour, newHour: newHour === undefined ? null : newHour, oldBusyness: null, newBusyness: null, locked: !!s.locked, noData: !s.forecast || !s.forecast.days }
    // Did the old time break a rule (closed, outside your day)?
    if (!isFixed(s) && cost(s, s.hour) === null) {
      row.oldProblem = true
      fixedProblems++
    }
    if (s.forecast && s.forecast.days && s.forecast.days[dayName] && newHour !== undefined) {
      row.oldBusyness = busynessAt(s.forecast, dayName, s.hour)
      row.newBusyness = busynessAt(s.forecast, dayName, newHour)
      sumBefore += row.oldBusyness
      sumAfter += row.newBusyness
      tracked++
    }
    rows.push(row)
  }
  rows.sort((a, b) => (a.newHour === null ? 99 : a.newHour) - (b.newHour === null ? 99 : b.newHour))

  return {
    rows,
    unplaced,
    avgBefore: tracked ? Math.round(sumBefore / tracked) : null,
    avgAfter: tracked ? Math.round(sumAfter / tracked) : null,
    fixedProblems // how many stops had a time that broke a rule before
  }
}
