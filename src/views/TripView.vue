<template>
  <div>
    <p v-if="loading" class="text-muted">Loading trip…</p>

    <div v-else-if="loadError" class="alert alert-warning">
      {{ loadError }} <router-link to="/">Back to your trips</router-link>
    </div>

    <template v-else>
      <!-- Back to the list of trips -->
      <router-link to="/" class="btn btn-sm btn-outline-secondary mb-3" data-testid="back-to-trips">
        ← Back to my trips
      </router-link>

      <div class="card p-4 mb-4 text-white trip-hero">
        <h2>{{ headerTitle }}</h2>
        <p class="mb-0 text-white-50">{{ headerSubtitle }}</p>
      </div>

      <!-- Safety banner: shown on every tab when SafetyLayer reports High/Critical risk -->
      <div v-if="safetyWarning" class="alert alert-danger d-flex justify-content-between align-items-center">
        <span>⚠️ {{ safetyWarning }}</span>
        <button class="btn btn-sm btn-outline-danger" @click="activeTab = 'safety'">View safety</button>
      </div>

      <!-- First trip only: a short guide to the trip page -->
      <transition name="guide">
        <section v-if="showGuide" class="guide mb-4" aria-labelledby="guide-title" data-testid="trip-guide">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h2 id="guide-title" class="h5 mb-2">🎉 Your trip is ready! Here's how it works</h2>
            <button type="button" class="btn-close" aria-label="Close guide" @click="showGuide = false"></button>
          </div>
          <ol class="guide-steps">
            <li>
              <strong>📍 Places</strong> holds your <em>Wishlist</em> and <em>Group decisions</em>.
              Keep saving places and voting there any time.
              <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="openPlaces('wishlist')">Open Places</button>
            </li>
            <li>
              <strong>Itinerary & Weather</strong>: pick a day and use <em>+ Add stop</em> to fit your group picks into it.
              Crowd tips then suggest quieter times, and <em>✨ Plan my day</em> re-times the whole day.
            </li>
            <li>The other tabs cover packing, expenses, photos, safety and getting around.</li>
          </ol>
          <button type="button" class="btn btn-primary btn-sm" @click="showGuide = false">Got it</button>
        </section>
      </transition>

      <ul class="nav nav-pills mb-4">
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'itinerary' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'itinerary'">Itinerary & Weather</button>
        </li>
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'places' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'places'" data-testid="places-tab">📍 Places</button>
        </li>
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'packing' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'packing'">Packing List</button>
        </li>
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'expenses' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'expenses'">Expenses & Split</button>
        </li>
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'photos' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'photos'">Photos</button>
        </li>
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'safety' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'safety'" data-testid="safety-tab">Safety</button>
        </li>
        <li class="nav-item me-2">
          <button class="btn btn-sm" :class="activeTab === 'travelOptions' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'travelOptions'">Go Options</button>
        </li>
      </ul>

      <!-- Group decisions and expenses are still built around the Seoul demo data -->
      <div v-show="activeTab === 'itinerary'">
        <FlightDelayWidget v-if="isDemo" />
        <ItineraryView
          :trip-id="id"
          :destination="itineraryInfo.destination"
          :start-date="itineraryInfo.startDate"
          :end-date="itineraryInfo.endDate"
          :initial-stops="itineraryInfo.stops"
          :initial-wishlist="itineraryInfo.wishlist"
          @itinerary-change="updatePackingActivities" />
      </div>
      <!-- Places = Wishlist + Group decisions. Both use the same wishlist, which the itinerary saves. -->
      <div v-show="activeTab === 'places'">
        <div class="places-switch mb-4" role="tablist" aria-label="Places">
          <button type="button" role="tab" :aria-selected="placesTab === 'wishlist'" :class="{ active: placesTab === 'wishlist' }"
            @click="placesTab = 'wishlist'" data-testid="places-wishlist">♥ Wishlist</button>
          <button type="button" role="tab" :aria-selected="placesTab === 'vote'" :class="{ active: placesTab === 'vote' }"
            @click="placesTab = 'vote'" data-testid="places-vote">👍 Group decisions</button>
        </div>
        <transition name="guide" mode="out-in">
          <WishlistView v-if="placesTab === 'wishlist'" key="w" :destinations="itineraryInfo.destinations" />
          <PlacesVoting v-else key="v" :travellers="itineraryInfo.travellers" @go-wishlist="placesTab = 'wishlist'" />
        </transition>
      </div>
      <div v-show="activeTab === 'packing'">
        <PackingView :has-outdoor-activity="hasOutdoorActivity" />
      </div>
      <div v-if="activeTab === 'expenses'">
        <ExpensesView v-if="isDemo" />
        <div v-else class="card p-4 text-center text-muted"><h5>No expenses yet</h5><p class="mb-0">Expense splitting for your own trips is coming soon.</p></div>
      </div>
      <div v-show="activeTab === 'photos'">
        <PhotosView />
      </div>
      <!--
        v-show (not v-if) keeps SafetyLayer mounted when you switch tabs,
        so live location tracking and alerts keep running in the background.
      -->
      <div v-show="activeTab === 'safety'">
        <SafetyLayer @risk-change="handleRiskChange" />
      </div>

      <div v-show="activeTab === 'travelOptions'">
        <TransportOptions />
      </div>

    </template>
  </div>
</template>

<script>
import axios from 'axios'
import ItineraryView from '../components/ItineraryView.vue'
import WishlistView from '../components/WishlistView.vue'
import PlacesVoting from '../components/PlacesVoting.vue'
import GroupVoting from '../components/GroupVoting.vue'
import PackingView from '../components/PackingView.vue'
import PhotosView from '../components/PhotosView.vue'
import ExpensesView from '../components/ExpensesView.vue'
import SafetyLayer from '../components/SafetyLayer.vue'
import FlightDelayWidget from '../components/FlightDelayWidget.vue'
import TransportOptions from '../components/TransportOptions.vue'


export default {
  components: { ItineraryView, WishlistView, PlacesVoting, GroupVoting, PackingView, PhotosView, ExpensesView, SafetyLayer, FlightDelayWidget, TransportOptions},
  props: { id: { type: String, default: 'seoul' } }, // from the route /trip/:id
  data() {
    return {
      activeTab: 'itinerary',
      placesTab: 'wishlist', // inside Places: 'wishlist' | 'vote'
      // Shown once, after setting up the user's first trip
      showGuide: this.$route.query.welcome === '1',
      hasOutdoorActivity: true,
      safetyWarning: '',
      trip: null,
      loading: true,
      loadError: ''
    }
  },
  computed: {
    // What the itinerary needs to know about this trip
    itineraryInfo() {
      if (this.isDemo) return { destination: 'Seoul, South Korea', destinations: ['Seoul, South Korea'], travellers: ['Sarah', 'John', 'Amy'], startDate: '2026-10-12', endDate: '2026-10-17', stops: [], wishlist: [] }
      const t = this.trip
      return { destination: t.destination, destinations: t.destinations && t.destinations.length ? t.destinations : [t.destination], travellers: t.travellers || [], startDate: t.startDate, endDate: t.endDate, stops: t.stops || [], wishlist: t.wishlist || [] }
    },
    isDemo() {
      return this.id === 'seoul'
    },
    headerTitle() {
      return this.isDemo ? 'Seoul, South Korea' : this.trip.name
    },
    headerSubtitle() {
      if (this.isDemo) return '12 Oct – 17 Oct | Travellers: Sarah, John, Amy'
      const t = this.trip
      const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const dates = t.startDate ? (t.endDate ? fmt(t.startDate) + ' – ' + fmt(t.endDate) : 'From ' + fmt(t.startDate)) : 'Dates not set'
      const places = t.destinations && t.destinations.length ? t.destinations.join(' → ') : t.destination
      return places + ' | ' + dates + ' | Travellers: ' + t.travellers.join(', ')
    }
  },
  async mounted() {
    // Remove "?welcome=1" from the address so the guide doesn't come back on refresh
    if (this.showGuide) this.$router.replace({ query: {} })
    if (!this.isDemo) {
      try {
        const res = await axios.get('/api/trips/' + this.id)
        this.trip = res.data
      } catch (err) {
        this.loadError = err.response && err.response.status === 404 ? 'That trip could not be found.' : 'Could not load this trip. Is the server running?'
      }
    }
    this.loading = false
  },
  methods: {
    openPlaces(tab) {
      this.activeTab = 'places'
      this.placesTab = tab
    },
    updatePackingActivities(activities) {
      this.hasOutdoorActivity = activities.some((activity) => activity.outdoor)
    },
    /*
      handleRiskChange()
      Listens to the "risk-change" event from SafetyLayer.
      When the risk score is 50+ (High/Critical), it shows a banner on
      every tab so the group knows to rethink outdoor activities.
    */
    handleRiskChange(risk) {
      if (risk.score >= 50) {
        this.safetyWarning = `${risk.label} risk near ${risk.location?.city || 'you'}. Consider swapping outdoor activities.`
      } else {
        this.safetyWarning = ''
      }
    }
  }
}
</script>

<style scoped>
/* First-trip guide */
.guide {
  background: #fff;
  border: 1.5px solid #b8e4d2;
  border-radius: 20px;
  padding: 18px 20px;
  box-shadow: 0 8px 24px rgba(11, 127, 95, 0.08);
}
.guide-steps {
  padding-left: 1.2rem;
  margin-bottom: 12px;
}
.guide-steps li {
  margin-bottom: 6px;
}

/* Wishlist | Group decisions switch */
.places-switch {
  display: inline-flex;
  background: #fff;
  border: 1.5px solid #dfe5e3;
  border-radius: 999px;
  padding: 4px;
}
.places-switch button {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 8px 18px;
  font-weight: 600;
  color: var(--app-muted, #5f6f6b);
  transition: background 0.2s, color 0.2s;
}
.places-switch button.active {
  background: #1f2d2a;
  color: #dcf5a6;
}
.places-switch button:focus-visible {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 2px;
}

.guide-enter-active,
.guide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.guide-enter-from,
.guide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
@media (prefers-reduced-motion: reduce) {
  .guide-enter-active,
  .guide-leave-active,
  .places-switch button { transition: none; }
}
</style>
