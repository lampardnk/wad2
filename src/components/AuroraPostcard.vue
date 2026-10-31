<template>
  <!-- The postcard on the sign-in pages: the campervan-under-the-northern-lights illustration
       (src/assets/auth-postcard.webp) pinned in front, over the back of a postcard with an airmail stamp,
       a postmark, address lines and "Wish you were here!". The whole group floats gently. -->
  <div class="apc">
    <!-- back of the postcard -->
    <div class="apc-back" aria-hidden="true">
      <span class="apc-divider"></span>
      <span class="apc-lines"><i></i><i></i><i></i><i></i></span>
      <span class="apc-stamp"><span>S</span></span>
      <svg class="apc-postmark" viewBox="0 0 170 90">
        <defs><path id="apc-ring" d="M45 45m-31 0a31 31 0 1 1 62 0a31 31 0 1 1-62 0" /></defs>
        <circle cx="45" cy="45" r="38" fill="none" stroke="currentColor" stroke-width="2.6" />
        <circle cx="45" cy="45" r="24" fill="none" stroke="currentColor" stroke-width="1.6" />
        <text font-size="9.5" font-weight="900" letter-spacing="2" fill="currentColor"><textPath href="#apc-ring">AIRMAIL · POSTMARK ·</textPath></text>
        <text x="45" y="53" text-anchor="middle" font-size="22" font-weight="900" fill="currentColor">S</text>
        <path d="M92 22c11-7 20 7 31 0s20 7 31 0M92 42c11-7 20 7 31 0s20 7 31 0M92 62c11-7 20 7 31 0s20 7 31 0" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
      </svg>
      <p class="apc-note">Wish you<br>were here!</p>
    </div>

    <!-- the illustration in front, with a red pushpin. On top of the picture: a moving aurora glow over the sky,
         and an invisible button over the van (tap it: headlights flash, snow kicks up, "Beep beep!", the card hops).
         Positions are percentages of the picture (1200 x 899). -->
    <div class="apc-front" :class="{ hop: honking }">
      <svg class="apc-pin" viewBox="0 0 40 52" aria-hidden="true">
        <path d="M20 30v20" stroke="#8a99a5" stroke-width="3" stroke-linecap="round" />
        <path d="M11 26h18l-3-8v-8h3V4H11v6h3v8Z" fill="#e0405a" stroke="#12324a" stroke-width="2.6" stroke-linejoin="round" />
        <path d="M15 7h4" stroke="#ff9aa5" stroke-width="2.4" stroke-linecap="round" />
      </svg>
      <img class="apc-card" :src="postcard" alt="" width="1200" height="899" draggable="false">

      <!-- the northern lights: soft glows and light curtains drifting over the sky -->
      <span class="apc-aurora" aria-hidden="true">
        <i class="glow g1"></i>
        <i class="glow g2"></i>
        <i class="glow g3"></i>
        <i class="rays"></i>
      </span>

      <!-- headlight glows (brighter on hover, flash when tapped) -->
      <span class="apc-light l1" aria-hidden="true"></span>
      <span class="apc-light l2" aria-hidden="true"></span>

      <!-- snow kicked up by the wheels -->
      <span v-if="honking" :key="honkKey" class="apc-snow" aria-hidden="true">
        <i v-for="n in 12" :key="n" :style="snowStyle(n)"></i>
      </span>

      <!-- "Beep beep!" -->
      <transition name="apc-beep">
        <span v-if="honking" class="apc-beep" aria-hidden="true">Beep beep!</span>
      </transition>

      <!-- the van: tap it -->
      <button type="button" class="apc-van" aria-label="Honk the campervan" title="Beep beep!" @click="honk"></button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import postcard from '../assets/auth-postcard.webp'

// Tap the van: a honk (headlights flash, snow flies, a speech bubble, the card hops)
const honking = ref(false)
const honkKey = ref(0) // a new number restarts the snow puffs
let honkTimer = null
function honk() {
  honkKey.value++
  honking.value = true
  clearTimeout(honkTimer)
  honkTimer = setTimeout(() => { honking.value = false }, 1400)
}
// Snow puffs: four from each wheel, flying back and up
const WHEELS = [[36.5, 75], [50.5, 76.5], [63.5, 74]]
function snowStyle(n) {
  const w = WHEELS[n % 3]
  const k = Math.floor(n / 3)
  return {
    left: w[0] + '%',
    top: w[1] + '%',
    '--dx': (-18 - k * 14 - (n % 2) * 8) + 'px',
    '--dy': (-14 - k * 9) + 'px',
    animationDelay: k * 0.05 + 's',
    width: 6 + (n % 4) * 2 + 'px',
    height: 6 + (n % 4) * 2 + 'px'
  }
}
</script>

<style scoped>
.apc {
  position: relative;
  width: min(640px, 100%);
  aspect-ratio: 1.16;
  animation: apc-float 6s ease-in-out infinite;
}
@keyframes apc-float {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-10px) rotate(0.6deg); }
}
/* ---------- back of the postcard, behind and to the right ---------- */
.apc-back {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 80%;
  border: 3px solid #12324a;
  border-radius: 10px;
  background: #fbf2e1;
  box-shadow: 0 6px 0 rgba(18, 50, 74, 0.18), 0 24px 36px -20px rgba(18, 50, 74, 0.5);
  transform: rotate(4deg);
}
.apc-divider {
  position: absolute;
  left: 44%;
  top: 34%;
  bottom: 12%;
  border-left: 2px dotted rgba(168, 151, 120, 0.6);
}
.apc-lines {
  position: absolute;
  left: 50%;
  right: 16px;
  bottom: 16%;
  display: grid;
  gap: 14px;
}
.apc-lines i {
  border-bottom: 2px dotted rgba(168, 151, 120, 0.6);
}
.apc-stamp {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px;
  background: radial-gradient(circle, transparent 2.4px, #fffdf8 2.8px) -5px -5px / 10px 10px;
  filter: drop-shadow(0 2px 2px rgba(18, 50, 74, 0.35));
  transform: rotate(5deg);
}
.apc-stamp span {
  display: grid;
  place-items: center;
  width: 64px;
  height: 76px;
  border: 2px solid rgba(18, 50, 74, 0.35);
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.35), transparent 50%),
    #5e96b8;
  color: #e9f4fa;
  font-family: 'Lilita One', var(--font-display);
  font-size: 2.8rem;
  line-height: 1;
  text-shadow: 2px 2px 0 rgba(18, 50, 74, 0.45);
}
.apc-postmark {
  position: absolute;
  top: 46px;
  right: 36px;
  width: 150px;
  color: rgba(36, 50, 74, 0.65);
  transform: rotate(-16deg);
}
.apc-note {
  position: absolute;
  right: 18px;
  bottom: 34%;
  margin: 0;
  font-family: 'Caveat', 'Segoe Script', cursive;
  font-weight: 700;
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  line-height: 1;
  text-align: right;
  color: #12324a;
  transform: rotate(-9deg);
}
/* ---------- the illustration in front ---------- */
.apc-front {
  position: absolute;
  left: 0;
  top: 12%;
  width: 74%;
  transform: rotate(-3deg);
  z-index: 1;
}
.apc-card {
  display: block;
  width: 100%;
  height: auto;
  /* the card's own shape casts the shadow (the image has a transparent background) */
  filter: drop-shadow(0 5px 0 #e3cfa9) drop-shadow(0 26px 30px rgba(18, 50, 74, 0.35));
  user-select: none;
}
.apc-pin {
  position: absolute;
  top: -34px;
  left: 48%;
  z-index: 2;
  width: 50px;
  filter: drop-shadow(2px 4px 2px rgba(0, 0, 0, 0.25));
  transform: rotate(12deg);
}
/* ---------- living picture ---------- */
/* the northern lights: green glows that drift and breathe, plus light curtains sliding sideways.
   "screen" only brightens, so it lights up the dark sky and barely touches the light parts. */
.apc-aurora {
  position: absolute;
  left: 6.5%;
  top: 7.5%;
  width: 87%;
  height: 40%;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
  mix-blend-mode: screen;
  pointer-events: none;
  /* fades out towards the mountains */
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
}
.apc-aurora .glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(18px);
  opacity: 0.35;
}
.apc-aurora .g1 {
  left: 8%; top: 20%; width: 45%; height: 50%;
  background: radial-gradient(closest-side, rgba(90, 255, 190, 0.9), transparent);
  animation: apc-sway 7s ease-in-out infinite alternate;
}
.apc-aurora .g2 {
  left: 45%; top: 5%; width: 40%; height: 60%;
  background: radial-gradient(closest-side, rgba(60, 230, 220, 0.85), transparent);
  animation: apc-sway 9s ease-in-out -3s infinite alternate-reverse;
}
.apc-aurora .g3 {
  left: 20%; top: 45%; width: 60%; height: 40%;
  background: radial-gradient(closest-side, rgba(150, 255, 170, 0.7), transparent);
  animation: apc-sway 11s ease-in-out -6s infinite alternate;
}
@keyframes apc-sway {
  0% { transform: translate(-6%, 4%) scale(1, 0.9); opacity: 0.2; }
  50% { opacity: 0.5; }
  100% { transform: translate(8%, -6%) scale(1.15, 1.1); opacity: 0.3; }
}
/* vertical light curtains drifting sideways */
.apc-aurora .rays {
  position: absolute;
  inset: -10% -20%;
  background: repeating-linear-gradient(95deg, transparent 0 22px, rgba(140, 255, 210, 0.22) 30px, transparent 42px 70px);
  filter: blur(3px);
  opacity: 0.6;
  animation: apc-rays 14s linear infinite;
}
@keyframes apc-rays {
  from { transform: translateX(0) skewX(-6deg); }
  to { transform: translateX(140px) skewX(6deg); }
}
/* headlights: a soft glow that brightens on hover and flashes on a honk */
.apc-light {
  position: absolute;
  width: 9%;
  aspect-ratio: 1;
  margin: -4.5% 0 0 -4.5%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 236, 150, 0.9), rgba(255, 210, 90, 0.35) 50%, transparent);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s;
}
.apc-light.l1 { left: 58.2%; top: 63.6%; }
.apc-light.l2 { left: 66.9%; top: 62.3%; }
.apc-front:has(.apc-van:hover) .apc-light {
  opacity: 0.6;
}
.apc-front.hop .apc-light {
  animation: apc-flash 0.35s ease-in-out 3;
}
@keyframes apc-flash {
  0%, 100% { opacity: 0.2; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.6); }
}
/* the invisible tap area over the van */
.apc-van {
  position: absolute;
  left: 32%;
  top: 36%;
  width: 37.5%;
  height: 41%;
  padding: 0;
  border: 0;
  border-radius: 30px;
  background: transparent;
  cursor: pointer;
}
.apc-van:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}
/* the whole card hops when the van honks */
.apc-front.hop .apc-card,
.apc-front.hop .apc-pin {
  animation: apc-hop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes apc-hop {
  0%, 100% { translate: 0 0; }
  30% { translate: 0 -10px; }
  55% { translate: 0 2px; }
}
/* snow puffs flying back from the wheels */
.apc-snow i {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 1.5px rgba(18, 50, 74, 0.25);
  animation: apc-puff 0.8s ease-out forwards;
  pointer-events: none;
}
@keyframes apc-puff {
  0% { transform: translate(0, 0) scale(0.4); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1.3); opacity: 0; }
}
/* "Beep beep!" */
.apc-beep {
  position: absolute;
  left: 62%;
  top: 27%;
  padding: 6px 12px;
  border: 2.5px solid #12324a;
  border-radius: 14px;
  background: #fff;
  color: #12324a;
  font-family: 'Lilita One', var(--font-display);
  font-size: clamp(0.95rem, 1.6vw, 1.2rem);
  white-space: nowrap;
  box-shadow: 0 3px 0 #12324a;
  transform: rotate(-6deg);
  pointer-events: none;
}
.apc-beep::after {
  content: '';
  position: absolute;
  left: 14px;
  bottom: -9px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-right: 2.5px solid #12324a;
  border-bottom: 2.5px solid #12324a;
  transform: rotate(45deg);
}
.apc-beep-enter-active {
  transition: opacity 0.15s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.apc-beep-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.apc-beep-enter-from,
.apc-beep-leave-to {
  opacity: 0;
  transform: rotate(-6deg) scale(0.5) translateY(10px);
}
@media (prefers-reduced-motion: reduce) {
  .apc, .apc-aurora .glow, .apc-aurora .rays, .apc-front.hop .apc-card, .apc-front.hop .apc-pin, .apc-snow i { animation: none; }
}
</style>
