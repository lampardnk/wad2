<template>
  <!-- Flat portrait of one crew skin (used on its card in the Travel Twin studio) -->
  <svg class="cp" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient :id="'bg-' + c.id" cx="50%" cy="38%" r="65%">
        <stop offset="0%" :stop-color="c.accent" stop-opacity="0.55" />
        <stop offset="100%" :stop-color="c.tint" />
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="96" :fill="'url(#bg-' + c.id + ')'" />

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
      <path d="M46 78c18 6 36 8 54 8s36-2 54-8" fill="none" :stroke="c.accent" stroke-width="3" stroke-linecap="round" />
      <circle cx="100" cy="64" r="6" :fill="c.accent" />
    </g>
    <g v-if="L.hat === 'bandana'">
      <path d="M54 90c4-26 22-42 46-42s42 16 46 42c-14-7-30-9-46-9s-32 2-46 9z" :fill="L.hatColor" />
      <path d="M142 80l18 4-8 15z" :fill="L.hatColor" />
      <circle cx="80" cy="66" r="2.5" fill="#fff" opacity="0.7" /><circle cx="104" cy="60" r="2.5" fill="#fff" opacity="0.7" /><circle cx="124" cy="70" r="2.5" fill="#fff" opacity="0.7" />
    </g>
    <g v-if="L.hat === 'beanie'">
      <path d="M54 92c0-30 20-50 46-50s46 20 46 50z" :fill="L.hatColor" />
      <rect x="52" y="82" width="96" height="14" rx="7" :fill="c.accent" opacity="0.9" />
      <circle cx="100" cy="40" r="8" :fill="c.accent" />
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
      <rect x="122" y="168" width="18" height="18" rx="4" :fill="c.accent" />
      <path d="M131 171v12M125 177h12" stroke="#fff" stroke-width="3" stroke-linecap="round" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ c: { type: Object, required: true } }) // a CREW entry from avatarStore.js
const L = computed(() => props.c.portrait)
</script>

<style scoped>
.cp {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
