<template>
  <!-- One inked passport stamp: a rough-edged shape (circle, scalloped badge, rounded octagon or pill)
       in a vintage ink, a little landmark, a short code, the city (full name, wraps instead of "…") and the date.
       It's a button: clicking it emits "select". -->
  <button type="button" class="ps" :class="['ps-' + look.shape, { on: active, big }]"
    :style="{ '--ink': look.ink, '--tilt': look.tilt + 'deg', '--w': w + 'px', '--h': h + 'px' }"
    :aria-pressed="active" :aria-label="'Trips to ' + place + (date ? ', ' + date : '')" @click="emit('select', place)">
    <svg class="ps-ink" :viewBox="'0 0 ' + vw + ' ' + vh" aria-hidden="true" focusable="false">
      <defs>
        <!-- worn rubber-stamp edges: wobble the lines a little and knock tiny holes in the ink -->
        <filter :id="fid" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" :seed="seed" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" result="wobbly" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" :seed="seed + 3" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="holes" />
          <feComposite in="wobbly" in2="holes" operator="in" />
        </filter>
      </defs>
      <g :filter="'url(#' + fid + ')'" fill="none" :stroke="look.ink" stroke-linejoin="round">
        <template v-if="look.shape === 'circle'">
          <circle cx="60" cy="60" r="55" stroke-width="4.5" />
          <circle cx="60" cy="60" r="47" stroke-width="1.6" />
        </template>
        <template v-else-if="look.shape === 'scallop'">
          <path :d="scallop" stroke-width="4" />
          <circle cx="60" cy="60" r="44" stroke-width="1.6" stroke-dasharray="3 3" />
        </template>
        <template v-else-if="look.shape === 'octagon'">
          <path d="M40 6h40c4 0 7 1 10 4l20 20c3 3 4 6 4 10v40c0 4-1 7-4 10l-20 20c-3 3-6 4-10 4H40c-4 0-7-1-10-4L10 90c-3-3-4-6-4-10V40c0-4 1-7 4-10l20-20c3-3 6-4 10-4Z" stroke-width="4.5" />
          <path d="M43 14h34l29 29v34l-29 29H43L14 77V43Z" stroke-width="1.6" />
        </template>
        <template v-else>
          <rect x="4" y="4" width="152" height="88" rx="44" stroke-width="4.5" />
          <rect x="12" y="12" width="136" height="72" rx="36" stroke-width="1.6" />
        </template>
        <!-- landmark, top middle -->
        <g :transform="'translate(' + (vw / 2 - 11) + ' ' + (look.shape === 'pill' ? 14 : 15) + ') scale(0.92)'" stroke-width="2.2" stroke-linecap="round">
          <path v-for="(d, i) in LANDMARKS[look.landmark]" :key="i" :d="d" />
        </g>
      </g>
    </svg>
    <span class="ps-text">
      <span class="ps-code">{{ look.code }}</span>
      <span class="ps-city" :class="sizeClass">{{ look.city }}</span>
      <span class="ps-date"><span class="ps-flag" aria-hidden="true">{{ flag }}</span>{{ date }}</span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { stampStyle } from '../stampStyle.js'

const props = defineProps({
  place: { type: String, required: true }, // 'Kyoto, Japan'
  date: { type: String, default: '' },     // e.g. 'MAR 2025'
  flag: { type: String, default: '' },     // flag emoji
  active: { type: Boolean, default: false }, // it's the filter being shown
  big: { type: Boolean, default: false }     // the oversized one in the stamping ceremony
})
const emit = defineEmits(['select'])

let counter = 0
const fid = 'ps-rough-' + Math.random().toString(36).slice(2, 8) + counter++ // each stamp needs its own filter id
const look = computed(() => stampStyle(props.place))
const seed = computed(() => (look.value.code.charCodeAt(0) || 7) % 50)
const vw = computed(() => (look.value.shape === 'pill' ? 160 : 120))
const vh = computed(() => (look.value.shape === 'pill' ? 96 : 120))
const scale = computed(() => (props.big ? 2.2 : 1))
const w = computed(() => (look.value.shape === 'pill' ? 150 : 112) * scale.value)
const h = computed(() => (look.value.shape === 'pill' ? 90 : 112) * scale.value)
const sizeClass = computed(() => {
  const n = look.value.city.length
  return n > 14 ? 'xs' : n > 9 ? 'sm' : ''
})

// Scalloped edge: 18 little bumps round a circle
const scallop = (() => {
  const bumps = 18
  let d = ''
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2
    const x = 60 + Math.cos(a) * 52
    const y = 60 + Math.sin(a) * 52
    if (i === 0) d += 'M' + x.toFixed(1) + ' ' + y.toFixed(1)
    else d += 'A9 9 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
})()

// Little landmarks drawn on a 24 x 22 grid (simple, generic shapes)
const LANDMARKS = {
  pagoda: ['M3 8h18L12 3Z', 'M5 13h14L12 9', 'M6 13v6h12v-6', 'M10 19v-4h4v4', 'M2 19h20'],
  palm: ['M12 20c0-6 1-10 3-13', 'M15 7c-3-3-7-3-10 0 3 0 6 1 8 2', 'M15 7c2-3 6-4 8-2-3 0-5 1-6 3', 'M15 7c1-3 0-5-2-6', 'M3 20c4-2 14-2 18 0'],
  peak: ['M1 19 9 7l4 6 3-4 7 10Z', 'M7 10l2 2 2-2', 'M18 4h.01'],
  arch: ['M3 20V9c0-4 4-7 9-7s9 3 9 7v11', 'M8 20v-8c0-2 2-4 4-4s4 2 4 4v8', 'M2 20h20'],
  dome: ['M5 13c0-4 3-7 7-7s7 3 7 7Z', 'M12 6V2', 'M4 13h16v7H4Z', 'M9 20v-4h6v4'],
  bridge: ['M1 12h22', 'M5 5v15', 'M19 5v15', 'M5 6c3 5 11 5 14 0', 'M9 12v-3M12 12V9.5M15 12v-3'],
  skyline: ['M2 20V11h4v9', 'M6 20V5h5v15', 'M11 20V9h4v11', 'M15 20V3h4l2 3v14', 'M1 20h22'],
  tower: ['M12 2v3', 'M9 20c1-6 2-11 3-15 1 4 2 9 3 15', 'M10 12h4', 'M8 20h8']
}
</script>

<style scoped>
.ps {
  position: relative;
  flex: none;
  width: var(--w);
  height: var(--h);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transform: rotate(var(--tilt));
  mix-blend-mode: multiply; /* ink soaks into the paper */
  opacity: 0.9;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s, filter 0.2s;
}
.ps:hover {
  opacity: 1;
  transform: rotate(var(--tilt)) translateY(-4px) scale(1.05);
  animation: ps-wiggle 0.5s ease-in-out;
}
.ps:active {
  transform: rotate(var(--tilt)) scale(0.96);
}
.ps.on {
  opacity: 1;
  transform: rotate(var(--tilt)) scale(1.08);
  filter: drop-shadow(0 0 0.5px var(--ink)) drop-shadow(0 6px 10px rgba(18, 50, 74, 0.25));
}
.ps:focus-visible {
  outline: 3px dashed var(--ink);
  outline-offset: 4px;
  border-radius: 50%;
}
@keyframes ps-wiggle {
  0%, 100% { transform: rotate(var(--tilt)) translateY(-4px) scale(1.05); }
  30% { transform: rotate(calc(var(--tilt) - 5deg)) translateY(-4px) scale(1.06); }
  65% { transform: rotate(calc(var(--tilt) + 4deg)) translateY(-4px) scale(1.06); }
}
.ps-ink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ps-text {
  position: absolute;
  inset: 26% 16% 14%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  text-align: center;
  font-family: 'Courier New', ui-monospace, monospace;
  text-transform: uppercase;
  line-height: 1.05;
}
.ps-pill .ps-text {
  inset: 30% 12% 12%;
}
.ps-code {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.ps-city {
  max-width: 100%;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  overflow-wrap: anywhere; /* long names wrap onto a 2nd line instead of being cut off */
}
.ps-city.sm {
  font-size: 10px;
}
.ps-city.xs {
  font-size: 8.5px;
  letter-spacing: 0.02em;
}
.ps-date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.ps-flag {
  font-size: 11px;
  mix-blend-mode: normal;
}
/* The big ceremony stamp */
.ps.big {
  cursor: default;
  mix-blend-mode: normal;
}
.ps.big:hover,
.ps.big:active {
  transform: rotate(var(--tilt));
  animation: none;
}
.ps.big .ps-code { font-size: 42px; }
.ps.big .ps-city { font-size: 24px; }
.ps.big .ps-city.sm { font-size: 20px; }
.ps.big .ps-city.xs { font-size: 16px; }
.ps.big .ps-date { font-size: 18px; gap: 6px; }
.ps.big .ps-flag { font-size: 22px; }
@media (prefers-reduced-motion: reduce) {
  .ps, .ps:hover { transition: none; animation: none; }
}
</style>
