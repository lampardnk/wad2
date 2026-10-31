<template>
  <!-- Someone's Travel Twin face, or their initial if they haven't made one (or it can't load).
       <TwinFace :user-id="m.id" :version="m.avatarV" :name="m.name" :trip="tripId" /> -->
  <span class="tf" :class="{ pic: !!src && !failed }" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" @error="failed = true">
    <template v-else>{{ text || initial }}</template>
    <slot />
  </span>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { pictureUrl } from '../avatarStore.js'

const props = defineProps({
  userId: { type: [String, Object], default: '' },
  version: { type: Number, default: 0 },
  name: { type: String, default: '?' },
  trip: { type: String, default: '' }, // show this trip's outfit if they made one
  text: { type: String, default: '' }  // shown instead of the initial (e.g. 'KH')
})
const failed = ref(false)
const src = computed(() => pictureUrl(props.userId ? String(props.userId) : '', props.version, props.trip))
const initial = computed(() => (props.name || '?').charAt(0).toUpperCase())
watch(src, () => { failed.value = false })
</script>

<style scoped>
/* Size, colour and border come from the class it's given (e.g. cw-avatar); this only adds the picture */
.tf {
  position: relative;
}
.tf img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}
.tf.pic {
  background: #001d2c !important;
}
</style>
