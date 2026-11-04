// =====================================================================
// Day optimizer: puts one day's stops in a better order.
//
//   import { optimizeDay } from './dayOptimizer.js'
//   const result = optimizeDay(stops, rainByHour, { dayStart: 9, dayEnd: 21, from, end, travel })
//   result.after.items  -> [{ stop, start, travelMin, mode, reasons: [...] }]
//   result.summary      -> "Route optimized: 15.0 → 10.5 km."
//
// A stop: { id, name, lat, lon, duration (hours), outdoor, locked, hour,
//           crowd: [24 numbers 0-100] or null, open, close, closedToday }
// rainByHour: 24 numbers, chance of rain 0-1 for each hour of the day.
//
// How it works:
//  1. Try every order of the flexible stops (locked stops keep their time).
//  2. Time each order: a stop starts when you get there (rounded up to 15 min), or when it opens.
//  3. Pick the order with the fewest warnings (the ⚠ list: closed, outside your day, late for a
//     fixed time, outdoors in rain, peak crowds). Equal warnings: the shortest distance wins.
//     Distance = road km of every leg (hotel -> stops -> hotel), the same whichever way you travel.
// =====================================================================

// ---------- distances ----------
export function haversineKm(a, b) {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLon = (b.lon - a.lon) * r
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(x))
}

// ---------- getting from one stop to the next ----------
// Every way to get there, with its time. Times only come from the server's route lookup (Geoapify, tp.real):
// until they arrive, or if there's no route, the leg has no options and its travel time isn't counted.
// tp ("travel preferences", from Settings → Transport):
//   { modes: ['walk', 'transit', 'taxi', 'bike'], maxWalk: 20, priority: 'balanced' | 'fastest' | 'cheapest',
//     group: 4 (people sharing a taxi), real: { 'lat,lon>lat,lon': { walk: { min, km }, taxi: {...}, ... } } }
// cost = order only, for "Cheapest" (walking is free, a taxi costs more than a bus or bike share).
// We have no fare data, so no prices are shown.
export const TRAVEL_MODES = {
  walk: { label: 'Walk', icon: 'footprints', cost: 0, maps: 'walking' },
  bike: { label: 'Bike', icon: 'bike', cost: 1, maps: 'bicycling' },
  transit: { label: 'Transit', icon: 'train', cost: 1, maps: 'transit' },
  taxi: { label: 'Taxi', icon: 'car', cost: 3, maps: 'driving' }
}
export const DEFAULT_TRAVEL = { modes: ['walk', 'transit', 'taxi'], maxWalk: 20, priority: 'balanced', group: 1, real: {} }

// The key a route is saved under: both ends, to about 10 m
export function legKey(a, b) {
  return a.lat.toFixed(4) + ',' + a.lon.toFixed(4) + '>' + b.lat.toFixed(4) + ',' + b.lon.toFixed(4)
}
// Two names for one spot (same point to 4 decimals, about 10 m)
export function samePoint(a, b) {
  const [from, to] = legKey(a, b).split('>')
  return from === to
}

// Every way from a to b: [{ mode, min, km, live (a real route, not a guess), allowed (in your preferences) }]
// Where you are when you leave a stop: a flight ends at another airport (endLat/endLon), everything else where it is
export function exitOf(s) {
  return s && s.endLat != null ? { ...s, lat: s.endLat, lon: s.endLon } : s
}

export function travelOptions(a, b, tp = DEFAULT_TRAVEL) {
  a = exitOf(a)
  if (!a || !b || a.lat == null || b.lat == null) return []
  const km = haversineKm(a, b)
  const real = (tp.real && tp.real[legKey(a, b)]) || {}
  const list = []
  for (const mode of ['walk', 'transit', 'taxi', 'bike']) {
    if (mode === 'transit' && km < 0.6) continue // a bus for a few hundred metres? just walk
    const r = real[mode]
    if (!r) continue // no route for this way: not shown (never guessed)
    // Transit times from the route lookup are Geoapify's own approximation (no timetables), so not "live"
    list.push({ mode, min: r.min, km: r.km != null ? r.km : km, live: mode !== 'transit', allowed: tp.modes.includes(mode) })
  }
  return list
}

// Which way we suggest, and why. Balanced (default): walk if it's within your limit, otherwise
// public transport, and a taxi only when it saves a lot of time. Fastest / cheapest do what they say.
export function recommendTravel(options, tp = DEFAULT_TRAVEL) {
  let pool = options.filter((o) => o.allowed)
  if (!pool.length) pool = options
  const by = (mode) => pool.find((o) => o.mode === mode)
  const walk = by('walk')
  const walkOk = walk && walk.min <= tp.maxWalk
  const tooFar = walk && !walkOk ? 'walking is ' + walk.min + ' min, over your ' + tp.maxWalk + '-min limit' : ''
  const fastest = pool.slice().sort((x, y) => x.min - y.min)[0]
  if (!fastest) return null

  if (tp.priority === 'fastest') {
    if (walkOk && walk.min <= fastest.min + 3) return { option: walk, reason: 'walking is about as quick' }
    return { option: fastest, reason: 'fastest' + (tooFar ? '; ' + tooFar : '') }
  }
  if (tp.priority === 'cheapest') {
    if (walkOk) return { option: walk, reason: 'free, and within your walking limit' }
    const cheap = pool.filter((o) => o.mode !== 'walk').sort((x, y) => TRAVEL_MODES[x.mode].cost - TRAVEL_MODES[y.mode].cost || x.min - y.min)[0]
    if (cheap) return { option: cheap, reason: 'cheapest' + (tooFar ? '; ' + tooFar : '') }
    return { option: walk, reason: 'the only way you allowed' }
  }
  // balanced
  if (walkOk) return { option: walk, reason: 'short walk' }
  const bike = by('bike')
  const transit = by('transit')
  const taxi = by('taxi')
  if (bike && bike.min <= 20 && (!transit || bike.min <= transit.min + 5)) return { option: bike, reason: 'quick ride' + (tooFar ? '; ' + tooFar : '') }
  if (transit) {
    // A taxi only when transit is long and the taxi saves at least 20 minutes
    if (taxi && transit.min > 40 && transit.min - taxi.min >= 20) {
      return { option: taxi, reason: 'saves ' + (transit.min - taxi.min) + ' min over transit' }
    }
    return { option: transit, reason: tooFar || 'public transport' }
  }
  return { option: fastest, reason: tooFar || 'fastest' }
}

// How you'll get from a to b: the way the group picked (b.travelMode, if it was picked for coming
// from a), otherwise the suggestion. No map point or no route yet: mode 'unknown', and its time
// isn't counted (min 0). missing = 'place' (not on the map) | 'route' (no route found yet).
export function travelBetween(a, b, tp = DEFAULT_TRAVEL) {
  a = exitOf(a)
  if (!a || !b || a.lat == null || b.lat == null) return { min: 0, mode: 'unknown', km: null, missing: 'place' }
  // The same spot twice (a place on the day again, or a hotel visit at your hotel): nothing to travel
  if (samePoint(a, b)) return { min: 0, mode: 'same', km: 0, live: true }
  const options = travelOptions(a, b, tp)
  if (!options.length) return { min: 0, mode: 'unknown', km: null, missing: 'route' }
  const rec = recommendTravel(options, tp)
  const picked = b.travelMode && b.travelFrom === a.id ? options.find((o) => o.mode === b.travelMode) : null
  const use = picked || rec.option
  return { min: use.min, mode: use.mode, km: use.km, live: use.live, picked: !!picked, recommended: rec.option.mode, reason: rec.reason }
}

// Every pair once, so the search doesn't redo the maths
export function travelMatrix(stops, tp) {
  const matrix = {}
  for (const a of stops) {
    matrix[a.id] = {}
    for (const b of stops) matrix[a.id][b.id] = a.id === b.id ? { min: 0, mode: 'walk', km: 0 } : travelBetween(a, b, tp)
  }
  return matrix
}

// ---------- crowds & weather ----------
// Crowd % from the stop's BestTime curve (stop.crowd). No data = 0, so crowds don't count for that stop.
export function crowdAt(stop, start) {
  const curve = stop.crowd
  if (!curve) return 0
  const hours = Math.max(1, Math.round(stop.duration || 1))
  let total = 0
  for (let k = 0; k < hours; k++) total += curve[Math.floor(start + k) % 24] || 0
  return total / hours
}

// Highest chance of rain while you're there
export function rainDuring(rainByHour, start, duration) {
  if (!rainByHour) return 0
  let worst = 0
  for (let h = Math.floor(start); h < Math.ceil(start + (duration || 1)); h++) worst = Math.max(worst, rainByHour[h % 24] || 0)
  return worst
}

const quarter = (h) => Math.ceil(h * 4 - 1e-9) / 4 // round up to the next 15 minutes

// ---------- distance (what Optimize Route compares) ----------
// Road km from a to b: the length of the driving route if we have it, else the straight line.
// It doesn't depend on how you'll travel, so a taxi or a bus can't change which order wins.
export function legKm(a, b, tp = DEFAULT_TRAVEL) {
  a = exitOf(a)
  if (!a || !b || a.lat == null || b.lat == null) return 0
  const real = tp.real && tp.real[legKey(a, b)]
  return real && real.taxi && real.taxi.km != null ? real.taxi.km : haversineKm(a, b)
}

// Total km for stops in this order, from where the day starts to where it ends
export function routeKm(stops, opts = {}) {
  const path = [opts.from, ...stops, opts.end].filter(Boolean)
  let km = 0
  for (let i = 1; i < path.length; i++) km += legKm(path[i - 1], path[i], opts.travel || DEFAULT_TRAVEL)
  return Math.round(km * 10) / 10
}

// ---------- building a day from an order ----------
// order: flexible stops in visiting order. locked: stops with a fixed time.
// opts: { dayStart, buffer (hours kept free between stops, from Preferences),
//         from (where you leave from: hotel / airport, or the stop you're at when re-planning) }
// A flexible stop goes before the next locked one only if it fits (getting there and the buffer included).
export function scheduleInOrder(order, locked, matrix, opts) {
  const anchors = locked.slice().sort((a, b) => a.hour - b.hour)
  const items = []
  const queue = order.slice()
  const buffer = opts.buffer || 0
  let time = opts.dayStart
  let prev = opts.from || null
  let li = 0
  const travel = (a, b) => (a ? matrix[a.id][b.id] : { min: 0, mode: 'start', km: 0 })

  while (queue.length || li < anchors.length) {
    const lock = anchors[li]
    if (queue.length) {
      const s = queue[0]
      const t = travel(prev, s)
      const arrive = time + t.min / 60 + (prev ? buffer : 0)
      // If we arrive before the place opens, wait until opening time.
      const start = quarter(Math.max(arrive, s.open ?? arrive))
      const end = start + (s.duration || 1)
      if (!lock || end + travel(s, lock).min / 60 + buffer <= lock.hour + 1e-9) {
        items.push({ stop: s, start, travelMin: t.min, mode: t.mode, km: t.km, waitMin: 0, lateMin: 0 })
        time = end
        prev = s
        queue.shift()
        continue
      }
    }
    const t = travel(prev, lock)
    const arrive = time + t.min / 60
    items.push({
      stop: lock, start: lock.hour, travelMin: t.min, mode: t.mode, km: t.km,
      waitMin: Math.max(0, Math.round((lock.hour - arrive) * 60)),
      lateMin: Math.max(0, Math.round((arrive - lock.hour) * 60))
    })
    time = Math.max(arrive, lock.hour) + (lock.duration || 1)
    prev = lock
    li++
  }
  // Always in clock order (a locked stop set before the day starts would otherwise come out of order)
  return items.sort((a, b) => a.start - b.start)
}

// Timeline from the times the stops already have (the "before" picture)
export function scheduleAsIs(stops, matrix) {
  const sorted = stops.slice().sort((a, b) => a.hour - b.hour)
  const items = []
  let prev = null
  let time = null
  for (const s of sorted) {
    const t = prev ? matrix[prev.id][s.id] : { min: 0, mode: 'start', km: 0 }
    const arrive = time === null ? s.hour : time + t.min / 60
    items.push({
      stop: s, start: s.hour, travelMin: t.min, mode: t.mode, km: t.km,
      waitMin: 0, lateMin: Math.max(0, Math.round((arrive - s.hour) * 60))
    })
    time = s.hour + (s.duration || 1)
    prev = s
  }
  return items
}

// ---------- warnings (the ⚠ list, and what Optimize Route counts) ----------
// Crowd warnings follow "Avoid peak crowds" (Preferences): Relaxed never, Balanced at Peak (80%+), Strict at Busy (55%+)
export const CROWD_LIMIT = { low: null, medium: 80, high: 55 }

export function warningsFor(it, rainByHour, opts) {
  const s = it.stop
  const dur = s.duration || 1
  const out = []
  if (opts && it.start + dur > opts.dayEnd + 0.01) out.push({ icon: '⏰', text: 'Ends after your day ends' })
  if (opts && it.start < opts.dayStart - 0.01) out.push({ icon: '🌅', text: 'Before your day starts' })
  if (s.outdoor && rainDuring(rainByHour, it.start, dur) >= 0.5) out.push({ icon: '🌧️', text: 'Outdoors during predicted rain' })
  const crowdLimit = opts && opts.crowdLimit !== undefined ? opts.crowdLimit : 80
  const busy = crowdAt(s, it.start)
  if (!s.locked && crowdLimit != null && busy >= crowdLimit) out.push({ icon: '👥', text: (busy >= 80 ? 'Peak crowds' : 'Busy') + ' at this time' })
  if (s.closedToday) out.push({ icon: '🚪', text: 'Closed all day' })
  else if ((s.open != null && it.start < s.open) || (s.close != null && it.start + dur > s.close)) out.push({ icon: '🚪', text: 'Closed at this time' })
  if (it.lateMin > 0) out.push({ icon: '⚠️', text: "Can't get here in time from the previous stop" })
  return out
}

// ---------- the "why" pills (shown on the preview) ----------
const fmt = (h) => {
  const hour = Math.floor(h) % 24
  const min = Math.round((h - Math.floor(h)) * 60)
  return (hour % 12 === 0 ? 12 : hour % 12) + (min ? ':' + String(min).padStart(2, '0') : '') + (hour >= 12 ? ' PM' : ' AM')
}

export function reasonsFor(it, index, rainByHour, dayHasRain) {
  const s = it.stop
  const reasons = []
  if (s.locked) {
    reasons.push({ icon: '🔒', text: 'Fixed time', kind: 'lock' })
  } else {
    const rain = rainDuring(rainByHour, it.start, s.duration)
    const busy = Math.round(crowdAt(s, it.start))
    if (s.outdoor === false && rain >= 0.5) reasons.push({ icon: '🌧️', text: fmt(it.start) + ' slot: indoors during predicted rain', kind: 'rain' })
    else if (s.outdoor && dayHasRain && rain < 0.3) reasons.push({ icon: '🌤️', text: 'Dry window for an outdoor visit', kind: 'rain' })
    if (busy && busy < 45) reasons.push({ icon: '👥', text: 'Quieter time (~' + busy + '% busy)', kind: 'crowd' })
  }
  if (index === 0) reasons.push({ icon: '📍', text: 'First stop of the day', kind: 'travel' })
  else if (it.mode === 'walk') reasons.push({ icon: '🚶', text: it.travelMin + ' min walk from the previous stop', kind: 'travel' })
  else if (it.mode === 'transit') reasons.push({ icon: '🚇', text: it.travelMin + ' min by transit from the previous stop', kind: 'travel' })
  else if (it.mode === 'taxi') reasons.push({ icon: '🚕', text: it.travelMin + ' min by taxi from the previous stop', kind: 'travel' })
  else if (it.mode === 'bike') reasons.push({ icon: '🚲', text: it.travelMin + ' min by bike from the previous stop', kind: 'travel' })
  if (it.waitMin >= 20) reasons.push({ icon: '⏳', text: it.waitMin + ' min free before this', kind: 'wait' })
  return reasons
}

// ---------- the main function ----------
function permutations(list) {
  if (list.length <= 1) return [list.slice()]
  const out = []
  for (let i = 0; i < list.length; i++) {
    const rest = list.slice(0, i).concat(list.slice(i + 1))
    for (const p of permutations(rest)) out.push([list[i]].concat(p))
  }
  return out
}

export function optimizeDay(stops, rainByHour, opts = {}) {
  const options = { dayStart: 9, dayEnd: 21, ...opts }
  // options.from / options.end: where the day starts and ends (your hotel, or the airport), if known
  const ends = [options.from, options.end].filter(Boolean)
  const matrix = travelMatrix(stops.concat(ends), options.travel) // times use each person's way of getting around (Settings)
  const locked = stops.filter((s) => s.locked)
  const flex = stops.filter((s) => !s.locked)

  // The two numbers every plan is judged by
  const rate = (items) => ({
    items,
    warnings: items.reduce((n, it) => n + warningsFor(it, rainByHour, options).length, 0),
    km: routeKm(items.map((it) => it.stop), options)
  })
  const beats = (x, y) => x.warnings < y.warnings || (x.warnings === y.warnings && x.km < y.km - 0.05)

  const before = rate(scheduleAsIs(stops, matrix))
  // Every order of the flexible stops. A day with more than 8 would be too many orders
  // (9 stops = 362,880): those keep reversing stretches of the order while that helps (2-opt).
  let best = null
  const consider = (order) => {
    const r = rate(scheduleInOrder(order, locked, matrix, options))
    if (!best || beats(r, best)) best = r
    return r === best
  }
  if (flex.length <= 8) {
    for (const order of permutations(flex)) consider(order)
  } else {
    let order = flex.slice().sort((a, b) => a.hour - b.hour)
    consider(order)
    for (let improved = true; improved;) {
      improved = false
      for (let i = 0; i < order.length - 1; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const next = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1))
          if (consider(next)) { order = next; improved = true }
        }
      }
    }
  }

  const better = beats(best, before)
  const after = better ? best : before
  const dayHasRain = (rainByHour || []).some((p) => p >= 0.5)
  after.items.forEach((it, i) => { it.reasons = reasonsFor(it, i, rainByHour, dayHasRain) })

  return { before, after, better, hasWarnings: after.warnings > 0, summary: summarize(before, after) }
}

// e.g. "Route optimized: 1 fewer warning, 15.0 → 10.5 km."
function summarize(before, after) {
  const parts = []
  const fixed = before.warnings - after.warnings
  if (fixed > 0) parts.push(fixed + ' fewer warning' + (fixed === 1 ? '' : 's'))
  if (Math.abs(before.km - after.km) >= 0.05) parts.push(before.km.toFixed(1) + ' → ' + after.km.toFixed(1) + ' km')
  if (!parts.length) return 'Your day is already in a good order.'
  return 'Route optimized: ' + parts.join(', ') + '.'
}


// 3-hour forecast blocks ({ time, span, rain }) -> chance of rain for each hour
// Uses OpenWeather's own chance of rain (pop). Hours without a forecast count as 0 (no data, no rain counted).
export function rainFromBlocks(blocks) {
  const hours = new Array(24).fill(0)
  for (const b of blocks || []) {
    const chance = typeof b.pop === 'number' ? b.pop : b.rain ? 1 : 0
    for (let h = b.time; h < b.time + (b.span || 3) && h < 24; h++) hours[h] = chance
  }
  return hours
}
