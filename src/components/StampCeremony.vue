<template>
  <!-- "Trip complete!" stamping ceremony.
       1. Pip pops up next to a faint outline of the stamp and a "Stamp my passport" button.
       2. Press it: the big stamp slams down (scale 1.8 -> 0.95 -> 1) with an ink splat, confetti,
          a rubber-stamp "thunk" and a little buzz on phones.
       3. It floats down into its slot in the passport (targetRect), then "done".
       <StampCeremony :open="!!ceremony" :place="..." :date="..." :flag="..." :trip-name="..." :target-rect="slotOf"
         @slam="..." @done="..." @close="..." />   — or call stamp() on it (template ref) to start step 2 yourself. -->
  <Teleport to="body">
    <transition name="sc-fade">
      <div v-if="open" class="sc" :class="'is-' + phase" role="dialog" aria-modal="true" aria-labelledby="sc-title" @keydown.esc="skip">
        <div class="sc-card">
          <div class="sc-guide"><PlaneGuide :size="110" :mood="phase === 'ready' ? 'wave' : 'loop'" /></div>
          <p class="sc-kicker">Trip complete!</p>
          <h2 id="sc-title" class="sc-title">{{ tripName }}</h2>
          <p class="sc-sub">{{ phase === 'ready' ? 'Welcome back! Time to stamp your passport.' : more ? 'Stamped! +' + more + ' more place' + (more === 1 ? '' : 's') + ' from this trip.' : 'Stamped!' }}</p>

          <div class="sc-pad">
            <!-- ink splat behind the stamp -->
            <svg v-if="phase !== 'ready'" class="sc-splat" viewBox="0 0 200 200" aria-hidden="true">
              <g :fill="ink" opacity="0.09">
                <circle cx="100" cy="100" r="78" />
                <circle cx="22" cy="60" r="9" /><circle cx="180" cy="48" r="7" /><circle cx="170" cy="164" r="11" />
                <circle cx="30" cy="158" r="6" /><circle cx="100" cy="8" r="5" /><circle cx="196" cy="110" r="5" />
              </g>
            </svg>
            <span v-if="phase !== 'ready'" class="sc-confetti" aria-hidden="true">
              <span v-for="i in 24" :key="i" :style="confetti(i)"></span>
            </span>
            <div ref="stampEl" class="sc-stamp" :style="flyStyle" @transitionend="landed">
              <PassportStamp :place="place" :date="date" :flag="flag" big />
            </div>
          </div>

          <div class="sc-btns">
            <template v-if="phase === 'ready'">
              <button type="button" class="sc-skip" @click="skip">Later</button>
              <button ref="goEl" type="button" class="sc-go" @click="stamp">Stamp my passport</button>
            </template>
            <button v-else-if="phase === 'stamped'" type="button" class="sc-go" @click="fly">Add to my passport</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import PlaneGuide from './PlaneGuide.vue'
import PassportStamp from './PassportStamp.vue'
import { stampStyle } from '../stampStyle.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  place: { type: String, default: '' },     // the stamp: the trip's first destination
  date: { type: String, default: '' },
  flag: { type: String, default: '' },
  tripName: { type: String, default: '' },
  more: { type: Number, default: 0 },       // other places on the trip (stamped too, quietly)
  targetRect: { type: Function, default: null }, // () => DOMRect of the stamp's slot in the passport (or null)
  sound: { type: Boolean, default: true }
})
const emit = defineEmits(['slam', 'stamped', 'done', 'close'])

const phase = ref('ready') // ready -> slam -> stamped -> flying
const stampEl = ref(null)
const goEl = ref(null)
const flyStyle = ref({})
const ink = computed(() => stampStyle(props.place || 'x').ink)
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let autoFly = null

watch(() => props.open, (open) => {
  if (!open) return
  phase.value = 'ready'
  flyStyle.value = {}
  nextTick(() => goEl.value && goEl.value.focus())
})

// Step 2: slam it down
function stamp() {
  if (phase.value !== 'ready') return
  phase.value = 'slam'
  emit('slam')
  // the thunk lands as the stamp hits the paper (a third of the way through the slam)
  setTimeout(() => {
    thunk()
    if (navigator.vibrate) navigator.vibrate(35)
  }, still ? 0 : 160)
  setTimeout(() => {
    phase.value = 'stamped'
    emit('stamped')
    autoFly = setTimeout(fly, 2200) // floats into the passport by itself if they don't press the button
  }, still ? 50 : 650)
}

// Step 3: float into its slot (or just finish if the slot isn't on screen)
function fly() {
  clearTimeout(autoFly)
  if (phase.value !== 'stamped') return
  const target = props.targetRect ? props.targetRect() : null
  const el = stampEl.value
  if (!target || !el || still) return finish()
  const from = el.getBoundingClientRect()
  const dx = target.left + target.width / 2 - (from.left + from.width / 2)
  const dy = target.top + target.height / 2 - (from.top + from.height / 2)
  const s = Math.max(0.2, target.width / from.width)
  phase.value = 'flying'
  flyStyle.value = { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')', transition: 'transform 0.85s cubic-bezier(0.5, 0, 0.2, 1)' }
}
function landed(e) {
  if (phase.value === 'flying' && e.propertyName === 'transform') finish()
}
function finish() {
  phase.value = 'ready'
  emit('done', props.place)
}
function skip() {
  clearTimeout(autoFly)
  emit('close')
}

// A rubber-stamp "thunk", made on the spot (no sound file): a low thud + a short papery slap
let audio = null
function thunk() {
  if (!props.sound) return
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)()
    const t = audio.currentTime
    const thud = audio.createOscillator()
    const g1 = audio.createGain()
    thud.frequency.setValueAtTime(140, t)
    thud.frequency.exponentialRampToValueAtTime(42, t + 0.16)
    g1.gain.setValueAtTime(0.55, t)
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    thud.connect(g1).connect(audio.destination)
    thud.start(t)
    thud.stop(t + 0.24)
    const len = Math.floor(audio.sampleRate * 0.07)
    const buf = audio.createBuffer(1, len, audio.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const slap = audio.createBufferSource()
    const band = audio.createBiquadFilter()
    const g2 = audio.createGain()
    slap.buffer = buf
    band.type = 'bandpass'
    band.frequency.value = 1800
    g2.gain.value = 0.35
    slap.connect(band).connect(g2).connect(audio.destination)
    slap.start(t)
  } catch (err) {
    // no sound available: the animation still plays
  }
}

// Confetti burst from the stamp
function confetti(i) {
  const colors = ['#ffbf3c', '#ff6b7a', '#19b3c4', '#8fcbff', '#c3b0ff', ink.value]
  const angle = (i / 24) * Math.PI * 2
  return {
    '--dx': Math.round(Math.cos(angle) * (120 + (i % 4) * 30)) + 'px',
    '--dy': Math.round(Math.sin(angle) * (100 + (i % 3) * 30)) + 'px',
    background: colors[i % colors.length],
    animationDelay: 0.12 + (i % 5) * 0.03 + 's'
  }
}

defineExpose({ stamp, fly })
</script>

<style scoped>
.sc {
  position: fixed;
  inset: 0;
  z-index: 1450;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(8, 30, 48, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background 0.4s;
}
.sc.is-flying {
  background: rgba(8, 30, 48, 0);
  backdrop-filter: none;
}
.sc-card {
  position: relative;
  width: min(460px, 100%);
  padding: 34px 26px 22px;
  border-radius: 30px;
  background: #fffaf0;
  color: #12324a;
  border: 2.5px solid #12324a;
  box-shadow: 0 7px 0 #12324a, 0 30px 60px -20px rgba(0, 0, 0, 0.5);
  text-align: center;
  animation: sc-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: opacity 0.3s, transform 0.3s;
}
.is-flying .sc-card {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.is-flying .sc-card > :not(.sc-pad) {
  opacity: 0;
}
@keyframes sc-pop {
  from { opacity: 0; transform: translateY(30px) scale(0.9); }
}
.sc-guide {
  position: absolute;
  top: -70px;
  left: -30px;
  pointer-events: none;
  filter: drop-shadow(0 8px 8px rgba(0, 0, 0, 0.2));
}
.sc-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #d94b5b;
}
.sc-title {
  margin: 4px 0 4px;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 900;
}
.sc-sub {
  margin: 0;
  color: #4a6274;
  font-weight: 600;
}
.sc-pad {
  position: relative;
  height: 270px;
  display: grid;
  place-items: center;
}
.sc-stamp {
  position: relative;
  z-index: 2;
  transform-origin: 50% 50%;
}
/* before stamping: just a faint dashed outline where it'll go */
.is-ready .sc-stamp {
  opacity: 0.16;
  filter: grayscale(1);
}
/* the slam: big and high -> squashes into the paper -> settles */
.is-slam .sc-stamp {
  animation: sc-slam 0.62s cubic-bezier(0.3, 0, 0.3, 1) both;
}
@keyframes sc-slam {
  0% { transform: scale(1.8) translateY(-40px); opacity: 0; }
  25% { transform: scale(1.8) translateY(-30px); opacity: 1; }
  50% { transform: scale(0.95); }
  75% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.is-slam .sc-card {
  animation: sc-shake 0.35s ease-out 0.15s;
}
@keyframes sc-shake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-3px, 2px); }
  50% { transform: translate(3px, -2px); }
  75% { transform: translate(-2px, 1px); }
}
.sc-splat {
  position: absolute;
  width: 260px;
  height: 260px;
  animation: sc-splat 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) 0.15s both;
}
@keyframes sc-splat {
  from { transform: scale(0.3); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.is-flying .sc-splat {
  opacity: 0;
  transition: opacity 0.2s;
}
.sc-confetti {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  pointer-events: none;
}
.sc-confetti span {
  position: absolute;
  width: 9px;
  height: 14px;
  border-radius: 3px;
  animation: sc-burst 1.2s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
@keyframes sc-burst {
  0% { transform: translate(0, 0) rotate(0) scale(0.3); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(480deg) scale(1); opacity: 0; }
}
.sc-btns {
  display: flex;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
}
.sc-go,
.sc-skip {
  padding: 11px 22px;
  border-radius: 16px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.sc-go {
  border: 0;
  background: #ffbf3c;
  color: #12324a;
  box-shadow: 0 5px 0 #d99a1c;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.sc-go:hover {
  transform: translateY(-2px);
  box-shadow: 0 7px 0 #d99a1c;
}
.sc-go:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #d99a1c;
}
.sc-skip {
  border: 2px solid rgba(18, 50, 74, 0.2);
  background: transparent;
  color: #12324a;
}
.sc button:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
.sc-fade-enter-active,
.sc-fade-leave-active {
  transition: opacity 0.25s;
}
.sc-fade-enter-from,
.sc-fade-leave-to {
  opacity: 0;
}
@media (max-width: 480px) {
  .sc-pad { height: 230px; }
  .sc-guide { left: -6px; top: -64px; }
}
@media (prefers-reduced-motion: reduce) {
  .sc-card, .is-slam .sc-stamp, .is-slam .sc-card, .sc-splat { animation: none; }
  .sc-confetti { display: none; }
}
</style>
