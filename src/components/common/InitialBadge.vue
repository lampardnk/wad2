<template>
  <!-- A person's initial in a round badge. Size and colour come from the class it's given (e.g. cw-avatar).
       <InitialBadge :name="m.name" /> -->
  <span class="tf" aria-hidden="true">
    {{ text || initial }}
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '?' },
  text: { type: String, default: '' } // shown instead of the initial (e.g. 'KH')
})
const initial = computed(() => (props.name || '?').charAt(0).toUpperCase())
</script>

<style scoped>
.tf {
  position: relative;
}
</style>
