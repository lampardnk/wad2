<template>
  <!-- "Pip", the paper-plane tour guide (our own character): a folded paper plane with a face and an amber scarf.
       mood: idle (floats, scarf flutters) | talk (little bob each new tip) | wave (waggles its wings) | loop (loop-the-loop) -->
  <svg class="pg" :class="'pg-' + mood" :width="size" :height="size * 0.78" viewBox="0 0 120 94" aria-hidden="true" focusable="false">
    <g class="pg-fly">
      <!-- contrail -->
      <path class="pg-trail" d="M6 70c8-2 14-6 20-12M2 80c9-1 16-4 23-9" fill="none" stroke="#8fcbff" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 7" />
      <g class="pg-body" stroke="#12324a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
        <!-- scarf tails (behind the plane) -->
        <g class="pg-tail">
          <path d="M47 53c-6-1-10 2-15 1s-8-4-13-2c2 3 6 5 11 6s9-1 14-1Z" fill="#ff9d4d" />
          <path d="M48 57c-5 2-8 6-13 8s-9 1-12 4c4 1 9 1 13-1s7-5 11-7Z" fill="#ffc94d" />
        </g>
        <!-- folds: top wing, side, underside -->
        <path d="M12 46 112 22 54 54Z" fill="#fffaf0" />
        <path d="M54 54 112 22 62 80Z" fill="#f4e6cc" />
        <path d="M54 54 62 80 48 66Z" fill="#e6d2ae" />
        <!-- scarf round the middle -->
        <path d="M46 52c3-3 9-4 13-1l3 6c-4-1-9 0-13 2Z" fill="#ffc94d" />
      </g>
      <!-- face -->
      <g class="pg-eyes">
        <ellipse cx="75" cy="51" rx="4" ry="5.2" fill="#12324a" />
        <ellipse cx="89" cy="45" rx="3.8" ry="5" fill="#12324a" />
        <circle cx="76.4" cy="49" r="1.5" fill="#fff" />
        <circle cx="90.3" cy="43" r="1.4" fill="#fff" />
      </g>
      <ellipse cx="72" cy="60" rx="4.4" ry="2.6" fill="#ff7a85" opacity="0.55" />
      <ellipse cx="95" cy="52" rx="3.8" ry="2.4" fill="#ff7a85" opacity="0.55" />
      <!-- pilot cap (cap prop): navy crown, black peak, gold badge -->
      <g v-if="cap" stroke="#12324a" stroke-width="2.4" stroke-linejoin="round">
        <path d="M70 31c2-8 12-13 22-12s15 7 14 13Z" fill="#24407a" />
        <path d="M68 32c10-3 26-4 40-1l-1 4c-13-2-26-1-38 2Z" fill="#12324a" />
        <path d="M86 26l3-3 3 3-3 2.4Z" fill="#ffbf3c" stroke-width="1.4" />
      </g>
      <path class="pg-mouth" d="M79.5 57c2.6 3 6.6 2.2 8.4-1.4" fill="none" stroke="#12324a" stroke-width="2.6" stroke-linecap="round" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 96 },
  mood: { type: String, default: 'idle' }, // idle | talk | wave | loop
  cap: { type: Boolean, default: false }    // wears a pilot cap (trip setup)
})
</script>

<style scoped>
.pg {
  display: block;
  overflow: visible;
}
.pg-fly {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: pg-float 3s ease-in-out infinite;
}
.pg-tail {
  transform-box: fill-box;
  transform-origin: 100% 30%;
  animation: pg-flutter 0.5s ease-in-out infinite alternate;
}
.pg-eyes {
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: pg-blink 4.2s infinite;
}
.pg-trail {
  animation: pg-trail 1.2s linear infinite;
}
.pg-talk .pg-fly {
  animation: pg-talk 0.6s cubic-bezier(0.3, 1.6, 0.5, 1), pg-float 3s ease-in-out 0.6s infinite;
}
.pg-wave .pg-fly {
  animation: pg-wave 1s ease-in-out 2, pg-float 3s ease-in-out 2s infinite;
}
.pg-loop .pg-fly {
  transform-origin: 50% 140%;
  animation: pg-loop 1.1s cubic-bezier(0.45, 0, 0.25, 1) 1, pg-float 3s ease-in-out 1.1s infinite;
}
@keyframes pg-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-6px) rotate(2deg); }
}
@keyframes pg-flutter {
  from { transform: rotate(-6deg) scaleY(0.92); }
  to { transform: rotate(8deg) scaleY(1.06); }
}
@keyframes pg-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}
@keyframes pg-trail {
  to { stroke-dashoffset: -16; }
}
@keyframes pg-talk {
  0% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-8px) scale(1.06, 0.95) rotate(-4deg); }
  70% { transform: translateY(0) scale(0.96, 1.04); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes pg-wave {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(-14deg); }
  45% { transform: rotate(12deg); }
  70% { transform: rotate(-8deg); }
}
@keyframes pg-loop {
  0% { transform: rotate(0) scale(1); }
  50% { transform: rotate(-200deg) scale(1.1); }
  100% { transform: rotate(-360deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .pg-fly, .pg-tail, .pg-eyes, .pg-trail { animation: none !important; }
}
</style>
