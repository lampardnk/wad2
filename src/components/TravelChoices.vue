<template>
  <!-- Every way to make one journey, best first: time, cost, live route or estimate, and a Choose button.
       Used by the itinerary's travel panel (LegSheet) and by Other journeys. -->
  <ol class="tc" aria-label="Ways to get there">
    <li v-for="o in ranked" :key="o.mode" class="tc-row" :class="{ picked: o.mode === inUse, off: !o.allowed }">
      <span class="tc-icon" aria-hidden="true"><AppIcon :name="MODES[o.mode].icon" :size="20" /></span>
      <div class="tc-main">
        <p class="tc-top">
          <strong>{{ MODES[o.mode].label }}</strong>
          <span class="tc-min">{{ durationText(o.min) }}</span>
          <span v-if="o.mode === recommended" class="tc-badge sug">Suggested</span>
          <span v-if="o.mode === chosen" class="tc-badge pick">{{ chosenBy ? 'Picked by ' + chosenBy : 'Picked' }}</span>
        </p>
        <p class="tc-sub">
          {{ costText(o) }} · {{ kmText(o.km) }}
          <span class="tc-src" :class="{ live: o.live }">{{ o.live ? 'Live route' : 'Estimate' }}</span>
          <span v-if="!o.allowed" class="tc-off">Off in your settings</span>
        </p>
      </div>
      <div class="tc-actions">
        <button v-if="choosable && o.mode !== inUse" type="button" class="tc-btn" :aria-label="actionLabel + ' ' + MODES[o.mode].label + ', ' + durationText(o.min)" @click="emit('choose', o.mode)">{{ actionLabel }}</button>
        <span v-else-if="o.mode === inUse" class="tc-chosen" aria-label="In use"><AppIcon name="check" :size="16" /></span>
        <a v-if="mapsUrl" class="tc-link" :href="mapsUrl(o.mode)" target="_blank" rel="noopener" :aria-label="'Directions by ' + MODES[o.mode].label + ' in Google Maps'">Directions ↗</a>
      </div>
    </li>
  </ol>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { TRAVEL_MODES as MODES } from '../dayOptimizer.js'

const props = defineProps({
  options: { type: Array, default: () => [] },  // [{ mode, min, km, live, allowed }]
  recommended: { type: String, default: '' },
  chosen: { type: String, default: '' },        // the way the group picked ('' = none, the suggestion is used)
  chosenBy: { type: String, default: '' },
  group: { type: Number, default: 1 },          // people sharing a taxi
  mapsUrl: { type: Function, default: null },   // mode -> Google Maps directions link
  actionLabel: { type: String, default: 'Choose' },
  markInUse: { type: Boolean, default: true },   // false: every way gets the button (e.g. Save in Other journeys)
  choosable: { type: Boolean, default: true }    // false: just compare (e.g. the trip to and from your hotel)
})
const emit = defineEmits(['choose'])

// The way that's used: the group's pick, or else the suggestion
const inUse = computed(() => (props.markInUse ? props.chosen || props.recommended : ''))

// Suggested first, then the rest by time; ways you switched off in Settings go last
const ranked = computed(() => {
  const list = props.options.slice()
  list.sort((a, b) => (b.mode === props.recommended) - (a.mode === props.recommended) || (b.allowed - a.allowed) || a.min - b.min)
  return list
})

function durationText(min) {
  if (min < 60) return min + ' min'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h + ' h' + (m ? ' ' + m + ' min' : '')
}
function kmText(km) {
  if (km == null) return ''
  return km < 1 ? Math.round(km * 1000 / 50) * 50 + ' m' : km.toFixed(1) + ' km'
}
function costText(o) {
  const base = MODES[o.mode].costText
  return o.mode === 'taxi' && props.group > 1 ? base + ' (split ' + props.group + ' ways)' : base
}
</script>

<style scoped>
.tc {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: #fff;
  border: 1.5px solid #ece4d6;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.tc-row.picked {
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.18);
}
.tc-row.off {
  opacity: 0.6;
}
.tc-icon {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #003d5b;
  color: #fff;
}
.tc-row.picked .tc-icon {
  background: #edae49;
  color: #001d2c;
}
.tc-main {
  flex: 1;
  min-width: 0;
}
.tc-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 0;
  font-size: 15px;
  color: #001d2c;
}
.tc-min {
  font-weight: 700;
  color: #003d5b;
}
.tc-badge {
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.tc-badge.sug {
  background: #fbefd9;
  color: #7a4b00;
}
.tc-badge.pick {
  background: #003d5b;
  color: #fff;
}
.tc-sub {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: #5a6b78;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
}
.tc-src {
  padding: 0 7px;
  border-radius: 999px;
  border: 1px dashed #c9bfae;
  font-size: 11px;
}
.tc-src.live {
  border-style: solid;
  border-color: #9cc5b5;
  color: #1d6b50;
}
.tc-off {
  font-size: 11px;
  font-style: italic;
}
.tc-actions {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.tc-btn {
  border: 0;
  border-radius: 999px;
  background: #003d5b;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  padding: 7px 16px;
  transition: transform 0.15s;
}
.tc-btn:hover {
  transform: translateY(-1px);
}
.tc-chosen {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #edae49;
  color: #001d2c;
}
.tc-link {
  font-size: 12px;
  font-weight: 600;
  color: #00798c;
  text-decoration: none;
}
.tc-link:hover {
  text-decoration: underline;
}
.tc-btn:focus-visible,
.tc-link:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
@media (max-width: 420px) {
  .tc-row {
    flex-wrap: wrap;
  }
  .tc-actions {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tc-btn { transition: none; }
}
</style>
