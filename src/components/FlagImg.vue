<template>
  <!-- A country flag as a small rounded picture (from our server, /api/flag/jp.svg), not an emoji,
       so it looks the same on every device. Unknown country: a little map pin instead. -->
  <img v-if="code && !failed" class="fl" :src="'/api/flag/' + code.toLowerCase() + '.svg'" :width="size * 1.4" :height="size"
    alt="" loading="lazy" @error="failed = true">
  <DoodleIcon v-else name="pin" :size="size + 2" anim="" />
</template>

<script setup>
import { ref, watch } from 'vue'
import DoodleIcon from './DoodleIcon.vue'

const props = defineProps({
  code: { type: String, default: '' }, // two letters, e.g. 'JP'
  size: { type: Number, default: 14 }   // height in px
})
const failed = ref(false)
watch(() => props.code, () => { failed.value = false })
</script>

<style scoped>
.fl {
  display: inline-block;
  flex: none;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 0 0 1.5px #12324a; /* the same ink outline as the doodles */
  vertical-align: middle;
}
</style>
