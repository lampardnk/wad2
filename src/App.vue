<template>
  <div>
    <nav v-if="!$route.meta.hideNav" class="navbar navbar-dark bg-dark px-4 py-2 mb-4">
      <router-link to="/" class="navbar-brand fw-bold text-decoration-none text-white">
        Chui-se Your Trip
      </router-link>
      <!-- Profile icon: click for your name and Log out -->
      <div v-if="auth.user" class="profile">
        <button type="button" class="profile-btn" :aria-expanded="menuOpen" aria-haspopup="true"
          :aria-label="'Account: ' + auth.user.name" :title="auth.user.name" @click="menuOpen = !menuOpen" data-testid="nav-user">
          {{ auth.user.name.charAt(0).toUpperCase() }}
        </button>
        <div v-if="menuOpen" class="profile-menu" role="menu" @keydown.esc="menuOpen = false">
          <div class="profile-who">
            <span class="profile-btn big" aria-hidden="true">{{ auth.user.name.charAt(0).toUpperCase() }}</span>
            <span>
              <strong class="d-block">{{ auth.user.name }}</strong>
              <span class="profile-handle">@{{ auth.user.username }}</span>
            </span>
          </div>
          <router-link to="/settings" class="profile-item settings" role="menuitem" data-testid="settings-link">⚙︎ Settings</router-link>
          <button type="button" class="profile-item" role="menuitem" @click="handleLogout" data-testid="logout-btn">↪ Log out</button>
        </div>
      </div>
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
  </div>
</template>

<script>
import { auth, logout } from './auth.js'

export default {
  name: 'App',
  data() {
    return { auth, menuOpen: false }
  },
  mounted() {
    document.addEventListener('click', this.closeMenu)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMenu)
  },
  watch: {
    // Close it when changing page
    $route: {
      handler(to) {
        this.menuOpen = false
        // Pages with meta.dark (Settings) get a dark page background straight away,
        // instead of waiting for the page fade-in to finish
        document.body.classList.toggle('dark-page', !!to.meta.dark)
      },
      immediate: true
    }
  },
  methods: {
    // Close the menu when clicking anywhere else
    closeMenu(e) {
      if (!e.target.closest('.profile')) this.menuOpen = false
    },
    handleLogout() {
      this.menuOpen = false
      logout()
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.profile {
  position: relative;
}
.profile-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  background: linear-gradient(135deg, #0b7f5f, #2fe0a1);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, transform 0.15s;
}
.profile-btn:hover {
  border-color: #6ff2bd;
  transform: scale(1.05);
}
.profile-btn:focus-visible {
  outline: 3px solid #6ff2bd;
  outline-offset: 2px;
}
.profile-btn.big {
  width: 40px;
  height: 40px;
  border: 0;
  flex-shrink: 0;
}
.profile-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 1100;
  min-width: 220px;
  background: #fff;
  color: #1f2d2a;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
  animation: profile-in 0.15s ease;
}
.profile-who {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 12px;
  border-bottom: 1px solid #eef2f1;
  margin-bottom: 6px;
}
.profile-handle {
  font-size: 13px;
  color: #5f6f6b;
}
.profile-item {
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  border-radius: 10px;
  padding: 9px 10px;
  font-weight: 600;
  color: #c0392b;
}
.profile-item:hover,
.profile-item:focus-visible {
  background: #fdecec;
  outline: none;
}
.profile-item.settings {
  display: block;
  color: #1f2d2a;
  text-decoration: none;
}
.profile-item.settings:hover,
.profile-item.settings:focus-visible {
  background: #eef6f3;
}
@keyframes profile-in {
  from { opacity: 0; transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .profile-menu { animation: none; }
}
</style>
