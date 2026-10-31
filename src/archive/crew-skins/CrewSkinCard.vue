<template>
  <!-- Hero card with switchable crew "skins".
       Change skin: the arrows, the dots, a click/tap on the avatar, arrow keys, or a swipe.
       The card's colours (border, glow, tags) come from the current crew member. -->
  <section class="cc" :style="theme" role="group" aria-roledescription="carousel" aria-label="Crew skins"
    tabindex="0" @keydown="onKey">
    <div class="cc-stage" @pointerdown="swipeStart" @pointerup="swipeEnd">
      <button type="button" class="cc-arrow prev" aria-label="Previous crew member" @click="go(-1)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      </button>

      <button type="button" class="cc-avatar" :aria-label="'Swap to ' + CREW[(index + 1) % CREW.length].name" @click="tapAvatar">
        <span class="cc-ring" aria-hidden="true"></span>
        <Transition :name="dir > 0 ? 'cc-next' : 'cc-prev'" mode="out-in">
          <svg :key="skin.id" class="cc-svg" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <radialGradient :id="'bg-' + skin.id" cx="50%" cy="38%" r="65%">
                <stop offset="0%" :stop-color="skin.accent" stop-opacity="0.55" />
                <stop offset="100%" :stop-color="skin.tint" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="96" :fill="'url(#bg-' + skin.id + ')'" />

            <!-- hair that sits behind the head -->
            <path v-if="L.hair === 'bob'" d="M54 104c0-34 20-54 46-54s46 20 46 54v24h-14v-32H68v32H54z" :fill="L.hairColor" />
            <path v-if="L.hair === 'long'" d="M52 104c0-34 22-56 48-56s48 22 48 56v62h-16V110H68v56H52z" :fill="L.hairColor" />
            <path v-if="L.hair === 'ponytail'" d="M134 66c26 4 34 36 24 66-5-22-14-36-28-44z" :fill="L.hairColor" />
            <circle v-if="L.hair === 'bun'" cx="100" cy="50" r="17" :fill="L.hairColor" />
            <g v-if="L.hair === 'braid'" :fill="L.hairColor">
              <ellipse cx="140" cy="128" rx="9" ry="11" /><ellipse cx="142" cy="146" rx="8" ry="10" />
              <ellipse cx="143" cy="163" rx="7" ry="9" />
            </g>
            <g v-if="L.hair === 'locs'" :fill="L.hairColor">
              <rect v-for="x in [52, 62, 130, 140]" :key="x" :x="x" y="78" width="9" height="68" rx="4.5" />
            </g>

            <!-- shoulders, neck, head -->
            <path d="M28 200c4-36 32-56 72-56s68 20 72 56z" :fill="L.outfit" />
            <path d="M86 146l14 18 14-18" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="3" stroke-linejoin="round" />
            <rect x="88" y="128" width="24" height="22" rx="8" :fill="L.skin" />
            <circle cx="56" cy="104" r="9" :fill="L.skin" />
            <circle cx="144" cy="104" r="9" :fill="L.skin" />
            <circle cx="100" cy="100" r="44" :fill="L.skin" />

            <!-- face -->
            <path v-if="L.beard" d="M62 110c4 28 18 42 38 42s34-14 38-42c-8 10-22 14-38 14s-30-4-38-14z" :fill="L.hairColor" />
            <path v-if="L.stubble" d="M64 112c4 24 18 36 36 36s32-12 36-36c-8 9-20 13-36 13s-28-4-36-13z" :fill="L.hairColor" opacity="0.22" />
            <circle cx="74" cy="116" r="7" fill="#ff8f8f" opacity="0.22" />
            <circle cx="126" cy="116" r="7" fill="#ff8f8f" opacity="0.22" />
            <ellipse cx="84" cy="104" rx="4.2" ry="5.2" fill="#1d1a22" />
            <ellipse cx="116" cy="104" rx="4.2" ry="5.2" fill="#1d1a22" />
            <circle cx="85.5" cy="102" r="1.4" fill="#fff" />
            <circle cx="117.5" cy="102" r="1.4" fill="#fff" />
            <path d="M76 93q8-5 15 0M109 93q8-5 15 0" fill="none" :stroke="L.hair === 'long' ? '#8a8494' : L.hairColor" stroke-width="3" stroke-linecap="round" />
            <path d="M88 122q12 9 24 0" fill="none" :stroke="L.beard ? '#f2d6c2' : '#7a3b33'" stroke-width="3" stroke-linecap="round" />
            <g v-if="L.wrinkles" fill="none" stroke="#7a5a48" stroke-width="1.6" stroke-linecap="round" opacity="0.45">
              <path d="M72 106l-6 3M128 106l6 3M88 76h24" />
            </g>
            <path v-if="L.scar" d="M120 88l10 24M121 96l6-2M124 103l6-2" fill="none" stroke="#8a4b38" stroke-width="2.4" stroke-linecap="round" />

            <!-- hair in front -->
            <path v-if="L.hair === 'crop' || L.hair === 'locs'" d="M56 98c0-30 20-48 44-48s44 18 44 48c-8-12-22-20-44-20s-36 8-44 20z" :fill="L.hairColor" />
            <path v-if="L.hair === 'bob' || L.hair === 'long'" d="M56 100c0-30 20-50 44-50s44 20 44 50c-10-16-26-22-38-22-6 8-24 14-50 22z" :fill="L.hairColor" />
            <path v-if="L.hair === 'braid' || L.hair === 'bun' || L.hair === 'ponytail'" d="M56 98c2-30 22-46 44-46s42 16 44 46c-10-14-26-20-44-20s-34 6-44 20z" :fill="L.hairColor" />
            <rect v-if="L.headband" x="56" y="74" width="88" height="9" rx="4.5" :fill="L.headband" />

            <!-- hats -->
            <g v-if="L.hat === 'tricorn'">
              <path d="M38 76c20-6 40-32 62-32s42 26 62 32c-10 9-32 12-62 12s-52-3-62-12z" :fill="L.hatColor" />
              <path d="M46 78c18 6 36 8 54 8s36-2 54-8" fill="none" :stroke="skin.accent" stroke-width="3" stroke-linecap="round" />
              <circle cx="100" cy="64" r="6" :fill="skin.accent" />
            </g>
            <g v-if="L.hat === 'bandana'">
              <path d="M54 90c4-26 22-42 46-42s42 16 46 42c-14-7-30-9-46-9s-32 2-46 9z" :fill="L.hatColor" />
              <path d="M142 80l18 4-8 15z" :fill="L.hatColor" />
              <circle cx="80" cy="66" r="2.5" fill="#fff" opacity="0.7" /><circle cx="104" cy="60" r="2.5" fill="#fff" opacity="0.7" /><circle cx="124" cy="70" r="2.5" fill="#fff" opacity="0.7" />
            </g>
            <g v-if="L.hat === 'beanie'">
              <path d="M54 92c0-30 20-50 46-50s46 20 46 50z" :fill="L.hatColor" />
              <rect x="52" y="82" width="96" height="14" rx="7" :fill="skin.accent" opacity="0.9" />
              <circle cx="100" cy="40" r="8" :fill="skin.accent" />
            </g>

            <!-- accessories -->
            <g v-if="L.goggles">
              <path d="M56 80q44-12 88 0" fill="none" stroke="#5a4632" stroke-width="4" />
              <circle cx="84" cy="76" r="11" fill="#9fd8f0" stroke="#5a4632" stroke-width="4" />
              <circle cx="116" cy="76" r="11" fill="#9fd8f0" stroke="#5a4632" stroke-width="4" />
              <circle cx="80" cy="72" r="3" fill="#fff" opacity="0.8" /><circle cx="112" cy="72" r="3" fill="#fff" opacity="0.8" />
            </g>
            <g v-if="L.glasses" fill="none" stroke="#2a2433" stroke-width="3">
              <circle cx="84" cy="104" r="11" /><circle cx="116" cy="104" r="11" /><path d="M95 104h10" />
            </g>
            <g v-if="L.eyepatch">
              <path d="M58 90L144 112" stroke="#16131a" stroke-width="3" />
              <ellipse cx="116" cy="104" rx="11" ry="10" fill="#16131a" />
            </g>
            <circle v-if="L.earring" cx="146" cy="116" r="4.5" fill="none" stroke="#f2c14e" stroke-width="2.5" />
            <g v-if="L.medic">
              <rect x="122" y="168" width="18" height="18" rx="4" :fill="skin.accent" />
              <path d="M131 171v12M125 177h12" stroke="#fff" stroke-width="3" stroke-linecap="round" />
            </g>
          </svg>
        </Transition>
      </button>

      <button type="button" class="cc-arrow next" aria-label="Next crew member" @click="go(1)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>

    <Transition name="cc-text" mode="out-in">
      <div :key="skin.id" class="cc-info">
        <span class="cc-badge">{{ skin.role }}</span>
        <h3 class="cc-name">{{ skin.name }}</h3>
        <p class="cc-line">{{ skin.line }}</p>
        <ul class="cc-tags">
          <li v-for="t in skin.tags" :key="t">{{ t }}</li>
        </ul>
      </div>
    </Transition>

    <div class="cc-dots" aria-label="Choose a crew member">
      <button v-for="(c, i) in CREW" :key="c.id" type="button" class="cc-dot" :class="{ on: i === index }"
        :style="{ '--dot': c.accent }" :aria-label="c.name + ', ' + c.role" :aria-current="i === index" @click="jump(i)"></button>
    </div>

    <p class="cc-sr" aria-live="polite">{{ index + 1 }} of {{ CREW.length }}: {{ skin.name }}, {{ skin.role }}</p>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CREW } from './crewSkinsStandalone.js'

const index = ref(0) // which crew member is showing
const dir = ref(1)   // 1 = moving forward, -1 = back (picks the slide direction)

const skin = computed(() => CREW[index.value])
const L = computed(() => skin.value.look)
// The card's colours, as CSS variables
const theme = computed(() => ({ '--accent': skin.value.accent, '--glow': skin.value.glow, '--tint': skin.value.tint }))

function go(step) {
  dir.value = step
  index.value = (index.value + step + CREW.length) % CREW.length
}
function jump(i) {
  if (i === index.value) return
  dir.value = i > index.value ? 1 : -1
  index.value = i
}
function onKey(e) {
  if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
}

// Swipe on touch screens (a short tap still counts as a click on the avatar)
let startX = null
let swiped = false // a swipe that ends on the avatar shouldn't also count as a tap
function tapAvatar() {
  if (swiped) {
    swiped = false
    return
  }
  go(1)
}
function swipeStart(e) {
  startX = e.clientX
}
function swipeEnd(e) {
  if (startX === null) return
  const dx = e.clientX - startX
  startX = null
  if (e.pointerType !== 'mouse' && Math.abs(dx) > 40) {
    go(dx < 0 ? 1 : -1)
    swiped = true
    setTimeout(() => { swiped = false }, 350)
  }
}
</script>

<style scoped>
.cc {
  --accent: #f2a541;
  --glow: rgba(242, 165, 65, 0.45);
  --tint: #173f4a;
  position: relative;
  width: 100%;
  max-width: 320px;
  padding: 22px 20px 18px;
  border-radius: 24px;
  border: 1.5px solid var(--accent);
  background:
    radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--tint) 70%, transparent), transparent 70%),
    #0e1117;
  color: #eef1f6;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent), 0 18px 50px -12px var(--glow);
  text-align: center;
  outline: none;
  transition: border-color 0.5s ease, box-shadow 0.5s ease, background 0.5s ease;
}
.cc:focus-visible {
  box-shadow: 0 0 0 4px var(--accent), 0 18px 50px -12px var(--glow);
}
.cc *,
.cc *::before,
.cc *::after {
  box-sizing: border-box;
}

/* ----- avatar + arrows ----- */
.cc-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  touch-action: pan-y;
}
.cc-avatar {
  position: relative;
  width: 168px;
  height: 168px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cc-avatar:hover {
  transform: scale(1.04) rotate(-2deg);
}
.cc-avatar:active {
  transform: scale(0.95);
}
.cc-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px dashed color-mix(in srgb, var(--accent) 70%, transparent);
  animation: cc-spin 18s linear infinite;
  transition: border-color 0.5s;
}
@keyframes cc-spin {
  to { transform: rotate(360deg); }
}
.cc-svg {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  filter: drop-shadow(0 10px 18px var(--glow));
}
.cc-arrow {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #eef1f6;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cc-arrow svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.cc-arrow:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.cc-arrow.prev:active { transform: translateX(-3px) scale(0.92); }
.cc-arrow.next:active { transform: translateX(3px) scale(0.92); }

/* ----- name, role, tags ----- */
.cc-info {
  margin-top: 16px;
}
.cc-badge {
  display: inline-block;
  padding: 4px 11px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.cc-name {
  margin: 10px 0 4px;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.cc-line {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: #a9b1bf;
}
.cc-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.cc-tags li {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  color: #d5dbe5;
}

/* ----- dots ----- */
.cc-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
}
.cc-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
}
.cc-dot:hover {
  background: var(--dot);
}
.cc-dot.on {
  width: 22px;
  background: var(--dot);
}
.cc button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.cc-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ----- transitions: the avatar slides + turns in the direction you're going, the text lifts ----- */
.cc-next-enter-active,
.cc-next-leave-active,
.cc-prev-enter-active,
.cc-prev-leave-active {
  transition: transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.22s ease;
}
.cc-next-enter-from { opacity: 0; transform: translateX(28px) rotate(8deg) scale(0.9); }
.cc-next-leave-to { opacity: 0; transform: translateX(-28px) rotate(-8deg) scale(0.9); }
.cc-prev-enter-from { opacity: 0; transform: translateX(-28px) rotate(-8deg) scale(0.9); }
.cc-prev-leave-to { opacity: 0; transform: translateX(28px) rotate(8deg) scale(0.9); }
.cc-text-enter-active,
.cc-text-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.cc-text-enter-from { opacity: 0; transform: translateY(8px); }
.cc-text-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .cc-ring { animation: none; }
  .cc, .cc-avatar, .cc-dot, .cc-arrow,
  .cc-next-enter-active, .cc-next-leave-active, .cc-prev-enter-active, .cc-prev-leave-active,
  .cc-text-enter-active, .cc-text-leave-active {
    transition: opacity 0.15s ease;
  }
  .cc-next-enter-from, .cc-next-leave-to, .cc-prev-enter-from, .cc-prev-leave-to,
  .cc-text-enter-from, .cc-text-leave-to {
    transform: none;
  }
}
</style>
