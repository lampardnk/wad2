<template>
  <!-- First-visit tour: small bubbles that point at real parts of the page, one after another.
       Not a blocking pop-up: the page stays usable, and "Skip" ends it at any time.
       Usage: <FeatureTour storage-key="tour-discover-v1" :steps="[{ target: '[data-tour=filters]', title, body, cta }]" /> -->
  <Teleport to="body">
    <template v-if="active && step">
      <!-- Pulsing beacon on the thing being explained -->
      <span class="ft-beacon" :style="{ left: beacon.x + 'px', top: beacon.y + 'px' }" aria-hidden="true">
        <span class="ft-beacon-ping"></span>
        <span class="ft-beacon-dot"></span>
      </span>

      <transition name="ft-pop" appear>
        <div ref="bubbleEl" class="ft-bubble" :class="'is-' + side" :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
          role="dialog" aria-modal="false" :aria-labelledby="'ft-title-' + index" :aria-describedby="'ft-body-' + index"
          @click="next" @keydown.esc.stop="skip">
          <span class="ft-arrow" :style="{ left: arrowX + 'px' }" aria-hidden="true"></span>

          <button type="button" class="ft-skip" aria-label="Skip the tour" @click.stop="skip">
            <AppIcon name="x" :size="12" :stroke="2.6" /> Skip
          </button>

          <p class="ft-count" aria-hidden="true">Tip {{ index + 1 }} of {{ steps.length }}</p>
          <h2 :id="'ft-title-' + index" class="ft-title">
            <span v-if="step.icon" class="ft-icon"><AppIcon :name="step.icon" :size="16" /></span>
            {{ step.title }}
          </h2>
          <p :id="'ft-body-' + index" class="ft-body">{{ step.body }}</p>

          <div class="ft-foot">
            <span class="ft-dots" aria-hidden="true">
              <span v-for="(s, i) in steps" :key="i" class="ft-dot" :class="{ on: i === index, done: i < index }"></span>
            </span>
            <button ref="ctaEl" type="button" class="ft-cta" @click.stop="next">
              {{ step.cta || (index < steps.length - 1 ? 'Next' : 'Got it') }}
            </button>
          </div>
        </div>
      </transition>
    </template>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'

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
  if (index.value < props.steps.length - 1) show(index.value + 1)
  else finish()
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
  cancelAnimationFrame(frame)
  stopWatching()
  window.removeEventListener('resize', schedule)
  window.removeEventListener('scroll', schedule, true)
})
</script>

<style scoped>
.ft-bubble {
  /* Colours from the app: deep navy glass with the sunset-yellow accent */
  --ft-bg: rgba(0, 29, 44, 0.9);
  --ft-line: rgba(255, 255, 255, 0.1);
  --ft-text: #f6f1e7;
  --ft-muted: #b4c3cf;
  --ft-accent: #edae49;
  position: fixed;
  z-index: 1500;
  box-sizing: border-box;
  width: min(320px, calc(100vw - 24px));
  padding: 16px 16px 14px;
  border-radius: 16px;
  border: 1px solid var(--ft-line);
  background: var(--ft-bg);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  color: var(--ft-text);
  /* hairline accent ring + soft glow */
  box-shadow: 0 0 0 1.5px rgba(237, 174, 73, 0.55), 0 0 28px rgba(237, 174, 73, 0.18), 0 18px 44px rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: left 0.25s ease, top 0.25s ease;
}
.ft-arrow {
  position: absolute;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  background: var(--ft-bg);
  border: 1px solid var(--ft-line);
  transform: rotate(45deg);
}
.ft-bubble.is-bottom .ft-arrow {
  top: -8px;
  border-right: 0;
  border-bottom: 0;
  box-shadow: -1px -1px 0 0.5px rgba(237, 174, 73, 0.55);
}
.ft-bubble.is-top .ft-arrow {
  bottom: -8px;
  border-left: 0;
  border-top: 0;
  box-shadow: 1px 1px 0 0.5px rgba(237, 174, 73, 0.55);
}
.ft-skip {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ft-muted);
  font-size: 12px;
  font-weight: 600;
}
.ft-skip:hover,
.ft-skip:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ft-text);
  outline: none;
}
.ft-count {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ft-accent);
}
.ft-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 56px 6px 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--ft-text);
}
.ft-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(237, 174, 73, 0.15);
  color: var(--ft-accent);
}
.ft-body {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--ft-muted);
}
.ft-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ft-dots {
  display: inline-flex;
  gap: 5px;
}
.ft-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  transition: width 0.2s ease, background 0.2s ease;
}
.ft-dot.done {
  background: rgba(237, 174, 73, 0.5);
}
.ft-dot.on {
  width: 18px;
  background: var(--ft-accent);
}
.ft-cta {
  min-height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: var(--ft-accent);
  color: #001d2c;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
  transition: transform 0.15s, box-shadow 0.15s;
}
.ft-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(237, 174, 73, 0.35);
}
.ft-cta:focus-visible {
  outline: 3px solid #f3c26f;
  outline-offset: 2px;
}

/* Beacon: a dot with a ring that keeps pulsing outwards (like Tailwind's animate-ping) */
.ft-beacon {
  position: fixed;
  z-index: 1499;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  pointer-events: none;
  transition: left 0.25s ease, top 0.25s ease;
}
.ft-beacon-dot,
.ft-beacon-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #edae49;
}
.ft-beacon-dot {
  box-shadow: 0 0 0 3px rgba(0, 29, 44, 0.85);
}
.ft-beacon-ping {
  animation: ft-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ft-ping {
  75%,
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}

.ft-pop-enter-active,
.ft-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.ft-pop-enter-from,
.ft-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .ft-beacon-ping {
    animation: none;
    opacity: 0.35;
    transform: scale(1.8);
  }
  .ft-bubble,
  .ft-beacon,
  .ft-pop-enter-active,
  .ft-pop-leave-active {
    transition: none;
  }
}
</style>
