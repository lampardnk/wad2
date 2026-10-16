<template>
  <!-- Smart Schedule: the itinerary's settings + what the scheduler just did -->
  <section class="sp" aria-labelledby="sp-title">
    <header class="sp-head">
      <div class="sp-titles">
        <h3 id="sp-title" class="sp-title"><span class="sp-spark" aria-hidden="true">✨</span> Smart Schedule</h3>
        <p class="sp-sub">Automatically balances travel time, crowd levels and the weather.</p>
      </div>
      <div class="sp-head-right">
        <span v-if="saveText" class="sp-saved" :class="{ bad: saveText.startsWith('Could not') }" role="status">{{ saveText }}</span>
      </div>
    </header>

    <!-- Controls -->
    <div class="sp-controls">
      <div class="sp-control">
        <span class="sp-label" id="sp-hours">Active hours</span>
        <div class="sp-hours" role="group" aria-labelledby="sp-hours">
          <span aria-hidden="true">⏰</span>
          <CustomDropdown v-model="form.dayStart" :options="startChoices" size="sm" class="sp-time" header-text="Day starts" aria-label="Day starts" :searchable="false" />
          <span class="sp-dash" aria-hidden="true">–</span>
          <CustomDropdown v-model="form.dayEnd" :options="endChoices" size="sm" class="sp-time" header-text="Day ends" aria-label="Day ends" :searchable="false" />
        </div>
      </div>

      <div class="sp-control">
        <span class="sp-label" id="sp-crowd">Avoid peak crowds</span>
        <div class="sp-seg" role="radiogroup" aria-labelledby="sp-crowd">
          <button v-for="c in CROWD" :key="c.value" type="button" role="radio" :aria-checked="form.crowdSensitivity === c.value"
            :class="{ on: form.crowdSensitivity === c.value }" :title="c.hint" @click="form.crowdSensitivity = c.value">{{ c.label }}</button>
        </div>
      </div>

      <div class="sp-control">
        <span class="sp-label" id="sp-buffer">Transit buffer</span>
        <div class="sp-seg" role="radiogroup" aria-labelledby="sp-buffer">
          <button v-for="b in BUFFER" :key="b.value" type="button" role="radio" :aria-checked="form.travelBuffer === b.value"
            :class="{ on: form.travelBuffer === b.value }" @click="form.travelBuffer = b.value">{{ b.label }}</button>
        </div>
      </div>
    </div>

    <!-- What the scheduler is doing -->
    <p class="sp-status" :class="'is-' + (status.kind || 'idle')" role="status" aria-live="polite">
      <span class="sp-status-icon" aria-hidden="true">{{ ICONS[status.kind] || '•' }}</span>
      <span>{{ hoursError || status.text }}</span>
    </p>
  </section>
</template>

<script setup>
// Smart Schedule settings. Changes apply at once (the planner re-times the day) and are saved a moment later.
import { reactive, ref, computed, watch } from 'vue'
import { prefs, savePreferences } from '../preferences.js'
import CustomDropdown from './CustomDropdown.vue'

const props = defineProps({
  saveStatus: { type: String, default: '' },                                  // itinerary saving
  status: { type: Object, default: () => ({ kind: 'idle', text: '' }) }       // from the planner
})

const CROWD = [
  { value: 'low', label: 'Relaxed', hint: "Crowds don't bother me much" },
  { value: 'medium', label: 'Balanced', hint: 'Avoid the worst peaks' },
  { value: 'high', label: 'Strict', hint: 'Avoid busy times wherever possible' }
]
const BUFFER = [
  { value: 0, label: '0m' },
  { value: 0.25, label: '15m' },
  { value: 0.5, label: '30m' },
  { value: 1, label: '1h' }
]
const ICONS = { ok: '✓', fixed: '⚡', warn: '⚠', idle: '•', busy: '…' }

function hourLabel(h) {
  if (h === 24) return 'Midnight'
  const hour = h % 24
  return (hour % 12 === 0 ? 12 : hour % 12) + ':00 ' + (hour >= 12 ? 'PM' : 'AM')
}
const startChoices = []
for (let h = 5; h <= 12; h++) startChoices.push({ value: h, label: hourLabel(h) })
const endChoices = []
for (let h = 16; h <= 24; h++) endChoices.push({ value: h, label: hourLabel(h) })

// ----- the settings: apply now, save shortly after -----
const form = reactive({ ...prefs })
watch(prefs, (p) => {
  // Loaded from the server (or changed elsewhere): show it
  for (const key in p) if (form[key] !== p[key]) form[key] = p[key]
})

const hoursError = computed(() => (form.dayEnd - form.dayStart < 4 ? 'Your day needs to be at least 4 hours long.' : ''))
const saving = ref('')
let timer = null

watch(form, () => {
  let changed = false
  for (const key in form) if (form[key] !== prefs[key]) changed = true
  if (!changed || hoursError.value) return
  Object.assign(prefs, form) // the planner re-times the open day straight away
  saving.value = 'Saving…'
  clearTimeout(timer)
  timer = setTimeout(async () => {
    try {
      await savePreferences({ ...form })
      saving.value = 'Saved'
      setTimeout(() => { if (saving.value === 'Saved') saving.value = '' }, 2000)
    } catch (err) {
      saving.value = 'Could not save settings'
    }
  }, 600)
})

const saveText = computed(() => saving.value || props.saveStatus)
</script>

<style scoped>
.sp {
  --mint: #edae49;
  --line: rgba(255, 255, 255, 0.08);
  --muted: #8b949e;
  --text: #e6edf3;
  background: #00283c;
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px 18px;
  margin-bottom: 18px;
}
.sp-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.sp-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.2rem;
  margin: 0;
  color: #fff;
}
.sp-spark {
  color: var(--mint);
}
.sp-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted);
}
.sp-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.sp-saved {
  font-size: 12px;
  color: var(--muted);
}
.sp-saved.bad {
  color: #f09aa5;
}

/* Controls */
.sp-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, auto));
  justify-content: start;
  gap: 12px 22px;
  margin-top: 14px;
  padding: 12px;
  background: #0a3550;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.sp-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.sp-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}
.sp-hours {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 12px;
  border-radius: 999px;
  background: #00283c;
  border: 1px solid var(--line);
}
.sp-time :deep(.dd-trigger) {
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0 6px;
  font-weight: 600;
}
.sp-time :deep(.dd-trigger:hover),
.sp-time.open :deep(.dd-trigger) {
  background: rgba(255, 255, 255, 0.06);
}
.sp-dash {
  color: var(--muted);
}

/* Segmented controls */
.sp-seg {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: #00283c;
  border: 1px solid var(--line);
}
.sp-seg button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}
.sp-seg button:hover {
  color: var(--text);
}
.sp-seg button.on {
  background: rgba(237, 174, 73, 0.14);
  color: var(--mint);
  box-shadow: inset 0 0 0 1px rgba(237, 174, 73, 0.35);
}

/* Status strip */
.sp-status {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}
.sp-status-icon {
  flex: none;
  font-weight: 700;
}
.sp-status.is-ok {
  background: rgba(237, 174, 73, 0.08);
  color: #f8deb0;
}
.sp-status.is-fixed {
  background: rgba(88, 166, 255, 0.1);
  color: #c9e1ff;
}
.sp-status.is-warn {
  background: rgba(255, 176, 32, 0.1);
  color: #ffd38a;
}
.sp button:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .sp-controls {
    grid-template-columns: 1fr;
  }
  .sp-seg {
    align-self: flex-start;
  }
  .sp-head-right {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sp-seg button {
    transition: none;
  }
}
</style>
