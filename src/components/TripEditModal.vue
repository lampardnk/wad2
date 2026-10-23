<template>
  <!-- Edit trip (organiser only): name, route, dates. Deleting the trip lives here too. -->
  <Teleport to="body">
    <div class="te-overlay" @click.self="close" @keydown.esc="close">
      <form ref="sheet" class="te" role="dialog" aria-modal="true" aria-labelledby="te-title" tabindex="-1" @submit.prevent="save">
        <header class="te-head">
          <div>
            <p class="te-kicker">Organiser</p>
            <h2 id="te-title" class="te-title">Edit trip</h2>
          </div>
          <button type="button" class="te-x" aria-label="Close" @click="close">×</button>
        </header>

        <div class="te-body">
          <!-- Name -->
          <label class="te-label" for="te-name">Trip name</label>
          <input id="te-name" ref="nameBox" v-model="name" class="te-input" maxlength="80" required>

          <!-- Route: in travel order, with arrows to reorder -->
          <p class="te-label" id="te-route-label">Route</p>
          <ol class="te-route" aria-labelledby="te-route-label">
            <li v-for="(d, k) in destinations" :key="d" class="te-stop">
              <span class="te-dot" aria-hidden="true"></span>
              <span class="te-stop-name"><span aria-hidden="true">{{ flagFor(d) }}</span> {{ d }}</span>
              <span class="te-stop-tools">
                <button type="button" class="te-icon" :disabled="k === 0" :aria-label="'Move ' + d + ' earlier'" @click="move(k, -1)">↑</button>
                <button type="button" class="te-icon" :disabled="k === destinations.length - 1" :aria-label="'Move ' + d + ' later'" @click="move(k, 1)">↓</button>
                <button type="button" class="te-icon remove" :disabled="destinations.length === 1" :aria-label="'Remove ' + d"
                  :title="destinations.length === 1 ? 'A trip needs at least one destination' : 'Remove'" @click="destinations.splice(k, 1)">×</button>
              </span>
            </li>
          </ol>

          <!-- Add a destination (type-ahead, like New trip) -->
          <div v-if="destinations.length < 10" class="te-add">
            <label for="te-dest" class="visually-hidden">Add a destination</label>
            <input id="te-dest" v-model="query" class="te-input" placeholder="+ Add a destination…" autocomplete="off"
              role="combobox" aria-autocomplete="list" aria-controls="te-dest-list" :aria-expanded="options.length > 0"
              :aria-activedescendant="active >= 0 ? 'te-opt-' + active : null"
              @input="onType" @keydown="onKey" @blur="active = -1">
            <ul v-if="options.length" id="te-dest-list" class="te-suggest" role="listbox">
              <li v-for="(o, k) in options" :id="'te-opt-' + k" :key="o" role="option" :aria-selected="k === active"
                :class="{ on: k === active }" @mousedown.prevent="addDestination(o)" @mouseenter="active = k">
                <span aria-hidden="true">{{ flagFor(o) }}</span> {{ o }}
              </li>
            </ul>
          </div>

          <!-- Dates -->
          <div class="te-dates">
            <div>
              <label class="te-label" for="te-start">Start</label>
              <input id="te-start" v-model="startDate" type="date" class="te-input">
            </div>
            <div>
              <label class="te-label" for="te-end">End</label>
              <input id="te-end" v-model="endDate" type="date" class="te-input" :min="startDate || null">
            </div>
          </div>
          <p v-if="shiftText" class="te-hint">{{ shiftText }}</p>

          <p v-if="error" class="te-error" role="alert">{{ error }}</p>

          <!-- Delete the whole trip -->
          <div class="te-danger">
            <template v-if="!confirmDelete">
              <button type="button" class="te-delete" @click="confirmDelete = true">Delete this trip</button>
            </template>
            <div v-else class="te-confirm" role="alert">
              <p><strong>Delete "{{ trip.name }}" for everyone?</strong> Its itinerary, expenses and photos go too. This can't be undone.</p>
              <div class="te-confirm-btns">
                <button type="button" class="te-btn danger" :disabled="busy" @click="removeTrip">{{ busy ? 'Deleting…' : 'Delete trip' }}</button>
                <button type="button" class="te-btn" @click="confirmDelete = false">Keep it</button>
              </div>
            </div>
          </div>
        </div>

        <footer class="te-foot">
          <button type="button" class="te-btn" @click="close">Cancel</button>
          <button type="submit" class="te-btn primary" :disabled="busy || !changed">{{ busy ? 'Saving…' : 'Save changes' }}</button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { POPULAR_DESTINATIONS, codeForDestination, flagEmoji } from '../destinations.js'

const props = defineProps({
  trip: { type: Object, required: true } // { id, name, destinations, startDate, endDate }
})
const emit = defineEmits(['close', 'saved'])
const router = useRouter()

const name = ref(props.trip.name || '')
const destinations = ref((props.trip.destinations || []).slice())
const startDate = ref(props.trip.startDate || '')
const endDate = ref(props.trip.endDate || '')
const error = ref('')
const busy = ref(false)
const confirmDelete = ref(false)
const sheet = ref(null)
const nameBox = ref(null)

onMounted(() => {
  if (nameBox.value) nameBox.value.focus()
})

function close() {
  if (!busy.value) emit('close')
}

const changed = computed(() => {
  const t = props.trip
  return name.value.trim() !== t.name || startDate.value !== (t.startDate || '') || endDate.value !== (t.endDate || '') ||
    destinations.value.join('|') !== (t.destinations || []).join('|')
})

// Both dates moved by the same number of days: the stops move too (the server does the same check)
const DAY = 86400000
function dayNumber(s) {
  return Math.round(new Date(s + 'T00:00:00Z').getTime() / DAY)
}
const shiftText = computed(() => {
  const t = props.trip
  if (!t.startDate || !t.endDate || !startDate.value || !endDate.value) return ''
  const a = dayNumber(startDate.value) - dayNumber(t.startDate)
  const b = dayNumber(endDate.value) - dayNumber(t.endDate)
  if (!a || a !== b) return ''
  const days = Math.abs(a) + (Math.abs(a) === 1 ? ' day' : ' days')
  return 'The whole trip moves ' + days + (a > 0 ? ' later' : ' earlier') + ', and every planned stop moves with it.'
})

function flagFor(label) {
  return flagEmoji(codeForDestination(label))
}

function move(k, step) {
  const list = destinations.value
  const item = list[k]
  list.splice(k, 1)
  list.splice(k + step, 0, item)
}

// ----- Add a destination -----
const query = ref('')
const remote = ref([])
const active = ref(-1)
let timer = null

const options = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []
  const list = []
  for (const d of POPULAR_DESTINATIONS) {
    if (d.toLowerCase().includes(q) && list.length < 4 && !destinations.value.includes(d)) list.push(d)
  }
  for (const r of remote.value) {
    if (!list.includes(r.label) && list.length < 7 && !destinations.value.includes(r.label)) list.push(r.label)
  }
  return list
})

function onType() {
  active.value = -1
  clearTimeout(timer)
  const q = query.value.trim()
  remote.value = []
  if (q.length < 2) return
  timer = setTimeout(async () => {
    try {
      const res = await axios.get('/api/places', { params: { q } })
      if (query.value.trim() === q) remote.value = res.data
    } catch (err) {
      remote.value = [] // the popular list still works
    }
  }, 300)
}

function addDestination(label) {
  // "Singapore, Singapore" -> "Singapore"
  const parts = label.trim().split(', ')
  const clean = parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase() ? parts[0] : label.trim()
  const already = destinations.value.some((d) => d.toLowerCase() === clean.toLowerCase())
  if (clean && !already && destinations.value.length < 10) destinations.value.push(clean)
  query.value = ''
  remote.value = []
  active.value = -1
}

function onKey(e) {
  const count = options.value.length
  if (e.key === 'Enter') {
    e.preventDefault() // don't submit the whole form
    if (active.value >= 0 && count) addDestination(options.value[active.value])
    else if (query.value.trim()) addDestination(query.value)
  } else if (e.key === 'ArrowDown' && count) {
    e.preventDefault()
    active.value = (active.value + 1) % count
  } else if (e.key === 'ArrowUp' && count) {
    e.preventDefault()
    active.value = (active.value - 1 + count) % count
  } else if (e.key === 'Escape' && count) {
    e.stopPropagation() // close the list, not the whole dialog
    query.value = ''
    remote.value = []
  }
}

// ----- Save / delete -----
async function save() {
  error.value = ''
  if (query.value.trim()) addDestination(query.value) // something still typed in the box counts too
  if (!name.value.trim()) {
    error.value = 'Please give the trip a name.'
    return
  }
  if (endDate.value && startDate.value && endDate.value < startDate.value) {
    error.value = 'The end date must be on or after the start date.'
    return
  }
  busy.value = true
  try {
    const res = await axios.put('/api/trips/' + props.trip.id, {
      name: name.value.trim(),
      destinations: destinations.value,
      startDate: startDate.value,
      endDate: endDate.value
    })
    busy.value = false
    emit('saved', res.data)
  } catch (err) {
    error.value = (err.response && err.response.data && err.response.data.message) || 'Could not save the trip.'
    busy.value = false
  }
}

async function removeTrip() {
  busy.value = true
  try {
    await axios.delete('/api/trips/' + props.trip.id)
    router.push('/home')
  } catch (err) {
    error.value = 'Could not delete the trip. Try again.'
    busy.value = false
  }
}
</script>

<style scoped>
.te-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 29, 44, 0.55);
  backdrop-filter: blur(3px);
  animation: te-fade 0.18s ease-out;
}
.te {
  width: min(520px, 100%);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #001d2c;
  border-radius: 28px;
  box-shadow: 0 30px 80px rgba(0, 29, 44, 0.35);
  outline: none;
  animation: te-rise 0.22s ease-out;
}
.te-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 8px;
}
.te-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c98a1e;
}
.te-title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.6rem;
  letter-spacing: -0.02em;
}
.te-x {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: #f6f2eb;
  color: #5a6b78;
  font-size: 22px;
  line-height: 1;
}
.te-x:hover {
  background: #ece4d6;
}
.te-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 20px;
}
.te-label {
  display: block;
  margin: 16px 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #003d5b;
}
.te-input {
  width: 100%;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: #f6f2eb;
  padding: 11px 14px;
  font: inherit;
  font-size: 15px;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.te-input:focus {
  outline: none;
  background: #fff;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.2);
}

/* Route: dots joined by a dotted line, like the trip header */
.te-route {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
}
.te-route::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 22px;
  bottom: 22px;
  border-left: 2px dotted #edae49;
}
.te-stop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 4px 0;
}
.te-dot {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #edae49;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #edae49;
  z-index: 1;
}
.te-stop-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.te-stop-tools {
  display: flex;
  gap: 4px;
}
.te-icon {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: #f6f2eb;
  color: #003d5b;
  font-weight: 700;
  transition: background 0.15s;
}
.te-icon:hover:not(:disabled) {
  background: #ece4d6;
}
.te-icon.remove:hover:not(:disabled) {
  background: #fbe7ea;
  color: #d1495b;
}
.te-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.te-add {
  position: relative;
  margin-top: 8px;
}
.te-suggest {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 5;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 29, 44, 0.18);
}
.te-suggest li {
  padding: 9px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
}
.te-suggest li.on {
  background: #fbefd9;
}
.te-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.te-hint {
  margin: 10px 0 0;
  padding: 10px 14px;
  border-radius: 14px;
  background: #fbefd9;
  color: #7a4b00;
  font-size: 13px;
}
.te-error {
  margin: 12px 0 0;
  color: #d1495b;
  font-size: 14px;
  font-weight: 600;
}
.te-danger {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ece4d6;
}
.te-delete {
  border: 0;
  background: none;
  padding: 0;
  color: #d1495b;
  font-weight: 700;
  font-size: 14px;
}
.te-delete:hover {
  text-decoration: underline;
}
.te-confirm {
  padding: 14px;
  border-radius: 16px;
  background: #fbe7ea;
  font-size: 14px;
}
.te-confirm p {
  margin: 0 0 10px;
}
.te-confirm-btns {
  display: flex;
  gap: 8px;
}
.te-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px 22px;
  border-top: 1px solid #f1ebe0;
}
.te-btn {
  border: 1.5px solid #e6dfd2;
  border-radius: 999px;
  background: #fff;
  color: #003d5b;
  padding: 10px 20px;
  font-weight: 700;
  font-size: 14px;
  transition: transform 0.15s, opacity 0.15s;
}
.te-btn.primary {
  border-color: #edae49;
  background: #edae49;
  color: #001d2c;
  box-shadow: 0 6px 18px rgba(237, 174, 73, 0.3);
}
.te-btn.danger {
  border-color: #d1495b;
  background: #d1495b;
  color: #fff;
}
.te-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.te-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}
.te-btn:focus-visible,
.te-icon:focus-visible,
.te-x:focus-visible,
.te-delete:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
@keyframes te-fade {
  from { opacity: 0; }
}
@keyframes te-rise {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
}
@media (max-width: 560px) {
  .te-overlay {
    place-items: end center;
    padding: 0;
  }
  .te {
    border-radius: 28px 28px 0 0;
    max-height: 92vh;
  }
  .te-head,
  .te-body,
  .te-foot {
    padding-left: 18px;
    padding-right: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .te-overlay,
  .te {
    animation: none;
  }
}
</style>
