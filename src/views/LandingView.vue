<template>
  <div class="lp" :style="{ '--mx': mx, '--my': my }" @mousemove="onMove" @mouseleave="mx = 0; my = 0">
    <!-- Landing page: an animated night scene with the brand, a big title and two ways in -->
    <!-- ===== The scene: the photo, with the moving parts drawn on top in the same coordinates ===== -->
    <!-- The stage keeps the photo's shape on every screen and keeps the mountain in view
         (on a phone the right part of the photo is shown, not the empty middle) -->
    <div class="lp-stage" aria-hidden="true">
    <div class="lp-photo"></div>
    <svg class="lp-scene" viewBox="0 0 1376 768" preserveAspectRatio="none">
      <defs>
        <filter id="lp-soft"><feGaussianBlur stdDeviation="1.4" /></filter>
      </defs>

      <!-- Trip routes over the land, with glowing stops -->
      <g class="lp-layer" style="--depth: 14px">
        <path d="M612 422 C 600 500, 680 565, 769 561 C 830 558, 880 540, 922 528 C 990 508, 1050 480, 1105 463 C 1200 440, 1310 420, 1327 335 C 1335 300, 1300 285, 1260 290" class="lp-route" />
        <path d="M1105 463 C 1180 480, 1240 500, 1288 507 S 1360 525, 1400 540" class="lp-route" />
        <circle v-for="n in nodes" :key="'n' + n.id" :cx="n.x" :cy="n.y" r="4.5" class="lp-node" :style="{ animationDelay: n.d + 's' }" />
      </g>

      <!-- Embers rising off the summit -->
      <g class="lp-layer" style="--depth: 10px">
        <circle v-for="e in embers" :key="'e' + e.id" :cx="e.x" cy="262" :r="e.s" class="lp-ember"
          :style="{ animationDelay: e.d + 's', animationDuration: e.t + 's', '--drift': e.drift + 'px' }" />
      </g>

      <!-- The plane: takes off from a route stop, climbs away to the left, then comes back high
           across the sky and glides down onto another stop. Moved by script (see flyPlane)
           so its nose never tips more than a real climb or descent would. -->
      <g class="lp-layer" style="--depth: 20px">
        <path v-for="(leg, k) in LEGS" :key="'t' + k" :ref="(el) => { if (el) trailEls[k] = el }" :d="leg.d" fill="none"
          stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round" filter="url(#lp-soft)" opacity="0" />
        <g ref="planeEl" opacity="0">
          <image ref="imgEl" :href="planeImg" x="-46" y="-24" width="92" height="48" />
        </g>
      </g>
    </svg>
    </div>

    <!-- Drifting clouds and rising embers (plain HTML, lighter than SVG filters) -->
    <div class="lp-clouds" aria-hidden="true">
      <span class="lp-cloud c1"></span>
      <span class="lp-cloud c2"></span>
      <span class="lp-cloud c3"></span>
    </div>
    <div class="lp-shade" aria-hidden="true"></div>

    <!-- ===== Brand, title and the two ways in ===== -->
    <header class="lp-brand">
      <svg class="lp-compass" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="none" stroke="#2fe0a1" stroke-width="2.5" />
        <path d="M27 13 L22 22 L13 27 L18 18 Z" fill="#2fe0a1" />
        <circle cx="20" cy="20" r="2" fill="#05080d" />
      </svg>
      <span>CHUI-SE YOUR TRIP</span>
    </header>

    <router-link to="/login" class="lp-btn ghost lp-top-signin">Sign in / Join</router-link>

    <main class="lp-content">
      <h1 class="lp-title"><span>Travel</span><span>without</span><span>limits</span></h1>
      <p class="lp-tag">Plan together. Drift nowhere.</p>
      <div class="lp-actions">
        <!-- Explore straight away as a guest; sign in only when saving something -->
        <router-link to="/discover" class="lp-btn primary">Explore trips</router-link>
      </div>
    </main>

    <AuthJoinModal :open="authOpen" :initial-tab="authTab" :initial-code="authCode" @close="authOpen = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import planeImg from '../assets/landing-plane.png'
import AuthJoinModal from '../components/AuthJoinModal.vue'

// Sign in / Join dialog. /welcome?auth=signin or ?code=XXXX opens it straight away (handy for links)
const route = useRoute()
const authOpen = ref(!!(route.query.auth || route.query.code))
const authTab = ref(route.query.auth === 'signin' ? 'signin' : 'join')
const authCode = ref(route.query.code ? String(route.query.code) : '')

// Fixed "random" numbers, so the embers look scattered but never jump between visits
function seeded(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
// Embers rise from around the summit (at about x 1000-1080 in the photo)
const embers = []
for (let i = 0; i < 22; i++) {
  embers.push({ id: i, x: 990 + Math.round(seeded(i + 500) * 100), d: seeded(i + 600) * 9, t: 6 + seeded(i + 700) * 6, drift: 20 + Math.round(seeded(i + 800) * 120), s: 1 + seeded(i + 900) * 1.8 })
}
// The route stops, where they sit in the photo
const nodes = [
  { id: 1, x: 612, y: 422, d: 0 }, { id: 2, x: 769, y: 561, d: 0.6 }, { id: 3, x: 922, y: 528, d: 1.2 },
  { id: 4, x: 1105, y: 463, d: 1.8 }, { id: 5, x: 1288, y: 507, d: 2.4 }, { id: 6, x: 1327, y: 335, d: 3 }
]

// Parallax: the mouse position, from -1 to 1 on each axis (each layer moves by its own depth)
const mx = ref(0)
const my = ref(0)
let reduceMotion = false
function onMove(e) {
  if (reduceMotion) return
  mx.value = ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3)
  my.value = ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3)
}

// Brush and condensed fonts, only loaded on this page
function loadFonts() {
  if (document.getElementById('lp-fonts')) return
  const link = document.createElement('link')
  link.id = 'lp-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Oswald:wght@500;600&display=swap'
  document.head.appendChild(link)
}

// ---------- the plane ----------
// Two legs in photo coordinates: out (take off right, climb away left) and back (high and far, gliding down to land)
const LEGS = [
  { d: 'M1288 507 C 1200 470, 1120 400, 980 330 S 700 215, 480 165 S 120 95, -140 70', time: 14000, from: 0.45, to: 1 },
  { d: 'M-140 40 C 200 25, 560 50, 860 120 S 1220 260, 1327 335', time: 16000, from: 0.5, to: 0.75 }
]
const REST_TIME = 1500   // ms off screen between legs
const MAX_PITCH = 14     // degrees: a real climb or descent, never a dive or a loop
const trailEls = []
const planeEl = ref(null)
const imgEl = ref(null)
let frame = null
let startedAt = 0

function easeInOut(t) {
  return 0.5 - Math.cos(Math.PI * t) / 2 // slow start, cruise, slow finish
}
function pathFor(k) {
  return trailEls[k]
}
function flyPlane(now) {
  if (!planeEl.value || !trailEls[0] || !trailEls[1]) return
  if (!startedAt) startedAt = now
  const cycle = LEGS[0].time + LEGS[1].time + 2 * REST_TIME
  let elapsed = (now - startedAt) % cycle
  // Which leg are we on, and how far through it?
  let k = 0
  if (elapsed >= LEGS[0].time + REST_TIME) {
    k = 1
    elapsed -= LEGS[0].time + REST_TIME
  }
  const leg = LEGS[k]
  const path = pathFor(k)
  const total = path.getTotalLength()
  const flying = elapsed < leg.time
  const t = Math.min(1, elapsed / leg.time)
  const along = easeInOut(t) * total
  const here = path.getPointAtLength(along)
  const ahead = path.getPointAtLength(Math.min(total, along + 6))
  const behind = path.getPointAtLength(Math.max(0, along - 6))
  const goingLeft = k === 0
  // Heading from the path, then turned into a gentle nose-up / nose-down angle
  let angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180 / Math.PI
  if (goingLeft) angle = angle > 0 ? angle - 180 : angle + 180
  let pitch = goingLeft ? -angle : angle
  pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch))
  const rot = goingLeft ? -pitch : pitch
  const bob = Math.sin(now / 900) * 1.2
  const sway = Math.sin(now / 1300) * 1.2
  const size = leg.from + (leg.to - leg.from) * t
  const fade = flying ? Math.min(1, t / 0.06, (1 - t) / 0.08) : 0
  imgEl.value.setAttribute('transform', goingLeft ? 'scale(-1,1)' : '')
  planeEl.value.setAttribute('transform', 'translate(' + here.x.toFixed(1) + ' ' + (here.y + bob).toFixed(1) + ') rotate(' + (rot + sway).toFixed(2) + ') scale(' + size.toFixed(3) + ')')
  planeEl.value.setAttribute('opacity', fade.toFixed(2))
  // Vapour trail: the stretch just behind the plane on this leg; the other leg's trail is hidden
  path.style.strokeDasharray = '160 ' + total
  path.style.strokeDashoffset = (160 - along).toFixed(1)
  path.setAttribute('opacity', (fade * Math.min(1, t * 5)).toFixed(2))
  pathFor(1 - k).setAttribute('opacity', '0')
  frame = requestAnimationFrame(flyPlane)
}

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  loadFonts()
  document.body.classList.add('lp-body')
  if (reduceMotion) {
    // Still: just show the plane mid-flight
    const p = trailEls[0].getPointAtLength(trailEls[0].getTotalLength() * 0.55)
    imgEl.value.setAttribute('transform', 'scale(-1,1)')
    planeEl.value.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') rotate(8)')
    planeEl.value.setAttribute('opacity', '1')
  } else {
    frame = requestAnimationFrame(flyPlane)
  }
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  document.body.classList.remove('lp-body')
})
</script>

<style scoped>
.lp {
  --mx: 0;
  --my: 0;
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #05080d;
  color: #fff;
}
/* The photo is 1376 x 768. The stage is that shape, big enough to cover the screen (plus a little
   room for the mouse parallax), slid sideways so the focus point (--focus, 0-1 across the photo)
   sits mid-screen without ever leaving a gap at the edges. */
.lp {
  --vh: 100vh;
  --focus: 0.6;
}
@supports (height: 100dvh) {
  .lp { --vh: 100dvh; } /* phones: the visible height, not counting the address bar */
}
.lp-stage {
  --sw: calc(max(100vw, var(--vh) * 1.7917) * 1.04);
  --sh: calc(var(--sw) * 0.5581);
  position: absolute;
  width: var(--sw);
  height: var(--sh);
  left: clamp(calc(100vw - var(--sw)), calc(50vw - var(--sw) * var(--focus)), 0px);
  top: calc((var(--vh) - var(--sh)) / 2);
}
.lp-photo {
  position: absolute;
  inset: 0;
  background: #05080d url('../assets/landing-bg.jpg') center / 100% 100% no-repeat;
  transform: translate(calc(var(--mx) * -8px), calc(var(--my) * -5px));
  transition: transform 0.6s cubic-bezier(.2, .7, .2, 1);
}
.lp-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* Each layer drifts against the mouse by its depth: far layers barely, near layers more */
.lp-layer {
  transform: translate(calc(var(--mx) * var(--depth) * -1), calc(var(--my) * var(--depth) * -0.6));
  transition: transform 0.6s cubic-bezier(.2, .7, .2, 1);
}
/* Vapour trail: a short bright stretch of the flight path that travels with the plane */
.lp-route {
  fill: none;
  stroke: #2fe0a1;
  stroke-width: 2;
  stroke-dasharray: 6 9;
  opacity: 0.75;
  animation: lp-dash 3s linear infinite;
}
@keyframes lp-dash {
  to { stroke-dashoffset: -60; }
}
.lp-node {
  fill: #2fe0a1;
  filter: drop-shadow(0 0 6px #2fe0a1);
  transform-box: fill-box;
  transform-origin: center;
  animation: lp-node 3.6s ease-in-out infinite;
}
@keyframes lp-node {
  50% { transform: scale(1.6); opacity: 0.6; }
}

/* Clouds */
.lp-clouds {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.lp-cloud {
  position: absolute;
  width: 220px;
  height: 60px;
  border-radius: 60px;
  background:
    radial-gradient(40px 34px at 30% 40%, rgba(255, 255, 255, 0.9), transparent 70%),
    radial-gradient(52px 40px at 55% 35%, rgba(255, 255, 255, 0.85), transparent 70%),
    radial-gradient(70px 30px at 50% 70%, rgba(220, 228, 236, 0.8), transparent 75%);
  filter: blur(2px);
  opacity: 0.7;
  animation: lp-cloud linear infinite;
}
.lp-cloud.c1 { top: 28%; animation-duration: 70s; animation-delay: -20s; }
.lp-cloud.c2 { top: 18%; transform: scale(0.7); opacity: 0.45; animation-duration: 95s; animation-delay: -60s; }
.lp-cloud.c3 { top: 36%; transform: scale(0.5); opacity: 0.35; animation-duration: 120s; animation-delay: -90s; }
@keyframes lp-cloud {
  from { left: 105%; }
  to { left: -30%; }
}

/* Embers rising from the summit (SVG circles, so they line up with the photo) */
.lp-ember {
  fill: #ffb35c;
  filter: drop-shadow(0 0 3px rgba(255, 140, 60, 0.9));
  opacity: 0;
  animation: lp-ember linear infinite;
}
@keyframes lp-ember {
  0% { transform: translate(0, 0); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translate(var(--drift), -200px); opacity: 0; }
}

/* Darkens the left so the title reads on any screen */
.lp-shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(5, 8, 13, 0.85) 0%, rgba(5, 8, 13, 0.45) 40%, transparent 65%);
}

/* Brand */
.lp-brand {
  position: absolute;
  top: 28px;
  left: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Oswald', 'Inter', sans-serif;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.06em;
  color: #2fe0a1;
  text-shadow: 0 0 18px rgba(47, 224, 161, 0.5);
}
.lp-compass {
  width: 38px;
  height: 38px;
  filter: drop-shadow(0 0 8px rgba(47, 224, 161, 0.7));
  animation: lp-spin 12s ease-in-out infinite;
}
@keyframes lp-spin {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}

/* Title and actions */
.lp-content {
  position: absolute;
  left: 40px;
  bottom: 72px;
  max-width: 640px;
  transform: translate(calc(var(--mx) * 6px), calc(var(--my) * 4px));
  transition: transform 0.6s cubic-bezier(.2, .7, .2, 1);
}
.lp-title {
  margin: 0;
  font-family: 'Permanent Marker', 'Fredoka', cursive;
  font-weight: 400;
  font-size: clamp(56px, 9vw, 132px);
  line-height: 0.92;
  text-transform: uppercase;
  color: #f47c7c;
  text-shadow: 0 6px 30px rgba(0, 0, 0, 0.5);
}
.lp-title span {
  display: block;
  opacity: 0;
  animation: lp-rise 0.9s cubic-bezier(.2, .8, .2, 1) forwards;
}
.lp-title span:nth-child(2) { animation-delay: 0.12s; }
.lp-title span:nth-child(3) { animation-delay: 0.24s; }
@keyframes lp-rise {
  from { opacity: 0; transform: translateY(30px) rotate(-2deg); }
  to { opacity: 1; transform: none; }
}
.lp-tag {
  margin: 18px 0 44px;
  font-family: 'Permanent Marker', cursive;
  font-size: clamp(18px, 2.2vw, 28px);
  color: #f5f5f5;
  opacity: 0;
  animation: lp-rise 0.9s 0.45s cubic-bezier(.2, .8, .2, 1) forwards;
}
.lp-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 28px;
  opacity: 0;
  animation: lp-rise 0.9s 0.6s cubic-bezier(.2, .8, .2, 1) forwards;
}
.lp-btn {
  font-family: 'Oswald', 'Inter', sans-serif;
  font-weight: 500;
  font-size: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  color: #e9edf2;
  transition: color 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.lp-btn.primary {
  padding: 10px 30px;
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
}
.lp-btn.primary:hover {
  border-color: #2fe0a1;
  color: #2fe0a1;
  box-shadow: 0 0 24px rgba(47, 224, 161, 0.35);
  transform: translateY(-2px);
}
.lp-btn.ghost {
  border: 0;
  background: none;
  padding: 0;
}
.lp-top-signin {
  position: absolute;
  top: 26px;
  right: 40px;
  z-index: 2;
  font-size: 26px;
  letter-spacing: 0.05em;
}
.lp-btn.ghost:hover {
  color: #2fe0a1;
}
.lp-btn:focus-visible {
  outline: 3px solid rgba(47, 224, 161, 0.7);
  outline-offset: 4px;
  border-radius: 999px;
}

@media (max-width: 700px) {
  .lp { --focus: 0.74; } /* centre on the peak */
  .lp-brand { left: 20px; top: 20px; font-size: 18px; }
  .lp-compass { width: 32px; height: 32px; }
  .lp-top-signin { top: 20px; right: 20px; font-size: 20px; }
  .lp-content { left: 20px; right: 20px; bottom: 48px; }
  /* keep the mountain and routes clear; only darken behind the title */
  .lp-shade { background: linear-gradient(180deg, rgba(5, 8, 13, 0.15) 0%, rgba(5, 8, 13, 0) 30%, rgba(5, 8, 13, 0.3) 52%, rgba(5, 8, 13, 0.88) 72%); }
  .lp-clouds { opacity: 0.6; } /* softer clouds so the small sky doesn't look busy */
  .lp-actions { gap: 18px; }
  .lp-btn { font-size: 17px; }
}
/* Very narrow phones: logo and Sign in must share one line */
@media (max-width: 360px) {
  .lp-brand { font-size: 16px; gap: 6px; }
  .lp-compass { width: 28px; height: 28px; }
  .lp-top-signin { font-size: 16px; right: 16px; }
  .lp-title { font-size: 48px; }
}
/* Phones turned sideways: not much height, so everything gets shorter */
@media (max-height: 520px) and (orientation: landscape) {
  .lp { --focus: 0.62; }
  .lp-brand { top: 14px; }
  .lp-top-signin { top: 12px; }
  .lp-content { bottom: 18px; }
  .lp-title { font-size: clamp(34px, 13vh, 72px); }
  .lp-tag { margin: 6px 0 14px; font-size: 16px; }
  .lp-btn { font-size: 16px; }
  .lp-btn.primary { padding: 6px 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .lp *, .lp-title span, .lp-tag, .lp-actions { animation: none !important; opacity: 1 !important; }
  .lp-layer, .lp-content { transition: none; transform: none; }
}
</style>

<!-- The page fills the whole window, so the body behind it goes dark too -->
<style>
body.lp-body {
  background: #05080d;
  overflow: hidden;
}
</style>
