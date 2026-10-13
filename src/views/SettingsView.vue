<template>
  <div class="st-page">
    <button type="button" class="st-back" @click="goBack">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      Go back
    </button>

    <section class="st" aria-labelledby="st-title">
      <!-- Header + auto-save status -->
      <header class="st-head">
        <div>
          <h1 id="st-title" class="st-title">Settings</h1>
          <p class="st-sub">Changes save automatically.</p>
        </div>
        <span class="st-status" :class="status" role="status" aria-live="polite">
          <span class="st-status-dot" aria-hidden="true"></span>
          {{ statusText }}
        </span>
      </header>

      <p v-if="loading" class="st-sub">Loading…</p>
      <div v-else class="st-cols">
        <!-- Left column on wide screens -->
        <div class="st-col">
        <!-- ===== My information ===== -->
        <h2 class="st-group-title">My Information</h2>
        <div class="st-group">
          <div class="st-row">
            <label class="st-row-label" for="st-email">Email</label>
            <input id="st-email" v-model="email" type="email" class="st-input" maxlength="120" autocomplete="email"
              :aria-invalid="!!emailError" aria-describedby="st-email-err" @blur="saveEmail" @keydown.enter.prevent="saveEmail">
          </div>
          <p v-if="emailError" id="st-email-err" class="st-err" role="alert">{{ emailError }}</p>
          <div class="st-row stack">
            <label class="st-row-label" for="st-diet">Food needs</label>
            <DietTagsInput id="st-diet" v-model="diet" />
          </div>
          <div class="st-row stack">
            <label class="st-row-label" for="st-phone">WhatsApp</label>
            <PhoneInput id="st-phone" v-model="phone" />
          </div>
        </div>

        <!-- ===== Session & account ===== -->
        <h2 class="st-group-title">Session & Account</h2>
        <div class="st-group">
          <div class="st-row">
            <span class="st-who">
              <span class="st-avatar" aria-hidden="true">{{ initial }}</span>
              <span class="st-row-text">
                <span class="st-row-label">@{{ user.username }}</span>
                <span class="st-row-hint">{{ savedEmail }}</span>
              </span>
            </span>
            <button type="button" class="st-logout" @click="handleLogout">Log out</button>
          </div>
        </div>
        </div>

        <!-- Right column on wide screens -->
        <div class="st-col">
        <!-- ===== Trip preferences ===== -->
        <h2 class="st-group-title">Trip Preferences</h2>
        <div class="st-group">
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label" id="st-cur-label">Base currency</span>
              <span class="st-row-hint">For new trips' expenses</span>
            </span>
            <CustomDropdown id="st-currency" v-model="settings.currency" :options="currencyChoices" size="sm"
              header-text="Base currency" aria-label="Base currency" />
          </div>
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label" id="st-units-label">Distance & weather</span>
            </span>
            <div class="st-seg" role="radiogroup" aria-labelledby="st-units-label" :class="{ right: settings.units === 'imperial' }">
              <span class="st-seg-thumb" aria-hidden="true"></span>
              <button v-for="u in UNITS" :key="u.value" type="button" role="radio" :aria-checked="settings.units === u.value"
                :tabindex="settings.units === u.value ? 0 : -1" :class="{ on: settings.units === u.value }"
                @click="settings.units = u.value" @keydown="onSegKey">{{ u.label }}</button>
            </div>
          </div>
        </div>

        <!-- ===== Safety & notifications ===== -->
        <h2 class="st-group-title">Safety & Notifications</h2>
        <div class="st-group">
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label" id="st-haz-label">Hazard advisories</span>
              <span class="st-row-hint">Earthquake and storm warnings near your trip</span>
            </span>
            <button type="button" role="switch" class="st-switch" :aria-checked="settings.hazardAlerts" aria-labelledby="st-haz-label"
              @click="settings.hazardAlerts = !settings.hazardAlerts"><span class="st-knob"></span></button>
          </div>
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label" id="st-exp-label">Expense activity</span>
              <span class="st-row-hint">New bill splits and settle-ups</span>
            </span>
            <button type="button" role="switch" class="st-switch" :aria-checked="settings.expenseAlerts" aria-labelledby="st-exp-label"
              @click="settings.expenseAlerts = !settings.expenseAlerts"><span class="st-knob"></span></button>
          </div>
        </div>

        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { auth, logout, saveLogin } from '../auth.js'
import { CURRENCIES } from '../expenses.js'
import CustomDropdown from '../components/CustomDropdown.vue'
import DietTagsInput from '../components/DietTagsInput.vue'
import PhoneInput from '../components/PhoneInput.vue'

const router = useRouter()

const UNITS = [
  { value: 'metric', label: 'km · °C' },
  { value: 'imperial', label: 'mi · °F' }
]

// "SGD ($)", "JPY (¥)" ...
const currencyChoices = []
for (const c of CURRENCIES) {
  let symbol = ''
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    for (const p of parts) if (p.type === 'currency') symbol = p.value
  } catch (err) {
    symbol = ''
  }
  currencyChoices.push({ value: c, label: symbol && symbol !== c ? c + ' (' + symbol + ')' : c })
}

// ----- State -----
const loading = ref(true)
const email = ref('')
const savedEmail = ref('')
const emailError = ref('')
const diet = ref([])
const phone = ref('')
const settings = reactive({ currency: 'SGD', units: 'metric', hazardAlerts: true, expenseAlerts: true })

const user = computed(() => auth.user || { name: '', username: '' })
const initial = computed(() => (user.value.name || '?').charAt(0).toUpperCase())

// ----- Auto-save -----
// Changes are collected for a moment, then sent together (fewer requests while typing)
const status = ref('saved') // 'saving' | 'saved' | 'error'
const statusText = computed(() => ({ saving: 'Saving…', saved: 'Saved', error: 'Not saved' })[status.value])
let pending = {}
let timer = null

function queueSave(patch) {
  pending = { ...pending, ...patch }
  status.value = 'saving'
  clearTimeout(timer)
  timer = setTimeout(flush, 500)
}

async function flush() {
  const body = pending
  pending = {}
  try {
    const res = await axios.put('/api/auth/me', body)
    if (body.email) {
      savedEmail.value = res.data.email
      saveLogin(auth.token, { ...auth.user, email: res.data.email }) // keep the saved login up to date
    }
    if (!Object.keys(pending).length) status.value = 'saved'
  } catch (err) {
    status.value = 'error'
    const message = (err.response && err.response.data && err.response.data.message) || 'Could not save.'
    if (body.email) emailError.value = message
  }
}

// Load, then start watching (so loading doesn't trigger saves)
async function load() {
  try {
    const res = await axios.get('/api/auth/me')
    email.value = res.data.email || ''
    savedEmail.value = res.data.email || ''
    diet.value = res.data.diet || []
    phone.value = res.data.phone || ''
    Object.assign(settings, res.data.settings || {})
  } catch (err) {
    status.value = 'error'
  }
  loading.value = false
  watch(diet, (v) => queueSave({ diet: v }))
  watch(phone, (v) => queueSave({ phone: v }))
  watch(settings, () => queueSave({ settings: { ...settings } }))
}
load()

// Email saves when you leave the box (half-typed emails aren't sent)
function saveEmail() {
  const value = email.value.trim().toLowerCase()
  emailError.value = ''
  if (value === savedEmail.value) return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    emailError.value = 'Please enter a valid email.'
    return
  }
  queueSave({ email: value })
}

// Save anything still waiting when leaving the page
onBeforeUnmount(() => {
  clearTimeout(timer)
  if (Object.keys(pending).length) flush()
})

// ----- Controls -----
function onSegKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    settings.units = settings.units === 'metric' ? 'imperial' : 'metric'
    const buttons = e.currentTarget.parentElement.querySelectorAll('button')
    buttons[settings.units === 'metric' ? 0 : 1].focus()
  }
}

function goBack() {
  if (window.history.state && window.history.state.back) router.back()
  else router.push('/')
}

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.st-page {
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
  padding-bottom: 48px;
  --mint: #2fe0a1;
  --text: #e6edf3;
  --muted: #8b949e;
}

/* Go back */
.st-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px 0 12px;
  margin-bottom: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-weight: 600;
  font-size: 14px;
  transition: transform 0.15s, border-color 0.15s, color 0.15s;
}
.st-back svg {
  transition: transform 0.15s;
}
.st-back:hover {
  border-color: rgba(47, 224, 161, 0.5);
  color: var(--mint);
}
.st-back:hover svg {
  transform: translateX(-2px);
}
.st-back:active {
  transform: scale(0.96);
}

/* Card */
.st {
  background: rgba(17, 23, 32, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 24px 60px rgba(0, 0, 0, 0.45);
}
.st-cols {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 28px;
}
.st-col {
  min-width: 0;
}
@media (min-width: 860px) {
  .st {
    padding: 30px 32px 32px;
  }
  .st-cols {
    grid-template-columns: 1fr 1fr;
  }
}
.st-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 6px;
}
.st-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.6rem;
  margin: 0;
}
.st-sub {
  color: var(--muted);
  font-size: 13px;
  margin: 2px 0 0;
}

/* Auto-save status */
.st-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mint);
  background: rgba(47, 224, 161, 0.08);
  border: 1px solid rgba(47, 224, 161, 0.2);
}
.st-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 rgba(47, 224, 161, 0.6);
  animation: st-pulse 2s infinite;
}
.st-status.saving {
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}
.st-status.saving .st-status-dot {
  animation: st-blink 0.8s infinite alternate;
}
.st-status.error {
  color: #ff8a8f;
  background: rgba(255, 90, 95, 0.1);
  border-color: rgba(255, 90, 95, 0.3);
}
.st-status.error .st-status-dot {
  animation: none;
}

/* Groups */
.st-group-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 20px 4px 8px;
}
.st-group {
  background: #161d27;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: visible;
}
.st-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 54px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
}
.st-row:last-child {
  border-bottom: 0;
}
.st-row:first-child {
  border-radius: 14px 14px 0 0;
}
.st-row:last-child {
  border-radius: 0 0 14px 14px;
}
.st-row:only-child {
  border-radius: 14px;
}
.st-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.st-row.stack {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.st-row-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.st-row-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.st-row-hint {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.st-input {
  flex: 1;
  max-width: 280px;
  min-width: 0;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: var(--text);
  font-size: 14px;
  padding: 7px 10px;
  text-align: right;
  color-scheme: dark;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.st-input:focus {
  outline: none;
  text-align: left;
  border-color: var(--mint);
  box-shadow: 0 0 0 3px rgba(47, 224, 161, 0.15);
}
.st-input[aria-invalid='true'] {
  border-color: rgba(255, 90, 95, 0.6);
}
.st-err {
  color: #ff9a9a;
  font-size: 12px;
  margin: 0;
  padding: 0 14px 10px;
  text-align: right;
}

/* Segmented km/mi toggle with a sliding thumb */
.st-seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: none;
  padding: 3px;
  border-radius: 999px;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.st-seg-thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  border-radius: 999px;
  background: rgba(47, 224, 161, 0.14);
  border: 1px solid rgba(47, 224, 161, 0.35);
  box-shadow: 0 0 12px rgba(47, 224, 161, 0.15);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.st-seg.right .st-seg-thumb {
  transform: translateX(100%);
}
.st-seg button {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  white-space: nowrap;
  transition: color 0.2s;
}
.st-seg button.on {
  color: var(--mint);
}

/* Toggle switch */
.st-switch {
  position: relative;
  flex: none;
  width: 44px;
  height: 26px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #2a323d;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.st-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s;
}
.st-switch[aria-checked='true'] {
  background: rgba(47, 224, 161, 0.85);
  border-color: rgba(47, 224, 161, 0.9);
  box-shadow: 0 0 14px rgba(47, 224, 161, 0.3);
}
.st-switch[aria-checked='true'] .st-knob {
  transform: translateX(18px);
  background: #fff;
}
.st-switch:active .st-knob {
  width: 24px;
}
.st-switch[aria-checked='true']:active .st-knob {
  transform: translateX(14px);
}

/* Account */
.st-who {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.st-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0b7f5f, #2fe0a1);
  color: #fff;
  font-weight: 700;
}
.st-logout {
  flex: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #cbd5e1;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.st-logout:hover {
  color: #ff8a8f;
  border-color: rgba(255, 90, 95, 0.45);
  background: rgba(255, 90, 95, 0.08);
}

/* Focus rings */
.st-back:focus-visible,
.st-seg button:focus-visible,
.st-switch:focus-visible,
.st-logout:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
}

@keyframes st-pulse {
  0% { box-shadow: 0 0 0 0 rgba(47, 224, 161, 0.55); }
  70% { box-shadow: 0 0 0 6px rgba(47, 224, 161, 0); }
  100% { box-shadow: 0 0 0 0 rgba(47, 224, 161, 0); }
}
@keyframes st-blink {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

@media (max-width: 480px) {
  .st {
    padding: 16px;
    border-radius: 18px;
  }
  .st-row {
    padding: 10px 12px;
  }
  .st-row-hint {
    white-space: normal;
  }
  .st-input {
    max-width: 60%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .st-status-dot,
  .st-seg-thumb,
  .st-knob,
  .st-switch,
  .st-back,
  .st-back svg {
    animation: none;
    transition: none;
  }
}
</style>
