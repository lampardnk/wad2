<template>
  <div v-if="compact" class="hud-wrap">
    <!-- Trip setup progress as a flight: 4 altitude stops on a dashed flight path (boarding, climbing,
         cruising, landing). The plane flies from the last step's stop to this one, nose along the path,
         leaving a contrail behind it. Pip (in a pilot cap) comments from the corner. When someone boards
         (gets added to the trip), a little avatar token pops up and flies into the plane.
         <FlightTracker :step="1" :boarded="['Kay', 'Amy']" /> -->
    <!-- Narrower than 1024px (no room for two columns): a slim "in-flight HUD" instead of the tall sky: the plane flies left to right
         across 4 stops, and Pip's line becomes a one-line chip you can close. -->
    <aside class="hud" aria-label="Setup progress">
      <div class="hud-track">
        <span class="hud-line" aria-hidden="true"></span>
        <span class="hud-trail" :style="{ width: hudPct + '%' }" aria-hidden="true"></span>
        <span v-for="(n, i) in NODES" :key="n.label" class="hud-node" :class="{ on: i === step, done: i < step }"
          :style="{ left: (i / (NODES.length - 1)) * 100 + '%' }" :aria-current="i === step ? 'step' : null">
          <span class="hud-dot">
            <svg v-if="i < step" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="hud-name">{{ n.short }}</span>
          <span class="ft-sr">{{ n.label }}{{ i < step ? ' (done)' : '' }}</span>
        </span>
        <span class="hud-plane" :style="{ left: hudPct + '%' }" aria-hidden="true">
          <DoodleIcon name="plane" :size="28" tint="sky" anim="" />
          <span v-if="boarded.length" class="hud-seats">{{ boarded.length }}</span>
        </span>
        <span v-for="t in tokens" :key="t.id" class="ft-token hud-token" :style="{ left: hudPct + '%', background: t.style.background }" aria-hidden="true">{{ t.letter }}</span>
      </div>
    </aside>
    <transition name="ft-tip">
      <div v-if="!chipClosed" class="hud-chip" role="status">
        <PlaneGuide :size="34" mood="idle" cap />
        <span class="hud-chip-text">{{ shortTip }}</span>
        <button type="button" class="hud-chip-x" aria-label="Hide tip" @click="closeChip">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
        </button>
      </div>
    </transition>
    <p class="ft-sr" aria-live="polite">{{ boardedMsg }}</p>
    <Teleport to="body">
      <div v-if="confetti.length" class="ft-confetti" aria-hidden="true">
        <i v-for="c in confetti" :key="c.id" :style="c.style"></i>
      </div>
    </Teleport>
  </div>

  <aside v-else ref="box" class="ft" aria-label="Setup progress">
    <!-- drifting clouds -->
    <svg v-for="c in CLOUDS" :key="c.top" class="ft-cloud" :style="{ top: c.top, width: c.w + 'px', animationDuration: c.speed, animationDelay: c.delay }"
      viewBox="0 0 64 32" aria-hidden="true">
      <path d="M14 28h38c6 0 10-4 10-9s-4-9-10-9c-1-5-6-8-11-8-4 0-8 2-10 6-1-1-3-1-5-1-5 0-9 4-9 8-4 0-6 3-6 6s3 7 3 7Z"
        fill="#fff" stroke="#12324a" stroke-width="2" stroke-linejoin="round" opacity="0.92" />
    </svg>

    <!-- Stays in view while the form beside it scrolls; the sky behind fills the whole card -->
    <div class="ft-inner">
    <!-- the drawing scales to fit this area, keeping its shape (300 x 520) so the labels and plane line up -->
    <div class="ft-area">
    <div class="ft-stage">
    <svg class="ft-sky" viewBox="0 0 300 520" aria-hidden="true">
      <!-- runway -->
      <rect x="20" y="488" width="150" height="14" rx="7" fill="#12324a" opacity="0.85" />
      <path d="M34 495h122" stroke="#ffbf3c" stroke-width="2.5" stroke-dasharray="10 9" stroke-linecap="round" />
      <!-- the planned route (dashed) and the contrail behind the plane (solid, grows as it flies) -->
      <path ref="route" :d="ROUTE" fill="none" stroke="#12324a" stroke-opacity="0.3" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" />
      <path :d="ROUTE" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" :stroke-dasharray="total" :stroke-dashoffset="total - flown" opacity="0.9" />
      <path :d="ROUTE" fill="none" stroke="#8fcbff" stroke-width="3" stroke-linecap="round" :stroke-dasharray="total" :stroke-dashoffset="total - flown" />
      <!-- the four stops -->
      <g v-for="(n, i) in NODES" :key="n.label">
        <circle v-if="i === step" class="ft-ping" :cx="n.x" :cy="n.y" r="13" fill="#ffbf3c" />
        <circle :cx="n.x" :cy="n.y" r="11" :fill="i < step ? '#ffbf3c' : i === step ? '#fff' : '#fff'" stroke="#12324a" stroke-width="3" />
        <path v-if="i < step" :d="'M' + (n.x - 5) + ' ' + n.y + 'l3.5 3.5 6-7'" fill="none" stroke="#12324a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        <text v-else :x="n.x" :y="n.y + 4.5" text-anchor="middle" font-size="12" font-weight="900" fill="#12324a">{{ i + 1 }}</text>
      </g>
    </svg>

    <!-- stop labels (HTML so the text stays crisp) -->
    <ol class="ft-labels">
      <li v-for="(n, i) in NODES" :key="n.label" class="ft-label" :class="{ on: i === step, done: i < step, left: n.side === 'left' }"
        :style="{ left: (n.x / 300) * 100 + '%', top: (n.y / 520) * 100 + '%' }" :aria-current="i === step ? 'step' : null">
        <small>{{ n.altitude }}</small>
        <strong>{{ n.label }}</strong>
      </li>
    </ol>

    <!-- the plane -->
    <span class="ft-plane" :style="planeStyle" aria-hidden="true">
      <DoodleIcon name="plane" :size="40" tint="sky" anim="" />
    </span>
    <!-- "3 aboard" rides under the plane (not rotated with it) -->
    <span v-if="boarded.length" class="ft-seats" :style="{ left: planeStyle.left, top: planeStyle.top }">{{ boarded.length }} aboard</span>

    <!-- people boarding -->
    <span v-for="t in tokens" :key="t.id" class="ft-token" :style="t.style" aria-hidden="true">{{ t.letter }}</span>
    </div>
    </div>
    <p class="ft-sr" aria-live="polite">{{ boardedMsg }}</p>

    <!-- Pip, in a pilot cap -->
    <div class="ft-pip">
      <transition name="ft-tip" mode="out-in">
        <p :key="tip" class="ft-bubble">{{ tip }}</p>
      </transition>
      <PlaneGuide :size="84" :mood="landed ? 'loop' : 'idle'" cap />
    </div>
    </div>
    <Teleport to="body">
      <div v-if="confetti.length" class="ft-confetti" aria-hidden="true">
        <i v-for="c in confetti" :key="c.id" :style="c.style"></i>
      </div>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import DoodleIcon from './DoodleIcon.vue'
import PlaneGuide from './PlaneGuide.vue'

const props = defineProps({
  step: { type: Number, default: 0 },          // 0 invite, 1 save places, 2 vote, 3 plan your days
  boarded: { type: Array, default: () => [] }  // names of everyone on the trip
})

// Flight path from the runway (bottom) up to cruising height, then the approach to the destination
const ROUTE = 'M70 470C70 400 210 410 210 330C210 250 90 260 90 175C90 105 220 150 222 72'
const NODES = [
  { x: 70, y: 470, label: 'Invite your group', short: 'Invite', altitude: 'Boarding', side: 'right' },
  { x: 210, y: 330, label: 'Save places', short: 'Save', altitude: 'Climbing', side: 'left' },
  { x: 90, y: 175, label: 'Vote together', short: 'Vote', altitude: 'Cruising', side: 'right' },
  { x: 222, y: 72, label: 'Plan your days', short: 'Plan', altitude: 'Landing', side: 'left' }
]
const TIPS = [
  'Invite your crew aboard before takeoff!',
  'Climbing through the clouds! Save the places you dream of.',
  'Cruising altitude! Time to vote together.',
  'Final approach. Let\'s plan your days!'
]
// Shorter versions for the one-line chip on phones
const SHORT_TIPS = ['Invite your crew aboard!', 'Climbing! Save places you love.', 'Cruising! Time to vote.', 'Final approach. Plan your days!']
const CLOUDS = [
  { top: '12%', w: 70, speed: '38s', delay: '-6s' },
  { top: '38%', w: 54, speed: '30s', delay: '-18s' },
  { top: '62%', w: 84, speed: '46s', delay: '-30s' }
]

const box = ref(null)
const route = ref(null)
const total = ref(1000)
const flown = ref(0)
const planeStyle = ref({})
const tokens = ref([])
const boardedMsg = ref('')
const landed = ref(false) // after "Land": the plane is at the last stop
const tip = computed(() => landed.value ? 'Touchdown! Enjoy your trip!' : TIPS[Math.min(props.step, TIPS.length - 1)])
const shortTip = computed(() => landed.value ? 'Touchdown!' : SHORT_TIPS[Math.min(props.step, SHORT_TIPS.length - 1)])
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let nodeLen = []
let frame = 0
let tokenId = 0
let planeXY = { x: 0, y: 0 } // where the plane is (in path units), for tokens to fly to

// Narrower than 1024px gets the HUD (two columns don't fit) (and switch over live if the window is resized)
const media = window.matchMedia('(max-width: 1023px)')
const compact = ref(media.matches)
function onMedia() {
  compact.value = media.matches
}
media.addEventListener('change', onMedia)
// HUD: how far along the bar the plane is (0-100%)
const hudPct = ref(0)
// The tip chip can be closed (stays closed for the rest of the visit)
const chipClosed = ref(sessionStorage.getItem('ft-chip-closed') === '1')
function closeChip() {
  chipClosed.value = true
  try { sessionStorage.setItem('ft-chip-closed', '1') } catch (err) { /* private window */ }
}

// Each step is its own page, so remember where the plane was between pages
let lastStep = -1
if (typeof window !== 'undefined') lastStep = window.__ftLastStep ?? -1

onMounted(() => {
  const to = Math.min(props.step, NODES.length - 1)
  const from = lastStep >= 0 && lastStep < to ? lastStep : to
  window.__ftLastStep = to
  // HUD: start at the last stop, then glide to this one
  hudPct.value = (from / (NODES.length - 1)) * 100
  if (from !== to && !still) setTimeout(() => { hudPct.value = (to / (NODES.length - 1)) * 100 }, 350)
  else hudPct.value = (to / (NODES.length - 1)) * 100
  if (!compact.value) startTower(from, to)
})
// Switched from phone size to wide: draw the tower now
watch(compact, (small) => {
  if (!small) nextTick(() => startTower(props.step, props.step))
})
function startTower(from, to) {
  const path = route.value
  if (!path) return
  nodeLen = []
  total.value = path.getTotalLength()
  // How far along the path each stop is
  for (const n of NODES) {
    let best = 0
    let bestD = Infinity
    for (let l = 0; l <= total.value; l += total.value / 400) {
      const p = path.getPointAtLength(l)
      const d = (p.x - n.x) ** 2 + (p.y - n.y) ** 2
      if (d < bestD) {
        bestD = d
        best = l
      }
    }
    nodeLen.push(best)
  }
  if (from === to || still) place(nodeLen[to])
  else fly(nodeLen[from], nodeLen[to])
}
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  media.removeEventListener('change', onMedia)
})

// Put the plane at a distance along the path, nose pointing along it
function place(len) {
  const path = route.value
  const p = path.getPointAtLength(len)
  const q = path.getPointAtLength(Math.min(len + 2, total.value))
  const back = path.getPointAtLength(Math.max(len - 2, 0))
  const a = (Math.atan2(q.y - back.y, q.x - back.x) * 180) / Math.PI
  planeXY = { x: p.x, y: p.y }
  flown.value = len
  // the plane drawing's nose points 25° above "right"
  planeStyle.value = { left: (p.x / 300) * 100 + '%', top: (p.y / 520) * 100 + '%', transform: 'translate(-50%, -50%) rotate(' + (a + 25) + 'deg)' }
}
// Fly from one stop to the next (slow start, quick climb, gentle arrival)
function fly(fromLen, toLen) {
  place(fromLen)
  const t0 = performance.now()
  const dur = 1600
  const step = (now) => {
    const k = Math.min((now - t0) / dur, 1)
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    place(fromLen + (toLen - fromLen) * e)
    if (k < 1) frame = requestAnimationFrame(step)
  }
  setTimeout(() => { frame = requestAnimationFrame(step) }, 350) // after the page has faded in
}

// "Land": fly from this stop to the last one (the destination), then confetti.
// Returns a promise that finishes once the celebration has played, so the page can move on after it.
const confetti = ref([])
function land() {
  return new Promise((resolve) => {
    const last = NODES.length - 1
    const from = Math.min(props.step, last)
    window.__ftLastStep = last
    if (still) {
      landed.value = true
      setTimeout(resolve, 400)
      return
    }
    let flight = 0
    if (compact.value) {
      hudPct.value = 100 // the HUD plane glides to the end (1.2s)
      flight = 1250
    } else if (nodeLen.length) {
      fly(nodeLen[from], nodeLen[last]) // waits 350ms, then flies for 1.6s
      flight = 1950
    }
    setTimeout(() => {
      landed.value = true
      throwConfetti()
    }, flight)
    setTimeout(resolve, flight + 1700)
  })
}
function throwConfetti() {
  const pieces = []
  for (let i = 0; i < 90; i++) {
    const size = 6 + Math.random() * 8
    pieces.push({
      id: i,
      style: {
        left: Math.random() * 100 + 'vw',
        width: size + 'px',
        height: (Math.random() < 0.5 ? size : size * 0.45) + 'px',
        borderRadius: Math.random() < 0.3 ? '50%' : '2px',
        background: COLORS[i % COLORS.length],
        animationDelay: Math.random() * 0.35 + 's',
        animationDuration: 1.3 + Math.random() * 1.1 + 's',
        '--drift': (Math.random() * 160 - 80) + 'px',
        '--spin': (Math.random() * 900 - 450) + 'deg'
      }
    })
  }
  confetti.value = pieces
  setTimeout(() => { confetti.value = [] }, 2900)
}
defineExpose({ land })

// Someone new is on the trip: a token pops up from the side and flies into the plane
const COLORS = ['#ff6b7a', '#19b3c4', '#ffbf3c', '#c3b0ff', '#8fcbff']
watch(() => props.boarded.length, (now, before) => {
  if (!(now > before)) return
  const name = props.boarded[props.boarded.length - 1] || '?'
  boardedMsg.value = name + ' is aboard!'
  if (still) return
  const id = tokenId++
  tokens.value.push({
    id,
    letter: name.charAt(0).toUpperCase(),
    style: { left: (planeXY.x / 300) * 100 + '%', top: (planeXY.y / 520) * 100 + '%', background: COLORS[id % COLORS.length] }
  })
  setTimeout(() => { tokens.value = tokens.value.filter((t) => t.id !== id) }, 1300)
})
</script>

<style scoped>
.ft {
  position: relative;
  min-height: 560px;
  border-radius: 24px;
  overflow: hidden;
  overflow: clip; /* clip (not hidden) so the sticky drawing inside still sticks */
  /* sky blue at the top, fading to warm runway tones at the bottom */
  background:
    radial-gradient(120% 60% at 80% 0%, rgba(255, 255, 255, 0.55), transparent 60%),
    linear-gradient(180deg, #9fd3ff 0%, #c4e6ff 30%, #e6f4ff 55%, #fff1d6 82%, #ffdcab 100%);
  box-shadow: 0 2px 0 rgba(255, 255, 255, 0.7) inset, 0 22px 44px -20px rgba(18, 50, 74, 0.35), 0 4px 14px -6px rgba(18, 50, 74, 0.12);
}
/* the drawing + Pip stay on screen while a long form scrolls beside them */
.ft-inner {
  position: sticky;
  top: 16px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  /* fits between the page header and the floating bottom bar, so Pip is never hidden behind it */
  height: min(100%, calc(100vh - 210px));
  min-height: 520px;
  padding: 18px 16px 0;
}
.ft-area {
  flex: 1;
  min-height: 0;
  container-type: size;
  display: grid;
  place-items: center;
}
/* as big as fits, never stretched */
.ft-stage {
  position: relative;
  width: min(100cqw, 100cqh * 300 / 520);
  aspect-ratio: 300 / 520;
}
.ft-sky {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ft-ping {
  transform-box: fill-box;
  transform-origin: center;
  animation: ft-ping 1.6s ease-out infinite;
}
@keyframes ft-ping {
  from { transform: scale(1); opacity: 0.7; }
  to { transform: scale(2.4); opacity: 0; }
}
/* clouds drift across, slowly, forever */
.ft-cloud {
  position: absolute;
  left: -100px;
  animation: ft-drift linear infinite;
  pointer-events: none;
}
/* from just off the left edge to just off the right edge of the sky */
@keyframes ft-drift {
  from { left: -100px; }
  to { left: 100%; }
}
/* the labels sit beside their stop */
.ft-labels {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}
.ft-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  transform: translate(22px, -50%);
  padding: 5px 11px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 6px 14px -8px rgba(18, 50, 74, 0.4);
  color: #4a6274;
  line-height: 1.15;
  white-space: nowrap;
}
.ft-label.left {
  transform: translate(calc(-100% - 22px), -50%);
  text-align: right;
}
.ft-label small {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ft-label strong {
  font-size: 13.5px;
  color: #12324a;
}
.ft-label.on {
  background: #12324a;
  color: #ffd87a;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.2);
}
.ft-label.on strong {
  color: #fff;
}
.ft-label.done strong {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: rgba(18, 50, 74, 0.4);
}
/* plane + "3 aboard" */
.ft-plane {
  position: absolute;
  z-index: 3;
  line-height: 0;
  filter: drop-shadow(0 4px 3px rgba(18, 50, 74, 0.25));
}
.ft-seats {
  position: absolute;
  z-index: 3;
  transform: translate(-50%, 22px);
  padding: 2px 8px;
  border-radius: 999px;
  background: #ff6b7a;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.5;
  white-space: nowrap;
}
/* someone boarding: pops up from below-right, then flies into the plane */
.ft-token {
  position: absolute;
  z-index: 4;
  width: 30px;
  height: 30px;
  margin: -15px 0 0 -15px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2.5px solid #12324a;
  color: #12324a;
  font-weight: 900;
  font-size: 14px;
  animation: ft-board 1.2s cubic-bezier(0.5, 0, 0.3, 1) forwards;
}
@keyframes ft-board {
  0% { transform: translate(90px, 90px) scale(0); opacity: 0; }
  25% { transform: translate(70px, 50px) scale(1.25); opacity: 1; }
  45% { transform: translate(60px, 40px) scale(1); }
  100% { transform: translate(0, 0) scale(0.3); opacity: 0; }
}
.ft-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
/* Pip under the drawing with room to breathe: bubble on the left, Pip on the right */
.ft-pip {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 10px 6px 22px;
  pointer-events: none;
}
.ft-pip :deep(.pg) {
  flex: none;
}
.ft-bubble {
  position: relative;
  flex: 0 1 auto;
  min-width: 0;
  margin: 0;
  padding: 10px 14px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 0 rgba(18, 50, 74, 0.12), 0 10px 20px -10px rgba(18, 50, 74, 0.35);
  color: #12324a;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}
.ft-bubble::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  background: #fff;
  border-radius: 0 3px 0 0;
  transform: rotate(45deg);
}
.ft-tip-enter-active {
  transition: opacity 0.2s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ft-tip-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(6px);
}
/* ---------- phones: the in-flight HUD ---------- */
.hud-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-width: 100%; /* the one-line tip can never push the page wider than the screen */
}
.hud {
  padding: 12px 24px 10px;
  border-radius: 20px;
  background: linear-gradient(90deg, #9fd3ff, #d6eeff 55%, #ffe6bf);
  box-shadow: 0 2px 0 rgba(255, 255, 255, 0.7) inset, 0 12px 24px -14px rgba(18, 50, 74, 0.4);
}
.hud-track {
  position: relative;
  height: 46px;
}
.hud-line,
.hud-trail {
  position: absolute;
  left: 0;
  top: 12px;
  height: 3px;
  border-radius: 2px;
}
.hud-line {
  right: 0;
  background: repeating-linear-gradient(90deg, rgba(18, 50, 74, 0.35) 0 4px, transparent 4px 10px);
}
.hud-trail {
  background: #8fcbff;
  box-shadow: 0 0 0 2px #fff;
  transition: width 1.2s cubic-bezier(0.65, 0, 0.35, 1);
}
.hud-node {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transform: translateX(-50%);
}
.hud-dot {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  border: 2.5px solid #12324a;
  color: #12324a;
  font-size: 12px;
  font-weight: 900;
}
.hud-node.done .hud-dot {
  background: #ffbf3c;
}
.hud-node.on .hud-dot {
  background: #12324a;
  color: #fff;
}
.hud-name {
  font-size: 11px;
  font-weight: 800;
  color: #4a6274;
  line-height: 1;
}
.hud-node.on .hud-name {
  color: #12324a;
}
/* the plane rides just above the line and glides along it */
.hud-plane {
  position: absolute;
  top: -16px;
  z-index: 2;
  transform: translateX(-50%) rotate(25deg); /* nose pointing along the bar */
  line-height: 0;
  transition: left 1.2s cubic-bezier(0.65, 0, 0.35, 1);
  filter: drop-shadow(0 3px 2px rgba(18, 50, 74, 0.25));
}
.hud-plane .dz {
  animation: hud-bob 1.6s ease-in-out infinite;
}
@keyframes hud-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.hud-seats {
  position: absolute;
  right: -8px;
  top: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ff6b7a;
  color: #fff;
  font-size: 10.5px;
  font-weight: 900;
  line-height: 18px;
  text-align: center;
  transform: rotate(-25deg);
}
.hud-token {
  top: 0;
}
/* Pip's one-line tip, closeable */
.hud-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 8px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 3px 0 rgba(18, 50, 74, 0.1), 0 8px 18px -10px rgba(18, 50, 74, 0.35);
  color: #12324a;
  font-size: 13px;
  font-weight: 700;
}
.hud-chip :deep(.pg) {
  flex: none;
}
.hud-chip-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hud-chip-x {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: rgba(18, 50, 74, 0.08);
  color: #12324a;
  cursor: pointer;
}
.hud-chip-x:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}
/* confetti falling over the whole screen after landing */
.ft-confetti {
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow: hidden;
  pointer-events: none;
}
.ft-confetti i {
  position: absolute;
  top: -20px;
  animation: ft-confetti 1.8s cubic-bezier(0.25, 0.6, 0.5, 1) forwards;
}
@keyframes ft-confetti {
  0% { transform: translate(0, 0) rotate(0); opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translate(var(--drift), 105vh) rotate(var(--spin)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ft-cloud, .ft-ping, .ft-token, .hud-plane .dz { animation: none; }
  .hud-plane, .hud-trail { transition: none; }
}
</style>
