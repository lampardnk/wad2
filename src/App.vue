<template>
  <div class="pl-app">
    <!-- Full-width playful navbar: brand (just the name, not a link) and the profile menu -->
    <nav v-if="!$route.meta.hideNav" class="pl-nav" aria-label="Main">
      <span class="pl-brand">
        <span class="pl-brand-mark"><DoodleIcon name="plane" :size="28" tint="cream" anim="float" /></span>
        Chui-se Your Trip
      </span>
      <!-- Profile button + account menu -->
      <UserProfileMenu v-if="auth.user" />
    </nav>
    <!-- Login/signup pages use the full screen; other pages sit in the container -->
    <router-view v-if="$route.meta.hideNav" />
    <div v-else class="pl-shell">
      <!-- Pages fade and slide in when you open a trip or go back -->
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </div>
    <!-- Friends drawer, opened from the profile menu -->
    <FriendsDrawer v-if="auth.token" />
    <!-- "New gear unlocked!" for your Travel Twin (once, when your trips earn something new) -->
    <TwinCelebration v-if="auth.token" />
    <!-- Errors with "Try again", and the "can't reach the server" bar -->
    <AppToast />
  </div>
</template>

<script>
import { auth } from './auth.js'
import UserProfileMenu from './components/UserProfileMenu.vue'
import FriendsDrawer from './components/FriendsDrawer.vue'
import AppToast from './components/AppToast.vue'
import TwinCelebration from './components/TwinCelebration.vue'
import DoodleIcon from './components/DoodleIcon.vue'
import { startFriends, stopFriends } from './friends.js'

export default {
  name: 'App',
  components: { UserProfileMenu, FriendsDrawer, AppToast, TwinCelebration, DoodleIcon },
  data() {
    return { auth }
  },
  watch: {
    // Logged in: count friend requests and show me as online to my friends
    'auth.token': {
      handler(token) {
        if (token) startFriends()
        else stopFriends()
      },
      immediate: true
    },
    $route: {
      handler(to) {
        // Pages with meta.dark (Settings) get a dark page background straight away,
        // instead of waiting for the page fade-in to finish
        document.body.classList.toggle('dark-page', !!to.meta.dark)
      },
      immediate: true
    }
  }
}
</script>

