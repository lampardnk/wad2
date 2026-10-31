<template>
  <!-- A hand-drawn icon: a soft colour blob under a chunky ink outline (see doodles.js).
       <DoodleIcon name="plane" :size="28" anim="wiggle" />
       anim: wiggle | bounce | float (plays when the icon, or the button/link it sits in, is hovered) -->
  <svg class="dz" :class="anim ? 'dz-' + anim : ''" :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <g v-if="d" :transform="'translate(1.2 1.2)'" :fill="fillColor" stroke="none">
      <path v-for="(p, i) in d.fill" :key="'f' + i" :d="p" opacity="0.95" />
    </g>
    <g v-if="d" :fill="'none'" :stroke="ink" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round">
      <path v-for="(s, i) in d.spots || []" :key="'s' + i" :d="s.d" :fill="TINTS[s.c]" stroke="none" />
      <path v-for="(p, i) in d.line" :key="'l' + i" :d="p" />
      <path v-for="(p, i) in d.dashes || []" :key="'d' + i" :d="p" stroke-dasharray="0.1 3.2" :stroke-width="stroke * 1.1" />
      <circle v-for="(c, i) in d.dots || []" :key="'c' + i" :cx="c[0]" :cy="c[1]" :r="c[2]" :fill="ink" stroke="none" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { DOODLES, TINTS, INK } from '../doodles.js'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 24 },
  tint: { type: String, default: '' },      // override the blob colour: amber | sunset | teal | sky | lilac | cream
  anim: { type: String, default: 'wiggle' }, // '' for none
  light: { type: Boolean, default: false }   // on dark backgrounds: cream ink instead of navy
})
const d = computed(() => DOODLES[props.name] || null)
const fillColor = computed(() => TINTS[props.tint || (d.value && d.value.tint) || 'amber'])
const ink = computed(() => (props.light ? '#fff6e6' : INK))
const stroke = computed(() => (props.size <= 18 ? 2.4 : 2.1)) // small icons get slightly bolder lines
</script>

<style scoped>
.dz {
  display: inline-block;
  flex: none;
  overflow: visible;
  transform-origin: 50% 60%;
  vertical-align: middle;
}
/* Play on hover of the icon itself or the button / link / card it's inside */
.dz-wiggle:hover,
:is(a, button, label, [role='button'], .dz-hover):hover > .dz-wiggle,
:is(a, button, label, [role='button'], .dz-hover):hover .dz-wiggle {
  animation: dz-wiggle 0.55s ease-in-out;
}
.dz-bounce:hover,
:is(a, button, label, [role='button'], .dz-hover):hover .dz-bounce {
  animation: dz-bounce 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.dz-float {
  animation: dz-float 3.2s ease-in-out infinite;
}
@keyframes dz-wiggle {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(-12deg) scale(1.08); }
  45% { transform: rotate(10deg) scale(1.08); }
  70% { transform: rotate(-5deg); }
}
@keyframes dz-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-5px) scale(1.06, 0.95); }
  55% { transform: translateY(0) scale(0.94, 1.06); }
  75% { transform: translateY(-2px); }
}
@keyframes dz-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-3px) rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .dz, .dz:hover, :hover > .dz, :hover .dz { animation: none !important; }
}
</style>
