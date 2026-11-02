<template>
  <div class="pl-app">
    <!-- Full-width playful navbar: brand (just the name, not a link) and the profile menu -->
    <nav v-if="!$route.meta.hideNav" class="pl-nav" aria-label="Main">
      <span class="pl-brand">
        <span class="pl-brand-mark"><DoodleIcon name="plane" :size="28" tint="cream" /></span>
        Chui-se Your Trip
      </span>
      <!-- Profile button + account menu -->
      <UserProfileMenu v-if="auth.user" />
    </nav>
    <!-- Login/signup pages use the full screen; other pages sit in the container -->
    <router-view v-if="$route.meta.hideNav" />
    <div v-else class="pl-shell">
      <router-view :key="$route.path" />
    </div>
    <!-- Friends drawer, opened from the profile menu -->
    <FriendsDrawer v-if="auth.token" />
    <!-- Errors with "Try again", and the "can't reach the server" bar -->
    <AppToast />
    <!-- The app is open in another tab of this browser: this one is paused (see singleTab.js) -->
    <div v-if="!tab.active" class="tab-paused" role="alertdialog" aria-modal="true" aria-labelledby="tab-paused-title">
      <div class="tab-paused-card">
        <h2 id="tab-paused-title">Open in another tab</h2>
        <p>Chui-se Your Trip is open in another tab of this browser. To keep your changes safe, only one tab can be used at a time.</p>
        <button type="button" class="pl-btn" @click="useHere">Use here</button>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from './auth.js'
import UserProfileMenu from './components/UserProfileMenu.vue'
import FriendsDrawer from './components/FriendsDrawer.vue'
import AppToast from './components/AppToast.vue'
import DoodleIcon from './components/DoodleIcon.vue'
import { startFriends, stopFriends } from './friends.js'
import { tab } from './singleTab.js'

export default {
  name: 'App',
  components: { UserProfileMenu, FriendsDrawer, AppToast, DoodleIcon },
  data() {
    return { auth, tab }
  },
  methods: {
    // Reload: a freshly loaded tab takes over (singleTab.js) and shows the latest data
    useHere() {
      window.location.reload()
    }
  },
  watch: {
    // Logged in: count friend requests and show me as online to my friends
    'auth.token': {
      handler(token) {
        if (token) startFriends()
        else stopFriends()
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
/* Covers the whole page while another tab is in use */
.tab-paused {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 29, 44, 0.55);
}
.tab-paused-card {
  max-width: 420px;
  padding: 28px;
  border-radius: 24px;
  background: #fffaf0;
  color: var(--app-ink);
  text-align: center;
  box-shadow: 0 22px 50px -18px rgba(18, 50, 74, 0.5);
}
.tab-paused-card h2 {
  font-size: 1.5rem;
  margin-bottom: 8px;
}
.tab-paused-card p {
  margin-bottom: 18px;
}
</style>
