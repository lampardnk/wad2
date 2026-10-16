<template>
  <div>
    <nav v-if="!$route.meta.hideNav" class="navbar navbar-dark bg-dark px-4 py-2 mb-4">
      <router-link to="/home" class="navbar-brand fw-bold text-decoration-none text-white">
        Chui-se Your Trip
      </router-link>
      <!-- Profile button + account menu (trip crew and code while a trip is open) -->
      <UserProfileMenu v-if="auth.user" />
    </nav>
    <!-- Login/signup pages use the full screen; other pages sit in the container -->
    <router-view v-if="$route.meta.hideNav" />
    <div v-else class="container">
      <!-- Pages fade and slide in when you open a trip or go back -->
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </div>
    <!-- Friends drawer, opened from the profile menu -->
    <FriendsDrawer v-if="auth.token" />
  </div>
</template>

<script>
import { auth } from './auth.js'
import UserProfileMenu from './components/UserProfileMenu.vue'
import FriendsDrawer from './components/FriendsDrawer.vue'
import { startFriends, stopFriends } from './friends.js'

export default {
  name: 'App',
  components: { UserProfileMenu, FriendsDrawer },
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

