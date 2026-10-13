import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TripView from '../views/TripView.vue'
import LoginView from '../views/LoginView.vue'
import SignupView from '../views/SignupView.vue'
import TripSetupView from '../views/TripSetupView.vue'
import JoinView from '../views/JoinView.vue'
import SettingsView from '../views/SettingsView.vue'
import { auth } from '../auth.js'

const routes = [
  { path: '/', name: 'Home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: SettingsView, meta: { requiresAuth: true, dark: true } },
  { path: '/trip/:id', name: 'Trip', component: TripView, props: true, meta: { requiresAuth: true } },
  // New trips: step 1 = invite, step 2 = wishlist, step 3 = vote, then the trip page
  { path: '/trip/:id/setup/:step(invite|wishlist|vote)', name: 'TripSetup', component: TripSetupView, props: true, meta: { requiresAuth: true } },
  // Invite links: /join/<code>
  { path: '/join/:code', name: 'Join', component: JoinView, props: true, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: LoginView, meta: { hideNav: true } },
  { path: '/signup', name: 'Signup', component: SignupView, meta: { hideNav: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Before every page change: send logged-out users to /login
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // Logged-in users don't need the login/signup pages
  if ((to.path === '/login' || to.path === '/signup') && auth.token) {
    return '/'
  }
})

export default router
