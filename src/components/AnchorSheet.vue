<template>
  <!-- Where a day starts or ends: your hotel in a city, or your airport (arriving / flying home) -->
  <Teleport to="body">
    <transition name="as-fade">
      <div v-if="anchor" class="an-overlay" @click.self="emit('close')" @keydown.esc="emit('close')">
        <form ref="panel" class="an" role="dialog" aria-modal="true" aria-labelledby="an-title" tabindex="-1" @submit.prevent="save">
          <header class="an-head">
            <div>
              <p class="an-kicker">{{ kicker }}</p>
              <h3 id="an-title" class="an-title">{{ title }}</h3>
            </div>
            <button type="button" class="an-x" aria-label="Close" @click="emit('close')"><AppIcon name="x" :size="18" /></button>
          </header>

          <div class="an-body">
            <!-- The place: search, or the one that's picked -->
            <p class="an-label" id="an-place-label">{{ anchor.kind === 'stay' ? 'Hotel or place you’re staying' : 'Airport' }}</p>
            <div v-if="place" class="an-picked">
              <span class="an-picked-icon" aria-hidden="true"><AppIcon :name="anchor.kind === 'stay' ? 'door' : 'plane'" :size="18" /></span>
              <span class="an-picked-text"><strong>{{ place.name }}</strong><small v-if="place.address">{{ place.address }}</small></span>
              <button type="button" class="an-clear" aria-label="Choose a different place" title="Change" @click="changePlace"><AppIcon name="x" :size="14" :stroke="2.6" /></button>
            </div>
            <div v-else class="an-search">
              <AppIcon name="search" :size="16" class="an-search-icon" />
              <input ref="box" v-model="query" class="an-input" maxlength="120" autocomplete="off" aria-labelledby="an-place-label"
                :placeholder="anchor.kind === 'stay' ? 'e.g. Hotel Gracery' : 'e.g. Kansai'" @input="search">
              <button v-if="query" type="button" class="an-clear in" aria-label="Clear" @click="query = ''; results = []"><AppIcon name="x" :size="14" :stroke="2.6" /></button>
            </div>
            <p v-if="searching" class="an-hint" role="status">Searching…</p>
            <p v-else-if="searchError" class="an-hint err" role="alert">{{ searchError }}</p>
            <ul v-if="!place && results.length" class="an-results" aria-label="Places found">
              <li v-for="r in results" :key="r.name + r.lat">
                <button type="button" class="an-result" @click="pick(r)">
                  <strong>{{ r.name }}</strong><small>{{ r.address }}</small>
                </button>
              </li>
            </ul>

            <!-- Flights: number and time -->
            <div v-if="anchor.kind !== 'stay'" class="an-row">
              <div class="an-field">
                <label for="an-flight" class="an-label">Flight number <span class="an-opt">optional</span></label>
                <input id="an-flight" v-model="flight" class="an-input plain" maxlength="12" placeholder="e.g. SQ618">
              </div>
              <div class="an-field">
                <label for="an-time" class="an-label">{{ anchor.kind === 'arrive' ? 'Lands at' : 'Takes off at' }}</label>
                <input id="an-time" v-model="time" type="time" class="an-input plain" required>
              </div>
            </div>

            <!-- Hotels after the first day: the whole trip, or a hotel change from this day -->
            <fieldset v-if="anchor.kind === 'stay' && !anchor.firstDay" class="an-scope">
              <legend class="an-label">Stay here</legend>
              <label class="an-choice" :class="{ on: scope === 'onward' }">
                <input v-model="scope" type="radio" value="onward">
                <span><strong>From {{ anchor.dayLabel }}</strong><small>A hotel change: earlier days keep their hotel</small></span>
              </label>
              <label class="an-choice" :class="{ on: scope === 'trip' }">
                <input v-model="scope" type="radio" value="trip">
                <span><strong>Every night of the trip</strong><small>One hotel for the whole trip</small></span>
              </label>
            </fieldset>

            <p class="an-note">{{ note }}</p>
            <p v-if="error" class="an-hint err" role="alert">{{ error }}</p>
          </div>

          <footer class="an-foot">
            <button v-if="anchor.current" type="button" class="an-btn danger-text" @click="emit('remove')">Remove</button>
            <span class="an-space"></span>
            <button type="button" class="an-btn" @click="emit('close')">Cancel</button>
            <button type="submit" class="an-btn primary" :disabled="!place">Save</button>
          </footer>
        </form>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import AppIcon from './AppIcon.vue'

// anchor = { kind: 'stay' | 'arrive' | 'depart', city: 'Osaka, Japan', current: { name, address, lat, lon } | null,
//            flight: '', time: 'HH:mm' } or null (closed)
const props = defineProps({
  anchor: { type: Object, default: null }
})
const emit = defineEmits(['save', 'remove', 'close'])

const panel = ref(null)
const box = ref(null)
const place = ref(null)
const query = ref('')
const results = ref([])
const searching = ref(false)
const searchError = ref('')
const flight = ref('')
const time = ref('')
const error = ref('')
const scope = ref('trip') // hotels: 'trip' (every night) or 'onward' (from this day)

const kicker = computed(() => ({ stay: 'Where you\'re staying', arrive: 'Your arrival', depart: 'Your flight home' })[props.anchor.kind])
const title = computed(() => {
  if (props.anchor.kind === 'stay') return 'Your hotel'
  return props.anchor.kind === 'arrive' ? 'Which airport do you land at?' : 'Which airport do you fly home from?'
})
const note = computed(() => (props.anchor.kind === 'stay'
  ? 'Each day starts and ends here until you change hotel, so the plan counts the trip there and back. Everyone on the trip sees it.'
  : 'The day is planned around your flight, and it\'s saved on your Crew card too.'))

// Fill in each time it opens
watch(() => props.anchor, (a) => {
  if (!a) return
  place.value = a.current || null
  query.value = ''
  results.value = []
  searchError.value = ''
  error.value = ''
  flight.value = a.flight || ''
  // Changing hotel on a later day of a trip that has one already: most likely a hotel change
  scope.value = a.kind === 'stay' && !a.firstDay && a.hasHotels ? 'onward' : 'trip'
  time.value = a.time || ''
  nextTick(() => {
    if (box.value) box.value.focus()
    else if (panel.value) panel.value.focus()
  })
}, { immediate: true })

// Search as you type (after a short pause), near the trip's city
let timer = null
let asked = 0
function search() {
  clearTimeout(timer)
  searchError.value = ''
  const q = query.value.trim()
  if (q.length < 3) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    const mine = ++asked
    searching.value = true
    const text = props.anchor.kind !== 'stay' && !/airport/i.test(q) ? q + ' airport' : q
    try {
      const res = await axios.get('/api/safety/stay-search', { params: { q: text, near: props.anchor.city || undefined } })
      if (mine !== asked) return // a newer search is on its way
      results.value = res.data
      if (!res.data.length) searchError.value = 'Nothing found. Try the name with the area, e.g. "Hotel Gracery Namba".'
    } catch (err) {
      if (mine === asked) searchError.value = 'Search is busy right now. Try again in a moment.'
    }
    if (mine === asked) searching.value = false
  }, 350)
}
function pick(r) {
  place.value = { name: r.name, address: r.address || '', lat: r.lat, lon: r.lon }
  results.value = []
}
function changePlace() {
  place.value = null
  nextTick(() => box.value && box.value.focus())
}
function save() {
  error.value = ''
  if (!place.value) return
  if (props.anchor.kind !== 'stay' && !time.value) {
    error.value = 'Add the time, so the day can be planned around it.'
    return
  }
  emit('save', { place: place.value, flight: flight.value.trim().toUpperCase(), time: time.value, scope: scope.value })
}
</script>

<style scoped>
.an-overlay {
  position: fixed;
  inset: 0;
  z-index: 1290;
  background: rgba(0, 40, 62, 0.35);
}
.an {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(440px, 100%);
  display: flex;
  flex-direction: column;
  background: #fbf5ea;
  color: #003d5b;
  box-shadow: -18px 0 40px rgba(0, 40, 62, 0.18);
  outline: none;
  animation: an-in 0.22s ease-out;
}
@keyframes an-in {
  from { transform: translateX(30px); opacity: 0; }
}
.an-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 20px 20px 8px;
}
.an-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c98a1e;
}
.an-title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
}
.an-x {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #f4efe6;
  color: #5a6b78;
}
.an-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px 20px;
}
.an-label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 700;
}
.an-opt {
  font-weight: 500;
  color: #5a6b78;
}
.an-search {
  position: relative;
  display: flex;
  align-items: center;
}
.an-search-icon {
  position: absolute;
  left: 12px;
  color: #c98a1e;
  pointer-events: none;
}
.an-input {
  width: 100%;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: #fbf5ea;
  padding: 11px 38px 11px 36px;
  font: inherit;
  font-size: 14px;
  color: #001d2c;
}
.an-input.plain {
  padding: 10px 12px;
}
.an-input:focus {
  outline: none;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.2);
}
.an-clear {
  flex: none;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e6dfd2;
  color: #003d5b;
}
.an-clear.in {
  position: absolute;
  right: 8px;
}
.an-picked {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fbf5ea;
  border: 1.5px solid #edae49;
}
.an-picked-icon {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #edae49;
  color: #001d2c;
}
.an-picked-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.an-picked-text small,
.an-result small {
  color: #5a6b78;
  font-size: 12px;
}
.an-results {
  list-style: none;
  margin: 8px 0 0;
  padding: 6px;
  border-radius: 16px;
  background: #fbf5ea;
  border: 1px solid #ece4d6;
}
.an-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  border: 0;
  border-radius: 12px;
  background: none;
  padding: 8px 10px;
  text-align: left;
  color: #001d2c;
}
.an-result:hover,
.an-result:focus-visible {
  background: #fbefd9;
  outline: none;
}
.an-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #5a6b78;
}
.an-hint.err {
  color: #d1495b;
  font-weight: 600;
}
.an-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.an-scope {
  margin: 14px 0 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.an-choice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #ece4d6;
  border-radius: 14px;
  background: #fbf5ea;
  cursor: pointer;
}
.an-choice.on {
  border-color: #edae49;
  background: #fbefd9;
}
.an-choice input {
  margin-top: 3px;
  accent-color: #c98a1e;
}
.an-choice span {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.an-choice strong {
  font-size: 14px;
  color: #001d2c;
}
.an-choice small {
  font-size: 12.5px;
  color: #5a6b78;
}
.an-note {
  margin: 14px 0 0;
  font-size: 12.5px;
  color: #5a6b78;
}
.an-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px 20px;
  border-top: 1px solid #ece4d6;
}
.an-space {
  flex: 1;
}
.an-btn {
  border: 1.5px solid #e6dfd2;
  border-radius: 999px;
  background: #fbf5ea;
  color: #003d5b;
  padding: 9px 18px;
  font-weight: 700;
  font-size: 14px;
}
.an-btn.primary {
  border-color: #edae49;
  background: #edae49;
  color: #001d2c;
}
.an-btn.primary:disabled {
  opacity: 0.5;
}
.an-btn.danger-text {
  border: 0;
  background: none;
  padding: 9px 4px;
  color: #d1495b;
}
.an-x:focus-visible,
.an-clear:focus-visible,
.an-btn:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.as-fade-enter-active,
.as-fade-leave-active {
  transition: opacity 0.2s;
}
.as-fade-enter-from,
.as-fade-leave-to {
  opacity: 0;
}
@media (max-width: 640px) {
  .an {
    top: auto;
    left: 0;
    width: 100%;
    max-height: 90vh;
    border-radius: 24px 24px 0 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .an { animation: none; }
}
</style>
