<template>
  <div class="av-page">
    <!-- /avatar: the Travel Twin studio on its own page (opened from the profile menu's "Travel twin").
         Closing it goes back to wherever you came from.
         (This comment must stay INSIDE the div: a comment beside the root makes it a fragment,
         and the page transition then never finishes, so the next page never shows.) -->
    <AvatarStudio :open="true" @close="leave" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AvatarStudio from '../components/AvatarStudio.vue'

const router = useRouter()

function leave() {
  // Came from another page in the app: go back to it; opened directly: go to Settings
  if (window.history.state && window.history.state.back) router.back()
  else router.push('/settings')
}
</script>

<style scoped>
.av-page {
  min-height: 60vh;
}
</style>
