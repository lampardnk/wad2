<template>
  <!-- First-visit tour with "Pip", our paper-plane guide: a speech bubble points at real parts of the page,
       one after another, with a little flight-path progress bar. Finishing gets a loop-the-loop and confetti.
       Not a blocking pop-up: the page stays usable, and "Skip" ends it at any time.
       Usage: <FeatureTour storage-key="tour-discover-v1" :steps="[{ target: '[data-tour=filters]', title, body, cta }]" /> -->
  <Teleport to="body">
    <template v-if="active && step">
      <!-- Pulsing ring on the thing being explained -->
      <span class="ft-beacon" :style="{ left: beacon.x + 'px', top: beacon.y + 'px' }" aria-hidden="true">
        <span class="ft-beacon-ping"></span>
        <span class="ft-beacon-dot"></span>
      </span>

      <transition name="ft-pop" appear>
        <div ref="bubbleEl" :key="index" class="ft-bubble" :class="'is-' + side" :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
          role="dialog" aria-modal="false" :aria-labelledby="'ft-title-' + index" :aria-describedby="'ft-body-' + index"
          @keydown.esc.stop="skip">
          <span class="ft-arrow" :style="{ left: arrowX + 'px' }" aria-hidden="true"></span>
          <span class="ft-guide"><PlaneGuide :size="86" :mood="index === 0 ? 'wave' : 'talk'" /></span>

          <button type="button" class="ft-skip" aria-label="Skip the tour" @click.stop="skip">Skip</button>

          <h2 :id="'ft-title-' + index" class="ft-title">{{ step.title }}</h2>
          <p :id="'ft-body-' + index" class="ft-body">{{ step.body }}</p>

          <div class="ft-foot">
            <!-- Flight path: the little plane moves along as you go -->
            <div class="ft-path" aria-hidden="true">
              <span class="ft-path-done" :style="{ width: pathPct + '%' }"></span>
              <span v-for="(s, i) in steps" :key="i" class="ft-stop" :class="{ done: i < index, on: i === index }"
                :style="{ left: (steps.length > 1 ? (i / (steps.length - 1)) * 100 : 0) + '%' }"></span>
              <span class="ft-path-plane" :style="{ left: pathPct + '%' }"><DoodleIcon name="plane" :size="20" anim="" /></span>
            </div>
            <span class="ft-count">Step {{ index + 1 }} of {{ steps.length }}</span>
            <button ref="ctaEl" type="button" class="ft-cta" @click.stop="next">
              {{ step.cta || (index < steps.length - 1 ? 'Next' : 'Got it') }}
            </button>
          </div>
        </div>
      </transition>
    </template>

    <!-- All done: Pip loops, confetti pops -->
    <transition name="ft-pop">
      <div v-if="cheering" class="ft-cheer" role="status">
        <span class="ft-confetti" aria-hidden="true"><span v-for="i in 18" :key="i" :style="confetti(i)"></span></span>
        <PlaneGuide :size="96" mood="loop" />
        <strong>You're all set!</strong>
        <small>Have a great trip.</small>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import PlaneGuide from './PlaneGuide.vue'
import DoodleIcon from './DoodleIcon.vue'

const props = defineProps({
  // [{ target: CSS selector, fallback?: selector if target isn't on the page, title, body, cta?, icon?, placement?: 'top' | 'bottom' }]
  steps: { type: Array, required: true },
  storageKey: { type: String, required: true }, // e.g. 'chuise-tour-discover-v1' (change the version to show it again to everyone)
  delay: { type: Number, default: 900 }         // wait for the page to settle before the first bubble
})
const emit = defineEmits(['done'])

const GAP = 14     // space between the target and the bubble
const MARGIN = 12  // keep the bubble this far from the screen edges

const active = ref(false)
const index = ref(0)
const bubbleEl = ref(null)
const ctaEl = ref(null)
const pos = ref({ x: 0, y: 0 })
const beacon = ref({ x: 0, y: 0 })
const side = ref('bottom') // bubble sits 'bottom' (below the target) or 'top'
const arrowX = ref(24)
let frame = 0
let startTimer = null
let resizeObs = null

const step = computed(() => props.steps[index.value])
const cheering = ref(false) // the "You're all set!" moment after the last tip
let cheerTimer = null
// How far along the flight path the little plane is
const pathPct = computed(() => (props.steps.length > 1 ? (index.value / (props.steps.length - 1)) * 100 : 100))
// Confetti pieces round Pip
function confetti(i) {
  const colors = ['#ffbf3c', '#ff6b7a', '#19b3c4', '#8fcbff', '#c3b0ff']
  const angle = (i / 18) * Math.PI * 2
  return {
    '--dx': Math.round(Math.cos(angle) * (60 + (i % 3) * 22)) + 'px',
    '--dy': Math.round(Math.sin(angle) * (50 + (i % 4) * 16)) + 'px',
    background: colors[i % colors.length],
    animationDelay: (i % 5) * 0.04 + 's'
  }
}

// ---------- has this person seen it? (localStorage can be blocked, e.g. private mode) ----------
function seen() {
  try {
    return localStorage.getItem(props.storageKey) === 'done'
  } catch (err) {
    return false
  }
}
function markSeen() {
  try {
    localStorage.setItem(props.storageKey, 'done')
  } catch (err) {
    // can't remember it: the tour may show again next time, which is harmless
  }
}

// ---------- finding the target ----------
function targetEl() {
  const s = step.value
  if (!s) return null
  const el = document.querySelector(s.target) || (s.fallback ? document.querySelector(s.fallback) : null)
  // Hidden elements (display: none) have no size: treat them as missing
  if (el && el.getClientRects().length === 0) return null
  return el
}

// ---------- positioning (like Floating UI's "flip" + "shift", in a few lines) ----------
function place() {
  const el = targetEl()
  const bubble = bubbleEl.value
  if (!el || !bubble) return
  const r = el.getBoundingClientRect()
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const bw = bubble.offsetWidth
  const bh = bubble.offsetHeight

  // Big targets (like the map): point at a spot near their top instead of the edge
  const big = r.height > vh * 0.5
  const anchorX = r.left + r.width / 2
  const bigY = r.top + Math.min(120, r.height / 3)

  // Below the target if it fits, otherwise above (or whichever side has more room)
  const below = big ? bigY + 24 : r.bottom
  const roomBelow = vh - below - GAP
  const roomAbove = (big ? bigY - 24 : r.top) - GAP
  let want = step.value.placement || 'bottom'
  if (want === 'bottom' && roomBelow < bh && roomAbove > roomBelow) want = 'top'
  if (want === 'top' && roomAbove < bh && roomBelow > roomAbove) want = 'bottom'
  side.value = want

  // The beacon sits on the edge facing the bubble, so it doesn't cover the controls themselves
  const beaconY = big ? bigY : want === 'bottom' ? r.bottom : r.top
  beacon.value = { x: anchorX, y: Math.min(Math.max(beaconY, 8), vh - 8) }

  let y = want === 'bottom' ? below + GAP : (big ? bigY - 24 : r.top) - GAP - bh
  y = Math.min(Math.max(y, MARGIN), vh - bh - MARGIN)
  let x = anchorX - bw / 2
  x = Math.min(Math.max(x, MARGIN), vw - bw - MARGIN)
  pos.value = { x, y }
  // The little arrow keeps pointing at the target even when the bubble is pushed sideways
  arrowX.value = Math.min(Math.max(anchorX - x, 20), bw - 20)
}
function schedule() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(place)
}

// ---------- moving through the steps ----------
async function show(i) {
  // Skip steps whose target isn't on the page (and has no fallback)
  while (i < props.steps.length) {
    index.value = i
    if (targetEl()) break
    i++
  }
  if (i >= props.steps.length) return finish()
  const el = targetEl()
  const r = el.getBoundingClientRect()
  // Scroll it into view if it's off screen, or hidden under something (like a sticky header)
  const cx = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1)
  const cy = Math.min(Math.max(r.top + Math.min(r.height / 2, 40), 0), window.innerHeight - 1)
  const onTop = document.elementFromPoint(cx, cy)
  const covered = !onTop || !(el === onTop || el.contains(onTop))
  if (covered || r.top < 60 || r.bottom > window.innerHeight - 40) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  }
  active.value = true
  await nextTick()
  place()
  watchTarget(el)
  setTimeout(place, 450) // again once a smooth scroll has finished
  if (ctaEl.value) ctaEl.value.focus({ preventScroll: true })
}
function next() {
  if (index.value < props.steps.length - 1) {
    show(index.value + 1)
    return
  }
  finish()
  // Finished every tip (not skipped): a little celebration
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cheering.value = true
    clearTimeout(cheerTimer)
    cheerTimer = setTimeout(() => { cheering.value = false }, 2400)
  }
}
function skip() {
  finish()
}
function finish() {
  active.value = false
  markSeen()
  stopWatching()
  emit('done')
}

// Follow the target when the page scrolls, resizes, or the target itself changes size
function watchTarget(el) {
  stopWatching()
  if (window.ResizeObserver) {
    resizeObs = new ResizeObserver(schedule)
    resizeObs.observe(el)
  }
}
function stopWatching() {
  if (resizeObs) resizeObs.disconnect()
  resizeObs = null
}

// Restart from the first bubble (e.g. a "Show tips again" link): restart() via a template ref
function restart() {
  try {
    localStorage.removeItem(props.storageKey)
  } catch (err) {
    // ignore
  }
  show(0)
}
defineExpose({ restart })

// The bubble's size changes between steps: measure again after it renders
watch(index, () => nextTick(place))

onMounted(() => {
  window.addEventListener('resize', schedule)
  window.addEventListener('scroll', schedule, true) // true: also scrolling inside panels
  if (!seen()) startTimer = setTimeout(() => show(0), props.delay)
})
onBeforeUnmount(() => {
  clearTimeout(startTimer)
  clearTimeout(cheerTimer)
  cancelAnimationFrame(frame)
  stopWatching()
  window.removeEventListener('resize', schedule)
  window.removeEventListener('scroll', schedule, true)
})
</script>

<style scoped>
/* Speech bubble: cream paper, chunky ink border, pillowy shadow */
.ft-bubble {
  --ft-ink: #12324a;
  --ft-paper: #fffaf0;
  --ft-muted: #5a6b78;
  --ft-accent: #ffbf3c;
  position: fixed;
  z-index: 1500;
  width: min(330px, calc(100vw - 24px));
  padding: 16px 18px 14px 18px;
  border-radius: 24px;
  background: var(--ft-paper);
  color: var(--ft-ink);
  border: 2.5px solid var(--ft-ink);
  box-shadow: 0 6px 0 var(--ft-ink), 0 24px 40px -12px rgba(18, 50, 74, 0.4);
  font-family: var(--font-body);
}
/* Pip pokes out of the bubble's top-left corner */
.ft-guide {
  position: absolute;
  top: -58px;
  left: -26px;
  pointer-events: none;
  filter: drop-shadow(0 6px 6px rgba(18, 50, 74, 0.2));
}
.is-top .ft-guide {
  top: auto;
  bottom: -50px;
}
.ft-arrow {
  position: absolute;
  width: 18px;
  height: 18px;
  margin-left: -9px;
  background: var(--ft-paper);
  border: 2.5px solid var(--ft-ink);
  transform: rotate(45deg);
}
.is-bottom .ft-arrow {
  top: -11px;
  border-right: 0;
  border-bottom: 0;
}
.is-top .ft-arrow {
  bottom: -11px;
  border-left: 0;
  border-top: 0;
}
.ft-skip {
  position: absolute;
  top: 10px;
  right: 12px;
  padding: 3px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ft-muted);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.ft-skip:hover {
  background: rgba(18, 50, 74, 0.07);
  color: var(--ft-ink);
}
.ft-title {
  margin: 14px 40px 6px 44px;
  font-family: var(--font-display);
  font-size: 1.08rem;
  font-weight: 800;
  line-height: 1.25;
}
.ft-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #2b4a60;
}
.ft-foot {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px 12px;
  margin-top: 14px;
}
/* flight-path progress */
.ft-path {
  position: relative;
  grid-column: 1 / -1;
  height: 22px;
  margin: 0 10px;
}
.ft-path::before,
.ft-path-done {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  height: 3px;
  border-radius: 2px;
}
.ft-path::before {
  right: 0;
  background: repeating-linear-gradient(90deg, rgba(18, 50, 74, 0.25) 0 5px, transparent 5px 10px);
}
.ft-path-done {
  background: var(--ft-accent);
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ft-stop {
  position: absolute;
  top: 6px;
  width: 11px;
  height: 11px;
  margin-left: -5.5px;
  border-radius: 50%;
  background: #fbf5ea;
  border: 2.5px solid rgba(18, 50, 74, 0.3);
  transition: background 0.3s, border-color 0.3s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ft-stop.done {
  background: var(--ft-accent);
  border-color: var(--ft-ink);
}
.ft-stop.on {
  border-color: var(--ft-ink);
  transform: scale(1.25);
}
.ft-path-plane {
  position: absolute;
  top: -8px;
  margin-left: -10px;
  transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ft-count {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ft-muted);
}
.ft-cta {
  padding: 8px 18px;
  border: 0;
  border-radius: 14px;
  background: var(--ft-accent);
  color: var(--ft-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 #d99a1c;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.ft-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #d99a1c;
}
.ft-cta:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #d99a1c;
}
.ft-bubble button:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}

/* Pulsing ring on the target */
.ft-beacon {
  position: fixed;
  z-index: 1499;
  width: 0;
  height: 0;
  pointer-events: none;
}
.ft-beacon-dot,
.ft-beacon-ping {
  position: absolute;
  left: -8px;
  top: -8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffbf3c;
  border: 3px solid #12324a;
}
.ft-beacon-ping {
  border: 0;
  animation: ft-ping 1.4s ease-out infinite;
}
@keyframes ft-ping {
  from { transform: scale(1); opacity: 0.7; }
  to { transform: scale(3.4); opacity: 0; }
}

/* "You're all set!" */
.ft-cheer {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 18px 26px 16px;
  border-radius: 26px;
  background: #fffaf0;
  color: #12324a;
  border: 2.5px solid #12324a;
  box-shadow: 0 6px 0 #12324a, 0 24px 40px -12px rgba(18, 50, 74, 0.4);
  text-align: center;
}
.ft-cheer strong {
  font-family: var(--font-display);
  font-size: 1.15rem;
}
.ft-cheer small {
  color: #5a6b78;
}
.ft-confetti {
  position: absolute;
  left: 50%;
  top: 46px;
  pointer-events: none;
}
.ft-confetti span {
  position: absolute;
  width: 8px;
  height: 12px;
  border-radius: 3px;
  animation: ft-burst 1.1s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
@keyframes ft-burst {
  0% { transform: translate(0, 0) rotate(0) scale(0.4); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(420deg) scale(1); opacity: 0; }
}

.ft-pop-enter-active {
  transition: opacity 0.25s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ft-pop-leave-active {
  transition: opacity 0.15s ease;
}
.ft-pop-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.92);
}
.ft-pop-leave-to {
  opacity: 0;
}
@media (max-width: 480px) {
  .ft-guide {
    left: -8px;
    top: -50px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ft-beacon-ping { animation: none; }
  .ft-path-done, .ft-path-plane, .ft-stop, .ft-cta { transition: none; }
  .ft-pop-enter-active { transition: opacity 0.2s; }
  .ft-pop-enter-from { transform: none; }
}
</style>
