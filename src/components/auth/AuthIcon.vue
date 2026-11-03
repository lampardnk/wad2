<template>
  <!-- Doodle-style icons for the sign-in fields (navy ink, a touch of amber), same weight as DoodleIcon.
       <AuthIcon name="id" />  name: id | key | user | mail | code -->
  <svg class="ai" :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" focusable="false"
    fill="none" stroke="#12324a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- explorer ID badge: a card with a clip, a face and two lines -->
    <template v-if="name === 'id'">
      <rect x="6" y="7" width="20" height="21" rx="4" fill="#fff3dc" />
      <path d="M12.5 4h7v5h-7Z" fill="#ffc94d" />
      <circle cx="16" cy="15" r="3.4" fill="#8fcbff" />
      <path d="M10.5 23.5c1-2.6 3-3.8 5.5-3.8s4.5 1.2 5.5 3.8" />
    </template>
    <!-- vintage brass key -->
    <template v-else-if="name === 'key'">
      <circle cx="10" cy="12" r="6" fill="#ffc94d" />
      <circle cx="10" cy="12" r="2" fill="#fff3dc" />
      <path d="M14.5 15.5 26 27M21 22l2.6-2.6M24 25l2.4-2.4" />
    </template>
    <!-- a traveller -->
    <template v-else-if="name === 'user'">
      <circle cx="16" cy="11" r="5" fill="#ffc94d" />
      <path d="M6.5 27c1.2-5 4.8-8 9.5-8s8.3 3 9.5 8Z" fill="#8fcbff" />
    </template>
    <!-- an envelope -->
    <template v-else-if="name === 'mail'">
      <rect x="4.5" y="8" width="23" height="17" rx="3.5" fill="#fff3dc" />
      <path d="m5.5 10 10.5 8 10.5-8" />
      <path d="M21 21.5h3" stroke="#d94b5b" />
    </template>
    <!-- a 6-digit code on a ticket -->
    <template v-else>
      <path d="M4.5 10a2.5 2.5 0 0 0 0 5v0a2.5 2.5 0 0 1 0 5v3h23v-3a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 0 0-5V7h-23Z" fill="#ffc94d" />
      <path d="M11 15h.01M16 15h.01M21 15h.01" stroke-width="3.2" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, default: 'id' },
  size: { type: Number, default: 24 }
})
</script>

<style scoped>
.ai {
  display: block;
  flex: none;
}
</style>
