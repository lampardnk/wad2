<template>
  <div class="trip-page">
    <!-- Loading: a placeholder in the shape of the page -->
    <div v-if="loading" class="trip-stage" aria-busy="true">
      <div class="trip-nav skeleton-bar"></div>
      <p class="trip-loading">Loading trip…</p>
    </div>

    <div v-else-if="loadError" class="alert alert-warning">
      {{ loadError }} <router-link to="/">Back to your trips</router-link>
    </div>

    <template v-else>
      <!-- Dark header with the trip photo glowing behind it -->
      <div class="trip-stage" :style="stagePhoto ? { '--trip-photo': 'url(' + stagePhoto + ')' } : null" aria-hidden="true"></div>

      <!-- Top bar: back, trip name, every section of the trip. Stays on screen while scrolling. -->
      <nav class="trip-nav" aria-label="Trip sections">
        <router-link to="/" class="trip-back" data-testid="back-to-trips" title="Back to my trips">
          <span aria-hidden="true">‹</span><span class="trip-back-text">My trips</span>
        </router-link>
        <span class="trip-nav-name" :title="headerTitle">{{ headerTitle }}</span>

        <div class="trip-tabs" role="tablist" aria-label="Trip sections">
          <button v-for="t in tabs" :key="t.key" type="button" role="tab" class="trip-tab"
            :class="{ active: activeTab === t.key }" :aria-selected="activeTab === t.key" :aria-controls="'pane-' + t.key"
            :data-testid="t.testid" @click="activeTab = t.key">
            <span aria-hidden="true">{{ t.icon }}</span> {{ t.label }}
            <span v-if="t.key === 'safety' && safetyWarning" class="trip-tab-dot" aria-label="(warning)"></span>
          </button>
        </div>
      </nav>

      <!-- Trip title -->
      <header class="trip-head">
        <h1 class="trip-title">{{ headerTitle }}</h1>
        <p class="trip-route">
          <span v-for="(d, i) in itineraryInfo.destinations" :key="d">
            <span v-if="i > 0" class="trip-arrow" aria-hidden="true">→</span>
            {{ flagFor(d) }} {{ d.split(', ')[0] }}
          </span>
        </p>
        <div class="trip-toggle" aria-label="Trip details">
          <span class="trip-toggle-item">🗓 {{ dateText }}</span>
          <span class="trip-toggle-item on">👥 {{ itineraryInfo.travellers.length }} traveller{{ itineraryInfo.travellers.length === 1 ? '' : 's' }}</span>
        </div>

        <!-- Who's going: joined people (solid) and not-yet-joined travellers (dashed) + invite -->
        <div class="trip-crew">
          <span class="trip-faces" :aria-label="joinedNames.length + ' joined: ' + joinedNames.join(', ')">
            <span v-for="(n, i) in itineraryInfo.travellers.slice(0, 6)" :key="n" class="trip-face"
              :class="{ guest: !joinedNames.includes(n) }" :style="{ zIndex: 10 - i }" :title="n + (joinedNames.includes(n) ? '' : ' (not joined yet)')">
              {{ n.charAt(0).toUpperCase() }}
            </span>
            <span v-if="itineraryInfo.travellers.length > 6" class="trip-face more">+{{ itineraryInfo.travellers.length - 6 }}</span>
          </span>
          <button v-if="!isDemo" type="button" class="trip-invite" @click="showShare = true" data-testid="invite-btn">+ Invite</button>
        </div>
      </header>

      <TripShare v-if="showShare" :trip-id="id" :trip-name="trip.name" :members="trip.members || []"
        :travellers="trip.travellers" :role="trip.role || 'member'" :me="myName" :pending-invites="trip.pendingInvites || []"
        @close="showShare = false" @changed="reloadTrip" @left="$router.push('/')" />

      <!-- Summary cards: tap one to jump to that section -->
      <div class="trip-cards">
        <button type="button" class="trip-card" @click="activeTab = 'itinerary'">
          <span class="trip-card-label">Trip length</span>
          <span class="trip-card-big">{{ dayCount || '–' }}<small> / day{{ dayCount === 1 ? '' : 's' }}</small></span>
          <span class="trip-card-sub">{{ stopCount }} stop{{ stopCount === 1 ? '' : 's' }} planned</span>
        </button>
        <button type="button" class="trip-card featured" @click="openPlaces('vote')">
          <span class="trip-card-badge" aria-hidden="true">✓</span>
          <span class="trip-card-label">Group picks</span>
          <span class="trip-card-big">{{ pickCount }}<small> / {{ wishCount }} places</small></span>
          <span class="trip-card-sub">{{ wishCount ? 'Vote in Places → Group decisions' : 'Save places to your wishlist first' }}</span>
        </button>
        <button type="button" class="trip-card" @click="activeTab = 'packing'">
          <span class="trip-card-label">Travellers</span>
          <span class="trip-card-big">{{ itineraryInfo.travellers.length }}<small> / people</small></span>
          <span class="trip-card-sub text-truncate">{{ itineraryInfo.travellers.join(', ') || 'Just you' }}</span>
        </button>
      </div>

      <p v-if="photoPage" class="trip-credit">
        Photo: <a :href="photoPage" target="_blank" rel="noopener">Wikipedia</a>
      </p>

      <!-- The open section -->
      <main class="trip-panel">
        <div class="trip-panel-head">
          <h2 class="trip-panel-title"><span aria-hidden="true">{{ currentTab.icon }}</span> {{ currentTab.title }}</h2>
        </div>

        <!-- Safety banner: shown on every tab when SafetyLayer reports High/Critical risk -->
        <div v-if="safetyWarning" class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
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
                <strong>Itinerary</strong>: pick a day and use <em>+ Add stop</em> to fit your group picks into it.
                Crowd tips then suggest quieter times, and <em>✨ Plan my day</em> re-times the whole day.
              </li>
              <li>The other sections in the top bar cover packing, expenses, photos, safety and getting around.</li>
            </ol>
            <button type="button" class="btn btn-primary btn-sm" @click="showGuide = false">Got it</button>
          </section>
        </transition>

      <!-- Group decisions and expenses are still built around the Seoul demo data -->
      <div v-show="activeTab === 'itinerary'" :id="'pane-itinerary'" role="tabpanel">
        <FlightDelayWidget v-if="isDemo" />
        <ItineraryView
          :trip-id="id"
          :destination="itineraryInfo.destination"
          :start-date="itineraryInfo.startDate"
          :end-date="itineraryInfo.endDate"
          :initial-stops="itineraryInfo.stops"
          :initial-wishlist="itineraryInfo.wishlist" :initial-version="isDemo ? 0 : trip.version || 0"
          @itinerary-change="updatePackingActivities" />
      </div>
      <!-- Places = Wishlist + Group decisions. Both use the same wishlist, which the itinerary saves. -->
      <div v-show="activeTab === 'places'" :id="'pane-places'" role="tabpanel">
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
      <div v-show="activeTab === 'packing'" :id="'pane-packing'" role="tabpanel">
        <PackingView :key="'pack-' + id" :trip-id="id" :days="dayCount || 3"
          :activities="isDemo ? ['sightseeing', 'food'] : trip.activities || []"
          :weather="isDemo ? ['mild', 'rain'] : trip.weather || []"
          :extras="isDemo ? [] : trip.extras || []"
          :initial-packing="isDemo ? null : trip.packing"
          :has-outdoor-activity="hasOutdoorActivity" />
      </div>
      <div v-show="activeTab === 'expenses'" id="pane-expenses" role="tabpanel">
        <ExpensesView :key="'xp-' + id" :trip-id="id" :travellers="itineraryInfo.travellers"
          :start-date="itineraryInfo.startDate" :end-date="itineraryInfo.endDate"
          :initial="isDemo ? null : trip.expenses" :me="myName" />
      </div>
      <div v-show="activeTab === 'photos'" :id="'pane-photos'" role="tabpanel">
        <PhotosView :key="'ph-' + id" :trip-id="id" :travellers="itineraryInfo.travellers"
          :wishlist="wishlistPlaces" :initial-albums="isDemo ? [] : trip.photoAlbums || []" :me="myName" />
      </div>
      <!--
        v-show (not v-if) keeps SafetyLayer mounted when you switch tabs,
        so live location tracking and alerts keep running in the background.
      -->
      <div v-show="activeTab === 'safety'" :id="'pane-safety'" role="tabpanel">
        <SafetyLayer @risk-change="handleRiskChange" />
      </div>

      <div v-show="activeTab === 'travelOptions'" :id="'pane-travelOptions'" role="tabpanel">
        <TransportOptions />
      </div>
      </main>
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
import TripShare from '../components/TripShare.vue'
import { trip as store } from '../itineraryStore.js'
import { codeForDestination, flagEmoji } from '../destinations.js'


export default {
  components: { ItineraryView, WishlistView, PlacesVoting, GroupVoting, PackingView, PhotosView, ExpensesView, SafetyLayer, FlightDelayWidget, TransportOptions, TripShare },
  props: { id: { type: String, default: 'seoul' } }, // from the route /trip/:id
  data() {
    return {
      activeTab: 'itinerary',
      placesTab: 'wishlist', // inside Places: 'wishlist' | 'vote'
      // Sections in the top bar (title + desc are shown above the open section)
      tabs: [
        { key: 'itinerary', icon: '🗓', label: 'Itinerary', title: 'Itinerary & weather', desc: 'Your day-by-day plan, with crowd tips and the forecast.' },
        { key: 'places', icon: '📍', label: 'Places', title: 'Places', desc: 'Save places you like, then vote on them together.', testid: 'places-tab' },
        { key: 'packing', icon: '🎒', label: 'Packing', title: 'Packing list', desc: 'Built from your activities, the weather and how long you are away.' },
        { key: 'expenses', icon: '💸', label: 'Expenses', title: 'Expenses & split', desc: 'Log what the group spends and see who owes whom. Press N to add an expense.' },
        { key: 'photos', icon: '📷', label: 'Photos', title: 'Photos', desc: "The group's trip photos in one place." },
        { key: 'safety', icon: '🛡', label: 'Safety', title: 'Safety', desc: 'Live alerts and risk levels near you.', testid: 'safety-tab' },
        { key: 'travelOptions', icon: '🚆', label: 'Getting around', title: 'Getting around', desc: 'Ways to travel between your stops.' }
      ],
      // Shown once, after setting up the user's first trip
      showGuide: this.$route.query.welcome === '1',
      hasOutdoorActivity: true,
      safetyWarning: '',
      trip: null,
      loading: true,
      loadError: '',
      showShare: false,
      stagePhoto: '', // photo of the first destination (Wikipedia); plain dark header until it loads
      photoPage: ''
    }
  },
  computed: {
    // What the itinerary needs to know about this trip
    itineraryInfo() {
      if (this.isDemo) return { destination: 'Seoul, South Korea', destinations: ['Seoul, South Korea'], travellers: ['Sarah', 'John', 'Amy'], startDate: '2026-10-12', endDate: '2026-10-17', stops: [], wishlist: [] }
      const t = this.trip
      return { destination: t.destination, destinations: t.destinations && t.destinations.length ? t.destinations : [t.destination], travellers: t.travellers || [], startDate: t.startDate, endDate: t.endDate, stops: t.stops || [], wishlist: t.wishlist || [] }
    },
    currentTab() {
      for (const t of this.tabs) {
        if (t.key === this.activeTab) return t
      }
      return this.tabs[0]
    },
    dateText() {
      const t = this.itineraryInfo
      if (!t.startDate) return 'Dates not set'
      const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return t.endDate ? fmt(t.startDate) + ' – ' + fmt(t.endDate) : 'From ' + fmt(t.startDate)
    },
    dayCount() {
      const t = this.itineraryInfo
      if (!t.startDate || !t.endDate) return 0
      return Math.round((new Date(t.endDate) - new Date(t.startDate)) / 86400000) + 1
    },
    // Live numbers from the shared itinerary store
    stopCount() {
      return store.stops.length
    },
    // My traveller name on this trip (the demo trip pretends you're Sarah)
    myName() {
      return this.isDemo ? 'Sarah' : this.trip.me || this.trip.travellers[0] || ''
    },
    joinedNames() {
      if (this.isDemo) return ['Sarah', 'John', 'Amy']
      return (this.trip.members || []).map((m) => m.name)
    },
    wishlistPlaces() {
      return store.wishlist
    },
    wishCount() {
      return store.wishlist.length
    },
    pickCount() {
      const needed = Math.floor(this.itineraryInfo.travellers.length / 2) + 1
      let count = 0
      for (const w of store.wishlist) {
        if (this.itineraryInfo.travellers.length && (w.votes || []).length >= needed) count++
      }
      return count
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
    this.loadPhoto()
  },
  methods: {
    // After someone is removed: fetch the trip again
    async reloadTrip() {
      try {
        const res = await axios.get('/api/trips/' + this.id)
        this.trip = res.data
      } catch (err) {
        // keep what we have
      }
    },
    // A photo of the first destination for the header
    async loadPhoto() {
      const first = this.itineraryInfo.destinations[0]
      if (!first) return
      try {
        const res = await axios.get('/api/places/photo', { params: { destination: first } })
        if (!res.data.url) return
        // Only swap once the image has downloaded, so the header never flashes empty
        const img = new Image()
        img.onload = () => {
          this.stagePhoto = res.data.url
          this.photoPage = res.data.page
        }
        img.src = res.data.url
      } catch (err) {
        // Keep the default photo
      }
    },
    flagFor(d) {
      return flagEmoji(codeForDestination(d))
    },
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

/* ===== Page layout (dark header in the style of a product page, theme from the home page) ===== */
.trip-page {
  position: relative;
  padding: 12px 0 40px;
}
/* Glowing photo behind the top of the page */
.trip-stage {
  position: absolute;
  inset: 0 0 auto 0;
  height: 610px;
  border-radius: 28px;
  z-index: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(8, 14, 12, 0.55) 0%, rgba(8, 14, 12, 0.88) 50%, #0b1210 85%),
    linear-gradient(118deg, transparent 38%, rgba(111, 242, 189, 0.22) 48%, transparent 58%),
    linear-gradient(118deg, transparent 55%, rgba(11, 127, 95, 0.35) 63%, transparent 72%),
    var(--trip-photo, none) center 40% / cover no-repeat,
    #0b1210;
}
.trip-credit {
  position: relative;
  z-index: 1;
  text-align: right;
  font-size: 11px;
  color: var(--app-muted, #5f6f6b);
  margin: 10px 28px 0;
}
.trip-credit a {
  color: inherit;
}
.trip-loading {
  position: relative;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding-top: 160px;
}
.skeleton-bar {
  height: 62px;
  opacity: 0.6;
}

/* Top bar */
.trip-nav {
  position: sticky;
  top: 12px;
  z-index: 50;
  margin: 0 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 20px;
  background: rgba(16, 24, 22, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}
.trip-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  font-weight: 600;
  flex-shrink: 0;
}
.trip-back span:first-child {
  font-size: 20px;
  line-height: 1;
}
.trip-back:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
.trip-nav-name {
  color: #fff;
  font-family: 'Fredoka', sans-serif;
  font-size: 1.15rem;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trip-tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
  overflow-x: auto;
  scrollbar-width: none;
}
.trip-tabs::-webkit-scrollbar {
  display: none;
}
.trip-tab {
  position: relative;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-size: 15px;
  font-weight: 500;
  padding: 9px 14px;
  border-radius: 12px;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}
.trip-tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.trip-tab.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.trip-tab-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff5a5f;
}

/* Title */
.trip-head {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #fff;
  padding: 56px 16px 0;
}
.trip-title {
  font-family: 'Fredoka', sans-serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  margin-bottom: 6px;
}
.trip-route {
  color: rgba(255, 255, 255, 0.78);
  font-size: 1.05rem;
  margin-bottom: 20px;
}
.trip-arrow {
  margin: 0 8px;
  color: #6ff2bd;
}
/* Pill like a Monthly / Yearly switch */
.trip-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(10, 16, 14, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.trip-toggle-item {
  padding: 8px 18px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
}
.trip-toggle-item.on {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Summary cards */
.trip-crew {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.trip-faces {
  display: flex;
}
.trip-face {
  position: relative;
  width: 32px;
  height: 32px;
  margin-left: -8px;
  border-radius: 50%;
  background: #0b7f5f;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0b1210;
}
.trip-face:first-child {
  margin-left: 0;
}
.trip-face.guest {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  border: 2px dashed rgba(255, 255, 255, 0.35);
}
.trip-face.more {
  background: rgba(255, 255, 255, 0.15);
  font-size: 11px;
}
.trip-invite {
  border: 0;
  border-radius: 999px;
  background: #2fe0a1;
  color: #06261b;
  font-weight: 700;
  padding: 7px 16px;
  box-shadow: 0 6px 18px rgba(47, 224, 161, 0.3);
  transition: transform 0.15s;
}
.trip-invite:hover {
  transform: translateY(-1px);
}
.trip-invite:focus-visible {
  outline: 3px solid #6ff2bd;
  outline-offset: 2px;
}
.trip-cards {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  max-width: 1000px;
  margin: 44px auto 0;
  padding: 0 16px;
  align-items: end;
}
.trip-card {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 26px 28px;
  color: #fff;
  background: #121a18;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  transition: transform 0.2s, border-color 0.2s;
  position: relative;
}
.trip-card:hover {
  transform: translateY(-3px);
  border-color: rgba(111, 242, 189, 0.4);
}
.trip-card.featured {
  background: #1a2421;
  padding-top: 36px;
  padding-bottom: 36px;
  z-index: 1;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}
.trip-card-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #6ff2bd;
  color: #6ff2bd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  box-shadow: 0 0 14px rgba(111, 242, 189, 0.5);
}
.trip-card-label {
  font-weight: 600;
  font-size: 1.05rem;
}
.trip-card-big {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.1;
  margin-top: 8px;
}
.trip-card-big small,
.trip-card-sub {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 400;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.62);
}
.trip-card-sub {
  max-width: 100%;
}

/* The open section */
.trip-panel {
  position: relative;
  z-index: 1;
  margin-top: 32px;
  background: #fff;
  border-radius: 28px;
  padding: 32px;
  box-shadow: 0 16px 40px rgba(16, 40, 34, 0.08);
}
.trip-panel-head {
  margin-bottom: 20px;
}
.trip-panel-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.6rem;
  margin-bottom: 2px;
}
.trip-panel-desc {
  color: var(--app-muted, #5f6f6b);
  margin: 0;
}

/* Wishlist | Group decisions: same pill style as the header switch */
.places-switch {
  display: inline-flex;
  gap: 4px;
  background: #1f2d2a;
  border-radius: 999px;
  padding: 5px;
}
.places-switch button {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 8px 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  transition: background 0.2s, color 0.2s;
}
.places-switch button.active {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

/* Keyboard focus is always visible */
.trip-tab:focus-visible,
.trip-back:focus-visible,
.trip-card:focus-visible,
.places-switch button:focus-visible {
  outline: 3px solid #6ff2bd;
  outline-offset: 2px;
}

/* Small screens: tabs get their own scrolling row, cards stack */
@media (max-width: 900px) {
  .trip-nav {
    flex-wrap: wrap;
    margin: 0 8px;
  }
  .trip-tabs {
    order: 3;
    width: 100%;
    margin-left: 0;
  }
  /* Cards become three small tiles so they still fit on the header */
  .trip-cards {
    gap: 8px;
    margin-top: 28px;
    padding: 0 10px;
  }
  .trip-card,
  .trip-card.featured {
    padding: 14px 12px;
    border-radius: 16px;
  }
  .trip-card-label {
    font-size: 13px;
  }
  .trip-card-big {
    font-size: 1.9rem;
    margin-top: 2px;
  }
  .trip-card-big small {
    display: block;
    font-size: 12px;
  }
  .trip-card-sub,
  .trip-card-badge {
    display: none;
  }
  .trip-panel {
    padding: 20px 16px;
    border-radius: 22px;
  }
}
@media (max-width: 480px) {
  .trip-back-text {
    display: none;
  }
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
  .trip-tab,
  .trip-card,
  .places-switch button { transition: none; }
  .trip-card:hover { transform: none; }
}
</style>
