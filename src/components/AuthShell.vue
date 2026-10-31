<template>
  <!-- Shared look for Log in, Sign up and Forgot password: a cream desk with a "traveller clearance" card on the left
       (our explorer peeking over it, pulling his goggles down while you type a password) and an illustrated postcard on the right -->
  <div class="as">
    <header class="as-bar">
      <!-- Back to the landing page -->
      <router-link to="/" class="as-logo" title="Back to the home page" aria-label="Back to the Chui-se Your Trip home page">
        <span class="as-logo-mark"><DoodleIcon name="plane" :size="28" tint="cream" anim="" /></span>
        <span class="as-logo-name">Chui-se Your Trip</span>
      </router-link>
      <router-link :to="switchTo" class="as-switch">{{ switchLabel }}</router-link>
    </header>

    <div class="as-split">
      <main class="as-side">
        <!-- the clearance card (watches which field has focus, so Pip can look away for passwords) -->
        <section class="as-card" @focusin="onFocus" @focusout="onBlur">
          <!-- the explorer peeking over the card's top-left edge, with a speech bubble -->
          <div class="as-pip">
            <!-- tap him: he jumps, waves and says something new -->
            <button type="button" class="as-pip-btn" aria-label="Say hi to the explorer" @click="tapMascot">
              <ExplorerMascot :peek="shy" :cheer="cheering" :size="172" />
            </button>
            <!-- (the bob is on the wrapper, so it doesn't hold up the bubble's swap transition) -->
            <div class="as-bubble-wrap">
              <transition name="as-bubble" mode="out-in">
                <p :key="bubbleText" class="as-bubble" aria-live="polite">{{ bubbleText }}</p>
              </transition>
            </div>
          </div>
          <div class="as-card-inner">
            <h1 class="as-title">{{ title }}</h1>
            <p class="as-sub">{{ subtitle }}</p>
            <slot />
          </div>
        </section>
      </main>

      <!-- the illustrated postcard -->
      <div class="as-desk">
        <AuroraPostcard />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DoodleIcon from './DoodleIcon.vue'
import ExplorerMascot from './ExplorerMascot.vue'
import AuroraPostcard from './AuroraPostcard.vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  switchTo: { type: [String, Object], required: true }, // the other page (Log in <-> Sign up)
  switchLabel: { type: String, required: true },
  bubble: { type: String, default: 'Cleared for departure?' } // what the explorer says
})

// The explorer pulls his goggles down while a password box has focus
const shy = ref(false)
function onFocus(e) {
  shy.value = e.target.type === 'password'
}
function onBlur(e) {
  // moving to another field: the next focusin decides; leaving the card: Pip looks again
  if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) shy.value = false
}
// Tapping the explorer: a jump and a wave, and a new line for a moment (a different one each tap)
const TAP_LINES = ['Roger that, captain!', 'Bags packed? Let\'s fly!', 'Next stop: anywhere!', 'Wheels up in 3, 2, 1...']
const cheering = ref(false)
const tapLine = ref('')
let tapCount = 0
let tapTimer = null
function tapMascot() {
  cheering.value = false
  requestAnimationFrame(() => { cheering.value = true }) // restart the jump if tapped again quickly
  tapLine.value = TAP_LINES[tapCount % TAP_LINES.length]
  tapCount++
  clearTimeout(tapTimer)
  tapTimer = setTimeout(() => {
    cheering.value = false
    tapLine.value = ''
  }, 2200)
}
const bubbleText = computed(() => {
  if (shy.value) return 'Goggles down. No peeking!'
  return tapLine.value || props.bubble
})

</script>

<style scoped>
.as {
  --ink: #12324a;
  --muted: #5a6b78;
  --cream: #fffaf0;
  --edge: #efdcbc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--ink);
  /* a warm cream desk with faint dots */
  background:
    radial-gradient(circle, rgba(18, 50, 74, 0.09) 1.2px, transparent 1.4px) 0 0 / 26px 26px,
    linear-gradient(90deg, #faf6ee 0 50%, #f6efe2 50%);
}
/* top bar */
.as-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 22px clamp(18px, 4vw, 48px) 0;
}
.as-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  text-decoration: none;
}
.as-logo-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  background: #ffbf3c;
  box-shadow: inset 0 0 0 2.5px var(--ink), 0 4px 0 var(--ink);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.as-logo:hover .as-logo-mark {
  transform: rotate(-8deg) scale(1.06);
}
.as-logo-name {
  font-family: 'Lilita One', var(--font-display);
  font-size: clamp(1.3rem, 2.4vw, 1.75rem);
  letter-spacing: 0.01em;
}
.as-switch {
  padding: 10px 20px;
  border: 2.5px solid var(--ink);
  border-radius: 14px;
  background: var(--cream);
  color: var(--ink);
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 4px 0 var(--ink);
  transition: transform 0.12s, box-shadow 0.12s;
}
.as-switch:hover {
  color: var(--ink);
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--ink);
}
.as-switch:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--ink);
}
.as-logo:focus-visible,
.as-switch:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
  border-radius: 14px;
}
/* two columns */
.as-split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 24px;
  padding: 24px clamp(18px, 4vw, 48px) 40px;
}
.as-side {
  display: flex;
  justify-content: center;
  padding-top: 134px; /* room for the explorer peeking over the card */
}
/* the clearance card: cream, dotted paper, a dashed inner edge, pillowy shadow */
.as-card {
  position: relative;
  width: min(460px, 100%);
  padding: 10px;
  border-radius: 28px;
  background: var(--cream);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.9), 0 6px 0 #e3cfa9, 0 30px 50px -24px rgba(18, 50, 74, 0.45);
}
.as-card-inner {
  padding: 34px clamp(18px, 4vw, 34px) 26px;
  border: 2.5px dashed #d9c39b;
  border-radius: 20px;
  background: radial-gradient(circle, rgba(18, 50, 74, 0.06) 1px, transparent 1.2px) 0 0 / 16px 16px;
}
.as-title {
  margin: 0 0 6px;
  font-family: 'Lilita One', var(--font-display);
  font-weight: 400;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  line-height: 1.1;
  text-align: center;
  color: var(--ink);
}
.as-sub {
  margin: 0 0 22px;
  text-align: center;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--muted);
}
/* the explorer peeking over the card's top-left edge (his hands sit on the edge), bubble to his right */
.as-pip {
  position: absolute;
  left: -18px;
  top: -128px; /* 172px drawing: his hands land on the card's top edge */
  z-index: 2;
  display: flex;
  align-items: flex-start;
  pointer-events: none;
}
/* the explorer is a button (the rest of the corner lets clicks through) */
.as-pip-btn {
  padding: 0;
  border: 0;
  background: none;
  line-height: 0;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
}
.as-pip-btn:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
  border-radius: 20px;
}
.as-bubble-wrap {
  margin-top: 4px;
  animation: as-bubble-bob 3.4s ease-in-out infinite;
}
@keyframes as-bubble-bob {
  50% { transform: translateY(-3px) rotate(-1deg); }
}
.as-bubble {
  position: relative;
  max-width: 230px;
  margin: 6px 0 0;
  padding: 12px 16px;
  border-radius: 20px;
  font-family: 'Lilita One', var(--font-display);
  letter-spacing: 0.01em;
  background: #fff;
  border: 2.5px solid var(--ink);
  box-shadow: 0 4px 0 var(--ink);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.25;
}
.as-bubble::before {
  content: '';
  position: absolute;
  left: -9px;
  top: 18px;
  width: 13px;
  height: 13px;
  background: #fff;
  border-left: 2.5px solid var(--ink);
  border-bottom: 2.5px solid var(--ink);
  transform: rotate(45deg);
}
.as-bubble-enter-active {
  transition: opacity 0.2s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.as-bubble-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.as-bubble-enter-from,
.as-bubble-leave-to {
  opacity: 0;
  transform: scale(0.9) translateX(-6px);
}
/* ---------- the postcard on the right ---------- */
.as-desk {
  display: flex;
  justify-content: center;
  padding: 30px 10px 10px;
}
/* Narrower screens: just the card, centred (the postcard steps aside) */
@media (max-width: 900px) {
  .as {
    background:
      radial-gradient(circle, rgba(18, 50, 74, 0.09) 1.2px, transparent 1.4px) 0 0 / 26px 26px,
      #faf6ee;
  }
  .as-split {
    grid-template-columns: 1fr;
    padding-top: 12px;
  }
  .as-desk {
    display: none;
  }
}
@media (max-width: 480px) {
  .as-logo-mark { width: 40px; height: 40px; border-radius: 12px; }
  .as-switch { padding: 8px 14px; }
  .as-bubble { max-width: 170px; font-size: 13px; }
  .as-pip { left: -8px; }
}
@media (prefers-reduced-motion: reduce) {
  .as-bubble-wrap { animation: none; }
}
</style>

<!-- Form pieces used inside the slot by the Log in, Sign up and Forgot password pages -->
<style>
.as-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.as-label {
  margin: 6px 0 0 4px;
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #12324a;
}
/* a field: an icon tab on the left + the input */
.as-field {
  display: flex;
  align-items: stretch;
  border: 2.5px solid #efdcbc;
  border-radius: 16px;
  background: #fff3dc;
  box-shadow: inset 0 3px 0 rgba(18, 50, 74, 0.04);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.as-field:focus-within {
  border-color: #ffbf3c;
  box-shadow: 0 0 0 4px rgba(255, 191, 60, 0.25);
}
.as-field-icon {
  display: grid;
  place-items: center;
  width: 50px;
  flex: none;
  background: #f4e6cc;
  border-right: 2px solid #efdcbc;
}
.as-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #12324a;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
}
.as-input::placeholder {
  color: #9aa6ae;
  font-weight: 600;
}
.as-input:focus {
  outline: none;
}
/* "Let's go!": a chunky amber 3D button that presses down */
.as-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 56px;
  margin-top: 14px;
  border: 2.5px solid #12324a;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffd36e, #ffbf3c 55%, #f5a922);
  color: #12324a;
  font-family: 'Lilita One', var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 5px 0 #12324a;
  transition: transform 0.12s, box-shadow 0.12s;
}
.as-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 7px 0 #12324a;
}
.as-btn:active:not(:disabled) {
  transform: translateY(4px) scale(1.02, 0.96); /* squish */
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 1px 0 #12324a;
}
.as-btn:disabled {
  opacity: 0.65;
  cursor: progress;
}
.as-btn:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
/* the other big button (Sign up on the Log in page, Log in on the Sign up page): cream, same size as the amber one */
.as-btn2 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 56px;
  border: 2.5px solid #12324a;
  border-radius: 18px;
  background: #fffaf0;
  color: #12324a;
  font-family: 'Lilita One', var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  text-decoration: none;
  box-shadow: 0 5px 0 #12324a;
  transition: transform 0.12s, box-shadow 0.12s, background 0.15s;
}
.as-btn2:hover {
  color: #12324a;
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 7px 0 #12324a;
}
.as-btn2:active {
  transform: translateY(4px) scale(1.02, 0.96);
  box-shadow: 0 1px 0 #12324a;
}
.as-btn2:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
.as-error {
  margin: 6px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: #ffe1e4;
  color: #b3263a;
  font-size: 14px;
  font-weight: 700;
}
.as-success {
  margin: 0 0 4px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #d7f2f4;
  color: #0f6e7b;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}
.as-or {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 20px 0 12px;
  color: #8a99a5;
  font-size: 13px;
  font-weight: 700;
}
.as-or::before,
.as-or::after {
  content: '';
  flex: 1;
  border-top: 2px dotted rgba(168, 151, 120, 0.55);
}
.as-foot {
  margin: 18px 0 0;
  text-align: center;
  font-size: 14.5px;
  font-weight: 600;
  color: #5a6b78;
}
.as-foot a {
  color: #0f6e7b;
  font-weight: 900;
  text-decoration: none;
}
.as-foot a:hover {
  text-decoration: underline;
}
</style>
