<template>
  <!-- Invite page: what you see after opening a /join/<code> link -->
  <div class="jv">
    <div v-if="loading" class="jv-card jv-skel" aria-busy="true">
      <div class="jv-photo"></div>
      <div class="jv-body"><p class="jv-muted">Opening your invite…</p></div>
    </div>

    <div v-else-if="error" class="jv-card">
      <div class="jv-body text-center">
        <div class="jv-big-icon" aria-hidden="true">🔗</div>
        <h1 class="jv-title">Invite not found</h1>
        <p class="jv-muted">{{ error }}</p>
        <router-link to="/" class="jv-btn">Go to my trips</router-link>
      </div>
    </div>

    <article v-else class="jv-card">
      <div class="jv-photo" :style="photo ? { backgroundImage: 'url(' + photo + ')' } : null">
        <span class="jv-from">
          <span class="jv-av" aria-hidden="true">{{ trip.invitedBy.charAt(0).toUpperCase() }}</span>
          {{ trip.invitedBy }} invited you
        </span>
      </div>

      <div class="jv-body">
        <h1 class="jv-title">{{ trip.name }}</h1>
        <p class="jv-route">
          <span v-for="(d, i) in trip.destinations" :key="d">
            <span v-if="i > 0" class="jv-arrow" aria-hidden="true">→</span>
            {{ flagFor(d) }} {{ d.split(', ')[0] }}
          </span>
        </p>
        <p class="jv-meta">🗓 {{ dateText }}</p>

        <div class="jv-going">
          <span class="jv-faces" aria-hidden="true">
            <span v-for="(m, i) in trip.members.slice(0, 5)" :key="m.name" class="jv-face" :style="{ zIndex: 10 - i }">{{ m.name.charAt(0).toUpperCase() }}</span>
          </span>
          <span>{{ goingText }}</span>
        </div>

        <!-- Already in -->
        <template v-if="trip.alreadyMember">
          <p class="jv-note">✓ You're already on this trip.</p>
          <router-link :to="'/trip/' + trip.id" class="jv-btn">Open trip →</router-link>
        </template>

        <template v-else>
          <!-- Claim a name the organiser already listed, so past expenses and votes line up -->
          <fieldset v-if="trip.guests.length" class="jv-who">
            <legend class="jv-legend">Which one is you?</legend>
            <div class="jv-options">
              <label v-for="g in trip.guests" :key="g" class="jv-option" :class="{ on: as === g }">
                <input v-model="as" type="radio" name="as" :value="g">
                <span class="jv-av sm" aria-hidden="true">{{ g.charAt(0).toUpperCase() }}</span> {{ g }}
              </label>
              <label class="jv-option" :class="{ on: as === '' }">
                <input v-model="as" type="radio" name="as" value="">
                <span class="jv-av sm new" aria-hidden="true">+</span> Not listed, join as {{ myName }}
              </label>
            </div>
          </fieldset>

          <p v-if="joinError" class="jv-error" role="alert">{{ joinError }}</p>
          <button type="button" class="jv-btn" :disabled="joining" @click="join" data-testid="join-btn">
            {{ joining ? 'Joining…' : 'Join trip →' }}
          </button>
          <p class="jv-small">You'll be able to see the plan, vote, add expenses and share photos.</p>
        </template>
      </div>
    </article>
  </div>
</template>

<script>
import axios from 'axios'
import { auth } from '../auth.js'
import { codeForDestination, flagEmoji } from '../destinations.js'

export default {
  props: { code: { type: String, required: true } },

  data() {
    return {
      loading: true,
      error: '',
      trip: null,
      photo: '',
      as: null,
      joining: false,
      joinError: ''
    }
  },

  computed: {
    myName() {
      return auth.user ? auth.user.name : 'yourself'
    },
    dateText() {
      const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      if (!this.trip.startDate) return 'Dates not set yet'
      return this.trip.endDate ? fmt(this.trip.startDate) + ' – ' + fmt(this.trip.endDate) : 'From ' + fmt(this.trip.startDate)
    },
    // "Kay, Mei and 2 others are going"
    goingText() {
      const names = this.trip.members.map((m) => m.name)
      if (names.length === 1) return names[0] + ' is going'
      if (names.length === 2) return names[0] + ' and ' + names[1] + ' are going'
      return names.slice(0, 2).join(', ') + ' and ' + (names.length - 2) + ' other' + (names.length === 3 ? '' : 's') + ' are going'
    }
  },

  async created() {
    try {
      const res = await axios.get('/api/join/' + this.code)
      this.trip = res.data
      // Pre-pick the listed name that matches mine, if there is one
      const match = this.trip.guests.find((g) => auth.user && g.toLowerCase() === auth.user.name.toLowerCase())
      this.as = match || (this.trip.guests.length ? null : '')
      this.loadPhoto()
    } catch (err) {
      this.error = (err.response && err.response.data && err.response.data.message) || 'Could not open this invite. Is the server running?'
    }
    this.loading = false
  },

  methods: {
    flagFor(d) {
      return flagEmoji(codeForDestination(d))
    },

    async loadPhoto() {
      try {
        const res = await axios.get('/api/places/photo', { params: { destination: this.trip.destinations[0], size: 'small' } })
        if (res.data.url) this.photo = res.data.url
      } catch (err) {
        // the green gradient stays
      }
    },

    async join() {
      if (this.as === null) {
        this.joinError = 'Pick your name, or "Not listed".'
        return
      }
      this.joining = true
      this.joinError = ''
      try {
        const res = await axios.post('/api/join/' + this.code, { as: this.as })
        this.$router.push('/trip/' + res.data.id)
      } catch (err) {
        this.joinError = (err.response && err.response.data && err.response.data.message) || 'Could not join. Try again.'
      }
      this.joining = false
    }
  }
}
</script>

<style scoped>
.jv {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0 48px;
}
.jv-card {
  width: min(480px, 100%);
  background: #fff;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(16, 40, 34, 0.15);
  animation: jv-in 0.35s ease;
}
.jv-photo {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #0b7f5f, #0b1210) center / cover no-repeat;
}
.jv-photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.45));
}
.jv-from {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  font-weight: 600;
  font-size: 14px;
}
.jv-body {
  padding: 22px 26px 26px;
}
.jv-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 2rem;
  margin: 0 0 4px;
}
.jv-route {
  font-size: 1.05rem;
  margin: 0 0 2px;
}
.jv-arrow {
  margin: 0 6px;
  color: #0b7f5f;
}
.jv-meta,
.jv-muted {
  color: #5f6f6b;
}
.jv-going {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 20px;
  font-size: 14px;
}
.jv-faces {
  display: flex;
}
.jv-face,
.jv-av {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #0b7f5f;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.jv-face {
  position: relative;
  margin-left: -8px;
  border: 2px solid #fff;
}
.jv-face:first-child {
  margin-left: 0;
}
.jv-av.sm {
  width: 26px;
  height: 26px;
  font-size: 12px;
}
.jv-av.new {
  background: #eef4f2;
  color: #0b7f5f;
}
.jv-who {
  margin-bottom: 16px;
}
.jv-legend {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
  float: none;
}
.jv-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.jv-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid #e3e9e7;
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.jv-option input {
  position: absolute;
  opacity: 0;
}
.jv-option.on {
  border-color: #0b7f5f;
  background: #eef8f4;
}
.jv-option:focus-within {
  outline: 3px solid rgba(11, 127, 95, 0.35);
  outline-offset: 2px;
}
.jv-btn {
  display: block;
  width: 100%;
  text-align: center;
  border: 0;
  border-radius: 999px;
  background: #1f2d2a;
  color: #dcf5a6;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 13px;
  text-decoration: none;
  transition: background 0.15s, transform 0.15s;
}
.jv-btn:hover:not(:disabled) {
  background: #0b7f5f;
  color: #fff;
  transform: translateY(-1px);
}
.jv-btn:disabled {
  opacity: 0.6;
}
.jv-btn:focus-visible {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 3px;
}
.jv-note {
  font-weight: 600;
  color: #0b7f5f;
}
.jv-error {
  color: #c0392b;
  font-size: 14px;
}
.jv-small {
  text-align: center;
  font-size: 13px;
  color: #5f6f6b;
  margin: 12px 0 0;
}
.jv-big-icon {
  font-size: 44px;
}
.jv-skel .jv-photo {
  animation: jv-pulse 1.2s infinite;
}
@keyframes jv-in {
  from { opacity: 0; transform: translateY(12px); }
}
@keyframes jv-pulse {
  50% { opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) {
  .jv-card, .jv-skel .jv-photo { animation: none; }
}
</style>
