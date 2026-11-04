<template>
  <div class="trip-page">
    <!-- Loading: a placeholder in the shape of the page -->
    <LoadingSkeleton v-if="loading" variant="page" :count="3" label="Loading your trip…" />

    <div v-else-if="loadError" class="alert alert-warning">
      {{ loadError }}
      <button v-if="loadRetry" type="button" class="btn btn-link p-0 align-baseline" @click="$router.go(0)">Try again</button>
      <span v-if="loadRetry"> · </span>
      <router-link to="/home">Back to your trips</router-link>
    </div>

    <template v-else>
      <!-- One bar for the whole top of the page (it replaces the app's navbar here), stays on screen while scrolling:
           logo, back, the trip's basics (name, route, dates, who's going, Invite, Edit trip) and your profile,
           then the sections. As the window narrows, tabs move into "More"; on phones they become one menu button. -->
      <header class="trip-bar" :style="{ top: -barHide + 'px' }">
        <div ref="barTop" class="trip-bar-top">
          <span class="pl-brand-mark trip-logo" title="Chui-se Your Trip" aria-hidden="true"><DoodleIcon name="plane" :size="22" tint="cream" /></span>
          <router-link to="/home" class="trip-back" data-testid="back-to-trips" title="Back to My Trips">
            <AppIcon name="chevron-left" :size="16" /><span class="trip-back-text">My Trips</span>
          </router-link>
          <div class="trip-basics">
            <h1 class="trip-title" :title="headerTitle">{{ headerTitle }}</h1>
            <div class="trip-meta">
              <ol class="trip-route" :aria-label="'Route: ' + itineraryInfo.destinations.map((d) => d.split(', ')[0]).join(', then ')">
                <li v-for="d in itineraryInfo.destinations" :key="d" class="trip-route-stop">
                  <FlagImg :code="flagFor(d)" :size="12" /> {{ d.split(', ')[0] }}
                </li>
              </ol>
              <span class="trip-date"><AppIcon name="calendar" :size="14" /> {{ dateText }}</span>
              <!-- Who's going: joined people (solid) and not-yet-joined travellers (dashed) -->
              <span class="trip-faces" :aria-label="joinedNames.length + ' joined: ' + joinedNames.join(', ')">
                <span v-for="(n, i) in itineraryInfo.travellers.slice(0, 6)" :key="n" class="trip-face"
                  :class="{ guest: !joinedNames.includes(n) }" :style="{ zIndex: 10 - i }" :title="n + (joinedNames.includes(n) ? '' : ' (not joined yet)')">
                  {{ n.charAt(0).toUpperCase() }}
                </span>
                <span v-if="itineraryInfo.travellers.length > 6" class="trip-face more">+{{ itineraryInfo.travellers.length - 6 }}</span>
              </span>
              <button v-if="!readOnly" type="button" class="trip-invite" @click="showShare = true" data-testid="invite-btn">+ Invite</button>
              <!-- Organiser: change the name, route and dates (or delete the trip) -->
              <button v-if="!readOnly && trip.role === 'owner'" type="button" class="trip-edit" @click="showEdit = true" data-testid="edit-trip-btn">
                <AppIcon name="pencil" :size="13" /> Edit trip
              </button>
            </div>
          </div>
          <UserProfileMenu v-if="signedIn" class="trip-profile" />
        </div>
        <nav ref="barTabs" aria-label="Trip sections">
          <TripTabs :model-value="activeTab" @update:model-value="goToTab" :tabs="shownTabs" :alert-key="safetyWarning ? 'safety' : ''" class="trip-tabs" />
        </nav>
      </header>

      <TripShare v-if="showShare" :trip-id="id" :trip-name="trip.name" :members="trip.members || []"
        :travellers="trip.travellers" :role="trip.role || 'member'" :me="myName" :pending-invites="trip.pendingInvites || []"
        @close="showShare = false" @changed="reloadTrip" @left="$router.push('/home')" />
      <TripEditModal v-if="showEdit" :trip="trip" @close="showEdit = false" @saved="tripEdited" />

      <!-- The open section -->
      <!-- (keyed by readOnly: if the trip ends while open, every section starts again from what was saved) -->
      <main ref="panel" :key="readOnly ? 'panel-archived' : 'panel'" class="trip-panel">
        <div class="trip-panel-head">
          <h2 class="trip-panel-title"><span class="trip-panel-icon"><TabIcon :name="currentTab.key" :size="18" /></span> {{ currentTab.title }}</h2>
        </div>

        <!-- Archived: the trip has ended, so every section is look-only (the server refuses changes too) -->
        <div v-if="readOnly" class="alert alert-secondary d-flex align-items-center gap-2" role="status" data-testid="archived-banner">
          <AppIcon name="archive" :size="16" /> This trip has ended, so it's archived and read only.
        </div>

        <!-- Safety banner: shown on every other tab when SafetyLayer reports High/Critical risk
             (not on Safety itself: its own banner already says it, with more detail) -->
        <div v-if="safetyWarning && activeTab !== 'safety'" class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span><AppIcon name="alert" :size="16" /> {{ safetyWarning }}</span>
          <button class="btn btn-sm btn-outline-danger" @click="activeTab = 'safety'">View safety</button>
        </div>

        <!-- First trip only: a short guide to the trip page -->
          <section v-if="showGuide" class="guide mb-4" aria-labelledby="guide-title" data-testid="trip-guide">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <h2 id="guide-title" class="h5 mb-2"><AppIcon name="sparkles" :size="18" /> Your trip is ready! Here's how it works</h2>
              <button type="button" class="btn-close" aria-label="Close guide" @click="showGuide = false"></button>
            </div>
            <ol class="guide-steps">
              <li>
                <strong><AppIcon name="map-pin" :size="15" /> Places</strong> holds your <em>Wishlist</em> and <em>Group decisions</em>.
                Keep saving places and voting there any time.
                <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="openPlaces('wishlist')">Open Places</button>
              </li>
              <li>
                <strong>Itinerary</strong>: pick a day and drag your saved places onto it.
                Each stop shows its weather and crowds (tap them for options), and <em><AppIcon name="sparkles" :size="14" /> Optimize Route</em> re-orders the whole day.
              </li>
              <li>The other sections in the top bar cover packing, expenses, photos, safety and transport.</li>
            </ol>
            <button type="button" class="btn btn-primary btn-sm" @click="showGuide = false">Got it</button>
          </section>

      <div v-show="activeTab === 'itinerary'" :id="'pane-itinerary'" role="tabpanel">
        <!-- editRev: after "Edit trip" the planner starts again from the saved trip (new dates, moved stops) -->
        <ItineraryView
          :key="'itin-' + editRev"
          :trip-id="id"
          :destination="itineraryInfo.destination"
          :destinations="itineraryInfo.destinations"
          :start-date="itineraryInfo.startDate"
          :end-date="itineraryInfo.endDate"
          :initial-stops="itineraryInfo.stops"
          :initial-wishlist="itineraryInfo.wishlist" :initial-version="trip.version || 0" :travellers="itineraryInfo.travellers"
          :me="myName" :stays="trip.stays || []" :crew="trip.crew || {}"
          @itinerary-change="updatePackingActivities" @set-end-date="setEndDate" @go-places="addFromItinerary"
          @stays-change="staysChanged" @crew-change="trip.crew = $event" />
      </div>
      <!-- Places = Wishlist + Group decisions. Both use the same wishlist, which the itinerary saves. -->
      <div v-show="activeTab === 'places'" :id="'pane-places'" role="tabpanel" :class="{ 'has-return': returnTo }">
        <div class="places-switch mb-4" role="tablist" aria-label="Places">
          <button type="button" role="tab" :aria-selected="placesTab === 'wishlist'" :class="{ active: placesTab === 'wishlist' }"
            @click="placesTab = 'wishlist'" data-testid="places-wishlist"><AppIcon name="heart" :size="15" /> Wishlist</button>
          <button type="button" role="tab" :aria-selected="placesTab === 'vote'" :class="{ active: placesTab === 'vote' }"
            @click="placesTab = 'vote'" data-testid="places-vote"><AppIcon name="thumbs-up" :size="15" /> Group decisions</button>
        </div>
        <!-- Came here from the itinerary's "Add stop": a clear way back, always in view -->
          <div v-if="returnTo && activeTab === 'places'" class="places-return" role="region" aria-label="Adding stops to your itinerary">
            <p class="places-return-text" aria-live="polite">{{ placesTab === 'vote' ? 'Vote yes on places so they become group picks.' : 'Save more places for your wishlist.' }}</p>
            <button type="button" class="places-return-btn" :class="{ ready: newSaved }" @click="backToItinerary">
              <AppIcon name="chevron-left" :size="16" /> {{ newSaved ? 'Done, back to ' + returnTo.day : 'Back to ' + returnTo.day }}
            </button>
          </div>
          <WishlistView v-if="placesTab === 'wishlist'" key="w" :trip-id="id" :destinations="itineraryInfo.destinations"
            :start-date="itineraryInfo.startDate" :end-date="itineraryInfo.endDate" />
          <PlacesVoting v-else key="v" :trip-id="id" :travellers="itineraryInfo.travellers" :me="myName" :can-vote-for="canVoteFor" @go-wishlist="placesTab = 'wishlist'" />
      </div>
      <div v-show="activeTab === 'packing'" :id="'pane-packing'" role="tabpanel">
        <PackingView :key="'pack-' + id" :trip-id="id" :days="dayCount || 3"
          :activities="trip.activities || []"
          :weather="trip.weather || []"
          :extras="trip.extras || []"
          :initial-packing="trip.packing"
          :has-outdoor-activity="hasOutdoorActivity" />
      </div>
      <div v-show="activeTab === 'expenses'" id="pane-expenses" role="tabpanel">
        <ExpensesView :key="'xp-' + id" :trip-id="id" :travellers="itineraryInfo.travellers"
          :start-date="itineraryInfo.startDate" :end-date="itineraryInfo.endDate"
          :initial="trip.expenses" :me="myName" />
      </div>
      <div v-show="activeTab === 'photos'" :id="'pane-photos'" role="tabpanel">
        <PhotosView :key="'ph-' + id" :trip-id="id" :travellers="itineraryInfo.travellers"
          :wishlist="wishlistPlaces" :initial-albums="trip.photoAlbums || []" :me="myName"
          :filter-who="photoWho" />
      </div>
      <div v-show="activeTab === 'crew'" :id="'pane-crew'" role="tabpanel">
        <CrewView :key="'crew-' + id" :trip-id="id" :city="itineraryInfo.destinations[0].split(', ')[0]"
          :travellers="itineraryInfo.travellers" :members="trip.members || []"
          :pending-invites="trip.pendingInvites || []" :crew="trip.crew || {}"
          :role="trip.role" :me="myName"
          :my-id="authUserId" :flights="tripFlights" @invite="showShare = true" @go="goFromCrew" @changed="reloadTrip" />
      </div>
      <!-- Recap (after the trip): the trip in numbers with its route on a map -->
      <div v-if="tripPhase === 'after'" v-show="activeTab === 'recap'" id="pane-recap" role="tabpanel">
        <TripRecap :key="'recap-' + id" :trip-id="id" :name="trip.name"
          :destinations="itineraryInfo.destinations" :start-date="itineraryInfo.startDate" :end-date="itineraryInfo.endDate"
          :travellers="itineraryInfo.travellers" :stop-count="stopCount" :phase="tripPhase" />
      </div>
      <!--
        v-show (not v-if) keeps SafetyLayer mounted when you switch tabs. It only starts checking once
        Safety is opened, or straight away while the trip is happening (for the warning banner).
      -->
      <div v-show="activeTab === 'safety'" :id="'pane-safety'" role="tabpanel">
        <SafetyLayer :trip-id="id" :destinations="itineraryInfo.destinations" :start-date="itineraryInfo.startDate"
          :end-date="itineraryInfo.endDate" :stay="trip.stay" :stops="safetyStops" :me="myName"
          :active="activeTab === 'safety'" @risk-change="handleRiskChange" @stay-change="trip.stay = $event" />
      </div>

      <div v-show="activeTab === 'travelOptions'" :id="'pane-travelOptions'" role="tabpanel">
        <!-- Journeys that aren't between two stops (travel between stops is planned in the itinerary) -->
        <OtherJourneys :key="'oj-' + id" :trip-id="id" :destinations="itineraryInfo.destinations" :stops="safetyStops"
:stays="trip.stays || []" :my-airports="myAirports" :travellers="itineraryInfo.travellers" :me="myName"
          :start-date="itineraryInfo.startDate" :end-date="itineraryInfo.endDate"
          :initial-journeys="trip.journeys || []" :prefs="prefs" :flights="tripFlights" :wishlist="trip.wishlist" />
      </div>

    </main>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import { computed } from 'vue'
import ItineraryView from '../components/itinerary/ItineraryView.vue'
import WishlistView from '../components/places/WishlistView.vue'
import PlacesVoting from '../components/places/PlacesVoting.vue'
import GroupVoting from '../components/places/GroupVoting.vue'
import PackingView from '../components/trip/PackingView.vue'
import PhotosView from '../components/trip/PhotosView.vue'
import ExpensesView from '../components/expenses/ExpensesView.vue'
import SafetyLayer from '../components/safety/SafetyLayer.vue'
import OtherJourneys from '../components/itinerary/OtherJourneys.vue'
import { prefs } from '../preferences.js'
import TripShare from '../components/trip/TripShare.vue'
import CrewView from '../components/crew/CrewView.vue'
import TripTabs from '../components/trip/TripTabs.vue'
import TabIcon from '../components/trip/TabIcon.vue'
import { auth } from '../auth.js'
import { trip as store } from '../lib/itinerary/itineraryStore.js'
import { codeForDestination } from '../lib/trip/destinations.js'
import AppIcon from '../components/common/AppIcon.vue'
import LoadingSkeleton from '../components/common/LoadingSkeleton.vue'
import TripRecap from '../components/trip/TripRecap.vue'
import TripEditModal from '../components/trip/TripEditModal.vue'
import { notify } from '../lib/ui/notify.js'
import FlagImg from '../components/common/FlagImg.vue'
import DoodleIcon from '../components/common/DoodleIcon.vue'
import UserProfileMenu from '../components/account/UserProfileMenu.vue'

export default {
  components: { DoodleIcon, UserProfileMenu, FlagImg, LoadingSkeleton, TripRecap, TripEditModal, AppIcon, ItineraryView, WishlistView, PlacesVoting, GroupVoting, PackingView, PhotosView, ExpensesView, SafetyLayer, OtherJourneys, TripShare, CrewView, TripTabs, TabIcon },
  props: { id: { type: String, required: true } }, // from the route /trip/:id
  data() {
    return {
      prefs, // Settings → Transport (shared, loaded by the itinerary)
      barHide: 0, // how much of the top bar scrolls away: everything above the tabs (see mounted)
      activeTab: 'itinerary',
      placesTab: 'wishlist', // inside Places: 'wishlist' | 'vote'
      returnTo: null, // { date, day } when Places was opened from the itinerary's "Add stop"
      savedAtStart: 0, // wishlist size at that moment, to count the new saves
      // Sections in the top bar (title + desc are shown above the open section)
      tabs: [
        { key: 'itinerary', icon: '🗓', label: 'Itinerary', title: 'Itinerary', desc: 'Your day-by-day plan, with crowd tips and the forecast.' },
        { key: 'places', icon: '📍', label: 'Places', title: 'Places', desc: 'Save places you like, then vote on them together.', testid: 'places-tab' },
        { key: 'packing', icon: '🎒', label: 'Packing', title: 'Packing list', desc: 'Built from your activities, the weather and how long you are away.' },
        { key: 'expenses', icon: '💸', label: 'Expenses', title: 'Expenses & split', desc: 'Log what the group spends and see who owes whom. Press N to add an expense.' },
        { key: 'photos', icon: '📷', label: 'Photos', title: 'Photos', desc: "The group's trip photos in one place." },
        { key: 'safety', icon: '🛡', label: 'Safety', title: 'Safety', desc: 'Live alerts and risk levels near you.', testid: 'safety-tab' },
        { key: 'crew', icon: '👥', label: 'Crew', title: 'Trip crew', desc: '' },
        { key: 'recap', icon: '🗺', label: 'Recap', title: 'Trip recap', desc: 'Your finished trip in numbers, with the route on a map.' },
        { key: 'travelOptions', icon: '🚆', label: 'Transport', short: 'Transport', title: 'Transport', desc: 'Airport transfers, day trips and other journeys. Travel between stops is planned in the Itinerary.' }
      ],
      // Shown once, after setting up the user's first trip
      showGuide: this.$route.query.welcome === '1',
      hasOutdoorActivity: true,
      safetyWarning: '',
      trip: null,
      loading: true,
      loadError: '',
      loadRetry: false, // the load failed in a way trying again could fix
      showShare: false,
      showEdit: false, // Edit trip dialog
      editRev: 0,      // goes up after each edit, to reload the itinerary
      photoWho: { name: '', at: 0 }, // set when "Photos" is clicked on a crew card
    }
  },
  // Every section reads this: an archived trip shows everything, but nothing can be changed
  provide() {
    return { readOnly: computed(() => this.readOnly) }
  },
  computed: {
    // The trip has ended (see tripPhase). The server refuses changes to it too (server/archived.js).
    readOnly() {
      return this.tripPhase === 'after'
    },
    // What the itinerary needs to know about this trip
    itineraryInfo() {
      const t = this.trip
      return { destination: t.destination, destinations: t.destinations && t.destinations.length ? t.destinations : [t.destination], travellers: t.travellers || [], startDate: t.startDate, endDate: t.endDate, stops: t.stops || [], wishlist: t.wishlist || [] }
    },
    // The Recap tab only appears once the trip is over
    shownTabs() {
      const list = []
      for (const t of this.tabs) {
        if (t.key === 'recap' && this.tripPhase !== 'after') continue
        list.push(t)
      }
      return list
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
    // 'before' the trip, 'during' it, or 'after' it ended (no dates = before)
    tripPhase() {
      const t = this.itineraryInfo
      if (!t.startDate) return 'before'
      // Today on this device (like My Trips), so a trip moves to Archive here and there at the same moment
      const now = new Date()
      const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
      if (today < t.startDate) return 'before'
      if (t.endDate && today > t.endDate) return 'after'
      return 'during'
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
    // My traveller name on this trip
    myName() {
      return this.trip.me || this.trip.travellers[0] || ''
    },
    // Whose votes I may change: my own, and (organiser only) people without an account
    canVoteFor() {
      const list = [this.myName]
      if (this.trip.role === 'owner') {
        for (const t of this.trip.travellers) {
          if (!this.joinedNames.includes(t)) list.push(t)
        }
      }
      return list
    },
    joinedNames() {
      return (this.trip.members || []).map((m) => m.name)
    },
    // Itinerary stops for the safety radar
    safetyStops() {
      return store.stops
    },
    // Flights added on itinerary days (between cities, midway through the trip), in time order
    tripFlights() {
      const list = []
      for (const s of store.stops) {
        if (s.kind === 'flight' && s.flight) list.push({ id: s.id, date: s.date, ...s.flight })
      }
      list.sort((a, b) => (a.date + a.dep < b.date + b.dep ? -1 : 1))
      return list
    },
    // My airports (set from the itinerary), as suggestions in Other journeys
    myAirports() {
      const own = (this.trip.crew || {})[this.myName] || {}
      const list = []
      if (own.arriveAt) list.push(own.arriveAt)
      if (own.departFrom && (!own.arriveAt || own.departFrom.name !== own.arriveAt.name)) list.push(own.departFrom)
      return list
    },
    wishlistPlaces() {
      return store.wishlist
    },
    // Places saved since "Add stop" opened Places
    newSaved() {
      return this.returnTo ? Math.max(0, store.wishlist.length - this.savedAtStart) : 0
    },
    signedIn() {
      return !!auth.user
    },
    authUserId() {
      return auth.user && auth.user.id ? String(auth.user.id) : ''
    },
    headerTitle() {
      return this.trip.name
    },
    headerSubtitle() {
      const t = this.trip
      const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const dates = t.startDate ? (t.endDate ? fmt(t.startDate) + ' – ' + fmt(t.endDate) : 'From ' + fmt(t.startDate)) : 'Dates not set'
      const places = t.destinations && t.destinations.length ? t.destinations.join(' → ') : t.destination
      return places + ' | ' + dates + ' | Travellers: ' + t.travellers.join(', ')
    }
  },
  watch: {
    // Left Places some other way: the "Back to Day 2" bar isn't needed any more
    activeTab(tab) {
      if (tab !== 'places') this.returnTo = null
    }
  },
  async mounted() {
    // Remove "?welcome=1" from the address so the guide doesn't come back on refresh
    if (this.showGuide) this.$router.replace({ query: {} })
    try {
      // (a time limit, so a server that doesn't answer shows a message instead of loading forever)
      const res = await axios.get('/api/trips/' + this.id, { timeout: 30000 })
      this.trip = res.data
    } catch (err) {
      const notFound = err.response && err.response.status === 404
      this.loadError = notFound ? 'That trip could not be found.'
        : err.code === 'ECONNABORTED' ? 'The server is taking too long to answer (it may be starting up).'
          : 'Could not load this trip. Is the server running?'
      this.loadRetry = !notFound
    }
    this.loading = false
    // When you scroll, the top row slides away and the tabs stay pinned: it sticks that far above the screen
    this.$nextTick(() => {
      const row = this.$refs.barTop
      const tabs = this.$refs.barTabs
      if (!row || !tabs || typeof ResizeObserver === 'undefined') return
      // (6px of the bar stays above the tabs)
      this.barObserver = new ResizeObserver(() => { this.barHide = Math.max(0, tabs.offsetTop - 6) })
      this.barObserver.observe(row)
    })
    window.addEventListener('trip-conflict', this.reloadTrip) // a save clashed with another device's
    window.addEventListener('trip-archived', this.reloadTrip) // the trip ended while open: reload it read only
  },
  beforeUnmount() {
    if (this.barObserver) this.barObserver.disconnect()
    window.removeEventListener('trip-conflict', this.reloadTrip)
    window.removeEventListener('trip-archived', this.reloadTrip)
  },
  methods: {
    // Planner added or removed a day (or undid that): save the trip's new end date
    async setEndDate(endDate) {
      if (!this.trip.startDate || !endDate) return
      const before = this.trip.endDate
      this.trip.endDate = endDate // show it straight away
      try {
        const res = await axios.put('/api/trips/' + this.id + '/dates', { endDate })
        this.trip.endDate = res.data.endDate
      } catch (err) {
        this.trip.endDate = before // couldn't save: put it back
      }
    },
    // A crew card asked to open another tab (Expenses, or Photos filtered to one person)
    goFromCrew(tab, name) {
      if (tab === 'photos') this.photoWho = { name: name || '', at: Date.now() }
      this.goToTab(tab)
    },
    // Switch tab and bring the content panel up just under the sticky nav
    goToTab(tab) {
      this.activeTab = tab
      this.$nextTick(() => {
        const panel = this.$refs.panel
        if (!panel) return
        const nav = this.$el.querySelector('.trip-bar')
        const gap = nav ? nav.offsetHeight - this.barHide + 24 : 90 // (only the tabs row stays on screen)
        const top = panel.getBoundingClientRect().top + window.scrollY - gap
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' })
      })
    },
    // After someone is removed: fetch the trip again
    // Hotels changed in the itinerary (the Safety taxi card may follow the first one)
    staysChanged(data) {
      this.trip.stays = data.stays || []
      if (data.stay !== undefined) this.trip.stay = data.stay
    },
    // Saved in "Edit trip": load the trip again, restart the planner, and say what happened
    async tripEdited(saved) {
      this.showEdit = false
      await this.reloadTrip()
      this.editRev++
      let text = 'Trip updated.'
      if (saved && saved.movedStops) {
        const days = Math.abs(saved.shiftDays) + (Math.abs(saved.shiftDays) === 1 ? ' day' : ' days')
        text = 'Trip updated. ' + saved.movedStops + (saved.movedStops === 1 ? ' stop' : ' stops') + ' moved ' + days + (saved.shiftDays > 0 ? ' later.' : ' earlier.')
      }
      notify(text, null, 'ok')
    },
    async reloadTrip() {
      try {
        const res = await axios.get('/api/trips/' + this.id)
        this.trip = res.data
      } catch (err) {
        // keep what we have
      }
    },
    flagFor(d) {
      return codeForDestination(d) // country code for <FlagImg>
    },
    openPlaces(tab) {
      this.activeTab = 'places'
      this.placesTab = tab
    },
    // Itinerary's "Add stop": open Places, remembering which day to come back to
    addFromItinerary(info) {
      this.placesTab = info && info.tab === 'vote' ? 'vote' : 'wishlist'
      this.goToTab('places')
      this.returnTo = info && info.day ? info : { day: 'your itinerary' }
      this.savedAtStart = store.wishlist.length
    },
    backToItinerary() {
      this.returnTo = null
      this.goToTab('itinerary')
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
  background: #fbf5ea;
  border: 1.5px solid #f3d9a8;
  border-radius: 20px;
  padding: 18px 20px;
  box-shadow: 0 8px 24px rgba(0, 121, 140, 0.08);
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
  padding: 0 0 40px;
}
/* The one bar at the top: full screen width, like the app's navbar (which is hidden on this page) */
.trip-bar {
  position: sticky;
  top: 0;
  z-index: 1030;
  margin: 0 calc(50% - 50vw);
  padding: 10px clamp(14px, 3.2vw, 44px) 12px;
  background: linear-gradient(100deg, var(--pl-navy-deep), var(--pl-navy) 55%, #145079);
  border-radius: 0 0 28px 28px;
  box-shadow: 0 10px 30px -12px rgba(8, 42, 68, 0.55);
  color: #fff;
}
.trip-bar-top {
  display: flex;
  align-items: center;
  gap: 14px;
}
.trip-logo {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
}
.trip-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #003d5b;
  text-decoration: none;
  padding: 7px 12px;
  border-radius: 12px;
  background: #fbf5ea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-weight: 700;
  flex-shrink: 0;
}
.trip-back:hover {
  background: #fbf5ea;
  color: #003d5b;
  transform: translateY(-1px);
}
.trip-profile {
  flex: none;
  margin-left: auto;
}
/* Name on top, the basics in one row under it */
.trip-basics {
  flex: 1;
  min-width: 0;
}
.trip-title {
  font-family: var(--font-display);
  font-size: clamp(1.15rem, 2vw, 1.5rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trip-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 14px;
}
.trip-route {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
  font-weight: 700;
}
.trip-route-stop {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.trip-route-stop + .trip-route-stop::before {
  content: '→';
  margin: 0 8px;
  color: #edae49;
}
.trip-date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.8);
}
.trip-faces {
  display: flex;
}
.trip-face {
  position: relative;
  width: 26px;
  height: 26px;
  margin-left: -7px;
  border-radius: 50%;
  background: #00798c;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--pl-navy);
}
.trip-face:first-child {
  margin-left: 0;
}
.trip-face.guest {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  border: 2px dashed rgba(255, 255, 255, 0.4);
}
.trip-face.more {
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
}
.trip-invite {
  border: 0;
  border-radius: 999px;
  background: #edae49;
  color: #00283c;
  font-weight: 700;
  padding: 3px 12px;
}
.trip-edit {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  padding: 2px 11px;
}
.trip-invite:hover,
.trip-edit:hover {
  transform: translateY(-1px);
}
.trip-edit:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(237, 174, 73, 0.7);
}
.trip-invite:focus-visible,
.trip-edit:focus-visible {
  outline: 3px solid #f3c26f;
  outline-offset: 2px;
}
/* The sections, on their own row under the basics */
.trip-tabs {
  justify-content: flex-start;
  margin-top: 10px;
}

/* The open section */
.trip-panel {
  position: relative;
  z-index: 1;
  margin-top: 20px;
  background: #fbf5ea;
  border-radius: 28px;
  padding: 32px;
  box-shadow: 0 16px 40px rgba(0, 40, 62, 0.08);
}
.trip-panel-head {
  margin-bottom: 20px;
}
.trip-panel-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.trip-panel-icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(237, 174, 73, 0.14);
  color: #00798c;
}

/* Wishlist | Group decisions: same pill style as the header switch */
.has-return {
  padding-bottom: 96px; /* room so the bar never covers the last row */
}
.places-return {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 1050;
  transform: translateX(-50%);
  width: min(640px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 10px 10px 18px;
  border-radius: 999px;
  background: #003d5b;
  color: #fff;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
}
.places-return-text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
}
.places-return-btn {
  flex-shrink: 0;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: transparent;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
}
.places-return-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.places-return-btn.ready {
  border-color: #edae49;
  background: #edae49;
  color: #00283c;
}
.places-return-btn.ready:hover {
  transform: translateY(-1px);
}
.places-return-btn:focus-visible {
  outline: 3px solid #edae49;
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .places-return {
    flex-direction: column;
    align-items: stretch;
    border-radius: 20px;
    padding: 12px;
    gap: 10px;
  }
  .places-return-text {
    text-align: center;
  }
}

.places-switch {
  display: inline-flex;
  gap: 4px;
  background: #003d5b;
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
}
.places-switch button.active {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

/* Keyboard focus is always visible */
.trip-back:focus-visible,
.places-switch button:focus-visible {
  outline: 3px solid #f3c26f;
  outline-offset: 2px;
}

/* Small screens */
@media (max-width: 900px) {
  .trip-panel {
    padding: 20px 16px;
    border-radius: 22px;
  }
  .trip-panel-head {
    margin-bottom: 14px;
  }
  .trip-panel-title {
    font-size: 1.3rem;
  }
  .trip-panel-icon {
    width: 30px;
    height: 30px;
  }
}
/* Phones: no logo, the name and basics get the room; the sections are one menu button */
@media (max-width: 640px) {
  .trip-bar {
    padding: 8px 12px 10px;
    border-radius: 0 0 20px 20px;
  }
  .trip-bar-top {
    gap: 10px;
    align-items: flex-start;
  }
  .trip-logo {
    display: none;
  }
  .trip-meta {
    font-size: 13px;
    gap: 6px 10px;
  }
}
@media (max-width: 480px) {
  .trip-back-text {
    display: none;
  }
}

</style>
