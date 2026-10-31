<template>
  <div class="st-page">
    <button type="button" class="st-back" @click="goBack">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      Go back
    </button>

    <!-- faded notebook marks in the outer margins (wide screens only) -->
    <div class="st-margin left" aria-hidden="true">
      <span class="st-margin-rule"></span>
      <svg class="st-margin-compass" viewBox="0 0 100 100">
        <g fill="none" stroke="currentColor" stroke-width="1.2">
          <circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="34" stroke-dasharray="1 4" />
          <path d="M50 6 55 45 94 50 55 55 50 94 45 55 6 50 45 45Z" />
        </g>
        <text x="50" y="4.5" text-anchor="middle" font-size="7" fill="currentColor">N</text>
      </svg>
      <svg class="st-margin-route" viewBox="0 0 60 220">
        <path d="M30 4C6 40 54 70 30 110S8 180 30 216" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 6" stroke-linecap="round" />
        <circle cx="30" cy="4" r="3" fill="currentColor" /><path d="M24 210l6 8 6-8" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </div>
    <div class="st-margin right" aria-hidden="true">
      <svg class="st-margin-stamp" viewBox="0 0 110 110">
        <g fill="none" stroke="currentColor" stroke-width="1.4">
          <circle cx="55" cy="55" r="48" /><circle cx="55" cy="55" r="36" />
          <path d="M10 48h90M10 62h90" stroke-dasharray="2 3" />
        </g>
        <text x="55" y="59" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="2" fill="currentColor">FIELD NOTES</text>
      </svg>
      <span class="st-margin-rule"></span>
      <svg class="st-margin-stars" viewBox="0 0 60 60">
        <g fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 10l2 5 5 .6-3.6 3.4.8 5-4.2-2.4-4.2 2.4.8-5L7 15.6l5-.6Z" />
          <path d="M44 34l2.4 5.4 6 .8-4.4 4 1.2 6-5.2-3-5.2 3 1.2-6-4.4-4 6-.8Z" />
          <path d="M16 22 42 38" stroke-dasharray="2 4" />
        </g>
      </svg>
    </div>

    <section class="st" aria-labelledby="st-title">
      <!-- faint debossed motifs in two corners: a compass rose and a little star cluster -->
      <svg class="st-motif rose" viewBox="0 0 120 120" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.2">
          <circle cx="60" cy="60" r="44" /><circle cx="60" cy="60" r="38" stroke-dasharray="1 4" />
          <path d="M60 8 66 54 112 60 66 66 60 112 54 66 8 60 54 54Z" />
          <path d="M60 30 63 57 90 60 63 63 60 90 57 63 30 60 57 57Z" transform="rotate(45 60 60)" />
        </g>
        <text x="60" y="6" text-anchor="middle" font-size="7" fill="currentColor">N</text>
      </svg>
      <svg class="st-motif stars" viewBox="0 0 120 80" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 30l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />
          <path d="M60 14l2 5 5 .6-3.6 3.4.8 5-4.2-2.4-4.2 2.4.8-5L52 19.6l5-.6Z" />
          <path d="M98 44l2.4 5.4 6 .8-4.4 4 1.2 6-5.2-3-5.2 3 1.2-6-4.4-4 6-.8Z" />
          <path d="M24 34 60 19M60 19l38 30" stroke-dasharray="2 4" />
        </g>
      </svg>
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

      <!-- Came from the new-account prompt on Home: say where to start -->
      <div v-if="welcome" class="st-welcome" role="status">
        <!-- brass bulldog clip holding the note -->
        <svg class="st-clip" viewBox="0 0 70 34" aria-hidden="true">
          <defs><linearGradient id="st-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c48a" /><stop offset="0.55" stop-color="#b08d57" /><stop offset="1" stop-color="#8a6a3a" /></linearGradient></defs>
          <path d="M8 14h54v14a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill="url(#st-brass)" stroke="#5e4622" stroke-width="1.4" />
          <path d="M20 14V6a6 6 0 0 1 12 0M38 14V6a6 6 0 0 1 12 0" fill="none" stroke="#7a5d30" stroke-width="2.2" stroke-linecap="round" />
          <path d="M12 18h46" stroke="#f1dcae" stroke-width="1.2" opacity="0.7" />
        </svg>
        <div>
          <strong>Welcome! Start with My Information.</strong>
          <p>Add your food needs and WhatsApp: your crew sees them on every trip you join. Then check your base currency and trip pacing.</p>
        </div>
        <button type="button" class="st-primary" @click="router.push('/home')">Done, show my trips</button>
      </div>

      <LoadingSkeleton v-if="loading" variant="list" :count="3" label="Loading your settings…" />
      <div v-else class="st-cols">
        <!-- Left column on wide screens -->
        <div class="st-col">
        <!-- ===== Travel Twin (3D avatar; new clothes and gear unlock as trips are finished) ===== -->
        <h2 id="avatar" class="st-group-title"><span class="st-num">01</span>Travel Twin</h2>
        <div class="st-group st-pass">
          <button type="button" class="st-twin" @click="studioOpen = true">
            <span class="st-twin-pic">
              <img v-if="avatar.picture" :src="avatar.picture" alt="">
              <AppIcon v-else name="smile" :size="26" />
            </span>
            <span class="st-twin-text">
              <span class="st-pass-kicker">Explorer pass</span>
              <strong>
                {{ avatar.picture ? 'Your travel twin' : 'Create your travel twin' }}
                <span v-if="twinNew" class="st-twin-new">New gear</span>
              </strong>
              <small>Tier {{ avatar.progress.tier }} · {{ avatar.progress.tierName }} · {{ avatar.progress.xp }} XP · {{ twinNextText }}</small>
              <span class="st-twin-bar" aria-hidden="true"><span :style="{ width: twinProgress + '%' }"></span></span>
            </span>
            <span class="st-twin-cta">Customise <AppIcon name="chevron" :size="14" /></span>
          </button>
        </div>

        <!-- ===== My information ===== -->
        <h2 class="st-group-title"><span class="st-num">02</span>My Information</h2>
        <div class="st-group" :class="{ 'st-spot': welcome }">
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
        <h2 class="st-group-title"><span class="st-num">03</span>Session &amp; Account</h2>
        <div class="st-group">
          <div class="st-row">
            <span class="st-who">
              <span class="st-avatar" aria-hidden="true"><img v-if="avatar.picture" :src="avatar.picture" alt="" class="st-avatar-img"><template v-else>{{ initial }}</template></span>
              <span class="st-row-text">
                <span class="st-row-label">@{{ user.username }}</span>
                <span class="st-row-hint">{{ savedEmail }}</span>
              </span>
            </span>
            <button type="button" class="st-logout" @click="handleLogout">Log out</button>
          </div>
          <!-- Change password: opens a small form right here -->
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Password</span>
              <span class="st-row-hint">{{ pwDone ? '✓ Changed' : 'At least 8 characters' }}</span>
            </span>
            <button type="button" class="st-logout amber" :aria-expanded="pwOpen" aria-controls="st-pw-form" @click="togglePassword">
              {{ pwOpen ? 'Cancel' : 'Change' }}
            </button>
          </div>
          <form v-if="pwOpen" id="st-pw-form" class="st-row stack st-form" @submit.prevent="changePassword">
            <label class="st-field">
              <span>Current password</span>
              <input v-model="pw.current" type="password" class="st-input full" autocomplete="current-password" required>
            </label>
            <label class="st-field">
              <span>New password</span>
              <input v-model="pw.next" type="password" class="st-input full" autocomplete="new-password" minlength="8" required>
            </label>
            <label class="st-field">
              <span>New password again</span>
              <input v-model="pw.again" type="password" class="st-input full" autocomplete="new-password" required>
            </label>
            <p v-if="pwError" class="st-err left" role="alert">{{ pwError }}</p>
            <button type="submit" class="st-primary" :disabled="pwSaving">{{ pwSaving ? 'Saving…' : 'Change password' }}</button>
          </form>
        </div>

        <!-- ===== Delete account (asks for the password first) ===== -->
        <h2 class="st-group-title"><span class="st-num">04</span>Delete Account</h2>
        <div class="st-group">
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Delete my account</span>
              <span class="st-row-hint">This can't be undone</span>
            </span>
            <button type="button" class="st-danger" :aria-expanded="delOpen" aria-controls="st-del-form" @click="toggleDelete">
              {{ delOpen ? 'Cancel' : 'Delete…' }}
            </button>
          </div>
          <form v-if="delOpen" id="st-del-form" class="st-row stack st-form" @submit.prevent="deleteAccount">
            <ul class="st-warn">
              <li>Trips you organise go to the next person who joined. Trips only you are on are deleted.</li>
              <li>On trips you joined, your name stays as a traveller, so the expenses still add up.</li>
              <li>Your friends list and family groups you own are removed.</li>
            </ul>
            <label class="st-field">
              <span>Type your password to confirm</span>
              <input v-model="delPassword" type="password" class="st-input full" autocomplete="current-password" required>
            </label>
            <p v-if="delError" class="st-err left" role="alert">{{ delError }}</p>
            <button type="submit" class="st-danger solid" :disabled="!delPassword || deleting">{{ deleting ? 'Deleting…' : 'Delete my account' }}</button>
          </form>
        </div>
        </div>

        <!-- Right column on wide screens -->
        <div class="st-col">
        <!-- ===== Trip preferences ===== -->
        <h2 class="st-group-title"><span class="st-num">05</span>Trip Preferences</h2>
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

        <!-- ===== Pacing: how the itinerary planner times your days ===== -->
        <h2 id="pacing" class="st-group-title"><span class="st-num">06</span>Trip Pacing</h2>
        <div class="st-group">
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Day starts</span>
              <span class="st-row-hint">Earliest first stop</span>
            </span>
            <CustomDropdown id="st-day-start" v-model="pace.dayStart" :options="startChoices" size="sm" header-text="Day starts" aria-label="Day starts" />
          </div>
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Day ends</span>
              <span class="st-row-hint">Back at the hotel by</span>
            </span>
            <CustomDropdown id="st-day-end" v-model="pace.dayEnd" :options="endChoices" size="sm" header-text="Day ends" aria-label="Day ends" />
          </div>
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Crowds bother me</span>
              <span class="st-row-hint">More = avoid busy times harder</span>
            </span>
            <CustomDropdown id="st-crowd" v-model="pace.crowdSensitivity" :options="crowdChoices" size="sm" header-text="Crowds bother me" aria-label="Crowds bother me" />
          </div>
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Travel buffer</span>
              <span class="st-row-hint">Free time kept between stops</span>
            </span>
            <CustomDropdown id="st-buffer" v-model="pace.travelBuffer" :options="bufferChoices" size="sm" header-text="Travel buffer" aria-label="Travel buffer" />
          </div>
          <p v-if="paceError" class="st-err" role="alert">{{ paceError }}</p>
        </div>

        <!-- ===== Transport: how the itinerary suggests travelling between stops ===== -->
        <h2 id="getting-around" class="st-group-title"><span class="st-num">07</span>Transport</h2>
        <div class="st-group">
          <div class="st-row stack">
            <span class="st-row-text">
              <span class="st-row-label" id="st-modes-label">Ways I'm happy to travel</span>
              <span class="st-row-hint">Only these are suggested between your stops</span>
            </span>
            <div class="st-modes" role="group" aria-labelledby="st-modes-label">
              <button v-for="m in TRAVEL_CHOICES" :key="m.value" type="button" class="st-mode" role="checkbox"
                :aria-checked="pace.travelModes.includes(m.value)" :class="{ on: pace.travelModes.includes(m.value) }"
                :disabled="pace.travelModes.length === 1 && pace.travelModes.includes(m.value)"
                :title="pace.travelModes.length === 1 && pace.travelModes.includes(m.value) ? 'Keep at least one' : ''"
                @click="toggleMode(m.value)">
                <AppIcon :name="m.icon" :size="15" /> {{ m.label }}
              </button>
            </div>
          </div>
          <div class="st-row">
            <span class="st-row-text">
              <span class="st-row-label">Longest walk</span>
              <span class="st-row-hint">Longer than this: transit or a taxi instead</span>
            </span>
            <CustomDropdown id="st-max-walk" v-model="pace.maxWalk" :options="walkChoices" size="sm" header-text="Longest walk" aria-label="Longest walk" />
          </div>
          <div class="st-row stack">
            <span class="st-row-text">
              <span class="st-row-label" id="st-priority-label">Put first</span>
              <span class="st-row-hint">{{ priorityHint }}</span>
            </span>
            <div class="st-modes" role="radiogroup" aria-labelledby="st-priority-label">
              <button v-for="c in priorityChoices" :key="c.value" type="button" class="st-mode" role="radio"
                :aria-checked="pace.travelPriority === c.value" :class="{ on: pace.travelPriority === c.value }"
                @click="pace.travelPriority = c.value">{{ c.label }}</button>
            </div>
          </div>
        </div>

        <!-- ===== Safety & notifications ===== -->
        <h2 class="st-group-title"><span class="st-num">08</span>Safety &amp; Notifications</h2>
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

    <AvatarStudio :open="studioOpen" @close="studioOpen = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { auth, logout, saveLogin } from '../auth.js'
import { CURRENCIES } from '../expenses.js'
import { prefs, loadPreferences, savePreferences } from '../preferences.js'
import { formatHour } from '../crowd.js'
import CustomDropdown from '../components/CustomDropdown.vue'
import DietTagsInput from '../components/DietTagsInput.vue'
import PhoneInput from '../components/PhoneInput.vue'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import AppIcon from '../components/AppIcon.vue'
import AvatarStudio from '../components/AvatarStudio.vue'
import { avatar, loadAvatar, loadProgress, newUnlocks } from '../avatarStore.js'
import { loadThree } from '../services/three.js'

const router = useRouter()
const route = useRoute()
const welcome = computed(() => route.query.welcome === '1') // opened from the new-account prompt

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

// ----- Travel Twin card -----
const studioOpen = ref(false)
const twinNew = computed(() => newUnlocks().length > 0)
const twinProgress = computed(() => {
  const P = avatar.progress
  if (!P.next) return 100
  const from = P.tier === 1 ? 0 : P.tier === 2 ? 40 : 120
  return Math.round(((P.xp - from) / (P.next.min - from)) * 100)
})
const twinNextText = computed(() => {
  const P = avatar.progress
  return P.next ? P.next.min - P.xp + ' XP to ' + P.next.name : 'all gear unlocked'
})
loadAvatar()
loadProgress()
// Start loading the 3D engine in the background, so the studio opens straight away
setTimeout(() => loadThree().catch(() => {}), 1500)
if (route.hash === '#avatar') studioOpen.value = true
watch(() => route.hash, (h) => { if (h === '#avatar') studioOpen.value = true }) // menu link while already here

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

// ----- Pacing (its own API: /api/preferences) -----
const startChoices = []
for (let h = 5; h <= 12; h++) startChoices.push({ value: h, label: formatHour(h) })
const endChoices = []
for (let h = 17; h <= 24; h++) endChoices.push({ value: h, label: h === 24 ? 'Midnight' : formatHour(h) })
const crowdChoices = [
  { value: 'low', label: 'A little' },
  { value: 'medium', label: 'Somewhat' },
  { value: 'high', label: 'A lot' }
]
const bufferChoices = [
  { value: 0, label: 'None' },
  { value: 0.25, label: '15 min' },
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hour' }
]
const pace = reactive({ ...prefs, travelModes: (prefs.travelModes || []).slice() })

// ----- Transport -----
const TRAVEL_CHOICES = [
  { value: 'walk', label: 'Walking', icon: 'footprints' },
  { value: 'transit', label: 'Public transport', icon: 'train' },
  { value: 'taxi', label: 'Taxi / ride-hail', icon: 'car' },
  { value: 'bike', label: 'Cycling', icon: 'bike' }
]
const walkChoices = [10, 15, 20, 30, 45].map((m) => ({ value: m, label: m + ' min' }))
const priorityChoices = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'cheapest', label: 'Cheapest' }
]
const priorityHint = computed(() => ({
  balanced: 'Walk when it\'s short, else transit; a taxi only when it saves a lot',
  fastest: 'The quickest way, even if it costs more',
  cheapest: 'Walk or transit, a taxi only if nothing else is allowed'
})[pace.travelPriority] || '')
function toggleMode(mode) {
  const list = pace.travelModes.slice()
  const i = list.indexOf(mode)
  if (i >= 0) {
    if (list.length === 1) return // keep at least one
    list.splice(i, 1)
  } else {
    list.push(mode)
  }
  pace.travelModes = list
}
const paceError = ref('')
let paceTimer = null
async function loadPace() {
  try {
    await loadPreferences()
    Object.assign(pace, prefs, { travelModes: (prefs.travelModes || ['walk', 'transit', 'taxi']).slice() })
  } catch (err) {
    // keep the defaults
  }
  watch(pace, () => {
    paceError.value = ''
    if (pace.dayEnd - pace.dayStart < 4) {
      paceError.value = 'Your day needs to be at least 4 hours long.'
      return
    }
    status.value = 'saving'
    clearTimeout(paceTimer)
    paceTimer = setTimeout(savePace, 500)
  })
  // Opened from the menu's "Trip pacing": scroll down to it
  // Opened from the menu's "Trip pacing" or a travel panel's "Change": scroll down to that section
  if (route.hash === '#pacing' || route.hash === '#getting-around') {
    setTimeout(() => {
      const el = document.getElementById(route.hash.slice(1))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350) // after the page has faded in
  }
}
async function savePace() {
  paceTimer = null
  try {
    await savePreferences({ ...pace })
    status.value = 'saved'
  } catch (err) {
    status.value = 'error'
    paceError.value = (err.response && err.response.data && err.response.data.message) || 'Could not save.'
  }
}
loadPace()

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
// Dropdown menus open on <body>: this class lets them match the paper look while Settings is open
onMounted(() => document.body.classList.add('st-paper'))
onBeforeUnmount(() => {
  document.body.classList.remove('st-paper')
  clearTimeout(timer)
  if (paceTimer) {
    clearTimeout(paceTimer)
    savePace()
  }
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
  else router.push('/home')
}

function handleLogout() {
  logout()
  router.push('/login')
}

// ----- Change password -----
const pwOpen = ref(false)
const pw = reactive({ current: '', next: '', again: '' })
const pwError = ref('')
const pwSaving = ref(false)
const pwDone = ref(false)
function togglePassword() {
  pwOpen.value = !pwOpen.value
  pwError.value = ''
  pw.current = ''
  pw.next = ''
  pw.again = ''
}
async function changePassword() {
  pwError.value = ''
  if (pw.next.length < 8) {
    pwError.value = 'The new password must be at least 8 characters.'
    return
  }
  if (pw.next !== pw.again) {
    pwError.value = 'The two new passwords don\'t match.'
    return
  }
  pwSaving.value = true
  try {
    await axios.put('/api/auth/password', { currentPassword: pw.current, newPassword: pw.next })
    togglePassword() // close and clear the form
    pwDone.value = true
  } catch (err) {
    pwError.value = (err.response && err.response.data && err.response.data.message) || 'Could not change the password.'
  }
  pwSaving.value = false
}

// ----- Delete account -----
const delOpen = ref(false)
const delPassword = ref('')
const delError = ref('')
const deleting = ref(false)
function toggleDelete() {
  delOpen.value = !delOpen.value
  delPassword.value = ''
  delError.value = ''
}
async function deleteAccount() {
  delError.value = ''
  deleting.value = true
  try {
    await axios.delete('/api/auth/me', { data: { password: delPassword.value } })
    logout()
    router.push('/')
  } catch (err) {
    delError.value = (err.response && err.response.data && err.response.data.message) || 'Could not delete the account.'
    deleting.value = false
  }
}
</script>

<style scoped>
/* ===== Explorer's Field Guide, night edition =====
   A deep navy-slate card on the cream page. One clean font throughout. */
.st-page {
  position: relative;
  max-width: 1152px; /* about max-w-6xl */
  margin: 0 auto;
  padding-bottom: 48px;
  --paper: #0f172a; /* the card */
  --slip: #132238; /* subsection cards */
  --field: #0b131d; /* inputs and dropdowns */
  --ink: #f8fafc; /* main text */
  --ink-2: #334155; /* borders */
  --soft: #cbd5e1;
  --muted: #94a3b8;
  --rule: rgba(148, 163, 184, 0.16);
  --brass: #c9a46a;
  --brass-dark: #d9b97e;
  --teal: #2f8f94;
  --teal-dark: #1f5f63;
  --teal-hi: #5fbfc4;
  --amber: #e0a43a;
  --amber-dark: #8a5a17;
  --on-amber: #1a1408;
  --oxblood: #f87171;
  color: #1f2f3d;
}

/* Faded notebook marks in the empty side margins, only when there is room for them */
.st-margin {
  display: none;
  position: absolute;
  top: 90px;
  bottom: 60px;
  width: 110px;
  flex-direction: column;
  align-items: center;
  gap: 26px;
  pointer-events: none;
  color: rgba(31, 47, 61, 0.09);
}
.st-margin.left {
  right: calc(100% + 28px);
}
.st-margin.right {
  left: calc(100% + 28px);
}
.st-margin-compass,
.st-margin-stamp {
  width: 96px;
}
.st-margin-stamp {
  transform: rotate(-12deg);
}
.st-margin-route {
  width: 40px;
}
.st-margin-stars {
  width: 54px;
}
/* a faint double marginalia line, like the red rule on notebook paper */
.st-margin-rule {
  flex: 1;
  max-height: 340px;
  width: 5px;
  border-left: 1px solid rgba(156, 58, 58, 0.14);
  border-right: 1px solid rgba(156, 58, 58, 0.14);
}
@media (min-width: 1400px) {
  .st-margin {
    display: flex;
  }
}

/* Go back: a small paper tab */
.st-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 14px 0 10px;
  margin-bottom: 14px;
  border: 1.5px solid #3a4a57;
  border-radius: 8px;
  background: #fffdf8;
  color: #1f2f3d;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 2px 0 #3a4a57;
  transition: transform 0.12s, box-shadow 0.12s;
}
.st-back svg {
  transition: transform 0.15s;
}
.st-back:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 0 #3a4a57;
}
.st-back:hover svg {
  transform: translateX(-2px);
}
.st-back:active {
  transform: translateY(2px);
  box-shadow: 0 0 0 #3a4a57;
}

/* The card: deep navy-slate with a faint grid, a fold down the middle on wide screens */
.st {
  position: relative;
  overflow: hidden;
  padding: 22px;
  border: 1px solid #1e293b;
  border-radius: 14px;
  background:
    linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--paper);
  color: var(--ink);
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.2);
}
.st-motif {
  position: absolute;
  pointer-events: none;
  color: rgba(148, 163, 184, 0.1);
  /* debossed: a dark edge below the line */
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.45));
}
.st-motif.rose {
  top: 14px;
  right: 18px;
  width: 120px;
}
.st-motif.stars {
  left: 14px;
  bottom: 12px;
  width: 110px;
}
.st-cols {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0 44px;
}
.st-col {
  min-width: 0;
}
@media (min-width: 860px) {
  .st {
    padding: 32px 36px 40px;
  }
  .st-cols {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  /* the fold between the two pages */
  .st-cols::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 10px;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, var(--rule) 8%, var(--rule) 92%, transparent);
    box-shadow: 1px 0 0 rgba(0, 0, 0, 0.35);
  }
}
/* wide screens: a little more room around and between the two columns */
@media (min-width: 1200px) {
  .st {
    padding: 36px 44px 44px;
  }
  .st-cols {
    gap: 0 56px;
  }
}
.st-head {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 6px;
  padding-bottom: 12px;
  border-bottom: 1.5px solid var(--ink-2);
  box-shadow: 0 3px 0 -1.5px var(--paper), 0 4.5px 0 -1.5px var(--rule); /* a double rule under the title */
  padding-right: 120px; /* clear of the compass rose */
}
.st-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--ink);
}
.st-sub {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13.5px;
}

/* Auto-save status: a small inked stamp */
.st-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  margin-top: 8px;
  padding: 3px 9px;
  border: 1.5px solid currentColor;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--teal-hi);
  transform: rotate(-2deg);
}
.st-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.st-status.saving {
  color: var(--muted);
}
.st-status.saving .st-status-dot {
  animation: st-blink 0.8s infinite alternate;
}
.st-status.error {
  color: var(--oxblood);
}

/* Section headings: a number, the name, and a rule running out to the edge */
.st-group-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 28px 2px 10px;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--ink);
}
.st-group-title::after {
  content: '';
  flex: 1;
  align-self: center;
  border-bottom: 1px solid var(--rule);
}
.st-num {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--brass);
}

/* Each group: a subsection card with a fine inner margin */
.st-group {
  position: relative;
  background: var(--slip);
  border: 1px solid var(--ink-2);
  border-radius: 8px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
}
.st-group::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  pointer-events: none;
}
.st-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px dashed var(--rule);
}
.st-row:last-child {
  border-bottom: 0;
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
  font-weight: 700;
  color: var(--ink);
}
.st-row-hint {
  font-size: 12.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Inputs: dark wells with white text */
.st-input {
  flex: 1;
  max-width: 280px;
  min-width: 0;
  padding: 8px 10px;
  border: 1.5px solid var(--ink-2);
  border-radius: 4px;
  background: var(--field);
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  text-align: right;
  color-scheme: dark;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.st-input:focus {
  outline: none;
  text-align: left;
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(95, 191, 196, 0.22);
}
.st-input[aria-invalid='true'] {
  border-color: var(--oxblood);
}
.st-err {
  margin: 0;
  padding: 0 16px 10px;
  color: var(--oxblood);
  font-size: 12.5px;
  font-weight: 600;
  text-align: right;
}

/* Shared controls, restyled for the dark card */
/* dropdowns: dark wells with an amber edge */
.st-page .st :deep(.dd-trigger) {
  height: 36px;
  padding: 0 10px 0 12px;
  border: 1.5px solid var(--ink-2);
  border-left: 4px solid var(--amber);
  border-radius: 5px;
  background: var(--field);
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 700;
  box-shadow: 0 2px 0 var(--ink-2);
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.15s;
}
.st-page .st :deep(.dd-trigger:hover:not(:disabled)) {
  transform: translateY(-1px);
  box-shadow: 0 3px 0 var(--ink-2);
}
.st-page .st :deep(.dd-trigger:active:not(:disabled)) {
  transform: translateY(2px);
  box-shadow: 0 0 0 var(--ink-2);
}
.st-page .st :deep(.dd.open .dd-trigger),
.st-page .st :deep(.dd-trigger:focus-visible) {
  border-color: var(--teal);
  border-left-color: var(--amber);
  box-shadow: 0 2px 0 var(--teal), 0 0 0 3px rgba(95, 191, 196, 0.22);
}
.st-page .st :deep(.dd-chevron),
.st-page .st :deep(.dd.open .dd-chevron) {
  color: var(--brass-dark);
}
.st-page .st :deep(.dd-value.placeholder) {
  color: var(--muted);
}
/* food needs */
.st-page .st :deep(.dt) {
  border: 1.5px solid var(--ink-2);
  border-radius: 4px;
  background: var(--field);
}
.st-page .st :deep(.dt.focus) {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(95, 191, 196, 0.22);
}
.st-page .st :deep(.dt-input) {
  color: var(--ink);
  font-weight: 600;
}
.st-page .st :deep(.dt-input::placeholder),
.st-page .st :deep(.pi-number::placeholder) {
  color: #64748b;
}
.st-page .st :deep(.dt-tag) {
  border: 1px solid #475569;
  border-radius: 3px;
  background: #1e293b;
  color: var(--ink);
}
.st-page .st :deep(.dt-tag.allergy) {
  border-color: var(--oxblood);
  background: rgba(248, 113, 113, 0.12);
  color: #fecaca;
}
.st-page .st :deep(.dt-x:hover),
.st-page .st :deep(.dt-x:focus-visible) {
  background: rgba(148, 163, 184, 0.18);
}
.st-page .st :deep(.dt-menu) {
  border: 1.5px solid var(--ink-2);
  border-radius: 5px;
  background: var(--field);
  color: var(--ink);
  box-shadow: 0 14px 30px -12px rgba(0, 0, 0, 0.6);
  backdrop-filter: none;
}
.st-page .st :deep(.dt-menu li.active) {
  background: #1e293b;
  color: var(--ink);
}
.st-page .st :deep(.dt-hint) {
  color: var(--muted);
}
/* WhatsApp */
.st-page .st :deep(.pi) {
  border: 1.5px solid var(--ink-2);
  border-radius: 4px;
  background: var(--field);
}
.st-page .st :deep(.pi:focus-within) {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(95, 191, 196, 0.22);
}
.st-page .st :deep(.pi-code .dd-trigger) {
  height: 100%;
  border: 0;
  border-right: 1.5px solid var(--ink-2);
  border-radius: 0;
  background: var(--slip);
  box-shadow: none;
  transform: none;
}
.st-page .st :deep(.pi-number) {
  color: var(--ink);
  font-weight: 600;
  color-scheme: dark;
}

/* km / mi: a two-way toggle with an amber thumb */
.st-seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: none;
  padding: 3px;
  border: 1.5px solid var(--ink-2);
  border-radius: 6px;
  background: var(--field);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
}
.st-seg-thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  border-radius: 4px;
  background: linear-gradient(180deg, #e8b24f, var(--amber));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 1px 0 var(--amber-dark);
  transition: transform 0.25s cubic-bezier(0.3, 1.2, 0.5, 1);
}
.st-seg.right .st-seg-thumb {
  transform: translateX(100%);
}
.st-seg button {
  position: relative;
  padding: 6px 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--soft);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  transition: color 0.2s;
}
.st-seg button.on {
  color: var(--on-amber);
}

/* On/off: teal when on, with a brass knob */
.st-switch {
  position: relative;
  flex: none;
  width: 46px;
  height: 26px;
  padding: 0;
  border: 1.5px solid var(--ink-2);
  border-radius: 999px;
  background: var(--field);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
  transition: background 0.2s, border-color 0.2s;
}
.st-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  border: 1.5px solid var(--ink-2);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f6e6c4, var(--brass));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  transition: transform 0.25s cubic-bezier(0.3, 1.2, 0.5, 1);
}
.st-switch[aria-checked='true'] {
  background: var(--teal);
  border-color: var(--teal-hi);
}
.st-switch[aria-checked='true'] .st-knob {
  transform: translateX(20px);
}

/* Account: an identity badge */
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
  width: 40px;
  height: 40px;
  border: 1.5px solid var(--ink-2);
  border-radius: 50%;
  outline: 1px solid var(--rule);
  outline-offset: 2px;
  background: repeating-linear-gradient(45deg, #1e293b 0 3px, #172033 3px 4px);
  color: var(--ink);
  font-size: 1rem;
  font-weight: 800;
}
.st-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  filter: sepia(0.25) contrast(1.05);
}
/* tactile buttons: brass-teal (Log out) and burnished amber (Change) */
.st-logout {
  flex: none;
  padding: 7px 14px;
  border: 1.5px solid var(--teal-dark);
  border-radius: 6px;
  background: linear-gradient(180deg, #3aa3a8, var(--teal));
  color: #f8fafc;
  font-size: 13px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 3px 0 var(--teal-dark);
  transition: transform 0.12s, box-shadow 0.12s;
}
.st-logout.amber {
  border-color: var(--amber-dark);
  background: linear-gradient(180deg, #e8b24f, var(--amber));
  color: var(--on-amber);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 3px 0 var(--amber-dark);
}
.st-logout:hover {
  transform: translateY(-1px);
}
.st-logout:active {
  transform: translateY(3px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 0 var(--teal-dark);
}

/* Welcome: a ruled field note held by a brass clip */
.st-welcome {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 26px 0 6px;
  padding: 22px 18px 16px;
  border: 1.5px solid #3a4a57;
  border-radius: 4px;
  color: #1f2f3d;
  background:
    linear-gradient(90deg, transparent 0 30px, rgba(156, 58, 58, 0.25) 30px 31px, transparent 31px),
    repeating-linear-gradient(180deg, transparent 0 23px, rgba(47, 111, 115, 0.12) 23px 24px),
    #fffdf7;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3), 0 14px 24px -16px rgba(0, 0, 0, 0.6);
  transform: rotate(-0.4deg);
  font-size: 14px;
}
.st-clip {
  position: absolute;
  top: -16px;
  left: 50px;
  width: 64px;
  filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.2));
}
.st-welcome > div {
  padding-left: 22px;
}
.st-welcome strong {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
}
.st-welcome p {
  margin: 4px 0 0;
  color: #3a4a57;
  font-size: 13.5px;
  line-height: 1.5;
}
.st-welcome .st-primary {
  flex: none;
  align-self: center;
  margin-left: auto;
}
.st-spot {
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(224, 164, 58, 0.55);
}
@media (max-width: 640px) {
  .st-welcome {
    flex-wrap: wrap;
  }
  .st-welcome .st-primary {
    margin-left: 22px;
  }
}

/* Transport: vintage tickets with notched sides (the outline follows the notches) */
.st-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
}
.st-mode {
  --tk: var(--field);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 0;
  background:
    radial-gradient(circle at 0 50%, transparent 5px, var(--tk) 5.5px) left / 51% 100% no-repeat,
    radial-gradient(circle at 100% 50%, transparent 5px, var(--tk) 5.5px) right / 51% 100% no-repeat;
  color: var(--soft);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  filter:
    drop-shadow(1.2px 0 0 var(--tk-edge, #475569)) drop-shadow(-1.2px 0 0 var(--tk-edge, #475569))
    drop-shadow(0 1.2px 0 var(--tk-edge, #475569)) drop-shadow(0 -1.2px 0 var(--tk-edge, #475569));
  transition: transform 0.12s, color 0.15s;
}
.st-mode:hover:not(:disabled) {
  transform: translateY(-1px);
}
.st-mode:active:not(:disabled) {
  transform: translateY(1px);
}
.st-mode.on {
  --tk: var(--amber);
  --tk-edge: var(--amber-dark);
  color: var(--on-amber);
}
.st-mode:disabled {
  cursor: not-allowed;
}
.st-mode:focus-visible {
  outline: 2px solid var(--teal-hi);
  outline-offset: 3px;
}

/* Password and delete-account forms */
.st-form {
  gap: 12px;
  padding-top: 4px;
  padding-bottom: 16px;
}
.st-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--soft);
}
.st-input.full {
  max-width: none;
  text-align: left;
  padding: 10px 12px;
  text-transform: none;
  letter-spacing: 0;
}
.st-err.left {
  text-align: left;
  padding: 0;
}
/* burnished amber primary button */
.st-primary,
.st-danger.solid {
  align-self: flex-start;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 14px;
  transition: transform 0.12s, box-shadow 0.12s, opacity 0.15s;
}
.st-primary {
  border: 1.5px solid var(--amber-dark);
  background: linear-gradient(180deg, #e8b24f, var(--amber));
  color: var(--on-amber);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 0 var(--amber-dark);
}
.st-primary:hover:not(:disabled),
.st-danger.solid:hover:not(:disabled) {
  transform: translateY(-1px);
}
.st-primary:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 0 0 var(--amber-dark);
}
.st-primary:disabled,
.st-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.st-danger {
  flex: none;
  padding: 7px 14px;
  border: 1.5px solid var(--oxblood);
  border-radius: 6px;
  background: rgba(248, 113, 113, 0.08);
  color: var(--oxblood);
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 0 #7f1d1d;
  transition: transform 0.12s, box-shadow 0.12s, background 0.15s;
}
.st-danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.16);
}
.st-danger:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 0 0 var(--oxblood);
}
.st-danger.solid {
  border: 1.5px solid #7f1d1d;
  background: #dc2626;
  color: #fff;
  box-shadow: 0 4px 0 #7f1d1d;
}
.st-warn {
  margin: 0;
  padding: 12px 14px 12px 30px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-left: 3px solid var(--oxblood);
  border-radius: 3px;
  background: rgba(248, 113, 113, 0.08);
  color: var(--ink);
  font-size: 13px;
  line-height: 1.5;
}

/* Focus rings */
.st-back:focus-visible,
.st-seg button:focus-visible,
.st-switch:focus-visible,
.st-logout:focus-visible,
.st-primary:focus-visible,
.st-danger:focus-visible {
  outline: 2px solid var(--teal-hi);
  outline-offset: 3px;
}
@keyframes st-blink {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

/* Travel Twin: an embossed explorer pass with a perforated edge */
.st-pass {
  padding: 5px;
  border: 0;
  border-radius: 8px;
  background: radial-gradient(circle, transparent 2.2px, #1e293b 2.6px) -4px -4px / 9px 9px;
  box-shadow: none;
}
.st-pass::before {
  display: none;
}
.st-twin {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1.5px solid var(--ink-2);
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 40%),
    var(--slip);
  /* embossed */
  box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.06), inset -1px -1px 0 rgba(0, 0, 0, 0.35);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s;
}
.st-twin:hover {
  transform: translateY(-1px);
}
.st-twin:focus-visible {
  outline: 2px solid var(--teal-hi);
  outline-offset: 3px;
}
/* the portrait: an etched medallion (double ring, fine hatching, a little sepia) */
.st-twin-pic {
  flex: none;
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1.5px solid var(--ink-2);
  border-radius: 50%;
  outline: 1px solid var(--ink-2);
  outline-offset: 3px;
  background: repeating-linear-gradient(45deg, #1e293b 0 3px, #172033 3px 4px);
  color: var(--muted);
}
.st-twin-pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: sepia(0.3) contrast(1.05) saturate(0.9);
}
.st-twin-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.st-pass-kicker {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brass-dark);
}
.st-twin-text strong {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.25;
}
.st-twin-text small {
  font-size: 12.5px;
  color: var(--muted);
}
.st-twin-new {
  margin-left: 6px;
  padding: 1px 6px;
  border: 1px solid var(--oxblood);
  border-radius: 3px;
  color: var(--oxblood);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  vertical-align: 4px;
}
.st-twin-bar {
  display: block;
  height: 4px;
  margin-top: 5px;
  max-width: 220px;
  border: 1px solid var(--ink-2);
  border-radius: 2px;
  background: var(--field);
  overflow: hidden;
}
.st-twin-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--brass), #d9b97e);
}
.st-twin-cta {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1.5px solid var(--amber-dark);
  border-radius: 6px;
  background: linear-gradient(180deg, #e8b24f, var(--amber));
  font-size: 13px;
  font-weight: 800;
  color: var(--on-amber);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 2px 0 var(--amber-dark);
}
.st-twin:active .st-twin-cta {
  transform: translateY(2px);
  box-shadow: 0 0 0 var(--amber-dark);
}

@media (max-width: 480px) {
  .st {
    padding: 16px;
    border-radius: 10px;
  }
  .st-head {
    padding-right: 0;
  }
  .st-motif.rose {
    width: 80px;
    opacity: 0.6;
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
  .st-twin-cta {
    font-size: 0;
    padding: 6px 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .st-status-dot, .st-seg-thumb, .st-knob, .st-switch, .st-back, .st-back svg {
    animation: none;
    transition: none;
  }
}
/* Phones and touch screens: every control is at least 40px to tap */
@media (pointer: coarse), (max-width: 560px) {
  .st-seg button {
    min-height: 40px;
  }
  .st-switch::after {
    content: '';
    position: absolute;
    inset: -9px -4px;
  }
}
</style>

<!-- The dropdown menus open on <body>; while Settings is open they match the dark card -->
<style>
body.st-paper .dd-menu.dd-menu {
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0b131d;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: 0 18px 34px -14px rgba(0, 0, 0, 0.6);
  color: #f8fafc;
}
body.st-paper .dd-menu.dd-menu .dd-header {
  color: #c9a46a;
}
body.st-paper .dd-menu.dd-menu .dd-search {
  border: 1px solid #334155;
  border-radius: 4px;
  background: #132238;
  color: #94a3b8;
}
body.st-paper .dd-menu.dd-menu .dd-search input {
  color: #f8fafc;
}
body.st-paper .dd-menu.dd-menu .dd-list li.active {
  background: #1e293b;
}
body.st-paper .dd-menu.dd-menu .dd-list li.selected {
  color: #f2c16b;
  font-weight: 800;
}
body.st-paper .dd-menu.dd-menu .dd-list li.selected.active {
  background: #1e293b;
}
body.st-paper .dd-menu.dd-menu .dd-desc,
body.st-paper .dd-menu.dd-menu .dd-empty {
  color: #94a3b8;
}
body.st-paper .dd-menu.dd-menu .dd-check {
  color: #e0a43a;
  filter: none;
}
</style>
