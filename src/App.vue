<template>
  <div>
    <nav v-if="!$route.meta.hideNav" class="navbar navbar-dark bg-dark px-4 py-2 mb-4">
      <router-link to="/" class="navbar-brand fw-bold text-decoration-none text-white">
        Chui-se Your Trip
      </router-link>
      <div v-if="auth.user" class="d-flex align-items-center gap-3">
        <span class="text-white-50" data-testid="nav-user">Hi, {{ auth.user.name }}</span>
        <button class="btn btn-outline-light btn-sm" @click="handleLogout" data-testid="logout-btn">Log out</button>
      </div>
    </nav>
    <!-- Login/signup pages use the full screen; other pages sit in the container -->
    <router-view v-if="$route.meta.hideNav" />
    <div v-else class="container">
      <router-view />
    </div>
  </div>
</template>

<script>
import { auth, logout } from './auth.js'

export default {
  name: 'App',
  data() {
    return { auth }
  },
  methods: {
    handleLogout() {
      logout()
      this.$router.push('/login')
    }
  }
}
</script>
