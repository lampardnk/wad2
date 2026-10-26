<template>
  <!-- Getting around → Other journeys: trips that aren't between two stops on the plan
       (airport → hotel, a day trip to another city). Between-stop travel lives in the itinerary. -->
  <section class="oj" aria-labelledby="oj-title">
    <header class="oj-head">
      <h2 id="oj-title" class="oj-title">Other journeys</h2>
    </header>

    <!-- Plan a journey -->
    <form class="oj-form" @submit.prevent="findWays">
      <PlaceInput id="oj-from" v-model="fromText" label="From" :placeholder="fromHint" :groups="placeGroups" class="oj-field" />
      <button type="button" class="oj-swap" aria-label="Swap from and to" title="Swap" @click="swap"><AppIcon name="swap" :size="16" /></button>
      <PlaceInput id="oj-to" v-model="toText" label="To" :placeholder="toHint" :groups="placeGroups" class="oj-field" />
      <div v-if="dayOptions.length" class="oj-field small">
        <label for="oj-day">Day</label>
        <select id="oj-day" v-model="day" class="oj-input">
          <option value="">Any day</option>
          <option v-for="d in dayOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
      <button type="submit" class="oj-go" :disabled="busy || !fromText.trim() || !toText.trim()">{{ busy ? 'Finding…' : 'Find ways' }}</button>
    </form>

    <p v-if="error" class="oj-error" role="alert">{{ error }}</p>

    <!-- Ways to make this journey -->
    <div v-if="result" class="oj-result">
      <p class="oj-why">
        <strong>{{ result.fromName }} → {{ result.toName }}</strong><br>
        We suggest <strong>{{ label(result.recommended) }}</strong>: {{ result.reason }}.
        <span v-if="result.checking"> Checking live routes…</span>
      </p>
      <TravelChoices :options="result.options" :recommended="result.recommended" :group="group" :maps-url="mapsUrl"
        action-label="Save" :mark-in-use="false" @choose="saveJourney" />
      <p class="oj-note">Save the way you'll go, so everyone on the trip can see it.</p>
    </div>

    <!-- Saved journeys -->
    <h3 class="oj-h">Saved journeys <span class="oj-count">{{ journeys.length }}</span></h3>
    <p v-if="!journeys.length" class="oj-empty">Nothing saved yet. Airport transfers and day trips you plan above appear here.</p>
    <ul v-else class="oj-list">
      <li v-for="j in journeys" :key="j.id" class="oj-item">
        <span class="oj-item-icon" aria-hidden="true"><AppIcon :name="MODES[j.mode].icon" :size="18" /></span>
        <div class="oj-item-main">
          <strong>{{ j.from }} → {{ j.to }}</strong>
          <small>{{ MODES[j.mode].label }} · {{ durationText(j.min) }}<template v-if="j.date"> · {{ dayLabel(j.date) }}</template><template v-if="j.by"> · added by {{ j.by }}</template></small>
        </div>
        <button type="button" class="oj-del" :aria-label="'Delete ' + j.from + ' to ' + j.to" @click="removeJourney(j)"><AppIcon name="trash" :size="16" /></button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import AppIcon from './AppIcon.vue'
import TravelChoices from './TravelChoices.vue'
import PlaceInput from './PlaceInput.vue'
import { TRAVEL_MODES as MODES, travelOptions, recommendTravel, legKey, DEFAULT_TRAVEL } from '../dayOptimizer.js'
import { notify, errorText } from '../notify.js'

const props = defineProps({
  tripId: { type: String, default: '' },
  isDemo: { type: Boolean, default: false },
  destinations: { type: Array, default: () => [] },
  stops: { type: Array, default: () => [] },          // the itinerary's stops (names + addresses as suggestions)
  stays: { type: Array, default: () => [] },         // hotels, one per city (set in the itinerary)
  myAirports: { type: Array, default: () => [] },    // my arrival / departure airports (set in the itinerary)
  travellers: { type: Array, default: () => [] },
  me: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  initialJourneys: { type: Array, default: () => [] },
  prefs: { type: Object, default: () => ({}) }
})

const fromText = ref('')
const toText = ref('')
const day = ref('')
const busy = ref(false)
const error = ref('')
const result = ref(null)
const journeys = ref(props.initialJourneys.slice())
const group = computed(() => Math.max(1, props.travellers.length))

function label(mode) {
  return MODES[mode] ? MODES[mode].label.toLowerCase() : mode
}
function durationText(min) {
  if (min < 60) return min + ' min'
  return Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '')
}

// Places to pick from, in groups: your hotel, the stops on your plan, the trip's cities and their airports
const placeGroups = computed(() => {
  const groups = []
  const hotels = []
  for (const st of props.stays) hotels.push({ label: st.name, sub: st.city.split(', ')[0] })
  if (hotels.length) groups.push({ label: hotels.length === 1 ? 'Your hotel' : 'Your hotels', icon: 'door', items: hotels })
  const stops = []
  for (const s of props.stops) {
    if (!s.name || stops.some((x) => x.label === s.name)) continue
    stops.push({ label: s.name, sub: s.date ? dayLabel(s.date) : '' })
  }
  if (stops.length) groups.push({ label: 'On your plan', icon: 'map-pin', items: stops })
  const cities = []
  const airports = []
  for (const a of props.myAirports) airports.push({ label: a.name, sub: 'Your flight' })
  for (const d of props.destinations) {
    cities.push({ label: d, sub: '' })
    if (!props.myAirports.length) airports.push({ label: d.split(', ')[0] + ' Airport', sub: d })
  }
  if (airports.length) groups.push({ label: 'Airports', icon: 'plane', items: airports })
  if (cities.length) groups.push({ label: 'Cities', icon: 'landmark', items: cities })
  return groups
})
// Example text in the empty boxes, from this trip
const fromHint = computed(() => (props.destinations[0] ? 'e.g. ' + props.destinations[0].split(', ')[0] + ' Airport' : 'e.g. the airport'))
const toHint = computed(() => (props.stays.length ? 'e.g. ' + props.stays[0].name : 'e.g. your hotel'))
// What to look a typed place up by: a stop's address or the hotel's, when it's one of those
function lookupText(text) {
  const t = text.trim()
  const hotel = props.stays.find((x) => x.name === t)
  if (hotel && hotel.address) return hotel.address
  const stop = props.stops.find((s) => s.name === t)
  return stop && stop.address ? stop.address : t
}
// Hotels and my airports already have a map position: no lookup needed
function knownPlace(text) {
  const t = text.trim()
  const p = props.stays.find((x) => x.name === t) || props.myAirports.find((x) => x.name === t)
  return p && p.lat != null ? { lat: p.lat, lon: p.lon } : null
}

const dayOptions = computed(() => {
  const list = []
  if (!props.startDate || !props.endDate) return list
  const d = new Date(props.startDate + 'T00:00:00')
  const end = new Date(props.endDate + 'T00:00:00')
  let n = 1
  while (d <= end && list.length < 60) {
    const value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    list.push({ value, label: 'Day ' + n + ' · ' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) })
    d.setDate(d.getDate() + 1)
    n++
  }
  return list
})
function dayLabel(date) {
  const o = dayOptions.value.find((x) => x.value === date)
  return o ? o.label : new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function swap() {
  const t = fromText.value
  fromText.value = toText.value
  toText.value = t
}

const travelPrefs = computed(() => ({
  modes: props.prefs.travelModes && props.prefs.travelModes.length ? props.prefs.travelModes : DEFAULT_TRAVEL.modes,
  maxWalk: props.prefs.maxWalk || 20,
  priority: props.prefs.travelPriority || 'balanced',
  group: group.value,
  real: {}
}))

async function locate(text) {
  const known = knownPlace(text)
  if (known) return known
  const res = await axios.get('/api/safety/locate', { params: { place: lookupText(text), near: props.destinations[0] || undefined }, timeout: 20000 })
  return { lat: res.data.lat, lon: res.data.lon }
}

function build(from, to, real, checking) {
  const tp = { ...travelPrefs.value, real }
  const options = travelOptions(from, to, tp)
  const rec = recommendTravel(options, tp)
  return { fromName: fromText.value.trim(), toName: toText.value.trim(), from, to, options, recommended: rec.option.mode, reason: rec.reason, checking }
}

async function findWays() {
  error.value = ''
  result.value = null
  busy.value = true
  let from = null
  let to = null
  try {
    [from, to] = await Promise.all([locate(fromText.value), locate(toText.value)])
  } catch (err) {
    busy.value = false
    error.value = err.response && err.response.status === 404
      ? "We couldn't find one of those places. Try adding the city, e.g. \"Namba Station, Osaka\"."
      : errorText(err, 'Place search is busy right now. Try again in a moment.')
    return
  }
  // Show the estimate straight away, then the live routes when they arrive
  result.value = build(from, to, {}, true)
  busy.value = false
  try {
    const res = await axios.get('/api/travel/leg', { params: { from: from.lat + ',' + from.lon, to: to.lat + ',' + to.lon }, timeout: 20000 })
    result.value = build(from, to, { [legKey(from, to)]: res.data }, false)
  } catch (err) {
    if (result.value) result.value.checking = false // keep the estimate
  }
}

function mapsUrl(mode) {
  const r = result.value
  return 'https://www.google.com/maps/dir/?api=1&origin=' + r.from.lat + ',' + r.from.lon + '&destination=' + r.to.lat + ',' + r.to.lon + '&travelmode=' + MODES[mode].maps
}

async function store(list, done) {
  const before = journeys.value
  journeys.value = list
  if (props.isDemo) return done && done()
  try {
    const res = await axios.put('/api/trips/' + props.tripId + '/journeys', list)
    journeys.value = res.data
    if (done) done()
  } catch (err) {
    journeys.value = before
    notify(errorText(err, 'Could not save the journey.'), () => store(list, done))
  }
}

function saveJourney(mode) {
  const r = result.value
  const opt = r.options.find((o) => o.mode === mode)
  const j = { id: 'j-' + Date.now().toString(36), from: r.fromName, to: r.toName, mode, min: opt.min, date: day.value, by: props.me }
  store([j].concat(journeys.value), () => {
    result.value = null
    fromText.value = ''
    toText.value = ''
    notify('Journey saved: ' + j.from + ' → ' + j.to + ' by ' + label(mode) + '.', null, 'ok')
  })
}
function removeJourney(j) {
  store(journeys.value.filter((x) => x.id !== j.id))
}
</script>

<style scoped>
.oj {
  color: #001d2c;
}
.oj-title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.25rem;
  color: #003d5b;
}
.oj-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid #ece4d6;
}
.oj-field {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.oj-field.small {
  flex: 0 1 190px;
}
.oj-field label {
  font-size: 12.5px;
  font-weight: 700;
  color: #003d5b;
}
.oj-input {
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: #f6f2eb;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  color: #001d2c;
}
.oj-input:focus {
  outline: none;
  background: #fff;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.2);
}
.oj-swap {
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: #f6f2eb;
  color: #003d5b;
}
.oj-go {
  flex: none;
  border: 0;
  border-radius: 999px;
  background: #edae49;
  color: #001d2c;
  font-weight: 700;
  padding: 11px 22px;
  box-shadow: 0 6px 18px rgba(237, 174, 73, 0.3);
}
.oj-go:disabled {
  opacity: 0.5;
  box-shadow: none;
}
.oj-error {
  margin: 10px 0 0;
  color: #d1495b;
  font-weight: 600;
  font-size: 14px;
}
.oj-result {
  margin-top: 16px;
}
.oj-why {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fbefd9;
  font-size: 14px;
  line-height: 1.45;
}
.oj-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: #5a6b78;
}
.oj-h {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 26px 0 10px;
  font-size: 1.05rem;
  font-weight: 800;
  color: #003d5b;
}
.oj-count {
  padding: 1px 9px;
  border-radius: 999px;
  background: #fbefd9;
  font-size: 12px;
}
.oj-empty {
  margin: 0;
  font-size: 14px;
  color: #5a6b78;
}
.oj-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.oj-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #ece4d6;
}
.oj-item-icon {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #003d5b;
  color: #fff;
}
.oj-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.oj-item-main small {
  color: #5a6b78;
}
.oj-del {
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #f6f2eb;
  color: #5a6b78;
}
.oj-del:hover {
  background: #fbe7ea;
  color: #d1495b;
}
.oj-swap:focus-visible,
.oj-go:focus-visible,
.oj-del:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
@media (max-width: 640px) {
  .oj-swap {
    align-self: center;
  }
  .oj-go {
    width: 100%;
  }
}
</style>
