<template>
  <AuthShell title="Create your account" subtitle="Sign up to start planning trips with your friends."
    bubble="Hi there! Let's get you started."
    :switch-to="{ path: '/login', query: $route.query.redirect ? { redirect: $route.query.redirect } : {} }" switch-label="Sign In">
    <form class="as-form" @submit.prevent="signup" novalidate>
      <label for="name" class="as-label">Your name</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="user" /></span>
        <input id="name" type="text" class="as-input" v-model="name"
          placeholder="Name" autocomplete="name" data-testid="signup-name" required>
      </div>

      <label for="username" class="as-label">Username</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="id" /></span>
        <input id="username" type="text" class="as-input" v-model="username"
          placeholder="Username" autocomplete="username" autocapitalize="none" spellcheck="false"
          data-testid="signup-username" required>
      </div>

      <label for="email" class="as-label">Email</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="mail" /></span>
        <input id="email" type="email" class="as-input" v-model="email"
          placeholder="Email" autocomplete="email" autocapitalize="none" spellcheck="false"
          data-testid="signup-email" required>
      </div>

      <label for="password" class="as-label">Password</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="key" /></span>
        <input id="password" type="password" class="as-input" v-model="password"
          placeholder="At least 8 characters" autocomplete="new-password" data-testid="signup-password" required>
      </div>

      <label for="confirm" class="as-label">Confirm password</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="key" /></span>
        <input id="confirm" type="password" class="as-input" v-model="confirmPassword"
          placeholder="Confirm password" autocomplete="new-password" data-testid="signup-confirm" required>
      </div>

      <p v-if="errorMessage" class="as-error" role="alert" data-testid="signup-error">{{ errorMessage }}</p>

      <button type="submit" class="as-btn" :disabled="loading" data-testid="signup-submit">
        {{ loading ? 'Creating your account…' : 'Sign Up' }}
        <DoodleIcon v-if="!loading" name="plane" :size="24" anim="" />
      </button>
    </form>

    <!-- Already signed up: the second big button -->
    <p class="as-or">Already have an account?</p>
    <router-link :to="{ path: '/login', query: $route.query.redirect ? { redirect: $route.query.redirect } : {} }" class="as-btn2">Sign In</router-link>
  </AuthShell>
</template>

<script>
import axios from 'axios'
import AuthShell from '../components/AuthShell.vue'
import AuthIcon from '../components/AuthIcon.vue'
import DoodleIcon from '../components/DoodleIcon.vue'
import { saveLogin } from '../auth.js'
import { markNewAccount } from '../onboarding.js'

export default {
  components: { AuthShell, AuthIcon, DoodleIcon },
  data() {
    return {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      errorMessage: '',
      loading: false
    }
  },
  methods: {
    async signup() {
      this.errorMessage = ''

      // Check the form before calling the server
      if (!this.name || !this.username || !this.email || !this.password) {
        this.errorMessage = 'Please fill in all fields.'
        return
      }
      // 3-20 characters: letters, numbers, dots and underscores
      if (!/^[a-zA-Z0-9._]{3,20}$/.test(this.username.trim())) {
        this.errorMessage = 'Username must be 3-20 characters: letters, numbers, . or _ only.'
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
        this.errorMessage = 'Please enter a valid email.'
        return
      }
      if (this.password.length < 8) {
        this.errorMessage = 'Password must be at least 8 characters.'
        return
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.'
        return
      }

      this.loading = true
      try {
        const res = await axios.post('/api/auth/register', {
          name: this.name,
          username: this.username.trim(),
          email: this.email.trim(),
          password: this.password
        })
        // Account created: the server also logs them in, so go straight in
        // (to the page they came for, e.g. an invite link, otherwise their trips)
        saveLogin(res.data.token, res.data.user)
        markNewAccount(res.data.user.id) // Home will suggest setting up food needs etc. in Settings
        this.$router.push(this.$route.query.redirect || '/home')
      } catch (err) {
        // Show the server's message if it sent one, otherwise a general one
        if (err.response && err.response.data && err.response.data.message) {
          this.errorMessage = err.response.data.message
        } else {
          this.errorMessage = 'Cannot reach the server. Make sure it is running (cd server, then pnpm dev).'
        }
      }
      this.loading = false
    }
  }
}
</script>
