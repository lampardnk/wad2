<template>
  <!-- Transport > Other journeys: trips that aren't between two stops on the plan
       (airport to hotel, a day trip to another city). Between-stop travel lives in the itinerary. -->
  <section class="mb-4" aria-labelledby="oj-title">
    <h2 id="oj-title" class="h4 mb-3">Plan Journeys</h2>
 
    <!-- Plan a journey (or change a saved one) -->
    <div v-if="editing" class="alert alert-warning d-flex align-items-center py-2" role="status">
      <AppIcon name="pencil" :size="15" class="me-2" />
      <span>Changing <strong>{{ editing.from }} → {{ editing.to }}</strong></span>
      <button type="button" class="btn btn-link btn-sm ms-auto p-0" @click="cancelEdit">Cancel</button>
    </div>
 
    <form ref="formEl" class="card card-body mb-3" :class="{ 'border-warning': !!editing }" @submit.prevent="findWays">
      <div class="row g-2 align-items-start">
        <div class="col-12 col-md">
          <PlaceInput id="oj-from" v-model="fromText" v-model:place="fromPlace" label="From" :placeholder="fromHint" :groups="placeGroups" :near="centre" pin />
        </div>
        <div class="col-auto">
          <button type="button" class="btn btn-outline-secondary" aria-label="Swap from and to" title="Swap" @click="swap">
            <AppIcon name="swap" :size="16" />
          </button>
        </div>
        <div class="col-12 col-md">
          <PlaceInput id="oj-to" v-model="toText" v-model:place="toPlace" label="To" :placeholder="toHint" :groups="placeGroups" :near="centre" pin />
        </div>
        <div v-if="dayOptions.length" class="col-12 col-md-3">
          <label for="oj-day" class="form-label mb-1">Day</label>
          <CustomDropdown id="oj-day" v-model="day" :options="[{ value: '', label: 'Any day' }].concat(dayOptions)" block aria-label="Day" />
        </div>
        <div class="col-12 col-md-auto">
          <button type="submit" class="btn btn-primary w-100" :disabled="!fromPlace || !toPlace">
            Find ways
          </button>
        </div>
      </div>
    </form>
 
    <div v-if="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
 
    <!-- Ways to make this journey -->
    <div v-if="result" class="mb-4">
      <div class="alert alert-info">
        <strong>{{ result.fromName }} → {{ result.toName }}</strong><br>
        We suggest <strong>{{ label(result.recommended) }}</strong>: {{ result.reason }}.
        <span v-if="result.checking"> Checking live routes…</span>
      </div>
      <TravelChoices :options="result.options" :recommended="result.recommended" :group="group" :maps-url="mapsUrl"
        :chosen="editing ? editing.mode : ''" :chosen-by="editing ? editing.by : ''"
        action-label="Save" :mark-in-use="false" @choose="saveJourney" />
      <p class="form-text mt-2">{{ editing ? 'Save replaces the saved journey.' : 'Save the way you\'ll go, so everyone on the trip can see it.' }}</p>
    </div>
 
    <!-- Flights between cities, added on itinerary days (read-only here: change them on their day) -->
    <template v-if="flights.length">
      <h3 class="h5 mt-4">Flights on the plan <span class="badge bg-secondary">{{ flights.length }}</span></h3>
      <ul class="list-group mb-3">
        <li v-for="f in flights" :key="f.id" class="list-group-item d-flex align-items-center">
          <AppIcon name="plane" :size="18" class="me-3" />
          <div>
            <strong>{{ shortAirport(f.from.name) }} → {{ shortAirport(f.to.name) }}</strong><br>
            <small class="text-muted">{{ dayLabel(f.date) }}, takes off {{ f.dep }}, lands {{ f.arr }}<template v-if="f.number">, flight {{ f.number }}</template>. Edit it on the itinerary.</small>
          </div>
        </li>
      </ul>
    </template>
 
    <!-- Saved journeys -->
    <h3 class="h5 mt-4">Saved Journeys <span class="badge bg-secondary">{{ journeys.length }}</span></h3>
    <p v-if="!journeys.length" class="text-muted">Nothing saved yet. Airport transfers and day trips you plan above appear here.</p>
    <ul v-else class="list-group">
      <li v-for="j in journeys" :key="j.id" class="list-group-item d-flex align-items-center" :class="{ 'list-group-item-warning': editing && editing.id === j.id }">
        <AppIcon :name="MODES[j.mode].icon" :size="18" class="me-3" />
        <div class="flex-grow-1">
          <strong>{{ j.from }} → {{ j.to }}</strong><br>
          <small class="text-muted">{{ MODES[j.mode].label }}, {{ durationText(j.min) }}<template v-if="j.date">, {{ dayLabel(j.date) }}</template><template v-if="j.by">, added by {{ j.by }}</template></small>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm me-2" :aria-label="'Change ' + j.from + ' to ' + j.to" @click="editJourney(j)">
          <AppIcon name="pencil" :size="16" /> Change
        </button>
        <button type="button" class="btn btn-outline-danger btn-sm" :aria-label="'Delete ' + j.from + ' to ' + j.to" @click="removeJourney(j)">
          <AppIcon name="trash" :size="16" /> Delete
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import AppIcon from './AppIcon.vue'
import TravelChoices from './TravelChoices.vue'
import PlaceInput from './PlaceInput.vue'
import CustomDropdown from './CustomDropdown.vue'
import { TRAVEL_MODES as MODES, travelOptions, recommendTravel, legKey, DEFAULT_TRAVEL, haversineKm } from '../dayOptimizer.js'
import { notify, errorText } from '../notify.js'
import { cityCentre } from '../services/cityCentre.js'

const props = defineProps({
  tripId: { type: String, default: '' },
  isDemo: { type: Boolean, default: false },
  destinations: { type: Array, default: () => [] },
  stops: { type: Array, default: () => [] },          // the itinerary's stops (names + addresses as suggestions)
  stays: { type: Array, default: () => [] },         // hotels (set in the itinerary): { from: date, name, ... } (older ones: { city, ... })
  myAirports: { type: Array, default: () => [] },    // my arrival / departure airports (set in the itinerary)
  travellers: { type: Array, default: () => [] },
  me: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  initialJourneys: { type: Array, default: () => [] },
  prefs: { type: Object, default: () => ({}) },
  flights: { type: Array, default: () => [] }, // flights on itinerary days: [{ id, date, from, to, dep, arr, number }]
  wishlist: { type: Array, default: () => [] }
})
function shortAirport(name) {
  return name.replace(/ (International )?Airport.*$/i, '').split(',')[0]
}

const fromText = ref('')
const toText = ref('')
const fromPlace = ref(null) // the real places picked: { name, address, lat, lon }
const toPlace = ref(null)
// Search for places around the trip's first city
const centre = ref(null)
cityCentre(props.destinations[0]).then((c) => (centre.value = c))
const day = ref('')
const error = ref('')
const result = ref(null)
const journeys = ref(props.initialJourneys.slice())
const editing = ref(null) // the saved journey being changed, or null
const formEl = ref(null)
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
  // hotels
  const hotels = []
  for (const st of props.stays) {
    if (hotels.some((h) => h.label === st.name)) continue
    hotels.push({ label: st.name, sub: st.from ? 'From ' + dayLabel(st.from) : st.city ? st.city.split(', ')[0] : '', place: pointOf(st) })
  }
  if (hotels.length) groups.push({ label: hotels.length === 1 ? 'Your hotel' : 'Your hotels', icon: 'door', items: hotels })
  // wishlist places (excludes places already on the plan)
  const wishlistItems = []
  for (const w of props.wishlist) {
    if (!w.name) continue
    
    // check if place is already listed on the itinerary stops
    const isOnPlan = props.stops.some((s) => s.name && s.name.trim().toLowerCase() === w.name.trim().toLowerCase())
    
    if (!isOnPlan && !wishlistItems.some((x) => x.label === w.name)) {
      wishlistItems.push({
        label: w.name,
        sub: w.city ? w.city.split(', ')[0] + ' · Wishlist' : 'Wishlist item',
        place: pointOf(w)
      })
    }
  }
  if (wishlistItems.length) {
    groups.push({ label: 'Wishlist', icon: 'bookmark', items: wishlistItems })
  }
  // plan stops
  const stops = []
  for (const s of props.stops) {
    if (!s.name || stops.some((x) => x.label === s.name)) continue
    stops.push({ label: s.name, sub: s.date ? dayLabel(s.date) : '', place: pointOf(s) })
  }
  if (stops.length) groups.push({ label: 'On your plan', icon: 'map-pin', items: stops })
  // airports & cities
  // (other airports: type the airport's name to search for it)
  const airports = []
  for (const a of props.myAirports) airports.push({ label: a.name, sub: 'Your flight', place: pointOf(a) })
  if (airports.length) groups.push({ label: 'Airports', icon: 'plane', items: airports })
  return groups
})
// A trip place as a picked place (null when it has no map point)
function pointOf(p) {
  return p && p.lat != null && p.lon != null ? { name: p.name, address: p.address || '', lat: p.lat, lon: p.lon } : null
}
// Example text in the empty boxes, from this trip
const fromHint = computed(() => (props.destinations[0] ? 'e.g. ' + props.destinations[0].split(', ')[0] + ' Airport' : 'e.g. the airport'))
const toHint = computed(() => (props.stays.length ? 'e.g. ' + props.stays[0].name : 'e.g. your hotel'))
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
  const p = fromPlace.value
  fromPlace.value = toPlace.value
  toPlace.value = p
}

const travelPrefs = computed(() => ({
  modes: props.prefs.travelModes && props.prefs.travelModes.length ? props.prefs.travelModes : DEFAULT_TRAVEL.modes,
  maxWalk: props.prefs.maxWalk || 20,
  priority: props.prefs.travelPriority || 'balanced',
  group: group.value,
  real: {}
}))

function build(from, to, real, checking) {
  const tp = { ...travelPrefs.value, real }
  const options = travelOptions(from, to, tp)
  const rec = recommendTravel(options, tp)
  return { fromName: fromText.value.trim(), toName: toText.value.trim(), from, to, options, recommended: rec.option.mode, reason: rec.reason, checking }
}

const SAME_PLACE = 'From and To are the same place. Choose two different places.'
async function findWays() {
  error.value = ''
  result.value = null
  const from = fromPlace.value
  const to = toPlace.value
  if (!from || !to) {
    error.value = 'Pick both places from the suggestions, paste a Google Maps link, or drop a pin.'
    return
  }
  // Two names for the same spot (under 100 m apart): nothing to travel
  if (haversineKm(from, to) < 0.1) {
    error.value = SAME_PLACE
    return
  }
  // Show the estimate straight away, then the real routes when they arrive
  result.value = build(from, to, {}, true)
  try {
    const res = await axios.get('/api/travel/leg', { params: { from: from.lat + ',' + from.lon, to: to.lat + ',' + to.lon }, timeout: 20000 })
    result.value = build(from, to, { [legKey(from, to)]: res.data }, false)
  } catch (err) {
    if (result.value) result.value.checking = false // keep the estimate
  }
}
// A different place picked: the ways shown were for the old ones
watch([fromPlace, toPlace], () => {
  if (result.value && (result.value.from !== fromPlace.value || result.value.to !== toPlace.value)) result.value = null
})
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
  const old = editing.value
  // Changing a saved journey keeps its place in the list (and its id); a new one goes first
  const j = { id: old ? old.id : 'j-' + Date.now().toString(36), from: r.fromName, to: r.toName, mode, min: opt.min, date: day.value, by: props.me,
    fromPoint: { lat: r.from.lat, lon: r.from.lon }, toPoint: { lat: r.to.lat, lon: r.to.lon } }
  let list = [j].concat(journeys.value)
  if (old) {
    list = []
    for (const x of journeys.value) list.push(x.id === old.id ? j : x)
  }
  store(list, () => {
    result.value = null
    editing.value = null
    clearPlaces()
    notify((old ? 'Journey updated: ' : 'Journey saved: ') + j.from + ' → ' + j.to + ' by ' + label(mode) + '.', null, 'ok')
  })
}
// Open a saved journey in the form, with its ways to go already looked up
function editJourney(j) {
  editing.value = j
  fromText.value = j.from
  toText.value = j.to
  // Journeys saved before places had map points: pick the places again
  fromPlace.value = j.fromPoint ? { name: j.from, address: '', ...j.fromPoint } : null
  toPlace.value = j.toPoint ? { name: j.to, address: '', ...j.toPoint } : null
  day.value = j.date || ''
  if (formEl.value) formEl.value.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
  if (fromPlace.value && toPlace.value) findWays()
  else error.value = 'This journey was saved without map points. Pick From and To again, then Save.'
}
function clearPlaces() {
  fromText.value = ''
  toText.value = ''
  fromPlace.value = null
  toPlace.value = null
}
function cancelEdit() {
  editing.value = null
  result.value = null
  error.value = ''
  clearPlaces()
  day.value = ''
}
function removeJourney(j) {
  if (editing.value && editing.value.id === j.id) cancelEdit()
  store(journeys.value.filter((x) => x.id !== j.id))
}
</script>

<style scoped>
</style>