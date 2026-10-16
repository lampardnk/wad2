<template>
  <!-- Sign in / Join: one frosted dialog with two tabs.
       "Join with a code" is for invited friends; "Sign in" is for everyone else. -->
  <Teleport to="body">
    <transition name="am-fade">
      <div v-if="open" class="am-overlay" @click.self="close" @keydown.esc="close">
        <div ref="dialog" class="am" role="dialog" aria-modal="true" aria-labelledby="am-title" tabindex="-1">
          <button type="button" class="am-x" aria-label="Close" @click="close">✕</button>
          <h2 id="am-title" class="am-title">{{ tab === 'join' ? 'Join your crew' : mode === 'signin' ? 'Welcome back' : 'Create your account' }}</h2>
          <p v-if="reason" class="am-reason">{{ reason }}</p>

          <div class="am-tabs" role="tablist" aria-label="How do you want in?">
            <button type="button" role="tab" :aria-selected="tab === 'join'" :class="{ on: tab === 'join' }" @click="setTab('join')">Join with a code</button>
            <button type="button" role="tab" :aria-selected="tab === 'signin'" :class="{ on: tab === 'signin' }" @click="setTab('signin')">Sign in / Register</button>
          </div>

          <!-- ===== Join with a code ===== -->
          <div v-if="tab === 'join'" class="am-body">
            <form v-if="!preview" class="am-form" @submit.prevent="findTrip">
              <label for="am-code" class="am-label">Trip code or invite link</label>
              <input id="am-code" ref="firstInput" v-model="code" class="am-input am-code" autocomplete="off" autocapitalize="none"
                spellcheck="false" placeholder="e.g. aB3x9Kq_" maxlength="200" @input="error = ''">
              <p class="am-hint">It's in the invite your friend sent. Codes are case-sensitive.</p>
              <p v-if="error" class="am-error" role="alert">{{ error }}</p>
              <button type="submit" class="am-cta" :disabled="busy || !cleanCode">{{ busy ? 'Finding your trip…' : 'Find my trip' }}</button>
            </form>

            <template v-else>
              <!-- The trip they're about to join -->
              <div class="am-trip">
                <span class="am-trip-icon" aria-hidden="true">🧳</span>
                <div>
                  <strong>{{ preview.name }}</strong>
                  <small>{{ preview.destinations.map((d) => d.split(', ')[0]).join(' → ') }}<template v-if="preview.startDate"> · {{ dateText(preview.startDate) }}</template></small>
                  <small v-if="preview.invitedBy">Invited by {{ preview.invitedBy }} · {{ preview.memberCount }} on the trip</small>
                </div>
              </div>

              <button v-if="signedIn" type="button" class="am-cta" @click="goJoin">Join workspace ➔</button>
              <form v-else class="am-form" @submit.prevent="quickJoin">
                <p class="am-sub">One quick step so your crew knows it's you.</p>
                <label for="am-qname" class="am-label">Your name</label>
                <input id="am-qname" ref="firstInput" v-model="quick.name" class="am-input" autocomplete="name" maxlength="40">
                <label for="am-qemail" class="am-label">Email</label>
                <input id="am-qemail" v-model="quick.email" type="email" class="am-input" autocomplete="email">
                <label for="am-qpass" class="am-label">Password <span class="am-opt">8+ characters</span></label>
                <input id="am-qpass" v-model="quick.password" type="password" class="am-input" autocomplete="new-password">
                <p v-if="error" class="am-error" role="alert">{{ error }}</p>
                <button type="submit" class="am-cta" :disabled="busy">{{ busy ? 'Joining…' : 'Join workspace ➔' }}</button>
                <p class="am-switch">Already have an account? <button type="button" class="am-link" @click="setTab('signin')">Sign in</button> and we'll take you straight in.</p>
              </form>
              <button type="button" class="am-link am-back" @click="preview = null; error = ''">‹ Use a different code</button>
            </template>
          </div>

          <!-- ===== Sign in / Register ===== -->
          <div v-else class="am-body">
            <form v-if="mode === 'signin'" class="am-form" @submit.prevent="signIn">
              <label for="am-user" class="am-label">Username or email</label>
              <input id="am-user" ref="firstInput" v-model="login.username" class="am-input" autocomplete="username" autocapitalize="none" spellcheck="false">
              <label for="am-pass" class="am-label">Password</label>
              <input id="am-pass" v-model="login.password" type="password" class="am-input" autocomplete="current-password">
              <p v-if="error" class="am-error" role="alert">{{ error }}</p>
              <button type="submit" class="am-cta" :disabled="busy">{{ busy ? 'Signing in…' : preview ? 'Sign in and join ➔' : 'Sign in ➔' }}</button>
              <p class="am-switch">New here? <button type="button" class="am-link" @click="mode = 'register'; error = ''">Create an account</button></p>
            </form>

            <form v-else class="am-form" @submit.prevent="register">
              <label for="am-rname" class="am-label">Name</label>
              <input id="am-rname" ref="firstInput" v-model="reg.name" class="am-input" autocomplete="name" maxlength="40">
              <label for="am-ruser" class="am-label">Username <span class="am-opt">3-20 letters, numbers, . or _</span></label>
              <input id="am-ruser" v-model="reg.username" class="am-input" autocomplete="username" autocapitalize="none" spellcheck="false">
              <label for="am-remail" class="am-label">Email</label>
              <input id="am-remail" v-model="reg.email" type="email" class="am-input" autocomplete="email">
              <label for="am-rpass" class="am-label">Password <span class="am-opt">8+ characters</span></label>
              <input id="am-rpass" v-model="reg.password" type="password" class="am-input" autocomplete="new-password">
              <p v-if="error" class="am-error" role="alert">{{ error }}</p>
              <button type="submit" class="am-cta" :disabled="busy">{{ busy ? 'Creating…' : 'Create account ➔' }}</button>
              <p class="am-switch">Have an account? <button type="button" class="am-link" @click="mode = 'signin'; error = ''">Sign in</button></p>
            </form>
          </div>

        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { auth, saveLogin } from '../auth.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  initialTab: { type: String, default: 'join' },  // 'join' | 'signin'
  reason: { type: String, default: '' },          // e.g. why we're asking ("Sign in to save your trip")
  initialCode: { type: String, default: '' },
  next: { type: String, default: '/home' }            // where to go after signing in ('' = stay here and emit 'authed')
})
const emit = defineEmits(['close', 'authed'])
const router = useRouter()

const tab = ref('join')
const mode = ref('signin') // inside the Sign in tab: 'signin' | 'register'
const busy = ref(false)
const error = ref('')
const dialog = ref(null)
const firstInput = ref(null)
const code = ref('')
const preview = ref(null) // the trip a code points to
const login = ref({ username: '', password: '' })
const reg = ref({ name: '', username: '', email: '', password: '' })
const quick = ref({ name: '', email: '', password: '' })

const signedIn = computed(() => !!auth.token)
// Accepts a bare code or a whole invite link (…/join/aB3x9Kq_)
const cleanCode = computed(() => {
  const text = code.value.trim()
  const fromLink = text.match(/join\/([\w-]{6,20})/)
  if (fromLink) return fromLink[1]
  return /^[\w-]{6,20}$/.test(text) ? text : ''
})

function focusFirst() {
  nextTick(() => {
    if (firstInput.value) firstInput.value.focus()
    else if (dialog.value) dialog.value.focus()
  })
}
function setTab(t) {
  tab.value = t
  error.value = ''
  focusFirst()
}
watch(() => props.open, (open) => {
  if (!open) return
  tab.value = props.initialTab
  mode.value = 'signin'
  error.value = ''
  preview.value = null
  code.value = props.initialCode
  focusFirst()
}, { immediate: true })

function close() {
  if (!busy.value) emit('close')
}
function messageOf(err, fallback) {
  if (err.response && err.response.data && err.response.data.message) return err.response.data.message
  return err.response ? fallback : 'Cannot reach the server. Make sure it is running.'
}
function dateText(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------- join with a code ----------
async function findTrip() {
  if (!cleanCode.value) {
    error.value = 'That doesn\'t look like a trip code. Paste the code or the whole invite link.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/join/' + cleanCode.value + '/preview')
    preview.value = res.data
    focusFirst()
  } catch (err) {
    error.value = messageOf(err, 'Could not check that code. Try again.')
  }
  busy.value = false
}
// The existing join page lets them pick their name on the trip and confirms
function goJoin() {
  emit('close')
  router.push('/join/' + cleanCode.value)
}
// New invitee: name + email + password is enough; a username is made for them
function makeUsername(seed) {
  let base = seed.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 14)
  while (base.length < 3) base += 'x'
  return base + '.' + Math.floor(100 + Math.random() * 900)
}
async function quickJoin() {
  const q = quick.value
  if (!q.name.trim() || !q.email.trim() || !q.password) {
    error.value = 'Please fill in your name, email and a password.'
    return
  }
  if (q.password.length < 8) {
    error.value = 'Your password needs at least 8 characters.'
    return
  }
  busy.value = true
  error.value = ''
  const seed = q.email.split('@')[0] || q.name
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await axios.post('/api/auth/register', { name: q.name.trim(), username: makeUsername(seed), email: q.email.trim(), password: q.password })
      saveLogin(res.data.token, res.data.user)
      busy.value = false
      goJoin()
      return
    } catch (err) {
      const msg = messageOf(err, 'Could not create your account. Try again.')
      if (/username/i.test(msg) && attempt < 2) continue // that made-up username was taken: try another
      error.value = /email already exists/i.test(msg) ? 'You already have an account with this email. Sign in instead and we\'ll take you to the trip.' : msg
      break
    }
  }
  busy.value = false
}

// ---------- sign in / register ----------
// After signing in: into the trip (if they found one), back to what they were doing, or to their trips
function afterAuth() {
  if (preview.value) {
    goJoin()
    return
  }
  emit('authed')
  emit('close')
  if (props.next) router.push(props.next)
}
async function signIn() {
  if (!login.value.username.trim() || !login.value.password) {
    error.value = 'Please enter your username (or email) and password.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const res = await axios.post('/api/auth/login', { username: login.value.username.trim(), password: login.value.password })
    saveLogin(res.data.token, res.data.user)
    busy.value = false
    afterAuth()
    return
  } catch (err) {
    error.value = messageOf(err, 'Could not sign you in. Try again.')
  }
  busy.value = false
}
async function register() {
  const r = reg.value
  if (!r.name.trim() || !r.username.trim() || !r.email.trim() || !r.password) {
    error.value = 'Please fill in every field.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const res = await axios.post('/api/auth/register', { name: r.name.trim(), username: r.username.trim(), email: r.email.trim(), password: r.password })
    saveLogin(res.data.token, res.data.user)
    busy.value = false
    afterAuth()
    return
  } catch (err) {
    error.value = messageOf(err, 'Could not create your account. Try again.')
  }
  busy.value = false
}
</script>

<style scoped>
.am-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(5, 8, 13, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.am {
  position: relative;
  width: min(440px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 26px 24px 22px;
  border-radius: 22px;
  background: rgba(10, 53, 80, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(237, 174, 73, 0.06);
  color: #e6edf3;
  outline: none;
}
.am-x {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: #8b949e;
  transition: background 0.15s, color 0.15s;
}
.am-x:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #e6edf3;
}
.am-title {
  margin: 0 40px 4px 0;
  font-family: 'Oswald', Inter, sans-serif;
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.am-reason {
  margin: 0 0 10px;
  font-size: 14px;
  color: #edae49;
}
.am-tabs {
  display: flex;
  gap: 4px;
  margin: 14px 0 18px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}
.am-tabs button {
  flex: 1;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #8b949e;
  padding: 9px 8px;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.2s, color 0.2s;
}
.am-tabs button:hover {
  color: #e6edf3;
}
.am-tabs button.on {
  background: #edae49;
  color: #00283c;
}
.am-form {
  display: flex;
  flex-direction: column;
}
.am-label {
  margin: 10px 0 6px;
  font-size: 13px;
  font-weight: 600;
}
.am-opt {
  font-weight: 400;
  color: #8b949e;
}
.am-input {
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0 14px;
  background: rgba(0, 38, 58, 0.7);
  color: #e6edf3;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.am-input:focus {
  outline: none;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.18);
}
.am-code {
  height: 54px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 22px;
  letter-spacing: 0.12em;
  text-align: center;
}
.am-hint,
.am-sub {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8b949e;
}
.am-sub {
  margin: 0 0 4px;
  font-size: 13px;
}
.am-error {
  margin: 10px 0 0;
  font-size: 13px;
  color: #ec8a97;
}
.am-cta {
  margin-top: 16px;
  height: 46px;
  border: 0;
  border-radius: 999px;
  background: #edae49;
  color: #00283c;
  font-weight: 800;
  box-shadow: 0 0 24px rgba(237, 174, 73, 0.3);
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
}
.am-cta:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 32px rgba(237, 174, 73, 0.45);
}
.am-cta:disabled {
  opacity: 0.55;
}
.am-trip {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: rgba(237, 174, 73, 0.08);
  border: 1px solid rgba(237, 174, 73, 0.3);
  margin-bottom: 6px;
}
.am-trip-icon {
  font-size: 26px;
}
.am-trip strong {
  display: block;
  font-size: 16px;
}
.am-trip small {
  display: block;
  color: #c9d1d9;
  font-size: 12px;
}
.am-switch {
  margin: 14px 0 0;
  font-size: 13px;
  color: #8b949e;
  text-align: center;
}
.am-link {
  border: 0;
  background: none;
  padding: 0;
  color: #edae49;
  font-weight: 700;
}
.am-link:hover {
  text-decoration: underline;
}
.am-back {
  display: block;
  margin: 14px auto 0;
  font-size: 13px;
}
.am-x:focus-visible,
.am-tabs button:focus-visible,
.am-cta:focus-visible,
.am-link:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 2px;
}

/* Opening: fade in and grow from 96% */
.am-fade-enter-active,
.am-fade-leave-active {
  transition: opacity 0.22s ease;
}
.am-fade-enter-active .am,
.am-fade-leave-active .am {
  transition: transform 0.22s cubic-bezier(.2, .8, .2, 1);
}
.am-fade-enter-from,
.am-fade-leave-to {
  opacity: 0;
}
.am-fade-enter-from .am,
.am-fade-leave-to .am {
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .am-fade-enter-active, .am-fade-leave-active, .am-fade-enter-active .am, .am-fade-leave-active .am { transition: none; }
}
</style>
