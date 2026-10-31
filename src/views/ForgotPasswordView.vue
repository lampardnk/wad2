<template>
  <AuthShell title="Forgot your password?" :subtitle="step === 1 ? 'No worries. Enter the email you signed up with and we\'ll send you a 6-digit code.' : 'Check your inbox for the code, then pick a new password.'"
    switch-to="/login" switch-label="Sign In" bubble="Forgot your password? No problem!">

    <!-- Step 1: which account -->
    <form v-if="step === 1" class="as-form" @submit.prevent="sendCode" novalidate>
      <label for="fp-email" class="as-label">Email</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="mail" /></span>
        <input id="fp-email" type="email" class="as-input" v-model="email" placeholder="Email you signed up with"
          autocomplete="email" autocapitalize="none" spellcheck="false" required>
      </div>

      <p v-if="errorMessage" class="as-error" role="alert">{{ errorMessage }}</p>

      <button type="submit" class="as-btn" :disabled="loading">{{ loading ? 'Sending…' : 'Send me a code' }}</button>
    </form>

    <!-- Step 2: code from the email + new password -->
    <form v-else class="as-form" @submit.prevent="resetPassword" novalidate>
      <p class="as-success" role="status">{{ sentMessage }} <span class="fp-to">Sent to <strong>{{ email.trim() }}</strong>.</span></p>

      <label for="fp-code" class="as-label">6-digit code</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="code" /></span>
        <input id="fp-code" ref="codeInput" type="text" inputmode="numeric" maxlength="6" class="as-input fp-code" v-model="code"
          placeholder="6-digit code" autocomplete="one-time-code" required>
      </div>

      <label for="fp-pass" class="as-label">New password</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="key" /></span>
        <input id="fp-pass" type="password" class="as-input" v-model="password"
          placeholder="At least 8 characters" autocomplete="new-password" required>
      </div>

      <label for="fp-confirm" class="as-label">Confirm new password</label>
      <div class="as-field"><span class="as-field-icon"><AuthIcon name="key" /></span>
        <input id="fp-confirm" type="password" class="as-input" v-model="confirmPassword"
          placeholder="Confirm new password" autocomplete="new-password" required>
      </div>

      <p v-if="errorMessage" class="as-error" role="alert">{{ errorMessage }}</p>

      <button type="submit" class="as-btn" :disabled="loading">{{ loading ? 'Saving…' : 'Reset password' }}</button>

      <div class="fp-links">
        <button type="button" class="fp-link" :disabled="wait > 0 || loading" @click="sendCode">
          {{ wait > 0 ? 'Send a new code in ' + wait + 's' : 'Send a new code' }}
        </button>
        <button type="button" class="fp-link" @click="changeEmail">Use a different email</button>
      </div>
      <p class="fp-hint">Can't find it? Check your spam or junk folder.</p>
    </form>

    <p class="as-or">Remembered it?</p>
    <p class="as-foot"><router-link to="/login">Back to Sign In</router-link></p>
  </AuthShell>
</template>

<script>
import axios from 'axios'
import AuthShell from '../components/AuthShell.vue'
import AuthIcon from '../components/AuthIcon.vue'

export default {
  components: { AuthShell, AuthIcon },
  data() {
    return {
      step: 1,
      email: String(this.$route.query.email || ''),
      code: '',
      password: '',
      confirmPassword: '',
      sentMessage: '',
      errorMessage: '',
      loading: false,
      wait: 0, // seconds until "Send a new code" works again
      timer: null
    }
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    serverMessage(err) {
      if (err.response && err.response.data && err.response.data.message) return err.response.data.message
      return 'Cannot reach the server. Make sure it is running (cd server, then pnpm dev).'
    },
    async sendCode() {
      this.errorMessage = ''
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
        this.errorMessage = 'Please enter the email you signed up with.'
        return
      }
      this.loading = true
      try {
        const res = await axios.post('/api/auth/forgot', { email: this.email.trim() })
        this.sentMessage = res.data.message
        this.step = 2
        this.startWait()
        this.$nextTick(() => { if (this.$refs.codeInput) this.$refs.codeInput.focus() })
      } catch (err) {
        this.errorMessage = this.serverMessage(err)
      }
      this.loading = false
    },
    startWait() {
      this.wait = 60
      clearInterval(this.timer)
      this.timer = setInterval(() => {
        this.wait--
        if (this.wait <= 0) clearInterval(this.timer)
      }, 1000)
    },
    async resetPassword() {
      this.errorMessage = ''
      const code = this.code.replace(/\D/g, '')
      if (code.length !== 6) {
        this.errorMessage = 'Enter the 6-digit code from the email.'
        return
      }
      if (this.password.length < 8) {
        this.errorMessage = 'Password must be at least 8 characters.'
        return
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = "The two passwords don't match."
        return
      }
      this.loading = true
      try {
        const res = await axios.post('/api/auth/reset', { email: this.email.trim(), code, password: this.password })
        this.$router.push({ path: '/login', query: { reset: '1', username: res.data.username } })
      } catch (err) {
        this.errorMessage = this.serverMessage(err)
      }
      this.loading = false
    },
    changeEmail() {
      this.step = 1
      this.code = ''
      this.errorMessage = ''
    }
  }
}
</script>

<style scoped>
.fp-to {
  display: block;
  margin-top: 2px;
}
.fp-code {
  letter-spacing: 6px;
  font-size: 20px;
  font-weight: 700;
}
.fp-code::placeholder {
  letter-spacing: normal;
  font-size: 16px;
  font-weight: 400;
}
.fp-links {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.fp-link {
  padding: 6px 0;
  border: 0;
  background: none;
  color: #0f6e7b;
  font-size: 14px;
  font-weight: 800;
}
.fp-link:disabled {
  color: #8a99a5;
  font-weight: 500;
  cursor: default;
}
.fp-link:hover:not(:disabled) {
  text-decoration: underline;
}
.fp-hint {
  margin: 0;
  font-size: 13px;
  color: #5a6b78;
}
</style>
