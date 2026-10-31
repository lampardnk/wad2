<template>
  <div class="setup">
    <!-- New-trip setup: /trip/:id/setup/invite, then /wishlist, then /vote -->
    <LoadingSkeleton v-if="loading" variant="list" :count="4" label="Loading trip…" />
    <div v-else-if="loadError" class="alert alert-warning">
      {{ loadError }} <router-link to="/home">Back to your trips</router-link>
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

      <!-- Two columns: the flight-path progress on the left, this step on the right -->
      <div class="setup-grid">
        <FlightTracker ref="flight" class="setup-flight" :step="stepIndex" :boarded="boarded" />

        <section class="setup-card">
      <p v-if="step === 'invite'" class="setup-lead">Who's coming? Invite friends by username or send them a link. Going solo? Just skip this.</p>

      <TripShare v-if="step === 'invite'" inline :trip-id="id" :trip-name="tripInfo.name" :members="tripInfo.members"
        :travellers="tripInfo.travellers" :role="tripInfo.role" :me="tripInfo.me" :pending-invites="tripInfo.pendingInvites"
        @changed="reloadInfo" />
      <WishlistView v-else-if="step === 'wishlist'" :destinations="tripInfo.destinations" />
      <PlacesVoting v-else :trip-id="id" :travellers="tripInfo.travellers" :me="tripInfo.me" :can-vote-for="canVoteFor" @go-wishlist="goTo('wishlist')" />
        </section>
      </div>

      <!-- Back from the first step of a trip that was only just made: keep it, or throw it away? -->
      <Teleport to="body">
        <transition name="discard">
          <div v-if="askDiscard" class="discard-overlay" @mousedown.self="askDiscard = false" @keydown.esc="askDiscard = false">
            <section class="discard" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-text">
              <DoodleIcon name="suitcase" :size="46" anim="" />
              <h2 id="discard-title" class="discard-title">Discard this trip?</h2>
              <p id="discard-text" class="discard-text">
                Going back deletes <strong>{{ tripInfo.name }}</strong> and everything you've added to it so far. This can't be undone.
              </p>
              <p v-if="discardError" class="discard-err" role="alert">{{ discardError }}</p>
              <div class="discard-btns">
                <button type="button" class="discard-no" :disabled="discarding" @click="discardTrip">{{ discarding ? 'Discarding…' : 'Discard trip' }}</button>
                <button ref="keepBtn" type="button" class="discard-keep" @click="askDiscard = false">Keep planning</button>
              </div>
            </section>
          </div>
        </transition>
      </Teleport>

      <!-- Bottom bar -->
      <div class="setup-bar">
        <template v-if="step === 'invite'">
          <button type="button" class="btn btn-link text-muted" @click="goTo('wishlist')">Skip for now</button>
          <button type="button" class="setup-next" @click="goTo('wishlist')" data-testid="setup-invite-next">
            <DoodleIcon name="plane" :size="22" tint="cream" anim="" /> Next: Save places
          </button>
        </template>
        <template v-else-if="step === 'wishlist'">
          <button type="button" class="btn btn-link text-muted" @click="finish">Skip setup</button>
          <button type="button" class="setup-next" :disabled="saving" @click="goTo('vote')" data-testid="setup-next">
            <DoodleIcon name="plane" :size="22" tint="cream" anim="" /> Next: Vote together
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn btn-link text-muted" @click="goTo('wishlist')">← Back to wishlist</button>
          <button type="button" class="setup-next" :disabled="saving || landing" @click="land" data-testid="setup-finish">
            <DoodleIcon name="plane" :size="22" tint="cream" anim="" /> {{ landing ? 'Landing…' : 'Land: Plan my days' }}
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
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import FlightTracker from '../components/FlightTracker.vue'
import DoodleIcon from '../components/DoodleIcon.vue'
import { shortlist } from '../shortlist.js'

export default {
  components: { LoadingSkeleton, WishlistView, PlacesVoting, TripShare, FlightTracker, DoodleIcon },
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
      landing: false, // "Land" pressed: the plane is flying to the last stop
      saveStatus: '',
      saveTimer: null,
      lastSaved: '',
      askDiscard: false,  // the "Discard this trip?" question is showing
      discarding: false,
      discardError: ''
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
    // Everyone aboard: people on the trip + people invited (a new name makes a token fly into the plane)
    boarded() {
      const list = this.tripInfo.travellers.slice()
      for (const p of this.tripInfo.pendingInvites) {
        const n = p.name || p.username
        if (n && !list.includes(n)) list.push(n)
      }
      return list
    },
    stepIndex() {
      return this.steps.findIndex((s) => s.key === this.step)
    },
    // Votes are left out: each vote is saved on its own (PlacesVoting)
    saveKey() {
      const list = savedShape().wishlist
      for (const w of list) delete w.votes
      return JSON.stringify(list)
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
        this.saveStatus = 'Saved'
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

    // "Land": the plane flies to the destination and confetti falls (while the trip saves), then on to the trip
    async land() {
      this.landing = true
      const flight = this.$refs.flight
      await Promise.all([this.saveNow(), flight && flight.land ? flight.land() : null])
      const query = this.$route.query.first ? { welcome: '1' } : {}
      this.$router.push({ path: '/trip/' + this.id, query })
    },

    goBack() {
      if (this.step === 'vote') this.goTo('wishlist')
      else if (this.step === 'wishlist') this.goTo('invite')
      // First step of a trip that was just made (and is mine): check before throwing it away
      else if (this.$route.query.new && this.tripInfo.role === 'owner') {
        this.discardError = ''
        this.askDiscard = true
        this.$nextTick(() => this.$refs.keepBtn && this.$refs.keepBtn.focus())
      } else this.finish()
    },

    // "Discard trip": delete it (and everything added to it), then back to where it was started
    async discardTrip() {
      this.discarding = true
      this.discardError = ''
      try {
        clearTimeout(this.saveTimer)
        await axios.delete('/api/trips/' + this.id)
        this.lastSaved = this.saveKey // nothing left to save on the way out
        this.askDiscard = false
        // Made on Discover: its cities go back in the shortlist, and we go back to Discover
        const from = this.$route.query.from
        if (from) {
          const ids = String(from).split(',')
          const list = shortlist.value.slice()
          for (let i = 0; i < ids.length; i++) {
            if (ids[i] && !list.includes(ids[i])) list.push(ids[i])
          }
          shortlist.value = list
          this.$router.push('/discover')
        } else this.$router.push('/home')
      } catch (err) {
        this.discardError = "Couldn't discard the trip. Check your connection and try again."
      }
      this.discarding = false
    }
  },

  // Leaving the page another way (e.g. the navbar) still saves (not after the trip was discarded)
  beforeUnmount() {
    if (this.saveKey !== this.lastSaved && !this.discarding) saveTrip(this.id)
  }
}
</script>

<style scoped>
.setup {
  width: 100%;
  max-width: 1360px; /* the page shell already adds the side padding */
  margin: 0 auto;
  padding-bottom: 120px; /* room for the bottom bar */
}
/* Desktop: a 12-column grid. Flight path 5 columns (4 on wide screens), the step 7 (8).
   Both cards stretch to the same height. */
.setup-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 32px;
  align-items: stretch;
}
.setup-flight {
  grid-column: span 5;
}
.setup-card {
  grid-column: span 7;
  min-width: 0;
  padding: clamp(22px, 3vw, 40px);
  border-radius: 24px;
  background: #fffaf0;
  /* soft, pillowy shadow instead of an ink outline */
  box-shadow: 0 2px 0 rgba(255, 255, 255, 0.9) inset, 0 22px 44px -20px rgba(18, 50, 74, 0.3), 0 4px 14px -6px rgba(18, 50, 74, 0.1);
}
@media (min-width: 1280px) {
  .setup-flight {
    grid-column: span 4;
  }
  .setup-card {
    grid-column: span 8;
  }
}
/* Narrower than 1024px: one column. The flight becomes a slim progress track stuck to the top,
   the step fills the width, and the actions sit on the bottom edge. */
@media (max-width: 1023px) {
  .setup-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .setup-flight,
  .setup-card {
    grid-column: auto;
  }
  .setup-flight {
    position: sticky;
    top: 0;
    z-index: 25;
    padding: 8px 0 6px;
    background: linear-gradient(180deg, var(--pl-cream, #fff7e8) 80%, transparent);
  }
  .setup-card {
    width: 100%;
    padding: clamp(16px, 4vw, 28px);
    border-radius: 22px;
  }
  .setup .setup-bar { /* .setup in front so this wins over the floating-pill rule further down */
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    transform: none;
    border-radius: 22px 22px 0 0;
    padding: 12px clamp(16px, 4vw, 28px) calc(14px + env(safe-area-inset-bottom));
  }
  .setup-next {
    padding: 11px 18px;
  }
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
  border: 0;
  background: #fffaf0;
  color: #12324a;
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
  cursor: pointer;
  box-shadow: 0 4px 0 #ecd6b0, 0 10px 20px -12px rgba(18, 50, 74, 0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.setup-back:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #ecd6b0, 0 12px 22px -12px rgba(18, 50, 74, 0.35);
}
.setup-back:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #ecd6b0;
}
.setup-trip {
  margin: 0;
  color: var(--app-muted, #5a6b78);
  font-size: 14px;
}
.setup-title {
  font-family: var(--font-display);
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
  color: var(--app-muted, #5a6b78);
  background: #fbf5ea;
  border: 1px solid #e2dacb;
  border-radius: 999px;
  padding: 6px 14px 6px 6px;
}
.setup-steps .dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #efe9df;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.setup-steps li.current {
  color: #003d5b;
  font-weight: 600;
  border-color: #003d5b;
}
.setup-steps li.current .dot {
  background: #003d5b;
  color: #edae49;
}
.setup-steps li.done .dot {
  background: #00798c;
  color: #fff;
}
.setup-lead {
  color: #4a6274;
  font-size: 1.02rem;
  line-height: 1.55;
  margin-bottom: 26px;
}
/* Floating bottom bar, like the reference's dark nav */
.setup-bar {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: min(1360px, calc(100% - 2 * clamp(14px, 3.2vw, 44px))); /* lines up with the page */
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #12324a;
  border-radius: 999px;
  padding: 9px 10px 13px 22px;
  box-shadow: 0 16px 36px rgba(0, 40, 62, 0.3);
  z-index: 30;
}
.setup-bar .btn-link {
  color: #c9d3d0 !important;
  text-decoration: none;
  white-space: nowrap;
  font-weight: 700;
  padding: 8px 4px;
}
.setup-bar .btn-link:hover {
  color: #fff !important;
}
.setup-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border: 2.5px solid #12324a;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffd36e, #ffbf3c 55%, #f5a922);
  color: #12324a;
  font: inherit;
  font-weight: 900;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 5px 0 #0b1f2e;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.setup-next:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 7px 0 #0b1f2e;
}
.setup-next:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 0 #0b1f2e;
}
.setup-next:disabled {
  opacity: 0.6;
}
.setup-next:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
@media (max-width: 576px) {
  .setup-title { font-size: 1.6rem; }
  .setup .setup-bar .btn-link { font-size: 14px; }
  .setup .setup-next { padding: 10px 14px; font-size: 15px; }
  .setup-back { width: 46px; height: 46px; border-radius: 16px; }
}

/* "Discard this trip?" */
.discard-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(8, 30, 48, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.discard {
  width: min(420px, 100%);
  padding: 26px 24px 22px;
  border-radius: 26px;
  background: #fffaf0;
  border: 2.5px solid #12324a;
  box-shadow: 0 6px 0 #12324a, 0 30px 60px -20px rgba(0, 0, 0, 0.5);
  color: #12324a;
  text-align: center;
  animation: discard-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes discard-pop {
  from { opacity: 0; transform: translateY(16px) scale(0.92); }
}
.discard-title {
  margin: 8px 0 6px;
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 900;
}
.discard-text {
  margin: 0;
  color: #4a6274;
  line-height: 1.5;
}
.discard-err {
  margin: 10px 0 0;
  color: #c43a4b;
  font-weight: 700;
}
.discard-btns {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}
.discard-no,
.discard-keep {
  padding: 11px 18px;
  border-radius: 16px;
  border: 2.5px solid #12324a;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.discard-no {
  background: #fbf5ea;
  color: #c43a4b;
  box-shadow: 0 4px 0 #12324a;
}
.discard-keep {
  background: #ffbf3c;
  color: #12324a;
  box-shadow: 0 4px 0 #12324a;
}
.discard-no:active:not(:disabled),
.discard-keep:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #12324a;
}
.discard-no:disabled {
  opacity: 0.6;
}
.discard button:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
.discard-enter-active,
.discard-leave-active {
  transition: opacity 0.2s;
}
.discard-enter-from,
.discard-leave-to {
  opacity: 0;
}
@media (max-width: 420px) {
  .discard-btns {
    flex-direction: column-reverse;
  }
}
@media (prefers-reduced-motion: reduce) {
  .discard { animation: none; }
}
</style>
