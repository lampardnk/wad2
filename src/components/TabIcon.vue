<template>
  <!-- 15px line icons (Lucide shapes); they use the text colour of whatever they sit in -->
  <svg class="tab-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 15 }
})

const ICONS = {
  // calendar
  itinerary: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01', 'M8 18h.01', 'M12 18h.01'],
  // map pin
  places: ['M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0', 'M12 7a3 3 0 1 0 0 6 3 3 0 1 0 0-6'],
  // backpack
  packing: ['M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M8 10h8', 'M8 18h8', 'M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6', 'M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'],
  // wallet
  expenses: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
  // camera
  photos: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z', 'M12 10a3 3 0 1 0 0 6 3 3 0 1 0 0-6'],
  // shield
  safety: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  // users
  crew: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  // hamburger
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  // three dots
  more: ['M5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3', 'M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3', 'M19 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3'],
  // folded map
  recap: ['M9 3 3 5.5v15.5l6-2.5 6 2.5 6-2.5V3l-6 2.5z', 'M9 3v15.5', 'M15 5.5V21'],
  // train
  travelOptions: ['M8 3h8a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a4 4 0 0 1 4-4z', 'M4 11h16', 'M12 3v8', 'M8 19l-2 3', 'M18 22l-2-3', 'M8 15h.01', 'M16 15h.01']
}

const paths = computed(() => ICONS[props.name] || ICONS.places)
</script>

<style scoped>
.tab-icon {
  flex: none;
  display: block;
}
</style>
