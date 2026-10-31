<template>
  <!-- Our explorer: a cartoon kid in an aviator cap, goggles and a scarf, peeking over the edge of a card
       (the hands at the bottom of the drawing grip the card's top edge).
       peek = true: goggles come down over the eyes (frosted), a hand comes up to hold them, and every couple of
       seconds the left lens clears for a cheeky peek.
       cheer = true (when tapped): he jumps, waves, and his goggles bounce.
       <ExplorerMascot :peek="passwordFocused" :cheer="tapped" /> -->
  <svg class="em" :class="{ peek, cheer }" viewBox="0 0 150 140" :width="size" :height="size * 140 / 150" aria-hidden="true" focusable="false">
    <g stroke="#12324a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <!-- the head bobs gently (breathing); the hands stay gripping the card -->
      <g class="em-head">
        <!-- scarf tail, fluttering -->
        <path class="em-scarf-tail" d="M40 108c-12 4-18 14-30 12l4 9c12 2 20-8 30-14Z" fill="#ff9d4d" />
        <!-- ear flaps of the cap -->
        <path d="M28 60c-6 8-8 22-5 36 1 6 10 6 12 0l3-30Z" fill="#2fa7b8" />
        <path d="M96 60c6 8 8 22 5 36-1 6-10 6-12 0l-3-30Z" fill="#2fa7b8" />
        <!-- face -->
        <ellipse cx="62" cy="76" rx="31" ry="31" fill="#ffd9b8" />
        <ellipse cx="42" cy="88" rx="6.5" ry="4" fill="#ff8f9c" opacity="0.6" stroke="none" />
        <ellipse cx="82" cy="88" rx="6.5" ry="4" fill="#ff8f9c" opacity="0.6" stroke="none" />
        <!-- eyes (blink) -->
        <g class="em-eyes" stroke="none">
          <ellipse cx="51" cy="76" rx="4" ry="5.2" fill="#12324a" />
          <ellipse cx="73" cy="76" rx="4" ry="5.2" fill="#12324a" />
          <circle cx="52.4" cy="74" r="1.5" fill="#fff" />
          <circle cx="74.4" cy="74" r="1.5" fill="#fff" />
        </g>
        <!-- nose and smile -->
        <ellipse cx="62" cy="84" rx="6" ry="5" fill="#f4a07a" stroke-width="2.4" />
        <path d="M53 94q9 8 18 0" fill="none" stroke-width="2.6" />
        <!-- the cap -->
        <path d="M29 66c0-28 15-41 33-41s33 13 33 41c-8-9-19-13-33-13s-25 4-33 13Z" fill="#2fa7b8" />
        <path d="M62 26v26" fill="none" stroke="#1d7f8e" stroke-width="2.4" />
        <path d="M36 42c4-6 9-10 15-12" fill="none" stroke="#9fe3ea" stroke-width="3" />
        <!-- goggles: on the forehead, or pulled down over the eyes -->
        <g class="em-goggles">
          <path d="M28 50q34-14 68 0" fill="none" stroke="#8a5a2b" stroke-width="5" />
          <circle cx="50" cy="46" r="10.5" fill="#c98a4a" />
          <circle cx="74" cy="46" r="10.5" fill="#c98a4a" />
          <path d="M60 46h4" fill="none" stroke-width="3" />
          <circle class="em-lens left" cx="50" cy="46" r="6.6" fill="#bfe6ff" stroke-width="2" />
          <circle class="em-lens" cx="74" cy="46" r="6.6" fill="#bfe6ff" stroke-width="2" />
          <path d="M46 43l3-2M70 43l3-2" fill="none" stroke="#fff" stroke-width="2" />
        </g>
        <!-- scarf round the neck -->
        <path d="M36 104q26 13 52 0l1 9q-27 14-54 0Z" fill="#ffbf3c" />
        <path d="M44 107l2 8M58 110v8M72 109l-1 8" fill="none" stroke="#e09a1c" stroke-width="2" />
      </g>
      <!-- hands gripping the card's top edge (the right one comes up to hold the goggles when peeking) -->
      <g v-if="hands" class="em-hand left">
        <path d="M10 104c0-7 5-11 11-11s11 4 11 11v14H10Z" fill="#ffd9b8" />
        <path d="M17 108v10M24 108v10" fill="none" stroke-width="2.2" />
      </g>
      <g v-if="hands" class="em-hand right">
        <path d="M100 104c0-7 5-11 11-11s11 4 11 11v14h-22Z" fill="#ffd9b8" />
        <path d="M107 108v10M114 108v10" fill="none" stroke-width="2.2" />
      </g>
    </g>
  </svg>
</template>

<script setup>
defineProps({
  peek: { type: Boolean, default: false },  // a password box has focus
  cheer: { type: Boolean, default: false }, // just tapped: jump and wave
  hands: { type: Boolean, default: true },  // false = just his head (e.g. in a round avatar)
  size: { type: Number, default: 150 }
})
</script>

<style scoped>
.em {
  display: block;
  overflow: visible;
}
.em * {
  transform-box: fill-box;
}
/* idle: the head breathes, the eyes blink, the scarf flutters */
.em-head {
  transform-box: view-box;
  animation: em-breathe 3.4s ease-in-out infinite;
}
@keyframes em-breathe {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-3px) rotate(-1.5deg); }
}
.em-eyes {
  transform-origin: center;
  animation: em-blink 4.5s infinite;
}
@keyframes em-blink {
  0%, 93%, 100% { transform: scaleY(1); }
  96% { transform: scaleY(0.1); }
}
.em-scarf-tail {
  transform-origin: 100% 0;
  animation: em-flutter 0.6s ease-in-out infinite alternate;
}
@keyframes em-flutter {
  from { transform: rotate(-6deg); }
  to { transform: rotate(8deg); }
}
/* goggles: slide down over the eyes when peeking */
.em-goggles {
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.em.peek .em-goggles {
  transform: translateY(30px);
}
.em-lens {
  transition: fill 0.3s;
}
.em.peek .em-lens {
  fill: #eef6fb; /* frosted: can't see a thing */
}
/* ...except the left lens clears for a quick peek every couple of seconds */
.em.peek .em-lens.left {
  animation: em-peek 2.4s ease-in-out 0.6s infinite;
}
@keyframes em-peek {
  0%, 55%, 100% { fill: #eef6fb; }
  65%, 85% { fill: rgba(191, 230, 255, 0.15); }
}
/* the right hand comes up to hold the goggles */
.em-hand {
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.em.peek .em-hand.right {
  transform: translate(-22px, -40px) rotate(-25deg);
}
/* tapped: a happy jump (squash, stretch, land), a wave, and the goggles bounce */
.em.cheer .em-head {
  animation: em-jump 0.8s cubic-bezier(0.34, 1.4, 0.64, 1);
}
@keyframes em-jump {
  0% { transform: translateY(0) scale(1, 1); }
  20% { transform: translateY(4px) scale(1.06, 0.92); }
  45% { transform: translateY(-18px) scale(0.95, 1.06) rotate(-4deg); }
  70% { transform: translateY(0) scale(1.05, 0.95) rotate(2deg); }
  100% { transform: translateY(0) scale(1, 1); }
}
.em.cheer .em-goggles {
  animation: em-goggle-bounce 0.8s ease-out;
}
@keyframes em-goggle-bounce {
  30% { transform: translateY(-6px) rotate(-6deg); }
  60% { transform: translateY(2px) rotate(4deg); }
}
.em.cheer:not(.peek) .em-hand.right {
  animation: em-wave 1s ease-in-out;
}
@keyframes em-wave {
  0% { transform: translate(0, 0) rotate(0); }
  20% { transform: translate(8px, -46px) rotate(18deg); }
  40% { transform: translate(8px, -46px) rotate(-14deg); }
  60% { transform: translate(8px, -46px) rotate(18deg); }
  80% { transform: translate(8px, -46px) rotate(-8deg); }
  100% { transform: translate(0, 0) rotate(0); }
}
.em.cheer .em-eyes {
  animation: em-happy 0.8s ease-out; /* happy squint */
}
@keyframes em-happy {
  20%, 70% { transform: scaleY(0.35); }
}
@media (prefers-reduced-motion: reduce) {
  .em-head, .em-eyes, .em-scarf-tail, .em.peek .em-lens.left, .em.cheer .em-head, .em.cheer .em-goggles, .em.cheer .em-hand.right, .em.cheer .em-eyes { animation: none; }
}
</style>
