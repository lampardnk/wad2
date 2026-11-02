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
}

.em-eyes {
  transform-origin: center;
}

.em-scarf-tail {
  transform-origin: 100% 0;
}

.em.peek .em-goggles {
  transform: translateY(30px);
}

.em.peek .em-lens {
  fill: #eef6fb; /* frosted: can't see a thing */
}

.em.peek .em-hand.right {
  transform: translate(-22px, -40px) rotate(-25deg);
}

</style>
