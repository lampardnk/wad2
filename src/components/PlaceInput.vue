<template>
  <!-- A box that only ever gives a real place: { name, address, lat, lon }.
       Typing searches (Geoapify) and lists trip places that match; the user picks one.
       Also: paste a Google Maps link, or drop a pin on a small map. Typed text alone is never a place. -->
  <div class="pi" :class="{ open: showList }">
    <label v-if="label" :for="id" class="pi-label">{{ label }}</label>
    <div class="pi-box">
      <AppIcon :name="place ? 'check-circle' : 'map-pin'" :size="16" class="pi-pin" :class="{ ok: !!place }" />
      <input :id="id" ref="input" :value="modelValue" class="pi-input" maxlength="2000" :placeholder="placeholder" autocomplete="off"
        role="combobox" aria-autocomplete="list" :aria-expanded="showList" :aria-controls="id + '-list'"
        :aria-activedescendant="active >= 0 ? id + '-opt-' + active : null" :aria-describedby="id + '-state'"
        @input="onInput" @focus="open = true" @blur="onBlur" @keydown="onKey">
      <button v-if="modelValue" type="button" class="pi-clear" :aria-label="'Clear ' + (label || 'place')" title="Clear" @mousedown.prevent @click="clear">
        <AppIcon name="x" :size="14" :stroke="2.6" />
      </button>
    </div>
    <div v-if="showList" :id="id + '-list'" class="pi-list" role="listbox" :aria-label="(label || 'Place') + ' suggestions'">
      <template v-for="g in shownGroups" :key="g.label">
        <p class="pi-group" role="presentation">{{ g.label }}</p>
        <div v-for="item in g.items" :id="id + '-opt-' + item.index" :key="g.label + item.index" role="option"
          class="pi-opt" :class="{ active: item.index === active }" :aria-selected="item.index === active"
          @mousedown.prevent="pick(item)" @mouseenter="active = item.index">
          <span class="pi-icon" aria-hidden="true"><AppIcon :name="g.icon" :size="15" /></span>
          <span class="pi-text">
            <span class="pi-name">{{ item.before }}<mark>{{ item.match }}</mark>{{ item.after }}</span>
            <small v-if="item.sub">{{ item.sub }}</small>
          </span>
        </div>
      </template>
    </div>
    <!-- What the box holds right now -->
    <p :id="id + '-state'" class="pi-state" :class="{ bad: !!problem }" role="status">
      <template v-if="busy">{{ busy }}</template>
      <template v-else-if="problem">{{ problem }}</template>
      <template v-else-if="place">
        {{ place.address || 'On the map' }} ·
        <a :href="mapsLink(place)" target="_blank" rel="noopener">Open in Google Maps</a>
      </template>
      <template v-else-if="hint">{{ hint }}</template>
    </p>
    <button v-if="pin" type="button" class="pi-pin-btn" :aria-expanded="pinOpen" @click="togglePin">
      <AppIcon name="map-pin" :size="14" /> {{ pinOpen ? 'Close map' : 'Drop a pin' }}
    </button>
    <div v-if="pinOpen" ref="pinMap" class="pi-map" aria-label="Map: tap where the place is"></div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import axios from 'axios'
import AppIcon from './AppIcon.vue'
import { loadLeaflet } from '../services/leaflet.js'

const props = defineProps({
  modelValue: { type: String, default: '' }, // the text in the box
  place: { type: Object, default: null },    // the picked place, or null
  id: { type: String, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: 'Pick a suggestion, paste a Google Maps link, or drop a pin.' },
  // Trip places to offer first: [{ label: 'Your hotel', icon: 'door', items: [{ label, sub, place }] }]
  groups: { type: Array, default: () => [] },
  near: { type: Object, default: null },     // { lat, lon }: search around here (the trip city)
  pin: { type: Boolean, default: false },    // show "Drop a pin"
  keepPlace: { type: Boolean, default: false } // typing only changes the label (editing a place's name)
})
const emit = defineEmits(['update:modelValue', 'update:place'])
const input = ref(null)
const open = ref(false)
const active = ref(-1)
const found = ref([])   // search results for the text in the box
const busy = ref('')
const problem = ref('')
let timer = null
let asked = ''          // the text the last search was for

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILES_CREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'

function mapsLink(p) {
  return 'https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lon
}
function isLink(text) {
  return /^https?:\/\//i.test(text.trim())
}

// Trip places that match what's typed (all of them while the box is empty), then search results
const shownGroups = computed(() => {
  const q = props.modelValue.trim().toLowerCase()
  const out = []
  let index = 0
  const local = []
  for (const g of props.groups) {
    const items = []
    for (const it of g.items) {
      if (!it.place) continue
      const at = q ? it.label.toLowerCase().indexOf(q) : -1
      if (q && at < 0) continue
      if (items.length >= 6) break
      items.push(row(it.label, it.sub, it.place, at, q.length, index++))
    }
    if (items.length) {
      out.push({ ...g, items })
      local.push(...items)
    }
  }
  if (q && found.value.length) {
    const items = []
    for (const p of found.value) {
      if (local.some((l) => Math.abs(l.place.lat - p.lat) < 1e-4 && Math.abs(l.place.lon - p.lon) < 1e-4)) continue
      const at = p.name.toLowerCase().indexOf(q)
      items.push(row(p.name, p.address, p, at, q.length, index++))
    }
    if (items.length) out.push({ label: 'Places found', icon: 'map-pin', items })
  }
  return out
})
function row(label, sub, place, at, n, index) {
  return {
    label, sub, place, index,
    before: at >= 0 ? label.slice(0, at) : label,
    match: at >= 0 ? label.slice(at, at + n) : '',
    after: at >= 0 ? label.slice(at + n) : ''
  }
}
const flat = computed(() => {
  const list = []
  for (const g of shownGroups.value) for (const it of g.items) list.push(it)
  return list
})
const showList = computed(() => open.value && flat.value.length > 0 &&
  !(props.place && flat.value.length === 1 && flat.value[0].label === props.modelValue))

function onInput(e) {
  const text = e.target.value
  emit('update:modelValue', text)
  if (!props.keepPlace) emit('update:place', null)
  open.value = true
  active.value = -1
  problem.value = ''
  clearTimeout(timer)
  if (isLink(text)) timer = setTimeout(() => fromLink(text), 200)
  else timer = setTimeout(() => search(text), 300)
}

async function search(text) {
  const q = text.trim()
  asked = q
  if (q.length < 2) {
    found.value = []
    return
  }
  busy.value = 'Searching…'
  try {
    const params = { q }
    if (props.near) params.near = props.near.lat + ',' + props.near.lon
    const res = await axios.get('/api/place/suggest', { params, background: true })
    if (asked !== q) return // an answer to older typing
    found.value = res.data
    const anyLocal = flat.value.length > 0
    if (!res.data.length && !anyLocal) problem.value = 'No real place matches "' + q + '". Try another spelling, paste a Google Maps link, or drop a pin.'
  } catch (err) {
    if (asked === q) problem.value = (err.response && err.response.data && err.response.data.message) || "Couldn't search places just now. Try again."
  } finally {
    if (asked === q) busy.value = ''
  }
}

async function fromLink(text) {
  asked = text
  found.value = []
  busy.value = 'Reading the link…'
  try {
    const res = await axios.get('/api/place/from-link', { params: { url: text.trim() }, background: true })
    if (asked !== text) return
    choose(res.data)
  } catch (err) {
    if (asked === text) problem.value = (err.response && err.response.data && err.response.data.message) || "Couldn't read that link."
  } finally {
    if (asked === text) busy.value = ''
  }
}

function choose(place) {
  emit('update:modelValue', place.name)
  emit('update:place', { name: place.name, address: place.address || '', lat: place.lat, lon: place.lon, kind: place.kind || '' })
  open.value = false
  active.value = -1
  problem.value = ''
  found.value = []
}
function pick(item) {
  choose(item.place)
}
function clear() {
  emit('update:modelValue', '')
  if (!props.keepPlace) emit('update:place', null)
  found.value = []
  problem.value = ''
  active.value = -1
  open.value = true
  input.value.focus()
}
function onBlur() {
  open.value = false
  active.value = -1
}
function onKey(e) {
  const n = flat.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    open.value = true
    active.value = (active.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    active.value = (active.value - 1 + n) % n
  } else if (e.key === 'Enter') {
    // Enter picks the highlighted suggestion (or the only one). It never turns the text into a place.
    if (showList.value && (active.value >= 0 || n === 1)) {
      e.preventDefault()
      pick(flat.value[Math.max(0, active.value)])
    } else if (!props.place) {
      e.preventDefault()
      open.value = true
    }
  } else if (e.key === 'Escape' && showList.value) {
    e.stopPropagation()
    open.value = false
  }
}

// ----- Drop a pin -----
const pinOpen = ref(false)
const pinMap = ref(null)
let map = null
let marker = null
async function togglePin() {
  pinOpen.value = !pinOpen.value
  if (!pinOpen.value) {
    if (map) map.remove()
    map = null
    marker = null
    return
  }
  await nextTick()
  let L
  try {
    L = await loadLeaflet()
  } catch (err) {
    problem.value = 'The map could not load. Check your internet connection.'
    pinOpen.value = false
    return
  }
  if (!pinMap.value) return
  const centre = props.place || props.near || { lat: 1.29, lon: 103.85 }
  map = L.map(pinMap.value).setView([centre.lat, centre.lon], props.place ? 16 : 13)
  L.tileLayer(TILES, { maxZoom: 19, attribution: TILES_CREDIT }).addTo(map)
  if (props.place) marker = L.marker([props.place.lat, props.place.lon]).addTo(map)
  map.on('click', (e) => dropPin(L, e.latlng.lat, e.latlng.lng))
}
async function dropPin(L, lat, lon) {
  if (marker) marker.setLatLng([lat, lon])
  else marker = L.marker([lat, lon]).addTo(map)
  busy.value = 'Finding what is there…'
  problem.value = ''
  try {
    const res = await axios.get('/api/place/reverse', { params: { lat, lon }, background: true })
    choose(res.data)
  } catch (err) {
    choose({ name: 'Pinned spot', address: lat.toFixed(5) + ', ' + lon.toFixed(5), lat, lon })
  } finally {
    busy.value = ''
  }
}
onBeforeUnmount(() => {
  clearTimeout(timer)
  if (map) map.remove()
})
</script>

<style scoped>
.pi {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pi-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #003d5b;
}
.pi-box {
  position: relative;
  display: flex;
  align-items: center;
}
.pi-pin {
  position: absolute;
  left: 12px;
  color: #c98a1e;
  pointer-events: none;
}
.pi-input {
  width: 100%;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: #f6f2eb;
  padding: 10px 38px 10px 36px;
  font: inherit;
  font-size: 14px;
  color: #001d2c;
}
.pi-input:focus {
  outline: none;
  background: #fff;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.2);
}
.pi-clear {
  position: absolute;
  right: 8px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e6dfd2;
  color: #003d5b;
}
.pi-clear:hover {
  background: #d9cfbd;
}
.pi-clear:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 1px;
}
.pi-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #ece4d6;
  box-shadow: 0 18px 40px rgba(0, 29, 44, 0.16);
}
.pi-group {
  margin: 8px 10px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7a62;
}
.pi-group:first-child {
  margin-top: 4px;
}
.pi-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
}
.pi-opt.active {
  background: #fbefd9;
}
.pi-icon {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #f6f2eb;
  color: #003d5b;
}
.pi-opt.active .pi-icon {
  background: #edae49;
  color: #001d2c;
}
.pi-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pi-name {
  font-size: 14px;
  font-weight: 600;
  color: #001d2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-name mark {
  padding: 0;
  background: none;
  color: #c98a1e;
  font-weight: 800;
}
.pi-text small {
  font-size: 12px;
  color: #5a6b78;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pi-pin.ok {
  color: #2e7d4f;
}
.pi-state {
  margin: 2px 4px 0;
  min-height: 1.2em;
  font-size: 12px;
  color: #5a6b78;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-state.bad {
  color: #b3261e;
  white-space: normal;
}
.pi-state a {
  color: #003d5b;
  font-weight: 600;
}
.pi-pin-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid #e6dfd2;
  border-radius: 999px;
  background: #fff;
  padding: 4px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #003d5b;
}
.pi-pin-btn:hover {
  background: #f6f2eb;
}
.pi-map {
  height: 240px;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid #e6dfd2;
}
</style>
