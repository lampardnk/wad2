<template>
  <!-- Slide-over for one leg of the day (from one stop to the next): the suggestion and why,
       every other way with its time and cost, and choosing one (the rest of the day re-times) -->
  <Teleport to="body">
    <transition name="ls-fade">
      <div v-if="leg" class="ls-overlay" @click.self="emit('close')" @keydown.esc="emit('close')">
        <aside ref="panel" class="ls" role="dialog" aria-modal="true" aria-labelledby="ls-title" tabindex="-1">
          <header class="ls-head">
            <div>
              <p class="ls-kicker">Getting around</p>
              <h3 id="ls-title" class="ls-title">To {{ leg.toName }}</h3>
              <p class="ls-sub">From {{ leg.fromName }} · leave around {{ leg.leaveText }}</p>
            </div>
            <button type="button" class="ls-x" aria-label="Close" @click="emit('close')"><AppIcon name="x" :size="18" /></button>
          </header>

          <div class="ls-body">
            <!-- Why this way -->
            <p v-if="leg.readonly" class="ls-why">
              We suggest <strong>{{ label(leg.recommended) }}</strong>: {{ leg.reason }}.
            </p>
            <p v-else-if="leg.chosen" class="ls-why">
              <strong>{{ leg.chosenBy || 'Your group' }}</strong> picked <strong>{{ label(leg.chosen) }}</strong> for this leg.
              We'd suggest {{ label(leg.recommended) }} ({{ leg.reason }}).
              <button type="button" class="ls-link" @click="emit('choose', null)">Use the suggestion</button>
            </p>
            <p v-else class="ls-why">
              We suggest <strong>{{ label(leg.recommended) }}</strong>: {{ leg.reason }}.
            </p>

            <p v-if="leg.checking" class="ls-checking" role="status"><span class="ls-dot" aria-hidden="true"></span> Checking live routes…</p>

            <TravelChoices :options="leg.options" :recommended="leg.recommended" :chosen="leg.chosen || ''" :chosen-by="leg.chosenBy"
              :group="leg.group" :maps-url="mapsUrl" :choosable="!leg.readonly" @choose="(m) => emit('choose', m)" />

            <p v-if="leg.readonly" class="ls-note">Travel to and from your hotel or airport follows your Getting around settings.</p>
            <p v-else class="ls-note">Choosing a way re-times the rest of the day. Everyone on the trip sees the choice.</p>

            <!-- What the suggestion is based on (Settings → Getting around) -->
            <div class="ls-prefs">
              <span class="ls-chip">{{ priorityText }}</span>
              <span class="ls-chip">Walk ≤ {{ leg.maxWalk }} min</span>
              <span class="ls-chip">{{ modesText }}</span>
              <router-link to="/settings#getting-around" class="ls-link" @click="emit('close')">Change</router-link>
            </div>
          </div>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'
import TravelChoices from './TravelChoices.vue'
import { TRAVEL_MODES } from '../dayOptimizer.js'

// leg = { fromName, toName, from: { lat, lon }, to: { lat, lon }, leaveText, options, recommended, reason,
//         chosen ('' or a mode), chosenBy, group, maxWalk, modes, priority, checking } or null (closed)
const props = defineProps({
  leg: { type: Object, default: null }
})
const emit = defineEmits(['close', 'choose'])
const panel = ref(null)

function label(mode) {
  return TRAVEL_MODES[mode] ? TRAVEL_MODES[mode].label.toLowerCase() : mode
}
const priorityText = computed(() => ({ balanced: 'Balanced', fastest: 'Fastest first', cheapest: 'Cheapest first' })[props.leg.priority] || 'Balanced')
const modesText = computed(() => props.leg.modes.map((m) => TRAVEL_MODES[m].label).join(', '))

// Google Maps directions for one way (opens in a new tab)
function mapsUrl(mode) {
  const l = props.leg
  return 'https://www.google.com/maps/dir/?api=1&origin=' + l.from.lat + ',' + l.from.lon +
    '&destination=' + l.to.lat + ',' + l.to.lon + '&travelmode=' + TRAVEL_MODES[mode].maps
}

watch(() => !!props.leg, (open) => {
  if (open) nextTick(() => panel.value && panel.value.focus())
})
</script>

<style scoped>
.ls-overlay {
  position: fixed;
  inset: 0;
  z-index: 1290;
  background: rgba(0, 40, 62, 0.35);
}
.ls {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  background: #fbf5ea;
  color: #003d5b;
  box-shadow: -18px 0 40px rgba(0, 40, 62, 0.18);
  outline: none;
  animation: ls-in 0.22s ease-out;
}
@keyframes ls-in {
  from { transform: translateX(30px); opacity: 0; }
}
.ls-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 20px 20px 10px;
}
.ls-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c98a1e;
}
.ls-title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 800;
}
.ls-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #5a6b78;
}
.ls-x {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #f4efe6;
  color: #5a6b78;
}
.ls-x:hover {
  background: #e6dfd2;
}
.ls-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 20px 28px;
}
.ls-why {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #ece4d6;
  font-size: 14px;
  line-height: 1.45;
}
.ls-checking {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 13px;
  color: #5a6b78;
}
.ls-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #edae49;
  animation: ls-blink 1.1s ease-in-out infinite alternate;
}
@keyframes ls-blink {
  from { opacity: 0.3; }
}
.ls-note {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: #5a6b78;
}
.ls-prefs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #ece4d6;
}
.ls-chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: #f4efe6;
  font-size: 12px;
  font-weight: 600;
  color: #003d5b;
}
.ls-link {
  border: 0;
  background: none;
  padding: 0;
  color: #00798c;
  font-weight: 700;
  font-size: 13px;
  text-decoration: underline;
}
.ls-x:focus-visible,
.ls-link:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.ls-fade-enter-active,
.ls-fade-leave-active {
  transition: opacity 0.2s;
}
.ls-fade-enter-from,
.ls-fade-leave-to {
  opacity: 0;
}
/* Phones: slides up from the bottom instead */
@media (max-width: 640px) {
  .ls {
    top: auto;
    left: 0;
    width: 100%;
    max-height: 88vh;
    border-radius: 24px 24px 0 0;
    animation-name: ls-up;
  }
  @keyframes ls-up {
    from { transform: translateY(40px); opacity: 0; }
  }
}
@media (prefers-reduced-motion: reduce) {
  .ls, .ls-dot { animation: none; }
}
</style>
