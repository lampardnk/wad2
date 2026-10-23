<template>
  <!-- A 3D icon for an emoji (Fluent Emoji 3D), falling back to the plain emoji if there's no picture -->
  <img v-if="name && !failed" :src="'/api/icons/' + encodeURIComponent(name)" :width="size" :height="size" alt=""
    class="icon3d" loading="lazy" decoding="async" aria-hidden="true" @error="failed = true">
  <span v-else class="icon3d-text" :style="{ fontSize: Math.round(size * 0.82) + 'px' }" aria-hidden="true">{{ emoji }}</span>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NAMES_3D } from '../icons3d.js'

const props = defineProps({
  emoji: { type: String, required: true }, // e.g. '🎒'
  size: { type: Number, default: 32 }
})
const failed = ref(false)
const name = computed(() => NAMES_3D[props.emoji] || '')
watch(() => props.emoji, () => { failed.value = false })
</script>

<style scoped>
.icon3d {
  display: inline-block;
  flex: none;
  object-fit: contain;
  vertical-align: middle;
  filter: drop-shadow(0 4px 6px rgba(0, 29, 44, 0.14));
}
.icon3d-text {
  display: inline-block;
  line-height: 1;
  vertical-align: middle;
}
</style>
