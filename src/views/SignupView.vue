<template>
  <div class="auth-page">
    <AuthHero />

    <div class="auth-card">
      <div class="auth-sheet">
        <h1 class="auth-title">Create your account</h1>
        <p class="auth-subtitle">Plan trips together with friends and family.</p>

        <form @submit.prevent="signup" novalidate>
          <label for="name" class="visually-hidden">Name</label>
          <input id="name" type="text" class="auth-input" v-model="name"
            placeholder="Name" autocomplete="name" data-testid="signup-name" required>

          <label for="username" class="visually-hidden">Username</label>
          <input id="username" type="text" class="auth-input" v-model="username"
            placeholder="Username" autocomplete="username" autocapitalize="none" spellcheck="false"
            data-testid="signup-username" required>

          <label for="email" class="visually-hidden">Email</label>
          <input id="email" type="email" class="auth-input" v-model="email"
            placeholder="Email" autocomplete="email" autocapitalize="none" spellcheck="false"
            data-testid="signup-email" required>

          <label for="password" class="visually-hidden">Password</label>
          <input id="password" type="password" class="auth-input" v-model="password"
            placeholder="Password (min. 8 characters)" autocomplete="new-password" data-testid="signup-password" required>

          <label for="confirm" class="visually-hidden">Confirm password</label>
          <input id="confirm" type="password" class="auth-input" v-model="confirmPassword"
            placeholder="Confirm password" autocomplete="new-password" data-testid="signup-confirm" required>

          <p v-if="errorMessage" class="auth-error" role="alert" data-testid="signup-error">{{ errorMessage }}</p>

          <button type="submit" class="auth-btn" :disabled="loading" data-testid="signup-submit">
            {{ loading ? 'Creating account…' : 'Sign Up' }}
          </button>
        </form>

        <hr class="auth-divider">

        <p class="auth-switch">
          Already have an account? <router-link to="/login" class="auth-link">Sign In</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import AuthHero from '../components/AuthHero.vue'

export default {
  components: { AuthHero },
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
        await axios.post('/api/auth/register', {
          name: this.name,
          username: this.username.trim(),
          email: this.email.trim(),
          password: this.password
        })
        // Account created: send them to the login page with a success message
        this.$router.push({ path: '/login', query: { registered: 'true', username: this.username.trim().toLowerCase() } })
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
