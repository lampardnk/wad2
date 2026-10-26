// =====================================================================
// Day optimizer: puts one day's stops in a better order and time.
//
//   import { optimizeDay, scheduleInOrder } from './dayOptimizer.js'
//   const result = optimizeDay(stops, rainByHour, { dayStart: 9, dayEnd: 21 })
//   result.after.items  -> [{ stop, start, travelMin, mode, reasons: [...] }]
//   result.summary      -> "Saves 38 mins of travel and avoids afternoon rain"
//
// A stop: { id, name, lat, lon, duration (hours), outdoor, locked, hour,
//           crowd: [24 numbers 0-100] or null, popular, open, close }
// rainByHour: 24 numbers, chance of rain 0-1 for each hour of the day.
//
// How it works:
//  1. Travel times between every pair of stops (straight-line distance -> walk or transit minutes).
//  2. For an order of the flexible stops, build the day: each stop starts when you arrive
//     (rounded up to 15 min); locked stops keep their time and the others fit around them.
//  3. Give that day a cost: travel + waiting + crowds (outdoor sights count more) + rain on
//     outdoor stops + being closed / running late. Lower is better.
//  4. Try every order (up to 7 flexible stops = 5040 orders), or 2-opt swaps for longer days,
//     and keep the cheapest. Then explain each stop's time with short "reason" pills.
// =====================================================================

// How much each problem counts (in "minutes of travel" so they can be added up)
export const WEIGHTS = {
  travel: 1,     // per minute travelling
  wait: 0.3,     // per minute waiting for a locked stop
  crowd: 0.5,    // per % busy (outdoor), half for indoor
  rain: 90,      // outdoor stop in certain rain
  dryIndoor: 8,  // small bonus for an indoor stop during rain
  closed: 300,   // visiting outside opening hours
  late: 5,       // per minute late for a locked stop
  overtime: 2    // per minute past the end of the day
}

// ---------- distances ----------
export function haversineKm(a, b) {
  const r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r
  const dLon = (b.lon - a.lon) * r
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(x))
}

// ---------- getting from one stop to the next ----------
// Every way to get there, with its time. Real times come from the server's route lookup (tp.real);
// until they arrive (or without a map key) we estimate from the straight-line distance.
// tp ("travel preferences", from Settings → Transport):
//   { modes: ['walk', 'transit', 'taxi', 'bike'], maxWalk: 20, priority: 'balanced' | 'fastest' | 'cheapest',
//     group: 4 (people sharing a taxi), real: { 'lat,lon>lat,lon': { walk: { min, km }, taxi: {...}, ... } } }
export const TRAVEL_MODES = {
  walk: { label: 'Walk', icon: 'footprints', cost: 0, costText: 'Free', maps: 'walking' },
  bike: { label: 'Bike', icon: 'bike', cost: 1, costText: '$ bike share', maps: 'bicycling' },
  transit: { label: 'Transit', icon: 'train', cost: 1, costText: '$ fare', maps: 'transit' },
  taxi: { label: 'Taxi', icon: 'car', cost: 3, costText: '$$$', maps: 'driving' }
}
export const DEFAULT_TRAVEL = { modes: ['walk', 'transit', 'taxi'], maxWalk: 20, priority: 'balanced', group: 1, real: {} }

// The key a route is saved under: both ends, to about 10 m
export function legKey(a, b) {
  return a.lat.toFixed(4) + ',' + a.lon.toFixed(4) + '>' + b.lat.toFixed(4) + ',' + b.lon.toFixed(4)
}

// Straight-line guesses (minutes). Walking and cycling paths are ~25% longer than a straight line,
// roads ~30%. Transit adds ~8 min of walking to the stop and waiting; a taxi ~5 min to arrive.
function estimateMin(mode, km) {
  if (mode === 'walk') return Math.max(3, Math.round((km * 1.25) / 4.8 * 60))
  if (mode === 'bike') return Math.round(3 + (km * 1.25) / 14 * 60)
  if (mode === 'transit') return Math.round(8 + (km * 1.3) / 22 * 60)
  return Math.round(5 + (km * 1.3) / 24 * 60)
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
    let min = r ? r.min : estimateMin(mode, km)
    if (r && mode === 'taxi') min += 5 // the route is driving time; add the wait for the car
    // Transit times from the route lookup are still approximate (no timetables)
    list.push({ mode, min, km: r && r.km != null ? r.km : km, live: !!r && mode !== 'transit', allowed: tp.modes.includes(mode) })
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
    return { option: transit, reason: tooFar || 'good value' }
  }
  return { option: fastest, reason: tooFar || 'fastest' }
}

// How you'll get from a to b: the way the group picked (b.travelMode, if it was picked for coming
// from a), otherwise the suggestion. Without tp it's the old simple rule (walk up to 1.3 km, else transit).
// Unknown places (not on the map) count as 15 min.
export function travelBetween(a, b, tp) {
  a = exitOf(a)
  if (!a || !b || a.lat == null || b.lat == null) return { min: 15, mode: 'unknown', km: null }
  if (!tp) {
    const km = haversineKm(a, b)
    if (km <= 1.3) return { min: estimateMin('walk', km), mode: 'walk', km }
    return { min: estimateMin('transit', km), mode: 'transit', km }
  }
  const options = travelOptions(a, b, tp)
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
// Typical crowd curve when we have no real data: outdoor sights peak 11 AM - 3 PM
const OUTDOOR_CURVE = [5, 5, 5, 5, 5, 5, 10, 20, 30, 45, 65, 85, 95, 95, 85, 65, 50, 40, 35, 30, 20, 10, 5, 5]
const INDOOR_CURVE = [5, 5, 5, 5, 5, 5, 5, 10, 20, 35, 50, 60, 70, 70, 65, 60, 50, 40, 35, 25, 15, 10, 5, 5]

export function crowdAt(stop, start) {
  const curve = stop.crowd || (stop.popular === false ? null : stop.outdoor ? OUTDOOR_CURVE : INDOOR_CURVE)
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

// ---------- meals ----------
// from = earliest start, latest = last sensible start, duration in hours
export const MEALS = {
  breakfast: { key: 'breakfast', label: 'Breakfast', icon: '🥐', from: 7, latest: 10, duration: 0.75 },
  lunch: { key: 'lunch', label: 'Lunch', icon: '🍜', from: 11.5, latest: 13.5, duration: 1 },
  dinner: { key: 'dinner', label: 'Dinner', icon: '🍽', from: 17.5, latest: 20, duration: 1.25 }
}
const FOOD_WORDS = ['restaurant', 'market', 'cafe', 'café', 'food', 'ramen', 'sushi', 'izakaya', 'bbq', 'hawker', 'bistro', 'eatery', 'kyoja', 'noodle']

// 'breakfast' | 'lunch' | 'dinner' (named meals), 'food' (somewhere to eat, any meal) or null
export function mealOf(stop) {
  const name = (stop.name || '').toLowerCase()
  if (/breakfast|brunch/.test(name)) return 'breakfast'
  if (/lunch/.test(name)) return 'lunch'
  if (/dinner|supper/.test(name)) return 'dinner'
  for (const w of FOOD_WORDS) if (name.includes(w)) return 'food'
  return null
}

// Which meal breaks the day needs: lunch unless a lunch (or a food place) is planned,
// dinner unless a dinner (or a second food place) is planned. Only meals inside your day count.
// Breakfast is assumed at the hotel. opts.meals === false turns breaks off.
export function mealsNeeded(stops, opts) {
  if (opts.meals === false) return []
  let food = 0
  const named = {}
  for (const s of stops) {
    const m = mealOf(s)
    if (m === 'food') food++
    else if (m) named[m] = true
  }
  const out = []
  if (!named.lunch && food < 1) out.push(MEALS.lunch)
  if (!named.dinner && food < 2) out.push(MEALS.dinner)
  return out.filter((m) => opts.dayStart <= m.latest && opts.dayEnd >= m.from + m.duration)
}

function mealBreak(m, start) {
  return {
    stop: { id: 'meal-' + m.key, name: m.label + ' break', virtual: true, meal: m.key, icon: m.icon, duration: m.duration },
    start, travelMin: 0, mode: 'break', km: 0, waitMin: 0, lateMin: 0
  }
}

// How long a stop usually takes when nothing better is known (hours)
export function defaultDuration(stop) {
  const kind = mealOf(stop)
  if (MEALS[kind]) return MEALS[kind].duration
  if (kind === 'food') return 1
  const name = (stop.name || '').toLowerCase()
  if (/museum|gallery|palace|castle|zoo|aquarium|theme park|disney|universal/.test(name)) return 2
  if (/park|garden|hike|trail|mountain|beach|forest|grove|lake/.test(name)) return 1.5
  if (/temple|shrine|church|mosque|cathedral|-ji|dera|taisha|statue|monument|tower|viewpoint/.test(name)) return 1
  if (/mall|market|shopping|street|outlet/.test(name)) return 1.5
  return 1.5
}

// ---------- building a day from an order ----------
// order: flexible stops in visiting order. locked: stops with a fixed time.
// opts: { dayStart, dayEnd, buffer (hours kept free between stops, from Preferences),
//         from (stop you're leaving from, for re-planning the rest of a day),
//         allStops (the whole day, so meals already planned earlier still count) }
export function scheduleInOrder(order, locked, matrix, opts) {
  const anchors = locked.slice().sort((a, b) => a.hour - b.hour)
  const items = []
  const queue = order.slice()
  const buffer = opts.buffer || 0
  let time = opts.dayStart
  let prev = opts.from || null
  let li = 0
  const travel = (a, b) => (a ? matrix[a.id][b.id] : { min: 0, mode: 'start', km: 0 })
  // Meal breaks still to fit in (lunch, dinner)
  const breaks = mealsNeeded(opts.allStops || order.concat(locked), opts)
  let bi = 0
  const takeBreak = () => {
    const m = breaks[bi++]
    const start = quarter(Math.max(time, m.from))
    items.push(mealBreak(m, start))
    time = start + m.duration
  }

  while (queue.length || li < anchors.length) {
    const lock = anchors[li]
    while (bi < breaks.length && time > breaks[bi].latest + 1e-9) bi++ // too late for that meal now
    const meal = breaks[bi]
    if (queue.length) {
      const s = queue[0]
      const t = travel(prev, s)
      const arrive = time + t.min / 60 + (prev ? buffer : 0)

      // If we arrive before the place opens, wait until opening time.
      const start = quarter(Math.max(arrive, s.open ?? arrive))
      const end = start + (s.duration || 1)
      // Would this stop run past the latest time to eat? Eat first.
      if (meal && end > meal.latest + 1e-9 && (!lock || Math.max(time, meal.from) + meal.duration <= lock.hour)) {
        takeBreak()
        continue
      }
      // Fits before the next locked stop (including getting there and the buffer)?
      if (!lock || end + travel(s, lock).min / 60 + buffer <= lock.hour + 1e-9) {
        items.push({ stop: s, start, travelMin: t.min, mode: t.mode, km: t.km, waitMin: 0, lateMin: 0 })
        time = end
        prev = s
        queue.shift()
        continue
      }
    }
    if (lock) {
      // Room to eat before a locked stop that starts after the meal window?
      if (meal && lock.hour > meal.latest && Math.max(time, meal.from) + meal.duration + travel(prev, lock).min / 60 <= lock.hour + 1e-9 &&
          !(mealOf(lock) === meal.key)) {
        takeBreak()
        continue
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
  }
  // Always in clock order (a locked stop set before the day starts would otherwise come out of order)
  return items.sort((a, b) => a.start - b.start)
}

// Meal breaks for a timeline that already has times: put each needed meal in the first gap
// that fits it; if the stops run straight through mealtime, flag the stop that's in the way.
export function addMealBreaks(items, stops, opts) {
  const out = items.slice()
  for (const m of mealsNeeded(stops, opts)) {
    let placed = false
    for (let i = 0; i <= out.length && !placed; i++) {
      const before = out[i - 1]
      const after = out[i]
      if (!before && !after) break
      const gapStart = before ? before.start + (before.stop.duration || 1) : opts.dayStart
      const gapEnd = after ? after.start - (after.travelMin || 0) / 60 : opts.dayEnd
      if (!before || !after) continue // only between two stops (not before the day starts / after it ends)
      const start = quarter(Math.max(gapStart, m.from))
      if (start <= m.latest + 1e-9 && start + m.duration <= gapEnd + 1e-9) {
        out.splice(i, 0, mealBreak(m, start))
        placed = true
      }
    }
    if (!placed) {
      // Something is planned right through the meal: say so on that stop
      const mid = m.from + 1
      for (const it of out) {
        if (!it.stop.virtual && it.start <= mid && it.start + (it.stop.duration || 1) >= mid) {
          it.skipsMeal = m.label
          break
        }
      }
    }
  }
  return out
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

// ---------- scoring ----------
export function measure(items, rainByHour, opts) {
  const m = { cost: 0, travelMin: 0, waitMin: 0, lateMin: 0, crowd: 0, rainOutdoor: 0, closed: 0, overtimeMin: 0, earlyMin: 0, end: opts.dayStart }
  for (const it of items) {
    const s = it.stop
    if (s.virtual) continue // meal breaks
    const dur = s.duration || 1
    const kind = mealOf(s)
    const offFrom = (meal) => (it.start < meal.from ? meal.from - it.start : it.start > meal.latest ? it.start - meal.latest : 0)
    if (MEALS[kind]) {
      // e.g. "Lunch at …" at 4 PM: costs 2 per minute outside its window
      m.cost += offFrom(MEALS[kind]) * 60 * 2
    } else if (kind === 'food') {
      // A restaurant or food market: best at lunch or dinner time (whichever is closer)
      m.cost += Math.min(offFrom(MEALS.lunch), offFrom(MEALS.dinner)) * 60
    }
    m.travelMin += it.travelMin
    m.waitMin += it.waitMin
    m.lateMin += it.lateMin
    const busy = crowdAt(s, it.start)
    const rain = rainDuring(rainByHour, it.start, dur)
    if (!s.locked) {
      m.crowd += busy * (s.outdoor ? 1 : 0.5)
      if (s.outdoor) m.rainOutdoor += rain
    }
    if ((s.open != null && it.start < s.open) || (s.close != null && it.start + dur > s.close)) m.closed++
    m.end = Math.max(m.end, it.start + dur)
    // Starting before the day does (e.g. before your flight lands) costs like running over
    if (it.start < opts.dayStart - 0.01) m.earlyMin += Math.round((opts.dayStart - it.start) * 60)
    m.cost += (s.locked ? 0 : busy * WEIGHTS.crowd * (opts.crowdWeight || 1) * (s.outdoor ? 1 : 0.5))
    m.cost += s.outdoor ? rain * WEIGHTS.rain : -rain * WEIGHTS.dryIndoor
  }
  m.overtimeMin = Math.max(0, Math.round((m.end - opts.dayEnd) * 60))
  m.cost += m.travelMin * WEIGHTS.travel + m.waitMin * WEIGHTS.wait + m.lateMin * WEIGHTS.late +
    m.closed * WEIGHTS.closed + (m.overtimeMin + m.earlyMin) * WEIGHTS.overtime
  return m
}

// ---------- searching for the best order ----------
function permutations(list) {
  if (list.length <= 1) return [list.slice()]
  const out = []
  for (let i = 0; i < list.length; i++) {
    const rest = list.slice(0, i).concat(list.slice(i + 1))
    for (const p of permutations(rest)) out.push([list[i]].concat(p))
  }
  return out
}

// Longer days: start from nearest-neighbour, then keep reversing chunks (2-opt) while it helps
function twoOpt(flex, locked, matrix, rain, opts) {
  const order = [flex[0]]
  const left = flex.slice(1)
  while (left.length) {
    const last = order[order.length - 1]
    left.sort((a, b) => matrix[last.id][a.id].min - matrix[last.id][b.id].min)
    order.push(left.shift())
  }
  let best = order
  let bestCost = measure(scheduleInOrder(best, locked, matrix, opts), rain, opts).cost
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const next = best.slice(0, i).concat(best.slice(i, j + 1).reverse(), best.slice(j + 1))
        const c = measure(scheduleInOrder(next, locked, matrix, opts), rain, opts).cost
        if (c < bestCost - 0.01) {
          best = next
          bestCost = c
          improved = true
        }
      }
    }
  }
  return best
}

// ---------- the "why" pills ----------
const fmt = (h) => {
  const hour = Math.floor(h) % 24
  const min = Math.round((h - Math.floor(h)) * 60)
  return (hour % 12 === 0 ? 12 : hour % 12) + (min ? ':' + String(min).padStart(2, '0') : '') + (hour >= 12 ? ' PM' : ' AM')
}

export function reasonsFor(it, index, rainByHour, dayHasRain) {
  const s = it.stop
  const reasons = []
  if (s.virtual) return reasons
  const kind = mealOf(s)
  const inWindow = (meal) => it.start >= meal.from - 0.01 && it.start <= meal.latest + 0.01
  const meal = MEALS[kind] || (kind === 'food' ? [MEALS.lunch, MEALS.dinner].find(inWindow) : null)
  if (meal && inWindow(meal)) reasons.push({ icon: meal.icon, text: meal.label + ' time', kind: 'crowd' })
  if (s.locked) {
    reasons.push({ icon: '🔒', text: 'Fixed time', kind: 'lock' })
  } else {
    const rain = rainDuring(rainByHour, it.start, s.duration)
    const busy = Math.round(crowdAt(s, it.start))
    if (!s.outdoor && rain >= 0.5) reasons.push({ icon: '🌧️', text: fmt(it.start) + ' slot: indoors during predicted rain', kind: 'rain' })
    else if (s.outdoor && dayHasRain && rain < 0.3) reasons.push({ icon: '🌤️', text: 'Dry window for an outdoor visit', kind: 'rain' })
    if (s.outdoor && it.start + (s.duration || 1) <= 11.01) reasons.push({ icon: '☀️', text: 'Morning slot: beats the 11 AM crowd rush', kind: 'crowd' })
    else if (s.outdoor && it.start >= 15) reasons.push({ icon: '🌇', text: 'Late slot: crowds thin out after 3 PM', kind: 'crowd' })
    else if (busy && busy < 45) reasons.push({ icon: '👥', text: 'Quieter time (~' + busy + '% busy)', kind: 'crowd' })
  }
  if (index === 0) reasons.push({ icon: '📍', text: 'First stop of the day', kind: 'travel' })
  else if (it.mode === 'walk') reasons.push({ icon: '🚶', text: it.travelMin + ' min walk from the previous stop', kind: 'travel' })
  else if (it.mode === 'transit') reasons.push({ icon: '🚇', text: it.travelMin + ' min by transit from the previous stop', kind: 'travel' })
  else if (it.mode === 'taxi') reasons.push({ icon: '🚕', text: it.travelMin + ' min by taxi from the previous stop', kind: 'travel' })
  else if (it.mode === 'bike') reasons.push({ icon: '🚲', text: it.travelMin + ' min by bike from the previous stop', kind: 'travel' })
  if (it.waitMin >= 20) reasons.push({ icon: '⏳', text: it.waitMin + ' min free before this', kind: 'wait' })
  return reasons
}

// Problems with the current plan, shown before optimizing
export function warningsFor(it, rainByHour, opts) {
  const s = it.stop
  const out = []
  if (s.virtual) return out
  if (it.skipsMeal) out.push({ icon: '🍽', text: 'No time for ' + it.skipsMeal.toLowerCase() })
  const meal = MEALS[mealOf(s)]
  if (meal && (it.start < meal.from - 0.01 || it.start > meal.latest + 0.01)) out.push({ icon: meal.icon, text: 'Not at a usual ' + meal.label.toLowerCase() + ' time' })
  if (opts && it.start + (s.duration || 1) > opts.dayEnd + 0.01) out.push({ icon: '⏰', text: 'Ends after your day ends' })
  if (opts && s.locked && it.start < opts.dayStart - 0.01) out.push({ icon: '🌅', text: 'Before your day starts' })
  if (s.outdoor && rainDuring(rainByHour, it.start, s.duration) >= 0.5) out.push({ icon: '🌧️', text: 'Outdoors during predicted rain' })
  if (!s.locked && crowdAt(s, it.start) >= 80) out.push({ icon: '👥', text: 'Peak crowds at this time' })
  if ((s.open != null && it.start < s.open) || (s.close != null && it.start + (s.duration || 1) > s.close)) out.push({ icon: '🚪', text: 'Closed at this time' })
  if (it.lateMin > 0) out.push({ icon: '⚠️', text: "Can't get here in time from the previous stop" })
  return out
}

// ---------- the main function ----------
export function optimizeDay(stops, rainByHour, opts = {}) {
  const options = { dayStart: 9, dayEnd: 21, ...opts }
  // options.from / options.end: where the day starts and ends (your hotel, or the airport), if known
  const ends = [options.from, options.end].filter(Boolean)
  const matrix = travelMatrix(stops.concat(ends), options.travel) // uses each person's way of getting around (Settings)
  const locked = stops.filter((s) => s.locked)
  const flex = stops.filter((s) => !s.locked)
  // The trip back to the hotel (or to the airport) at the end of the day counts too
  const homeLeg = (items) => {
    if (!options.end) return 0
    let last = null
    for (const it of items) if (!it.stop.virtual && (!last || it.start > last.start)) last = it
    return last ? matrix[last.stop.id][options.end.id].min : 0
  }
  const score = (items, startLeg) => {
    const m = measure(items, rainByHour, options)
    const extra = homeLeg(items) + startLeg
    m.travelMin += extra
    m.cost += extra * WEIGHTS.travel
    return m
  }

  const beforeItems = scheduleAsIs(stops, matrix)
  // (the "before" times don't include getting from the hotel to the first stop, so add it for a fair comparison)
  const firstBefore = beforeItems.find((it) => !it.stop.virtual)
  const before = score(beforeItems, options.from && firstBefore ? matrix[options.from.id][firstBefore.stop.id].min : 0)

  let bestOrder = flex
  if (flex.length <= 7) {
    let bestCost = Infinity
    for (const order of permutations(flex)) {
      const c = score(scheduleInOrder(order, locked, matrix, options), 0).cost
      if (c < bestCost) {
        bestCost = c
        bestOrder = order
      }
    }
  } else {
    bestOrder = twoOpt(flex, locked, matrix, rainByHour, options)
  }

  const afterItems = scheduleInOrder(bestOrder, locked, matrix, options)
  const after = score(afterItems, 0)
  // Anything still worth a look after optimizing (shown with the result)
  const hasWarnings = afterItems.some((it) => warningsFor(it, rainByHour, options).length > 0)
  const dayHasRain = (rainByHour || []).some((p) => p >= 0.5)
  let real = 0
  for (const it of afterItems) {
    it.reasons = reasonsFor(it, real, rainByHour, dayHasRain)
    if (!it.stop.virtual) real++
  }

  return {
    before: { items: beforeItems, ...before },
    after: { items: afterItems, ...after },
    better: after.cost < before.cost - 1,
    hasWarnings,
    summary: summarize(before, after, options)
  }
}

function summarize(before, after, options = {}) {
  const parts = []
  const flight = (options.from && options.from.kind === 'arrive') || (options.end && options.end.kind === 'depart')
  if (before.earlyMin + before.overtimeMin > after.earlyMin + after.overtimeMin) parts.push(flight ? 'fits the day around your flight' : 'fits the day into your hours')
  const saved = before.travelMin - after.travelMin
  if (saved >= 5) parts.push('saves ' + saved + ' min of travel')
  if (before.rainOutdoor - after.rainOutdoor >= 0.4) parts.push('keeps outdoor stops out of the rain')
  if (before.crowd - after.crowd >= 30) parts.push('dodges the midday crowds')
  if (before.closed > after.closed) parts.push('visits places while they are open')
  if (before.lateMin > after.lateMin) parts.push('gets you to your fixed plans on time')
  if (!parts.length) return 'Your day is already in a good order.'
  parts.splice(3) // the three biggest wins are enough
  const text = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]
  return 'Route optimized: ' + text + '.'
}

// 3-hour forecast blocks ({ time, span, rain }) -> chance of rain for each hour
export function rainFromBlocks(blocks) {
  const hours = new Array(24).fill(0.1)
  for (const b of blocks || []) {
    for (let h = b.time; h < b.time + (b.span || 3) && h < 24; h++) hours[h] = b.rain ? 0.8 : 0.1
  }
  return hours
}
