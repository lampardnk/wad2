<template>
  <AuthShell title="Welcome back!" :subtitle="invited ? 'Sign in to join the trip you were invited to.' : 'Sign in to see your trips.'"
    :switch-to="{ path: '/signup', query: $route.query.redirect ? { redirect: $route.query.redirect } : {} }" switch-label="Sign Up">
    <p v-if="$route.query.registered" class="as-success" data-testid="login-registered">Account created! Sign in to start planning.</p>
    <p v-if="$route.query.reset" class="as-success" role="status">Password updated! Sign in with your new password.</p>

    <form class="as-form" @submit.prevent="login" novalidate>
      <label for="username" class="as-label">Username or email</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="id" /></span>
        <input id="username" type="text" class="as-input" v-model="username"
          placeholder="Username or email" autocomplete="username" autocapitalize="none" spellcheck="false"
          data-testid="login-username" required>
      </div>

      <label for="password" class="as-label">Password</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="key" /></span>
        <input id="password" type="password" class="as-input" v-model="password"
          placeholder="Password" autocomplete="current-password" data-testid="login-password" required>
      </div>
      <router-link :to="{ path: '/forgot-password', query: username.includes('@') ? { email: username.trim() } : {} }" class="lv-forgot">Forgot password?</router-link>

      <p v-if="errorMessage" class="as-error" role="alert" data-testid="login-error">{{ errorMessage }}</p>

      <button type="submit" class="as-btn" :disabled="loading" data-testid="login-submit">
        {{ loading ? 'Signing in…' : 'Sign In' }}
        <DoodleIcon v-if="!loading" name="plane" :size="24" anim="" />
      </button>
    </form>

    <!-- No account yet: the second big button -->
    <p class="as-or">Don't have an account?</p>
    <router-link :to="{ path: '/signup', query: $route.query.redirect ? { redirect: $route.query.redirect } : {} }" class="as-btn2">Sign Up</router-link>
  </AuthShell>
</template>

<script>
import axios from 'axios'
import AuthShell from '../components/AuthShell.vue'
import AuthIcon from '../components/AuthIcon.vue'
import DoodleIcon from '../components/DoodleIcon.vue'
import { saveLogin } from '../auth.js'

export default {
  components: { AuthShell, AuthIcon, DoodleIcon },
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

<style scoped>
.lv-forgot {
  align-self: flex-end;
  margin-top: -4px;
  font-size: 14px;
  font-weight: 600;
  color: #0f6e7b;
  font-weight: 800;
  text-decoration: none;
}
.lv-forgot:hover,
.lv-forgot:focus-visible {
  text-decoration: underline;
}
</style>
