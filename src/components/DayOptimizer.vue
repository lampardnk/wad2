<template>
  <section class="do" aria-labelledby="do-title">
    <!-- ===== Header ===== -->
    <header class="do-head">
      <div class="do-head-text">
        <h3 id="do-title" class="do-title">{{ sampleMode ? 'Sample day · Kyoto' : 'Day schedule' }}</h3>
        <p class="do-sub">
          <template v-if="sampleMode">Not saved · <button type="button" class="do-link" @click="leaveSample">Back to my day</button></template>
          <template v-else-if="stops.length < 2">Add at least 2 stops to optimize · <button type="button" class="do-link" @click="startSample">Try a sample Kyoto day</button></template>
          <template v-else>Drag ⋮⋮ to reorder · 🔒 keeps a stop at its time</template>
        </p>
      </div>
      <button type="button" class="do-optimize" :class="{ busy: phase }" :disabled="!!phase || rows.length < 2" @click="optimize" data-testid="optimize-day">
        <span v-if="phase" class="do-spin" aria-hidden="true"></span>
        <span v-else aria-hidden="true">✨</span>
        {{ phaseText }}
      </button>
    </header>
    <p class="visually-hidden" role="status" aria-live="polite">{{ phase ? phaseText : '' }}</p>

    <!-- ===== Hourly weather ===== -->
    <div v-if="rain" class="do-weather" aria-label="Chance of rain by hour">
      <span v-for="h in hours" :key="h" class="do-hour" :class="{ wet: rain[h] >= 0.5 }" :title="formatHour(h) + ': ' + Math.round(rain[h] * 100) + '% rain'">
        <span aria-hidden="true">{{ rain[h] >= 0.5 ? '🌧️' : rain[h] >= 0.3 ? '🌦️' : '☀️' }}</span>
        <small>{{ shortHour(h) }}</small>
      </span>
    </div>

    <!-- ===== Preview of the optimized day ===== -->
    <transition name="do-pop">
      <div v-if="preview" class="do-preview" :class="{ same: !preview.better }" role="region" aria-label="Optimized plan">
        <p class="do-preview-text">{{ preview.better ? preview.summary : 'Your day is already in a good order.' }}</p>
        <div v-if="preview.better" class="do-stats">
          <span class="do-stat">🚌 {{ preview.before.travelMin }} → <strong>{{ preview.after.travelMin }} min</strong> travel</span>
          <span v-if="rain" class="do-stat">🌧️ {{ wetCount(preview.before.items) }} → <strong>{{ wetCount(preview.after.items) }}</strong> outdoor stops in rain</span>
          <span class="do-stat">🏁 Done by <strong>{{ formatHour(preview.after.end) }}</strong></span>
        </div>
        <div class="do-preview-btns">
          <button v-if="preview.better" type="button" class="do-apply" @click="applyPreview">Apply</button>
          <button type="button" class="do-ghost" @click="preview = null">{{ preview.better ? 'Dismiss' : 'OK' }}</button>
        </div>
      </div>
    </transition>

    <!-- ===== Timeline ===== -->
    <p v-if="!rows.length" class="do-empty">No stops on this day yet.</p>
    <ol class="do-list" :class="{ previewing: preview && preview.better }">
      <li v-for="(it, i) in rows" :key="it.stop.id" class="do-row"
        :class="{ dragging: dragFrom === i, over: dragOver === i && dragFrom !== i }"
        @dragover.prevent="dragOver = i" @dragleave="dragOver = null" @drop.prevent="dropOn(i)">

        <!-- Getting here -->
        <div v-if="i > 0" class="do-leg" :class="it.mode">
          <span class="do-leg-line" aria-hidden="true"></span>
          {{ legText(it) }}
        </div>

        <article class="do-card" :class="{ locked: it.stop.locked, moved: movedFrom(it) !== null }"
          :draggable="!it.stop.locked && !(preview && preview.better)" @dragstart="dragFrom = i" @dragend="dragFrom = null; dragOver = null">
          <button type="button" class="do-handle" :disabled="it.stop.locked || !!(preview && preview.better)"
            :aria-label="'Move ' + it.stop.name + ' (arrow keys)'" title="Drag to reorder, or use the arrow keys" @keydown="onHandleKey($event, i)">⋮⋮</button>

          <div class="do-time">
            <strong>{{ formatHour(it.start) }}</strong>
            <span>{{ formatHour(it.start + (it.stop.duration || 1)) }}</span>
          </div>

          <div class="do-main">
            <div class="do-name-row">
              <span class="do-name">{{ it.stop.name }}</span>
              <span class="do-kind" :class="{ out: it.stop.outdoor }">{{ it.stop.outdoor ? 'Outdoor' : 'Indoor' }}</span>
              <span v-if="movedFrom(it) !== null" class="do-was">was {{ formatHour(movedFrom(it)) }}</span>
            </div>
            <div v-if="pillsFor(it).length" class="do-pills">
              <span v-for="(p, k) in pillsFor(it)" :key="k" class="do-pill" :class="p.kind">
                <span aria-hidden="true">{{ p.icon }}</span> {{ p.text }}
              </span>
            </div>
          </div>

          <button type="button" class="do-lock" :class="{ on: it.stop.locked }" :aria-pressed="it.stop.locked"
            :aria-label="(it.stop.locked ? 'Unlock ' : 'Lock ') + it.stop.name" :title="it.stop.locked ? 'Locked: stays at this time' : 'Lock to keep this time'"
            :disabled="!!(preview && preview.better)" @click="toggleLock(it.stop)">{{ it.stop.locked ? '🔒' : '🔓' }}</button>
        </article>
      </li>
    </ol>
    <p v-if="unknownLegs && !preview" class="do-note">Stops without an address count as 15 min away.</p>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { optimizeDay, scheduleInOrder, scheduleAsIs, travelMatrix, warningsFor, rainFromBlocks } from '../dayOptimizer.js'
import { KYOTO_SAMPLE } from '../dayOptimizerSample.js'

const props = defineProps({
  stops: { type: Array, default: () => [] },          // the day's stops from the itinerary store
  dayName: { type: String, default: '' },             // 'Tuesday' (for crowd data)
  weatherBlocks: { type: Array, default: () => [] },  // [{ time, span, rain }]
  prefs: { type: Object, default: () => ({ dayStart: 8, dayEnd: 23 }) }
})
const emit = defineEmits(['apply', 'lock'])

// ----- Sample Kyoto day (local only) -----
const sampleMode = ref(false)
const sampleStops = ref([])
function startSample() {
  sampleStops.value = KYOTO_SAMPLE.stops.map((s) => ({ ...s }))
  sampleMode.value = true
  preview.value = null
}
function leaveSample() {
  sampleMode.value = false
  preview.value = null
}

// ----- Places on the map (addresses -> coordinates, via our server; cached) -----
const coords = ref({})
async function locateAll() {
  const jobs = []
  for (const s of props.stops) {
    if (!s.address || coords.value[s.address] !== undefined) continue
    jobs.push(axios.get('/api/safety/locate', { params: { place: s.address }, timeout: 10000 })
      .then((res) => { coords.value = { ...coords.value, [s.address]: { lat: res.data.lat, lon: res.data.lon } } })
      .catch(() => { coords.value = { ...coords.value, [s.address]: null } }))
  }
  await Promise.all(jobs)
}
watch(() => props.stops.map((s) => s.address).join('|'), () => { if (!sampleMode.value) locateAll() }, { immediate: true })

// Crowd data from the itinerary (BestTime forecast: index 0 = 6 AM) -> 24 hours
function crowdCurve(forecast) {
  const day = forecast && forecast.days && forecast.days[props.dayName]
  if (!day || !day.raw) return null
  const curve = new Array(24).fill(0)
  for (let k = 0; k < 24; k++) curve[(k + 6) % 24] = day.raw[k] || 0
  return curve
}

// The stops in the shape the optimizer wants
const work = computed(() => {
  if (sampleMode.value) return sampleStops.value
  const list = []
  for (const s of props.stops) {
    const c = s.address ? coords.value[s.address] : null
    const day = s.forecast && s.forecast.days && s.forecast.days[props.dayName]
    list.push({
      id: s.id, name: s.name, hour: s.hour, outdoor: !!s.outdoor, locked: !!s.locked,
      duration: s.duration || (s.forecast && s.forecast.durationDefault) || 1,
      lat: c ? c.lat : null, lon: c ? c.lon : null,
      crowd: crowdCurve(s.forecast),
      popular: !!s.address, // meals etc. without an address aren't crowd-checked
      open: day && !day.closed ? day.open : null,
      close: day && !day.closed ? day.close : null
    })
  }
  return list
})

const rain = computed(() => {
  if (sampleMode.value) return KYOTO_SAMPLE.rain
  return props.weatherBlocks.length ? rainFromBlocks(props.weatherBlocks) : null
})
const opts = computed(() => ({ dayStart: props.prefs.dayStart || 8, dayEnd: Math.min(24, props.prefs.dayEnd || 23) }))
const hours = computed(() => {
  const list = []
  for (let h = opts.value.dayStart; h < opts.value.dayEnd; h++) list.push(h)
  return list
})

// What's on screen: the preview if there is one, otherwise today's plan with its problems
const current = computed(() => scheduleAsIs(work.value, travelMatrix(work.value)))
const preview = ref(null)
const rows = computed(() => (preview.value && preview.value.better ? preview.value.after.items : current.value))
const unknownLegs = computed(() => rows.value.some((it, i) => i > 0 && it.mode === 'unknown'))

// A new day / new stops: the old preview no longer applies
watch(() => props.stops.map((s) => s.id + s.hour + s.locked).join(), () => { if (!sampleMode.value) preview.value = null })

// ----- Optimize -----
const phase = ref('')
const phaseText = computed(() => ({
  route: 'Analyzing route…',
  forecast: 'Checking forecast…',
  reorder: 'Reordering…'
})[phase.value] || 'Optimize Day')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

async function optimize() {
  preview.value = null
  phase.value = 'route'
  if (!sampleMode.value) await locateAll()
  await pause(350)
  phase.value = 'forecast'
  await pause(350)
  phase.value = 'reorder'
  await pause(300)
  preview.value = optimizeDay(work.value, rain.value, opts.value)
  phase.value = ''
}

function save(changes) {
  if (sampleMode.value) {
    for (const c of changes) {
      const s = sampleStops.value.find((x) => x.id === c.id)
      if (s) s.hour = c.hour
    }
  } else {
    emit('apply', changes)
  }
}

function applyPreview() {
  const changes = []
  for (const it of preview.value.after.items) changes.push({ id: it.stop.id, hour: it.start })
  save(changes)
  preview.value = null
}

function toggleLock(stop) {
  if (sampleMode.value) stop.locked = !stop.locked
  else emit('lock', stop.id, !stop.locked)
}

// ----- Manual reordering (drag or arrow keys) -----
const dragFrom = ref(null)
const dragOver = ref(null)

function reorder(from, to) {
  if (from === null || from === to || to < 0 || to >= rows.value.length) return
  const list = rows.value.map((it) => it.stop)
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  // Locked stops keep their time; the others are re-timed in the new order around them
  const flex = list.filter((s) => !s.locked)
  const locked = list.filter((s) => s.locked)
  const items = scheduleInOrder(flex, locked, travelMatrix(work.value), opts.value)
  const changes = []
  for (const it of items) changes.push({ id: it.stop.id, hour: it.start })
  save(changes)
}

function dropOn(i) {
  reorder(dragFrom.value, i)
  dragFrom.value = null
  dragOver.value = null
}

function onHandleKey(e, i) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    reorder(i, e.key === 'ArrowUp' ? i - 1 : i + 1)
  }
}

// ----- Text helpers -----
function formatHour(h) {
  const hour = Math.floor(h) % 24
  const min = Math.round((h - Math.floor(h)) * 60)
  return (hour % 12 === 0 ? 12 : hour % 12) + ':' + String(min).padStart(2, '0') + (hour >= 12 ? ' PM' : ' AM')
}
function shortHour(h) {
  return (h % 12 === 0 ? 12 : h % 12) + (h >= 12 ? 'p' : 'a')
}
function legText(it) {
  if (it.mode === 'walk') return '🚶 ' + it.travelMin + ' min walk'
  if (it.mode === 'transit') return '🚇 ' + it.travelMin + ' min by transit'
  return '⋯ ~' + it.travelMin + ' min'
}
function movedFrom(it) {
  if (!preview.value || !preview.value.better) return null
  for (const b of preview.value.before.items) {
    if (b.stop.id === it.stop.id) return Math.abs(b.start - it.start) > 0.01 ? b.start : null
  }
  return null
}
function pillsFor(it) {
  if (preview.value && preview.value.better) return it.reasons || []
  return warningsFor(it, rain.value).map((w) => ({ ...w, kind: 'warn' }))
}
function wetCount(items) {
  let n = 0
  for (const it of items) {
    if (!it.stop.outdoor) continue
    for (let h = Math.floor(it.start); h < Math.ceil(it.start + (it.stop.duration || 1)); h++) {
      if ((rain.value[h] || 0) >= 0.5) { n++; break }
    }
  }
  return n
}
</script>

<style scoped>
.do {
  --mint: #edae49;
  --line: rgba(255, 255, 255, 0.08);
  --muted: #8b949e;
  --text: #e6edf3;
  background: #00283c;
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
}
.do-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.do-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.25rem;
  margin: 0;
  color: #fff;
}
.do-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted);
}
.do-link {
  border: 0;
  background: none;
  padding: 0;
  color: var(--mint);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.do-optimize {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  padding: 9px 18px;
  font-weight: 700;
  background: var(--mint);
  color: #00283c;
  box-shadow: 0 6px 20px rgba(237, 174, 73, 0.25);
  transition: transform 0.15s, filter 0.15s, box-shadow 0.15s;
}
.do-optimize:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
.do-optimize:disabled:not(.busy) {
  opacity: 0.45;
  box-shadow: none;
}
.do-optimize.busy {
  background: rgba(237, 174, 73, 0.15);
  color: var(--mint);
  box-shadow: inset 0 0 0 1px rgba(237, 174, 73, 0.4);
}
.do-spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(237, 174, 73, 0.3);
  border-top-color: var(--mint);
  border-radius: 50%;
  animation: do-spin 0.8s linear infinite;
}

/* Weather strip */
.do-weather {
  display: flex;
  gap: 4px;
  margin-top: 14px;
  padding: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  background: #0a3550;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.do-hour {
  flex: 1 0 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  border-radius: 8px;
  font-size: 14px;
}
.do-hour small {
  font-size: 10px;
  color: var(--muted);
}
.do-hour.wet {
  background: rgba(88, 166, 255, 0.12);
}

/* Preview */
.do-preview {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(237, 174, 73, 0.08);
  border: 1px solid rgba(237, 174, 73, 0.35);
  box-shadow: 0 0 24px rgba(237, 174, 73, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.do-preview.same {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--line);
  box-shadow: none;
}
.do-preview-text {
  margin: 0;
  font-weight: 600;
}
.do-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.do-stat {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}
.do-stat strong {
  color: #fff;
}
.do-preview-btns {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.do-apply {
  border: 0;
  border-radius: 999px;
  padding: 7px 20px;
  font-weight: 700;
  background: var(--mint);
  color: #00283c;
}
.do-ghost {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 16px;
  font-weight: 600;
  background: transparent;
  color: #cbd5e1;
}
.do-ghost:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Timeline */
.do-empty,
.do-note {
  color: var(--muted);
  font-size: 13px;
  margin: 12px 0 0;
}
.do-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}
.do-row {
  transition: transform 0.2s;
}
.do-row.over .do-card {
  border-color: var(--mint);
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.15);
}
.do-row.dragging .do-card {
  opacity: 0.45;
}
.do-leg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 4px 52px;
  font-size: 12px;
  color: var(--muted);
}
.do-leg-line {
  width: 2px;
  height: 18px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
}
.do-leg.walk .do-leg-line {
  background: repeating-linear-gradient(to bottom, var(--mint) 0 3px, transparent 3px 6px);
}
.do-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 12px 12px 6px;
  background: #0a3550;
  border: 1px solid var(--line);
  border-radius: 16px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s, background 0.2s;
}
.do-card:hover {
  border-color: rgba(255, 255, 255, 0.16);
}
.do-card.locked {
  background: linear-gradient(180deg, rgba(237, 174, 73, 0.05), transparent), #0a3550;
  border-color: rgba(237, 174, 73, 0.22);
}
.previewing .do-card.moved {
  border-color: rgba(237, 174, 73, 0.45);
  animation: do-slide 0.35s ease-out;
}
.do-handle {
  flex: none;
  align-self: stretch;
  width: 24px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6e7681;
  font-size: 14px;
  letter-spacing: -2px;
  cursor: grab;
}
.do-handle:hover:not(:disabled) {
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
}
.do-handle:disabled {
  opacity: 0.25;
  cursor: default;
}
.do-time {
  flex: none;
  width: 72px;
  display: flex;
  flex-direction: column;
  font-variant-numeric: tabular-nums;
}
.do-time strong {
  font-size: 14px;
  color: #fff;
}
.do-time span {
  font-size: 12px;
  color: var(--muted);
}
.do-main {
  flex: 1;
  min-width: 0;
}
.do-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.do-name {
  font-weight: 600;
}
.do-kind {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}
.do-kind.out {
  background: rgba(88, 166, 255, 0.12);
  color: #a5d0ff;
}
.do-was {
  font-size: 11px;
  color: var(--mint);
  font-weight: 600;
}
.do-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.do-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(237, 174, 73, 0.1);
  border: 1px solid rgba(237, 174, 73, 0.25);
  color: #f8deb0;
  animation: do-fade 0.3s ease-out;
}
.do-pill.travel,
.do-pill.wait,
.do-pill.lock {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--line);
  color: #cbd5e1;
}
.do-pill.warn {
  background: rgba(255, 176, 32, 0.1);
  border-color: rgba(255, 176, 32, 0.35);
  color: #ffd38a;
}
.do-lock {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: transparent;
  font-size: 15px;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
}
.do-lock:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}
.do-lock:active:not(:disabled) {
  transform: scale(0.92);
}
.do-lock.on {
  border-color: rgba(237, 174, 73, 0.45);
  background: rgba(237, 174, 73, 0.12);
}
.do-lock:disabled {
  opacity: 0.4;
}
.do button:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
}

/* Animations */
.do-pop-enter-active {
  transition: opacity 0.2s ease-out, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.do-pop-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.do-pop-enter-from,
.do-pop-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-6px);
}
@keyframes do-spin {
  to { transform: rotate(360deg); }
}
@keyframes do-slide {
  from { transform: translateY(-6px); opacity: 0.6; }
}
@keyframes do-fade {
  from { opacity: 0; }
}

@media (max-width: 560px) {
  .do {
    padding: 14px;
  }
  .do-optimize {
    width: 100%;
    justify-content: center;
  }
  .do-time {
    width: 60px;
  }
  .do-leg {
    padding-left: 40px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .do-spin,
  .do-pill,
  .previewing .do-card.moved {
    animation: none;
  }
  .do-card,
  .do-row,
  .do-pop-enter-active,
  .do-pop-leave-active {
    transition: none;
  }
}
</style>
