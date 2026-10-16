<template>
  <AuthShell title="Welcome back, explorer" :subtitle="invited ? 'Log in to join the trip you were invited to.' : 'Log in to pick up where you left off.'"
    :switch-to="{ path: '/signup', query: $route.query.redirect ? { redirect: $route.query.redirect } : {} }" switch-label="Sign up">
    <p v-if="$route.query.registered" class="as-success" data-testid="login-registered">Account created! Log in to start planning.</p>

    <form class="as-form" @submit.prevent="login" novalidate>
      <label for="username" class="visually-hidden">Username or email</label>
      <input id="username" type="text" class="as-input" v-model="username"
        placeholder="Username or email" autocomplete="username" autocapitalize="none" spellcheck="false"
        data-testid="login-username" required>

      <label for="password" class="visually-hidden">Password</label>
      <input id="password" type="password" class="as-input" v-model="password"
        placeholder="Password" autocomplete="current-password" data-testid="login-password" required>

      <p v-if="errorMessage" class="as-error" role="alert" data-testid="login-error">{{ errorMessage }}</p>

      <button type="submit" class="as-btn" :disabled="loading" data-testid="login-submit">
        {{ loading ? 'Logging in…' : "Let's go!" }}
      </button>
    </form>

    <p class="as-or">New here?</p>
    <p class="as-foot">
      <router-link :to="{ path: '/signup', query: $route.query.redirect ? { redirect: $route.query.redirect } : {} }">Create an account</router-link> to start planning with your crew.
    </p>
  </AuthShell>
</template>

<script>
import axios from 'axios'
import AuthShell from '../components/AuthShell.vue'
import { saveLogin } from '../auth.js'

export default {
  components: { AuthShell },
  data() {
    return {
      username: this.$route.query.username || '',
      password: '',
      errorMessage: '',
      loading: false
    }
  },
  computed: {
    // Came from an invite link (/join/...)
    invited() {
      return String(this.$route.query.redirect || '').startsWith('/join/')
    }
  },
  methods: {
    async login() {
      this.errorMessage = ''
      if (!this.username || !this.password) {
        this.errorMessage = 'Please enter your username (or email) and password.'
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
