<template>
  <div class="home">
    <!-- ===== Hero ===== -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-panel">
        <p class="hero-hello">Hi{{ firstName ? ', ' + firstName : '' }} 👋</p>
        <h1 id="hero-title" class="hero-title">
          Explore the world,<br><span class="hero-accent">skip the crowds</span>
        </h1>
        <p class="hero-text">Group Planning Made Easy!</p>
        <div class="hero-btns">
          <button class="btn hero-btn" @click="openForm" data-testid="new-trip-btn">+ Plan a new trip</button>
          <router-link to="/discover" class="btn hero-btn ghost">✨ Help me choose</router-link>
        </div>
      </div>
    </section>

    <!-- ===== Create trip (slides open) ===== -->
    <transition name="slide">
      <form v-if="showCreateForm" ref="form" class="create-card" @submit.prevent="createTrip" novalidate aria-labelledby="create-title">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 id="create-title" class="h5 mb-0">Plan a new trip</h2>
          <button type="button" class="btn-close" aria-label="Close" @click="closeForm"></button>
        </div>

        <div class="row g-4">
          <!-- Trip name -->
          <div class="col-md-6">
            <div class="field" :class="'is-' + states.name">
              <label for="trip-name" class="field-label">Trip name *</label>
              <input id="trip-name" ref="nameInput" type="text" class="field-input" v-model="newTrip.name" maxlength="80"
                placeholder="e.g. Kyoto Adventure" :aria-invalid="states.name === 'error'" aria-describedby="trip-name-msg"
                @blur="touched.name = true" data-testid="trip-name">
              <span class="field-icon" aria-hidden="true">{{ icons[states.name] }}</span>
            </div>
            <p id="trip-name-msg" class="field-msg" :class="'is-' + states.name">{{ messages.name }}</p>
          </div>

          <!-- Destination -->
          <div class="col-md-6">
            <div class="field" :class="'is-' + states.destination">
              <label for="trip-dest" class="field-label">Destinations *</label>
              <!-- Type-ahead: suggestions appear as you type -->
              <input id="trip-dest" type="text" class="field-input" v-model="newTrip.destination" maxlength="80"
                :placeholder="newTrip.destinations.length ? 'Add another stop…' : 'e.g. Kyoto, Japan'" autocomplete="off"
                role="combobox" aria-autocomplete="list" aria-controls="dest-list"
                :aria-expanded="destOpen && destOptions.length > 0"
                :aria-activedescendant="destActive >= 0 ? 'dest-opt-' + destActive : null"
                :aria-invalid="states.destination === 'error'" aria-describedby="trip-dest-msg"
                @input="onDestInput" @keydown="onDestKeydown" @focus="destOpen = true" @blur="onDestBlur"
                data-testid="trip-destination">
              <span class="field-icon" aria-hidden="true">{{ destLoading ? '…' : icons[states.destination] }}</span>

              <ul v-if="destOpen && destOptions.length" id="dest-list" class="suggest" role="listbox" data-testid="dest-suggestions">
                <li v-for="(opt, k) in destOptions" :id="'dest-opt-' + k" :key="opt.label" role="option"
                  class="suggest-item" :class="{ active: k === destActive }" :aria-selected="k === destActive"
                  @mousedown.prevent="pickDestination(opt.label)" @mouseenter="destActive = k">
                  <span class="suggest-icon" aria-hidden="true">{{ opt.flag }}</span>
                  <span>{{ opt.before }}<strong>{{ opt.match }}</strong>{{ opt.after }}</span>
                </li>
              </ul>
            </div>
            <!-- Chosen destinations, in travel order -->
            <ol v-if="newTrip.destinations.length" class="dest-chips" aria-label="Chosen destinations" data-testid="dest-chips">
              <li v-for="(d, k) in newTrip.destinations" :key="d" class="dest-chip">
                <span aria-hidden="true">{{ flagFor(d) }}</span>
                <span>{{ d }}</span>
                <button type="button" class="dest-chip-x" :aria-label="'Remove ' + d" @click="removeDestination(k)">×</button>
              </li>
            </ol>
            <p id="trip-dest-msg" class="field-msg" :class="'is-' + states.destination">{{ messages.destination }}</p>
          </div>

          <!-- Dates -->
          <div class="col-6">
            <div class="field" :class="'is-' + states.startDate">
              <label for="trip-start" class="field-label">Start date</label>
              <input id="trip-start" type="date" class="field-input" v-model="newTrip.startDate" :min="todayStr"
                :aria-invalid="states.startDate === 'error'" @blur="touched.startDate = true">
            </div>
            <p class="field-msg" :class="'is-' + states.startDate">{{ messages.startDate }}</p>
          </div>
          <div class="col-6">
            <div class="field" :class="'is-' + states.endDate">
              <label for="trip-end" class="field-label">End date</label>
              <input id="trip-end" type="date" class="field-input" v-model="newTrip.endDate" :min="newTrip.startDate || todayStr"
                :aria-invalid="states.endDate === 'error'" aria-describedby="trip-end-msg" @blur="touched.endDate = true">
            </div>
            <p id="trip-end-msg" class="field-msg" :class="'is-' + states.endDate">{{ messages.endDate }}</p>
          </div>
        </div>

        <p v-if="formError" class="field-msg is-error mt-1" role="alert" data-testid="trip-form-error">{{ formError }}</p>

        <div class="d-flex gap-2 mt-3">
          <button type="submit" class="btn pill-btn pill-primary" :disabled="saving" data-testid="trip-save">
            {{ saving ? 'Saving…' : 'Save trip' }}
          </button>
          <button type="button" class="btn pill-btn pill-ghost" @click="closeForm">Cancel</button>
        </div>
      </form>
    </transition>

    <!-- ===== Search + destination filter ===== -->
    <div class="toolbar">
      <div class="search">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <label for="trip-search" class="visually-hidden">Search trips</label>
        <input id="trip-search" v-model="search" type="search" class="form-control" placeholder="Search trips or destinations" data-testid="trip-search">
      </div>
      <CustomDropdown v-model="activeDestination" :options="destinationOptions" size="lg" class="dest-filter" :searchable="false"
        header-text="Filter by destination" aria-label="Filter by destination" />
    </div>

    <!-- ===== Invites waiting for me ===== -->
    <transition-group v-if="invites.length" name="list" tag="section" class="invites" aria-label="Trip invites">
      <article v-for="inv in invites" :key="inv.tripId" class="invite-card" data-testid="invite-card">
        <span class="invite-icon" aria-hidden="true">📨</span>
        <div class="invite-text">
          <p class="mb-0"><strong>{{ inv.invitedBy }}</strong> invited you to <strong>{{ inv.name }}</strong></p>
          <p class="invite-meta mb-0">
            <template v-for="(d, k) in inv.destinations" :key="d"><span v-if="k > 0"> → </span>{{ flagFor(d) }} {{ shortPlace(d) }}</template>
            <template v-if="inv.startDate"> · {{ dateRange(inv) }}</template>
            · {{ inv.people }} going
          </p>
        </div>
        <div class="invite-actions">
          <button type="button" class="btn invite-decline" @click="declineInvite(inv)">Decline</button>
          <router-link :to="'/join/' + inv.code" class="btn invite-join" data-testid="invite-join">Join →</router-link>
        </div>
      </article>
    </transition-group>

    <!-- ===== Trips ===== -->
    <div class="trips-head">
      <h2 class="section-title">My Trips</h2>
      <!-- Planning / Upcoming / Archive (finished trips) -->
      <div class="stage-tabs" role="tablist" aria-label="Show trips">
        <button v-for="st in STAGES" :key="st.key" type="button" role="tab" class="stage-tab"
          :class="{ on: stage === st.key }" :aria-selected="stage === st.key" :data-testid="'stage-' + st.key"
          @click="stage = st.key">
          {{ st.label }} <span class="stage-count">{{ stageCounts[st.key] }}</span>
        </button>
      </div>
    </div>

    <!-- Passport: a stamp for every city you've finished a trip to -->
    <section v-if="stage === 'archive' && stamps.length" class="passport" aria-label="Your passport">
      <div class="passport-head">
        <strong>🛂 Your passport</strong>
        <span>{{ stamps.length }} cit{{ stamps.length === 1 ? 'y' : 'ies' }} · {{ countryCount }} countr{{ countryCount === 1 ? 'y' : 'ies' }}</span>
      </div>
      <ul class="stamps">
        <li v-for="(st, k) in stamps" :key="st.place" class="stamp" :style="{ '--tilt': (k % 2 ? 4 : -4) + 'deg' }" :title="st.place + ' · ' + st.year">
          <span class="stamp-flag" aria-hidden="true">{{ flagFor(st.place) }}</span>
          <strong>{{ shortPlace(st.place) }}</strong>
          <small>{{ st.year }}</small>
        </li>
      </ul>
    </section>

    <div v-if="loadError" class="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
      <span>{{ loadError }}</span>
      <button class="btn btn-sm btn-outline-secondary" @click="loadTrips">Try again</button>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="trip-grid" aria-busy="true" aria-label="Loading trips">
      <div v-for="n in 3" :key="n" class="trip-card skeleton"></div>
    </div>

    <!-- Nothing matches the search -->
    <div v-else-if="!visibleTrips.length && (search || activeDestination !== 'All')" class="empty">
      <p class="mb-2">No {{ stageName.toLowerCase() }} trips match “{{ search || activeDestination }}”.</p>
      <button class="btn btn-sm btn-outline-primary" @click="clearFilters">Clear filters</button>
    </div>

    <!-- Archive is empty -->
    <div v-else-if="!visibleTrips.length && stage === 'archive'" class="empty">
      <p class="mb-0">🗂 Trips you've finished end up here.</p>
    </div>

    <transition-group v-else name="list" tag="div" class="trip-grid">
      <article v-for="t in visibleTrips" :key="t.id" class="trip-card" :class="{ archived: stage === 'archive' }" data-testid="trip-card" @click="openCard($event, t)">
        <!-- Illustrated header (colour picked from the destination) -->
        <router-link :to="'/trip/' + t.id" class="trip-art" :class="'theme-' + themeFor(t.destinations[0])" :aria-label="'Open ' + t.name" tabindex="-1">
          <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <circle cx="235" cy="38" r="16" class="sun" />
            <path d="M0 120 L70 50 L120 95 L170 40 L240 105 L300 70 L300 120 Z" class="mountain-back" />
            <path d="M0 120 Q60 80 120 100 T300 95 L300 120 Z" class="hill" />
          </svg>
          <!-- Photo of the destination (Wikipedia) fades in over the drawing once loaded -->
          <img v-if="photos[t.destinations[0]]" :src="photos[t.destinations[0]]" class="trip-photo" alt="" loading="lazy">
          <span class="trip-status" :class="'status-' + statusFor(t).kind">{{ statusFor(t).label }}</span>
          <span v-if="t.demo" class="trip-demo">Demo</span>
          <span v-else-if="t.members && t.members.length > 1" class="trip-demo">👥 {{ t.members.length }}</span>
        </router-link>

        <div class="trip-body">
          <h3 class="trip-name">{{ t.name }}</h3>
          <p class="trip-dest">
            <template v-for="(d, k) in t.destinations" :key="d">
              <span v-if="k > 0" class="text-muted"> → </span><span class="nowrap">{{ flagFor(d) }} {{ shortPlace(d) }}</span>
            </template>
          </p>
          <p class="trip-dates">🗓 {{ dateRange(t) }}<span v-if="tripLength(t)" class="text-muted"> ({{ tripLength(t) }})</span></p>

          <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
            <!-- Travellers as initials -->
            <div class="avatars" :aria-label="t.travellers.length + ' travellers: ' + t.travellers.join(', ')">
              <span v-for="(p, i) in t.travellers.slice(0, 4)" :key="i" class="avatar"
                :class="{ guest: t.members && !t.members.some((m) => m.name === p) }"
                :title="p + (t.members && !t.members.some((m) => m.name === p) ? ' (not joined yet)' : '')">{{ p.charAt(0).toUpperCase() }}</span>
              <span v-if="t.travellers.length > 4" class="avatar more">+{{ t.travellers.length - 4 }}</span>
            </div>

            <!-- Delete asks first, right inside the card -->
            <div v-if="confirmingId === t.id" class="d-flex align-items-center gap-1 small" role="alert">
              <span class="text-danger">Delete?</span>
              <button class="btn btn-sm btn-danger py-0" @click="removeTrip(t)">Yes</button>
              <button class="btn btn-sm btn-outline-secondary py-0" @click="confirmingId = null">No</button>
            </div>
            <button v-else-if="!t.demo && t.role === 'owner'" class="icon-btn" :aria-label="'Delete ' + t.name" title="Delete trip" @click="confirmingId = t.id">🗑</button>
            <span v-else-if="t.role === 'member'" class="shared-tag" title="You joined this trip">👥 Shared with you</span>
          </div>

          <router-link :to="'/trip/' + t.id" class="btn open-btn mt-3" data-testid="open-trip">Open trip →</router-link>
        </div>
      </article>

      <!-- "New trip" tile at the end -->
      <button v-if="stage !== 'archive'" key="new" type="button" class="trip-card new-tile" @click="openForm">
        <span class="plus" aria-hidden="true">+</span>
        <span>Plan a new trip</span>
      </button>
    </transition-group>
  </div>
</template>

<script>
import axios from 'axios'
import { auth } from '../auth.js'
import CustomDropdown from '../components/CustomDropdown.vue'
import { POPULAR_DESTINATIONS, codeForDestination, flagEmoji } from '../destinations.js'

// The built-in demo trip (all features are built around this one)
const DEMO_TRIP = {
  id: 'seoul',
  name: 'Seoul Trip',
  destination: 'Seoul, South Korea',
  destinations: ['Seoul, South Korea'],
  startDate: '2026-10-12',
  endDate: '2026-10-17',
  travellers: ['Sarah', 'John', 'Amy'],
  demo: true
}

const DAY_MS = 86400000

const STAGES = [
  { key: 'planning', label: 'Planning' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'archive', label: 'Archive' }
]

export default {
  components: { CustomDropdown },
  data() {
    return {
      trips: [],
      loading: true,
      loadError: '',
      showCreateForm: false,
      saving: false,
      formError: '',
      // Which fields the user has left at least once (we only judge those)
      touched: { name: false, destination: false, startDate: false, endDate: false },
      icons: { success: '✓', error: '!', '': '' },
      // Destination type-ahead
      destOpen: false,
      destActive: -1,        // highlighted suggestion (keyboard / mouse)
      destRemote: [],        // results from the online place search
      destLoading: false,
      destTimer: null,
      confirmingId: null,
      search: '',
      activeDestination: 'All',
      STAGES,
      stage: null, // 'planning' | 'upcoming' | 'archive' (picked once the trips load, see shownStage)
      // destination = what's being typed; destinations = the ones already added
      photos: {}, // destination -> photo url
      invites: [], // trips I've been invited to by username
      newTrip: { name: '', destination: '', destinations: [], startDate: '', endDate: '',  }
    }
  },

  async mounted() {
    // Coming from Discover ("Plan Tokyo"): open the form with the city and dates filled in
    const q = this.$route.query
    if (q.dest) {
      // One place, or several (a trip across a country)
      const dests = Array.isArray(q.dest) ? q.dest : [q.dest]
      for (const d of dests) this.pickDestination(String(d))
      this.newTrip.name = q.name ? String(q.name) : 'Trip to ' + String(dests[0]).split(', ')[0]
      if (q.start) this.newTrip.startDate = String(q.start)
      if (q.end) this.newTrip.endDate = String(q.end)
      this.openForm()
      this.$router.replace({ path: '/home' }) // so a refresh doesn't open it again
    }
    await this.loadTrips()
  },

  computed: {
    // One stamp per city from finished trips (earliest year first)
    stamps() {
      const list = []
      for (const t of this.allTrips) {
        if (t.demo || this.stageOf(t) !== 'archive') continue
        for (const d of t.destinations) {
          if (!list.some((st) => st.place === d)) list.push({ place: d, year: (t.endDate || t.startDate || '').slice(0, 4) })
        }
      }
      list.sort((a, b) => a.year.localeCompare(b.year))
      return list
    },
    countryCount() {
      const countries = []
      for (const st of this.stamps) {
        const c = this.flagFor(st.place)
        if (!countries.includes(c)) countries.push(c)
      }
      return countries.length
    },
    firstName() {
      return auth.user ? auth.user.name.split(' ')[0] : ''
    },

    // Saved trips plus the demo trip
    allTrips() {
      const list = []
      for (const t of this.trips) list.push(t)
      list.push(DEMO_TRIP)
      return list
    },

    // "All" plus one city per trip (the first one, for multi-city trips), for the filter dropdown
    destinationOptions() {
      const list = [{ value: 'All', label: 'All destinations', icon: '🌍' }]
      const seen = []
      for (const t of this.allTrips) {
        const d = t.destinations[0]
        if (!d || seen.includes(d)) continue
        seen.push(d)
        list.push({ value: d, label: d, icon: this.flagFor(d) })
      }
      return list
    },

    // How many trips are in each stage
    stageCounts() {
      const counts = { planning: 0, upcoming: 0, archive: 0 }
      for (const t of this.allTrips) counts[this.stageOf(t)]++
      return counts
    },
    stageName() {
      for (const st of STAGES) if (st.key === this.stage) return st.label
      return ''
    },

    // Trips that match the stage tab, the search box and the destination filter
    visibleTrips() {
      const q = this.search.trim().toLowerCase()
      const result = []
      for (const t of this.allTrips) {
        if (this.stageOf(t) !== this.stage) continue
        const matchesChip = this.activeDestination === 'All' || t.destinations.includes(this.activeDestination)
        let matchesSearch = !q || t.name.toLowerCase().includes(q)
        for (const d of t.destinations) {
          if (d.toLowerCase().includes(q)) matchesSearch = true
        }
        if (matchesChip && matchesSearch) result.push(t)
      }
      return result
    },

    // Suggestions for the Destination box: popular matches first, then online results.
    // Each has the typed letters split out so they can be shown in bold.
    destOptions() {
      const q = this.newTrip.destination.trim().toLowerCase()
      if (q.length < 2) return []

      const labels = []
      const codes = {} // label -> two-letter country code, for the flag
      for (const d of POPULAR_DESTINATIONS) {
        if (d.toLowerCase().includes(q) && labels.length < 4 && !this.newTrip.destinations.includes(d)) {
          labels.push(d)
          codes[d] = codeForDestination(d)
        }
      }
      for (const r of this.destRemote) {
        if (!labels.includes(r.label) && labels.length < 7 && !this.newTrip.destinations.includes(r.label)) {
          labels.push(r.label)
          codes[r.label] = r.countryCode || codeForDestination(r.label)
        }
      }

      const options = []
      for (const label of labels) {
        const at = label.toLowerCase().indexOf(q)
        options.push({
          label,
          flag: flagEmoji(codes[label]),
          before: at >= 0 ? label.slice(0, at) : label,
          match: at >= 0 ? label.slice(at, at + q.length) : '',
          after: at >= 0 ? label.slice(at + q.length) : ''
        })
      }
      return options
    },

    // Each field is '' (not checked yet), 'success' or 'error'
    states() {
      const t = this.newTrip
      const result = { name: '', destination: '', startDate: '', endDate: '' }

      if (this.touched.name) result.name = t.name.trim() ? 'success' : 'error'
      if (t.destinations.length) result.destination = 'success'
      else if (this.touched.destination) result.destination = t.destination.trim() ? '' : 'error'
      // Past dates are greyed out in the calendar; typing one in still shows an error
      if (t.startDate) result.startDate = t.startDate < this.todayStr ? 'error' : 'success'
      if (t.endDate) result.endDate = t.endDate < this.todayStr || (t.startDate && t.endDate < t.startDate) ? 'error' : 'success'
      return result
    },

    // The small line under each field
    messages() {
      const msg = { name: '', destination: '', startDate: '', endDate: '' }
      if (this.states.name === 'error') msg.name = 'Please give your trip a name'
      if (this.states.destination === 'error') msg.destination = 'Where are you going? Add at least one destination'
      else if (this.newTrip.destinations.length === 0) msg.destination = 'Pick a suggestion or press Enter to add it'
      else if (this.newTrip.destinations.length === 1) msg.destination = 'Going to more places? Add another'
      else msg.destination = this.newTrip.destinations.length + ' destinations, in this order'
      if (this.states.startDate === 'error') msg.startDate = "Can't start in the past"
      if (this.states.endDate === 'error') msg.endDate = this.newTrip.endDate < this.todayStr ? "Can't end in the past" : 'Must be on or after the start date'
      else if (this.formLength) msg.endDate = this.formLength
      return msg
    },

    // Today as YYYY-MM-DD in local time (the earliest date you can pick)
    todayStr() {
      const d = new Date()
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    },

    // Live preview of the trip length while filling in the form
    formLength() {
      if (!this.newTrip.startDate || !this.newTrip.endDate || this.newTrip.endDate < this.newTrip.startDate) return ''
      return this.tripLength({ startDate: this.newTrip.startDate, endDate: this.newTrip.endDate })
    }
  },

  methods: {
    // Clicking anywhere on a trip card opens it (except its own buttons, e.g. Delete)
    openCard(e, t) {
      if (e.target.closest('button, a')) return
      this.$router.push('/trip/' + t.id)
    },
    // ----- Destination type-ahead -----
    onDestInput() {
      this.destOpen = true
      this.destActive = -1
      // Wait until the user pauses typing (300 ms) before searching online
      clearTimeout(this.destTimer)
      const q = this.newTrip.destination.trim()
      if (q.length < 2) {
        this.destRemote = []
        return
      }
      this.destTimer = setTimeout(() => this.searchPlaces(q), 300)
    },

    async searchPlaces(q) {
      this.destLoading = true
      try {
        const res = await axios.get('/api/places', { params: { q } })
        // Only use the answer if the box still says the same thing
        if (this.newTrip.destination.trim() === q) this.destRemote = res.data
      } catch (err) {
        this.destRemote = [] // offline search failed: the popular list still works
      }
      this.destLoading = false
    },

    // Add a destination to the list and clear the box for the next one
    // "Singapore, Singapore" -> "Singapore" (a city-state named after itself)
    tidyPlace(label) {
      const parts = label.trim().split(', ')
      if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0]
      return label.trim()
    },
    pickDestination(label) {
      const clean = this.tidyPlace(label)
      // Already on the list (ignoring capitals)? Don't add it twice
      const already = this.newTrip.destinations.some((d) => d.toLowerCase() === clean.toLowerCase())
      if (clean && !already && this.newTrip.destinations.length < 10) {
        this.newTrip.destinations.push(clean)
      }
      this.newTrip.destination = ''
      this.destRemote = []
      this.destActive = -1
      this.touched.destination = true
    },

    removeDestination(index) {
      this.newTrip.destinations.splice(index, 1)
    },

    flagFor(label) {
      return flagEmoji(codeForDestination(label))
    },

    // "Kyoto, Japan" -> "Kyoto" (shorter on cards; the flag shows the country)
    shortPlace(label) {
      return codeForDestination(label) ? label.split(', ')[0] : label
    },

    // Up/Down to move, Enter to pick, Escape to close
    onDestKeydown(e) {
      const count = this.destOptions.length
      // Enter with nothing highlighted: add exactly what was typed
      if (e.key === 'Enter' && (this.destActive < 0 || !this.destOpen || count === 0)) {
        e.preventDefault()
        if (this.newTrip.destination.trim()) this.pickDestination(this.newTrip.destination)
        return
      }
      // Backspace in an empty box removes the last destination
      if (e.key === 'Backspace' && !this.newTrip.destination && this.newTrip.destinations.length) {
        this.newTrip.destinations.pop()
        return
      }
      if (!this.destOpen || count === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.destActive = (this.destActive + 1) % count
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.destActive = (this.destActive - 1 + count) % count
      } else if (e.key === 'Enter' && this.destActive >= 0) {
        e.preventDefault() // pick the suggestion instead of submitting the form
        this.pickDestination(this.destOptions[this.destActive].label)
      } else if (e.key === 'Escape') {
        this.destOpen = false
      }
    },

    onDestBlur() {
      this.destOpen = false
      this.touched.destination = true
    },

    async loadTrips() {
      this.loading = true
      this.loadError = ''
      try {
        const res = await axios.get('/api/trips')
        // Older trips only have one destination
        for (const t of res.data) {
          if (!t.destinations || !t.destinations.length) t.destinations = [t.destination]
        }
        this.trips = res.data
      } catch (err) {
        this.loadError = 'Could not load your trips. Is the server running?'
      }
      this.loading = false
      this.pickStartStage()
      this.loadPhotos()
      this.loadInvites()
    },

    async loadInvites() {
      try {
        const res = await axios.get('/api/invites')
        this.invites = res.data
      } catch (err) {
        this.invites = []
      }
    },

    async declineInvite(inv) {
      this.invites = this.invites.filter((x) => x !== inv)
      try {
        await axios.post('/api/invites/' + inv.tripId + '/decline')
      } catch (err) {
        this.loadInvites() // put it back if that failed
      }
    },

    // One photo per destination (trips going to the same place share it)
    async loadPhotos() {
      for (const t of this.allTrips) {
        const d = t.destinations[0]
        if (!d || this.photos[d] !== undefined) continue
        this.photos[d] = '' // looking it up
        axios.get('/api/places/photo', { params: { destination: d, size: 'small' } })
          .then((res) => {
            if (!res.data.url) return
            // Show it only once it has downloaded, so the card never flashes empty
            const img = new Image()
            img.onload = () => { this.photos[d] = res.data.url }
            img.src = res.data.url
          })
          .catch(() => {}) // keep the drawing
      }
    },

    openForm() {
      this.showCreateForm = true
      // Wait for the form to appear, then scroll to it and focus the first field
      this.$nextTick(() => {
        if (this.$refs.form) this.$refs.form.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (this.$refs.nameInput) this.$refs.nameInput.focus({ preventScroll: true })
      })
    },

    closeForm() {
      this.showCreateForm = false
      this.formError = ''
      this.resetTouched()
    },

    resetTouched() {
      for (const key in this.touched) this.touched[key] = false
    },

    clearFilters() {
      this.search = ''
      this.activeDestination = 'All'
    },

    // First visit: open Upcoming if there's anything coming up, otherwise Planning
    pickStartStage() {
      if (this.stage) return
      this.stage = this.stageCounts.upcoming ? 'upcoming' : 'planning'
    },

    async createTrip() {
      this.formError = ''
      for (const key in this.touched) this.touched[key] = true
      const name = this.newTrip.name.trim()
      // Anything still typed in the box counts too
      if (this.newTrip.destination.trim()) this.pickDestination(this.newTrip.destination)
      const destinations = this.newTrip.destinations
      if (!name || !destinations.length) {
        this.$nextTick(() => {
          const firstBad = this.$el.querySelector('[aria-invalid="true"]')
          if (firstBad) firstBad.focus()
        })
        return
      }
      if (this.states.startDate === 'error' || this.states.endDate === 'error') {
        return // the date fields already show the problem
      }
      this.saving = true
      try {
        const res = await axios.post('/api/trips', {
          name,
          destinations,
          startDate: this.newTrip.startDate,
          endDate: this.newTrip.endDate
        })
        this.newTrip = { name: '', destination: '', destinations: [], startDate: '', endDate: '',  }
        this.resetTouched()
        this.showCreateForm = false
        // New trip: set it up step by step (invite, wishlist, then voting). "first" = this is their first trip.
        const query = this.trips.length === 0 ? { first: '1' } : {}
        this.$router.push({ path: '/trip/' + res.data.id + '/setup/invite', query })
      } catch (err) {
        this.formError = (err.response && err.response.data && err.response.data.message) || 'Could not save the trip. Is the server running?'
      }
      this.saving = false
    },

    async removeTrip(trip) {
      this.confirmingId = null
      try {
        await axios.delete('/api/trips/' + trip.id)
        this.trips = this.trips.filter((t) => t.id !== trip.id)
      } catch (err) {
        this.loadError = 'Could not delete that trip. Try again.'
      }
    },

    dateRange(t) {
      if (!t.startDate) return 'Dates not set'
      const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return t.endDate ? fmt(t.startDate) + ' – ' + fmt(t.endDate) : 'From ' + fmt(t.startDate)
    },

    // "6 days" (start and end both count)
    tripLength(t) {
      if (!t.startDate || !t.endDate) return ''
      const days = Math.round((new Date(t.endDate) - new Date(t.startDate)) / DAY_MS) + 1
      return days + (days === 1 ? ' day' : ' days')
    },

    // Upcoming / ongoing / past, from today's date
    // Archive: the trip has ended. Upcoming: dates set and the itinerary has stops (or it's on now).
    // Planning: everything else (no dates yet, or nothing planned yet).
    stageOf(t) {
      const status = this.statusFor(t).kind
      if (status === 'past') return 'archive'
      if (status === 'ongoing') return 'upcoming'
      if (status === 'upcoming' && (t.demo || (t.stops && t.stops.length))) return 'upcoming'
      return 'planning'
    },

    statusFor(t) {
      if (!t.startDate) return { kind: 'none', label: 'Planning' }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(t.startDate + 'T00:00:00')
      const end = new Date((t.endDate || t.startDate) + 'T00:00:00')
      if (today < start) {
        const days = Math.round((start - today) / DAY_MS)
        return { kind: 'upcoming', label: days === 1 ? 'Tomorrow' : 'In ' + days + ' days' }
      }
      if (today <= end) return { kind: 'ongoing', label: 'Happening now' }
      return { kind: 'past', label: 'Completed' }
    },

    // Same destination always gets the same colour theme (0-3)
    themeFor(destination) {
      if (!destination) return 0
      let sum = 0
      for (let i = 0; i < destination.length; i++) sum += destination.charCodeAt(i)
      return sum % 4
    }
  }
}
</script>

<style scoped>
.home {
  --accent: #f08c3a; /* warm highlight, used sparingly */
}

/* ---------- Hero ---------- */
.hero {
  border-radius: 24px;
  overflow: hidden;
  min-height: 320px;
  display: flex;
  align-items: stretch;
  margin-bottom: 24px;
  background:
    linear-gradient(90deg, rgba(0, 20, 32, 0.15), rgba(0, 20, 32, 0)),
    url('/giza.jpg') center 30% / cover no-repeat,
    linear-gradient(135deg, #002a40, #30638e);
  box-shadow: 0 16px 40px rgba(7, 18, 36, 0.18);
}
.hero-panel {
  background: rgba(10, 22, 26, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #fff;
  padding: 40px 36px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hero-hello {
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 8px;
}
.hero-title {
  font-family: 'Fredoka', sans-serif;
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1.1;
  margin-bottom: 12px;
}
.hero-accent {
  color: #f3c26f;
}
.hero-text {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 20px;
}
.hero-btn {
  align-self: flex-start;
  background: #edae49;
  color: #00283c;
  font-weight: 700;
  border-radius: 999px;
  padding: 10px 22px;
  transition: transform 0.15s, background 0.15s;
}
.hero-btn:hover,
.hero-btn:focus-visible {
  background: #f3c26f;
  color: #00283c;
  transform: translateY(-1px);
}

.hero-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.hero-btn.ghost {
  background: transparent;
  color: #fff;
  border: 1.5px solid rgba(255, 255, 255, 0.7);
}
.hero-btn.ghost:hover,
.hero-btn.ghost:focus-visible {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* ---------- Passport (Archive tab) ---------- */
.passport {
  background: #fbf5ea;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  padding: 16px 18px;
  margin-bottom: 18px;
}
.passport-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.passport-head span {
  font-size: 13px;
  color: #5a6b78;
}
.stamps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0;
  padding: 0;
}
.stamp {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border: 2.5px dashed #00798c;
  border-radius: 50%;
  color: #00798c;
  transform: rotate(var(--tilt));
  text-align: center;
  line-height: 1.1;
  transition: transform 0.2s;
}
.stamp:hover {
  transform: rotate(0deg) scale(1.06);
}
.stamp:nth-child(3n + 2) {
  border-color: #d1495b;
  color: #d1495b;
}
.stamp:nth-child(3n) {
  border-color: #30638e;
  color: #30638e;
}
.stamp-flag {
  font-size: 22px;
}
.stamp strong {
  font-size: 12px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stamp small {
  font-size: 11px;
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .stamp { transition: none; }
}

/* ---------- Create form ---------- */
.create-card {
  background: #fbf5ea;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0, 40, 62, 0.08);
  scroll-margin-top: 16px;
}
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---------- Form fields: pill inputs with the label on the border ---------- */
.field {
  --field-color: #d6ccbb;
  --field-bg: #fff;
  position: relative;
}
.field-label {
  position: absolute;
  top: 0;
  left: 18px;
  transform: translateY(-50%);
  padding: 0 6px;
  background: var(--field-bg);
  font-size: 13px;
  color: var(--app-ink);
  line-height: 1;
  pointer-events: none;
}
.field-input {
  width: 100%;
  height: 54px;
  border: 1.5px solid var(--field-color);
  border-radius: 999px;
  padding: 0 46px 0 22px;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-ink);
  background: var(--field-bg);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-input::placeholder {
  color: #9aa7b1;
  font-weight: 500;
}
.field-input:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 4px rgba(0, 121, 140, 0.15);
}
.field-input:disabled {
  background: #f1f3f3;
  color: #9aa7b1;
}
.field-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 700;
  pointer-events: none;
}
.field.is-success { --field-color: #f1c47a; }
.field.is-success .field-icon { color: #1f9d6b; }
.field.is-error { --field-color: #ef9a8a; }
.field.is-error .field-input:focus { box-shadow: 0 0 0 4px rgba(214, 69, 46, 0.15); }
.field.is-error .field-icon {
  color: #d6452e;
  border: 2px solid #d6452e;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.field-msg {
  font-size: 13px;
  margin: 6px 0 0 22px;
  min-height: 18px; /* keeps the layout still when a message appears */
  color: var(--app-muted);
}
.field-msg.is-success { color: #1f9d6b; }
.field-msg.is-error { color: #d6452e; }

.pill-btn {
  border-radius: 999px;
  padding: 10px 24px;
  font-weight: 600;
}
.pill-primary {
  background: var(--app-primary);
  color: #fff;
}
.pill-primary:hover,
.pill-primary:focus-visible {
  background: var(--app-primary-dark);
  color: #fff;
}
.pill-ghost {
  border: 1.5px solid var(--field-color, #d6ccbb);
  color: var(--app-ink);
  background: #fbf5ea;
}
.pill-ghost:hover {
  border-color: var(--app-ink);
}

/* ---------- Chosen destinations ---------- */
.dest-chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0 0 0 10px;
  counter-reset: stop;
}
.dest-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fbefd9;
  color: #004e5a;
  border: 1px solid #f3d9a8;
  border-radius: 999px;
  padding: 4px 6px 4px 12px;
  font-size: 14px;
  font-weight: 600;
  animation: pop 0.12s ease-out;
}
.dest-chip::before {
  counter-increment: stop;
  content: counter(stop);
  font-size: 11px;
  background: var(--app-primary);
  color: #fff;
  border-radius: 999px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dest-chip-x {
  border: 0;
  background: transparent;
  color: #004e5a;
  font-size: 18px;
  line-height: 1;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.dest-chip-x:hover,
.dest-chip-x:focus-visible {
  background: #c9ecdd;
}

/* ---------- Destination suggestions ---------- */
.suggest {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: #fbf5ea;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(0, 40, 62, 0.14);
  max-height: 300px;
  overflow-y: auto;
  animation: pop 0.12s ease-out;
}
.suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  color: var(--app-ink);
}
.suggest-item strong {
  color: var(--app-primary);
}
.suggest-item.active {
  background: #fbefd9;
}
.suggest-icon {
  font-size: 18px;
  line-height: 1;
}
@keyframes pop {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .suggest { animation: none; }
}

/* ---------- Search + destination filter ---------- */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
}
.search {
  position: relative;
  flex: 1 1 260px;
  max-width: 420px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.6;
}
.search .form-control {
  border-radius: 999px;
  padding-left: 38px;
  height: 44px;
  background: #fbf5ea;
}
.invites {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}
.invite-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fbf5ea;
  border: 1.5px solid #f3d9a8;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 121, 140, 0.08);
}
.invite-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  background: #fbefd9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.invite-text {
  flex: 1;
  min-width: 0;
}
.invite-meta {
  font-size: 13px;
  color: var(--app-muted);
}
.invite-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.invite-join {
  background: #003d5b;
  color: #edae49;
  border-radius: 999px;
  font-weight: 600;
  padding: 7px 18px;
}
.invite-join:hover {
  background: var(--app-primary);
  color: #fff;
}
.invite-decline {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 7px 14px;
  color: var(--app-muted);
}
@media (max-width: 576px) {
  .invite-card {
    flex-wrap: wrap;
  }
  .invite-actions {
    width: 100%;
  }
  .invite-actions .btn {
    flex: 1;
  }
}
.dest-filter {
  flex: 0 1 260px;
  min-width: 200px;
}
.icon-btn:focus-visible,
.trip-card:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.4);
  outline-offset: 2px;
}

.section-title {
  font-size: 1.5rem;
  margin: 0;
}
.trips-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.stage-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: #fbf5ea;
  border: 1px solid var(--app-border);
}
.stage-tab {
  border: 0;
  background: transparent;
  color: var(--app-muted);
  font-size: 14px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 999px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.stage-tab:hover {
  color: var(--app-ink);
}
.stage-tab.on {
  background: var(--app-ink);
  color: #fff;
}
.stage-count {
  display: inline-block;
  min-width: 20px;
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(31, 45, 42, 0.08);
}
.stage-tab.on .stage-count {
  background: rgba(237, 174, 73, 0.25);
  color: #f8deb0;
}
.stage-tab:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.4);
  outline-offset: 2px;
}
/* Finished trips look a little faded until you hover */
.trip-card.archived .trip-photo,
.trip-card.archived .trip-art svg {
  filter: grayscale(0.6);
  transition: filter 0.2s;
}
.trip-card.archived:hover .trip-photo,
.trip-card.archived:hover .trip-art svg {
  filter: none;
}
@media (max-width: 480px) {
  .stage-tabs {
    width: 100%;
  }
  .stage-tab {
    flex: 1;
    padding: 7px 8px;
  }
}

/* ---------- Trip grid ---------- */
.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}
.trip-card {
  background: #fbf5ea;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0, 40, 62, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.trip-card[data-testid="trip-card"] {
  cursor: pointer;
}
.trip-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 30px rgba(0, 40, 62, 0.12);
}

/* Illustrated header */
.trip-art {
  position: relative;
  display: block;
  height: 120px;
  background: var(--sky);
}
.trip-status,
.trip-demo {
  z-index: 1;
}
.avatar.guest {
  background: #fbf5ea;
  color: #8a99a5;
  border: 2px dashed #d2c8b6;
}
.shared-tag {
  font-size: 12px;
  font-weight: 600;
  color: #00798c;
  background: #f5eee2;
  border-radius: 999px;
  padding: 3px 10px;
}
.trip-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: photo-in 0.4s ease;
}
/* Darken the top a little so the status badge stays readable */
.trip-art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0) 45%);
  pointer-events: none;
}
@keyframes photo-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .trip-photo { animation: none; }
}
.trip-art svg {
  width: 100%;
  height: 100%;
  display: block;
}
.sun { fill: var(--sun); }
.mountain-back { fill: var(--far); }
.hill { fill: var(--near); }
.theme-0 { --sky: #dff3ec; --sun: #ffd166; --far: #8fd3b8; --near: #2f9e78; }
.theme-1 { --sky: #e3eefc; --sun: #ffd166; --far: #9cbcea; --near: #3f6fb5; }
.theme-2 { --sky: #fdf0e1; --sun: #f08c3a; --far: #f2c48d; --near: #c9733a; }
.theme-3 { --sky: #ece6fb; --sun: #ffd166; --far: #b8a6ea; --near: #6a54b5; }

.trip-status,
.trip-demo {
  position: absolute;
  top: 10px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--app-ink);
}
.trip-status { left: 10px; }
.trip-demo { right: 10px; }
.status-upcoming { color: #004e5a; }
.status-ongoing { background: #00798c; color: #fff; }
.status-past { color: var(--app-muted); }

.trip-body {
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.trip-name {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 6px;
}
.nowrap {
  white-space: nowrap; /* keep a flag next to its place name */
}
.trip-dest,
.trip-dates {
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--app-ink);
}

.avatars {
  display: flex;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--app-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  margin-left: -8px;
}
.avatar:first-child { margin-left: 0; }
.avatar.more { background: var(--app-muted); }

.icon-btn {
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 4px 8px;
  opacity: 0.55;
  transition: opacity 0.15s, background 0.15s;
}
.icon-btn:hover {
  opacity: 1;
  background: #fbe7ea;
}

.open-btn {
  background: var(--accent);
  color: #3a1d06; /* dark text: readable on orange */
  border-radius: 999px;
  font-weight: 600;
  transition: filter 0.15s;
}
.open-btn:hover,
.open-btn:focus-visible {
  color: #3a1d06;
  filter: brightness(0.93);
}

/* "New trip" tile */
.new-tile {
  border: 2px dashed var(--app-border);
  background: transparent;
  box-shadow: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 300px;
  color: var(--app-muted);
  font-weight: 600;
}
.new-tile:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}
.plus {
  font-size: 40px;
  line-height: 1;
}

/* Loading skeleton */
.skeleton {
  min-height: 300px;
  background: linear-gradient(90deg, #efe9df 25%, #f9f6f0 50%, #efe9df 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  to { background-position: -200% 0; }
}

.empty {
  text-align: center;
  padding: 40px 16px;
  color: var(--app-muted);
  background: #fbf5ea;
  border: 1px dashed var(--app-border);
  border-radius: 16px;
}

/* Cards fade in/out when filtering */
.list-enter-active,
.list-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* Phones */
@media (max-width: 576px) {
  .hero { min-height: 0; border-radius: 18px; }
  .hero-panel { max-width: none; padding: 28px 22px; }
}

/* Respect "reduce motion" */
@media (prefers-reduced-motion: reduce) {
  .trip-card,
  .hero-btn,
  .slide-enter-active,
  .slide-leave-active,
  .list-enter-active,
  .list-leave-active {
    transition: none;
  }
  .trip-card:hover { transform: none; }
  .skeleton { animation: none; }
}
</style>