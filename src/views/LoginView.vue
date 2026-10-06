<template>
  <div class="auth-page">
    <AuthHero />

    <div class="auth-card">
      <div class="auth-sheet">
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-subtitle">Log in to plan smarter trips and skip the crowds.</p>

        <p v-if="$route.query.registered" class="auth-success" data-testid="login-registered">
          Account created! Please sign in.
        </p>

        <form @submit.prevent="login" novalidate>
          <label for="username" class="visually-hidden">Username</label>
          <input id="username" type="text" class="auth-input" v-model="username"
            placeholder="Username" autocomplete="username" autocapitalize="none" spellcheck="false"
            data-testid="login-username" required>

          <label for="password" class="visually-hidden">Password</label>
          <input id="password" type="password" class="auth-input" v-model="password"
            placeholder="Password" autocomplete="current-password" data-testid="login-password" required>

          <p v-if="errorMessage" class="auth-error" role="alert" data-testid="login-error">{{ errorMessage }}</p>

          <button type="submit" class="auth-btn" :disabled="loading" data-testid="login-submit">
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <hr class="auth-divider">

        <p class="auth-switch">
          Don't have an account? <router-link to="/signup" class="auth-link">Sign Up</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import AuthHero from '../components/AuthHero.vue'
import { saveLogin } from '../auth.js'

export default {
  components: { AuthHero },
  data() {
    return {
      username: this.$route.query.username || '',
      password: '',
      errorMessage: '',
      loading: false
    }
  },
  methods: {
    async login() {
      this.errorMessage = ''
      if (!this.username || !this.password) {
        this.errorMessage = 'Please enter your username and password.'
        return
      }

      this.loading = true
      try {
        const res = await axios.post('/api/auth/login', {
          username: this.username.trim(),
          password: this.password
        })
        saveLogin(res.data.token, res.data.user)
        // Go to the page they originally wanted, otherwise the homepage
        this.$router.push(this.$route.query.redirect || '/')
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
