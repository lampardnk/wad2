<template>
  <!-- "Add stop": everything that can go on this day in one place: your saved places, your hotels,
       a flight (e.g. Cape Town -> Kruger midway through the trip), or finding new places -->
  <Teleport to="body">
    <transition name="ad-fade">
      <div v-if="open" class="ad-overlay" @click.self="emit('close')" @keydown.esc="emit('close')">
        <aside ref="panel" class="ad" role="dialog" aria-modal="true" aria-labelledby="ad-title" tabindex="-1">
          <header class="ad-head">
            <div>
              <p class="ad-kicker">Add stop</p>
              <h3 id="ad-title" class="ad-title">{{ dayLabel }}</h3>
            </div>
            <button type="button" class="ad-x" aria-label="Close" @click="emit('close')"><AppIcon name="x" :size="18" /></button>
          </header>

          <div class="ad-body">
            <!-- ===== A flight ===== -->
            <form v-if="flightOpen" class="ad-flight" @submit.prevent="saveFlight">
              <p class="ad-h"><AppIcon name="plane" :size="16" /> Flight</p>
              <div v-for="end in ['from', 'to']" :key="end" class="ad-field">
                <label :for="'ad-' + end" class="ad-label">{{ end === 'from' ? 'From airport' : 'To airport' }}</label>
                <div v-if="air[end].place" class="ad-picked">
                  <span><strong>{{ air[end].place.name }}</strong><small v-if="air[end].place.address">{{ air[end].place.address }}</small></span>
                  <button type="button" class="ad-clear" :aria-label="'Change the ' + (end === 'from' ? 'departure' : 'arrival') + ' airport'" @click="air[end].place = null"><AppIcon name="x" :size="14" :stroke="2.6" /></button>
                </div>
                <template v-else>
                  <input :id="'ad-' + end" v-model="air[end].query" class="ad-input" maxlength="80" autocomplete="off"
                    :placeholder="end === 'from' ? 'e.g. Cape Town' : 'e.g. Hoedspruit'" @input="searchAirport(end)">
                  <p v-if="air[end].busy" class="ad-hint" role="status">Searching…</p>
                  <p v-else-if="air[end].error" class="ad-hint err">{{ air[end].error }}</p>
                  <ul v-if="air[end].results.length" class="ad-results">
                    <li v-for="r in air[end].results" :key="r.name + r.lat">
                      <button type="button" class="ad-result" @click="pickAirport(end, r)"><strong>{{ r.name }}</strong><small>{{ r.address }}</small></button>
                    </li>
                  </ul>
                </template>
              </div>
              <div class="ad-row">
                <div class="ad-field">
                  <label for="ad-dep" class="ad-label">Takes off</label>
                  <input id="ad-dep" v-model="dep" type="time" class="ad-input" required>
                </div>
                <div class="ad-field">
                  <label for="ad-arr" class="ad-label">Lands</label>
                  <input id="ad-arr" v-model="arr" type="time" class="ad-input" required>
                </div>
                <div class="ad-field">
                  <label for="ad-num" class="ad-label">Flight no. <span class="ad-opt">optional</span></label>
                  <input id="ad-num" v-model="number" class="ad-input" maxlength="12" placeholder="e.g. FA101">
                </div>
              </div>
              <div class="ad-kind" role="group" aria-label="Kind of flight">
                <button type="button" class="ad-chip" :class="{ on: !intl }" :aria-pressed="!intl" @click="intl = false">Domestic · at the airport 1.5 h before</button>
                <button type="button" class="ad-chip" :class="{ on: intl }" :aria-pressed="intl" @click="intl = true">International · 2.5 h before</button>
              </div>
              <p v-if="error" class="ad-hint err" role="alert">{{ error }}</p>
              <div class="ad-actions">
                <button type="button" class="ad-btn" @click="flightOpen = false">Back</button>
                <button type="submit" class="ad-btn primary" :disabled="!air.from.place || !air.to.place || !dep || !arr">Add flight</button>
              </div>
            </form>

            <template v-else>
              <!-- Flight and new places: the two bigger actions -->
              <div class="ad-big">
                <button type="button" class="ad-tile" @click="openFlight">
                  <span class="ad-tile-icon sun" aria-hidden="true"><AppIcon name="plane" :size="18" /></span>
                  <span><strong>Flight</strong><small>Flying between cities on this day</small></span>
                </button>
                <button type="button" class="ad-tile" @click="emit('find')">
                  <span class="ad-tile-icon" aria-hidden="true"><AppIcon name="search" :size="18" /></span>
                  <span><strong>Find new places</strong><small>Search and save in Places</small></span>
                </button>
              </div>

              <!-- Your hotels (e.g. back to the hotel to collect your bags) -->
              <template v-if="hotels.length">
                <p class="ad-h">Your hotels</p>
                <ul class="ad-list">
                  <li v-for="h in hotels" :key="h.name">
                    <button type="button" class="ad-item" @click="emit('add-hotel', h)">
                      <span class="ad-item-icon" aria-hidden="true"><AppIcon name="door" :size="16" /></span>
                      <span class="ad-item-text"><strong>{{ h.name }}</strong><small>{{ h.sub }}</small></span>
                      <span class="ad-plus" aria-hidden="true">+</span>
                    </button>
                  </li>
                </ul>
              </template>

              <!-- Saved places that can go on a day -->
              <p class="ad-h">Saved places</p>
              <p v-if="!places.length" class="ad-empty">Nothing saved yet. Use Find new places to save some.</p>
              <ul v-else class="ad-list">
                <li v-for="p in places" :key="p.id">
                  <button type="button" class="ad-item" @click="emit('add-place', p)">
                    <span class="ad-item-icon" aria-hidden="true">{{ p.icon }}</span>
                    <span class="ad-item-text"><strong>{{ p.name }}</strong><small>{{ p.sub }}</small></span>
                    <span class="ad-plus" aria-hidden="true">+</span>
                  </button>
                </li>
              </ul>
            </template>
          </div>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import axios from 'axios'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  dayLabel: { type: String, default: '' },
  hotels: { type: Array, default: () => [] },   // [{ name, address, lat, lon, sub }]
  places: { type: Array, default: () => [] },   // saved places ready to add: [{ id, name, icon, sub, ... }]
  near: { type: String, default: '' }           // the trip's city, to search airports near it
})
const emit = defineEmits(['close', 'add-place', 'add-hotel', 'add-flight', 'find'])

const panel = ref(null)
const flightOpen = ref(false)
const air = reactive({
  from: { query: '', results: [], busy: false, error: '', place: null },
  to: { query: '', results: [], busy: false, error: '', place: null }
})
const dep = ref('')
const arr = ref('')
const number = ref('')
const intl = ref(false)
const error = ref('')

watch(() => props.open, (open) => {
  if (!open) return
  flightOpen.value = false
  nextTick(() => panel.value && panel.value.focus())
})

function openFlight() {
  for (const end of ['from', 'to']) Object.assign(air[end], { query: '', results: [], busy: false, error: '', place: null })
  dep.value = ''
  arr.value = ''
  number.value = ''
  intl.value = false
  error.value = ''
  flightOpen.value = true
}

// Airport search as you type (after a short pause)
const timers = {}
const asked = { from: 0, to: 0 }
function searchAirport(end) {
  const box = air[end]
  clearTimeout(timers[end])
  box.error = ''
  const q = box.query.trim()
  if (q.length < 3) {
    box.results = []
    return
  }
  timers[end] = setTimeout(async () => {
    const mine = ++asked[end]
    box.busy = true
    try {
      const res = await axios.get('/api/safety/stay-search', { params: { q: /airport/i.test(q) ? q : q + ' airport', near: props.near || undefined } })
      if (mine !== asked[end]) return
      box.results = res.data
      if (!res.data.length) box.error = 'No airport found. Try the city name.'
    } catch (err) {
      if (mine === asked[end]) box.error = 'Search is busy right now. Try again in a moment.'
    }
    if (mine === asked[end]) box.busy = false
  }, 350)
}
function pickAirport(end, r) {
  air[end].place = { name: r.name, address: r.address || '', lat: r.lat, lon: r.lon }
  air[end].results = []
}

function saveFlight() {
  error.value = ''
  if (air.from.place.name === air.to.place.name) {
    error.value = 'The two airports are the same. Choose where you fly to.'
    return
  }
  emit('add-flight', {
    from: { name: air.from.place.name, lat: air.from.place.lat, lon: air.from.place.lon },
    to: { name: air.to.place.name, lat: air.to.place.lat, lon: air.to.place.lon },
    dep: dep.value, arr: arr.value, number: number.value.trim().toUpperCase(), intl: intl.value
  })
}
</script>

<style scoped>
.ad-overlay {
  position: fixed;
  inset: 0;
  z-index: 1290;
  background: rgba(0, 40, 62, 0.35);
}
.ad {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(480px, 100%);
  display: flex;
  flex-direction: column;
  background: #fbf5ea;
  color: #003d5b;
  box-shadow: -18px 0 40px rgba(0, 40, 62, 0.18);
  outline: none;
  animation: ad-in 0.22s ease-out;
}
@keyframes ad-in {
  from { transform: translateX(30px); opacity: 0; }
}
.ad-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 20px 20px 10px;
}
.ad-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c98a1e;
}
.ad-title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 800;
}
.ad-x {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #f4efe6;
  color: #5a6b78;
}
.ad-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 20px 28px;
}
.ad-big {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ad-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1.5px solid #ece4d6;
  border-radius: 16px;
  background: #fbf5ea;
  text-align: left;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ad-tile span:last-child {
  display: flex;
  flex-direction: column;
}
.ad-tile strong {
  font-size: 14px;
}
.ad-tile small {
  font-size: 12px;
  color: #5a6b78;
}
.ad-tile-icon,
.ad-item-icon {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #f4efe6;
  color: #003d5b;
}
.ad-tile-icon.sun {
  background: #edae49;
  color: #001d2c;
}
.ad-h {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 18px 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7a62;
}
.ad-flight .ad-h {
  margin-top: 4px;
}
.ad-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ad-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #ece4d6;
  border-radius: 14px;
  background: #fbf5ea;
  text-align: left;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ad-item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ad-item-text strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ad-item-text small {
  font-size: 12px;
  color: #5a6b78;
}
.ad-plus {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1.5px solid #00798c;
  color: #00798c;
  font-size: 18px;
}
.ad-item:hover,
.ad-tile:hover {
  border-color: #edae49;
  box-shadow: 0 6px 16px rgba(0, 61, 91, 0.08);
}
.ad-item:hover .ad-plus {
  background: #00798c;
  color: #fff;
}
.ad-empty {
  margin: 0;
  font-size: 13px;
  color: #5a6b78;
}
.ad-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  flex: 1;
  min-width: 0;
}
.ad-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #003d5b;
}
.ad-opt {
  font-weight: 500;
  color: #8a7a62;
}
.ad-input {
  width: 100%;
  border: 1.5px solid transparent;
  border-radius: 12px;
  background: #fbf5ea;
  padding: 9px 12px;
  font: inherit;
  font-size: 14px;
  color: #001d2c;
}
.ad-input:focus {
  outline: none;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.2);
}
.ad-row {
  display: flex;
  gap: 10px;
}
.ad-picked {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  background: #fbefd9;
  border: 1.5px solid #f3d29a;
}
.ad-picked span {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ad-picked small,
.ad-result small {
  font-size: 12px;
  color: #5a6b78;
}
.ad-clear {
  flex: none;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e6dfd2;
  color: #003d5b;
}
.ad-results {
  list-style: none;
  margin: 6px 0 0;
  padding: 4px;
  border-radius: 14px;
  background: #fbf5ea;
  border: 1px solid #ece4d6;
}
.ad-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: none;
  text-align: left;
  color: #001d2c;
}
.ad-result:hover {
  background: #fbefd9;
}
.ad-hint {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: #5a6b78;
}
.ad-hint.err {
  color: #a33a48;
}
.ad-kind {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.ad-chip {
  padding: 7px 12px;
  border: 1.5px solid #ece4d6;
  border-radius: 999px;
  background: #fbf5ea;
  font-size: 12.5px;
  font-weight: 600;
  color: #003d5b;
}
.ad-chip.on {
  border-color: #edae49;
  background: #fbefd9;
  color: #7a4b00;
}
.ad-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
.ad-btn {
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  padding: 9px 18px;
  border: 1.5px solid #003d5b;
  background: transparent;
  color: #003d5b;
}
.ad-btn.primary {
  border-color: #003d5b;
  background: #003d5b;
  color: #fff;
}
.ad-btn:disabled {
  opacity: 0.5;
}
.ad-x:focus-visible,
.ad-tile:focus-visible,
.ad-item:focus-visible,
.ad-chip:focus-visible,
.ad-btn:focus-visible,
.ad-result:focus-visible,
.ad-clear:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.ad-fade-enter-active,
.ad-fade-leave-active {
  transition: opacity 0.2s;
}
.ad-fade-enter-from,
.ad-fade-leave-to {
  opacity: 0;
}
@media (max-width: 640px) {
  .ad {
    top: auto;
    left: 0;
    width: 100%;
    max-height: 88vh;
    border-radius: 24px 24px 0 0;
    animation-name: ad-up;
  }
  @keyframes ad-up {
    from { transform: translateY(40px); opacity: 0; }
  }
  .ad-row {
    flex-wrap: wrap;
  }
}
@media (max-width: 420px) {
  .ad-big {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ad { animation: none; }
}
</style>
