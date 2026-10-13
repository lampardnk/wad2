<template>
  <div class="setup">
    <!-- New-trip setup: /trip/:id/setup/invite, then /wishlist, then /vote -->
    <p v-if="loading" class="text-muted">Loading trip…</p>
    <div v-else-if="loadError" class="alert alert-warning">
      {{ loadError }} <router-link to="/">Back to your trips</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <header class="setup-head">
        <button type="button" class="setup-back" aria-label="Back" @click="goBack">‹</button>
        <div class="flex-grow-1">
          <p class="setup-trip">{{ tripInfo.name }}</p>
          <h1 class="setup-title">{{ titles[step] }}</h1>
        </div>
        <span class="setup-saved small text-muted" role="status">{{ saveStatus }}</span>
      </header>

      <!-- Steps -->
      <ol class="setup-steps" aria-label="Setup steps">
        <li v-for="(s, i) in steps" :key="s.key" :class="{ current: step === s.key, done: i < stepIndex }" :aria-current="step === s.key ? 'step' : null">
          <span class="dot">{{ i < stepIndex ? '✓' : i + 1 }}</span> {{ s.label }}
        </li>
        <li><span class="dot">{{ steps.length + 1 }}</span> Plan your days</li>
      </ol>

      <p v-if="step === 'invite'" class="setup-lead">Who's coming? Invite friends by username or send them a link. Going solo? Just skip this.</p>

      <TripShare v-if="step === 'invite'" inline :trip-id="id" :trip-name="tripInfo.name" :members="tripInfo.members"
        :travellers="tripInfo.travellers" :role="tripInfo.role" :me="tripInfo.me" :pending-invites="tripInfo.pendingInvites"
        @changed="reloadInfo" />
      <WishlistView v-else-if="step === 'wishlist'" :destinations="tripInfo.destinations" />
      <PlacesVoting v-else :travellers="tripInfo.travellers" :me="tripInfo.me" :can-vote-for="canVoteFor" @go-wishlist="goTo('wishlist')" />

      <!-- Bottom bar -->
      <div class="setup-bar">
        <template v-if="step === 'invite'">
          <button type="button" class="btn btn-link text-muted" @click="goTo('wishlist')">Skip for now</button>
          <button type="button" class="btn setup-next" @click="goTo('wishlist')" data-testid="setup-invite-next">
            Next: save places →
          </button>
        </template>
        <template v-else-if="step === 'wishlist'">
          <button type="button" class="btn btn-link text-muted" @click="finish">Skip setup</button>
          <button type="button" class="btn setup-next" :disabled="saving" @click="goTo('vote')" data-testid="setup-next">
            Next: vote together →
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn btn-link text-muted" @click="goTo('wishlist')">← Back to wishlist</button>
          <button type="button" class="btn setup-next" :disabled="saving" @click="finish" data-testid="setup-finish">
            Finish: plan my days →
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import WishlistView from '../components/WishlistView.vue'
import PlacesVoting from '../components/PlacesVoting.vue'
import TripShare from '../components/TripShare.vue'
import { trip, loadFromServer, savedShape, saveTrip } from '../itineraryStore.js'

export default {
  components: { WishlistView, PlacesVoting, TripShare },
  props: {
    id: { type: String, required: true },
    step: { type: String, default: 'invite' } // 'invite' | 'wishlist' | 'vote'
  },

  data() {
    return {
      loading: true,
      loadError: '',
      tripInfo: { name: '', destinations: [], travellers: [], members: [], role: 'member', me: '', pendingInvites: [] },
      steps: [
        { key: 'invite', label: 'Invite group' },
        { key: 'wishlist', label: 'Save places' },
        { key: 'vote', label: 'Vote together' }
      ],
      titles: { invite: 'Invite your group', wishlist: 'Wishlist', vote: 'Group decisions' },
      saving: false,
      saveStatus: '',
      saveTimer: null,
      lastSaved: ''
    }
  },

  computed: {
    // My own vote, and (organiser only) people without an account
    canVoteFor() {
      const list = [this.tripInfo.me]
      if (this.tripInfo.role === 'owner') {
        const joined = this.tripInfo.members.map((m) => m.name)
        for (const t of this.tripInfo.travellers) {
          if (!joined.includes(t)) list.push(t)
        }
      }
      return list
    },
    stepIndex() {
      return this.steps.findIndex((s) => s.key === this.step)
    },
    // Changes whenever the wishlist or its votes change
    saveKey() {
      return JSON.stringify(savedShape().wishlist)
    }
  },

  watch: {
    // Save a moment after each change
    saveKey(key) {
      if (this.loading || key === this.lastSaved) return
      this.saveStatus = 'Saving…'
      clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(this.saveNow, 700)
    }
  },

  async mounted() {
    try {
      const res = await axios.get('/api/trips/' + this.id)
      this.setInfo(res.data)
      loadFromServer(res.data)
      this.lastSaved = this.saveKey
    } catch (err) {
      this.loadError = 'Could not load this trip. Is the server running?'
    }
    this.loading = false
  },

  methods: {
    setInfo(t) {
      this.tripInfo = {
        name: t.name,
        destinations: t.destinations && t.destinations.length ? t.destinations : [t.destination],
        travellers: t.travellers || [],
        members: t.members || [],
        role: t.role || 'member',
        me: t.me || '',
        pendingInvites: t.pendingInvites || []
      }
    },

    // After adding/removing people on the invite step (votes need the new names)
    async reloadInfo() {
      try {
        const res = await axios.get('/api/trips/' + this.id)
        this.setInfo(res.data)
      } catch (err) {
        // keep what we have
      }
    },

    async saveNow() {
      clearTimeout(this.saveTimer)
      if (this.saveKey === this.lastSaved) return
      this.saving = true
      try {
        await saveTrip(this.id)
        this.lastSaved = this.saveKey
        this.saveStatus = 'Saved ✓'
      } catch (err) {
        this.saveStatus = 'Could not save. Check your connection.'
      }
      this.saving = false
    },

    // Save first, then move to the next page (each step is its own page)
    async goTo(step) {
      await this.saveNow()
      this.$router.push({ path: '/trip/' + this.id + '/setup/' + step, query: this.$route.query })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    async finish() {
      await this.saveNow()
      // "first" = this was the user's first trip: the trip page then shows a short guide
      const query = this.$route.query.first ? { welcome: '1' } : {}
      this.$router.push({ path: '/trip/' + this.id, query })
    },

    goBack() {
      if (this.step === 'vote') this.goTo('wishlist')
      else if (this.step === 'wishlist') this.goTo('invite')
      else this.finish()
    }
  },

  // Leaving the page another way (e.g. the navbar) still saves
  beforeUnmount() {
    if (this.saveKey !== this.lastSaved) saveTrip(this.id)
  }
}
</script>

<style scoped>
.setup {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 96px; /* room for the bottom bar */
}
.setup-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.setup-back {
  width: 56px;
  height: 56px;
  border-radius: 20px;
  border: 1.5px solid #dfe5e3;
  background: #fff;
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}
.setup-back:hover {
  background: #f1f5f4;
}
.setup-trip {
  margin: 0;
  color: var(--app-muted, #5f6f6b);
  font-size: 14px;
}
.setup-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 2rem;
  margin: 0;
}
.setup-steps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 0 0 16px;
}
.setup-steps li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--app-muted, #5f6f6b);
  background: #fff;
  border: 1px solid #dfe5e3;
  border-radius: 999px;
  padding: 6px 14px 6px 6px;
}
.setup-steps .dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #eef2f1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.setup-steps li.current {
  color: #1f2d2a;
  font-weight: 600;
  border-color: #1f2d2a;
}
.setup-steps li.current .dot {
  background: #1f2d2a;
  color: #dcf5a6;
}
.setup-steps li.done .dot {
  background: #0b7f5f;
  color: #fff;
}
.setup-lead {
  color: var(--app-muted, #5f6f6b);
  margin-bottom: 24px;
}
/* Floating bottom bar, like the reference's dark nav */
.setup-bar {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: min(960px, calc(100% - 32px));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #1f2d2a;
  border-radius: 999px;
  padding: 8px 8px 8px 16px;
  box-shadow: 0 16px 36px rgba(16, 40, 34, 0.3);
  z-index: 30;
}
.setup-bar .btn-link {
  color: #c9d3d0 !important;
  text-decoration: none;
}
.setup-next {
  background: #dcf5a6;
  color: #1f2d2a;
  border-radius: 999px;
  font-weight: 700;
  padding: 10px 22px;
}
.setup-next:hover,
.setup-next:focus-visible {
  background: #c9ef7f;
  color: #1f2d2a;
}
@media (max-width: 576px) {
  .setup-title { font-size: 1.6rem; }
  .setup-back { width: 46px; height: 46px; border-radius: 16px; }
}
</style>
