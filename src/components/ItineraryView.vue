<template>
  <div>
    <!-- Pop-up notice: stays on screen while scrolling, closes by itself -->
    <div v-if="notice" class="notice-popup alert shadow d-flex align-items-start gap-2" :class="'alert-' + noticeType" role="alert">
      <span class="flex-grow-1">{{ notice }}</span>
      <button type="button" class="btn-close" aria-label="Close" @click="notice = ''"></button>
    </div>

    <!-- Smart Schedule: hours, crowds, buffer, and what the scheduler is doing -->
    <SchedulePanel :save-status="saveStatus" :status="plannerStatus" />

    <!-- The itinerary: day navigator, timeline with weather + crowd icons, saved places drawer -->
    <ItineraryPlanner :days="dayList" :selected-date="selectedDate" :stops="itinerary"
      :wishlist="allWishlist" :scheduled-names="scheduledNames" :day-name="tripDay" :weather-blocks="dayWeather" :typical="typicalWeather" :prefs="dayPrefs"
      :can-add-day="!isDemo && !!startDate" :day-counts="dayCounts" :day-issues="dayIssues" :destinations="destinations" :travellers="travellers" :me="me"
      :day-city="dayCities[selectedDate] || ''" :day-cities="dayCities" :stays="staysByDate" :my-flight="myFlight"
      :day-stay="stayOn(selectedDate)" :morning-stay="morningStayOn(selectedDate)"
      @select-day="selectDay" @add-day="addDay" @remove-day="removeDay" @notice="showNotice" @undo-day="undoDay" @add-place="openAddPlace" @go-vote="openVote"
      @apply="applyOptimized" @lock="setLocked" @schedule="scheduleWish" @unschedule="unscheduleStop" @status="plannerStatus = $event"
      @duration="setDuration" @move-day="moveToDay" @move-stops="moveStops" @swap="swapWithWish" @edit="editStop" @travel="setTravel"
      @save-stay="saveStay" @save-flight="saveFlight" />
  </div>
</template>

<script>
import axios from 'axios'
import { notify, errorText } from '../notify.js'
import SchedulePanel from './SchedulePanel.vue'
import ItineraryPlanner from './ItineraryPlanner.vue'
import { prefs, loadPreferences } from '../preferences.js'
import { getForecast } from '../crowd.js'
import { fetchTravelTime } from '../services/maps.js'
import { fetchWeatherForecast } from '../services/weatherService.js'
import { trip, loadDemo, loadFromServer, savedShape, runtimeStop, newId } from '../itineraryStore.js'
import { codeForDestination, COUNTRY_CODES } from '../destinations.js'
import DISCOVER from '../data/discoverCities.json'

// Everyone's votes, as text (to notice new votes from the group)
function votesKey(list) {
  const out = []
  for (const w of list || []) out.push(w.id + ':' + (w.votes || []).slice().sort().join(','))
  return out.join('|')
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default {
  components: { SchedulePanel, ItineraryPlanner },
  emits: ['itinerary-change', 'set-end-date', 'go-places', 'stays-change', 'crew-change'],
  props: {
    tripId: { type: String, default: 'seoul' }, // 'seoul' = the demo trip (not saved)
    destination: { type: String, default: '' },
    destinations: { type: Array, default: () => [] },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    initialStops: { type: Array, default: () => [] },
    initialWishlist: { type: Array, default: () => [] },
    initialVersion: { type: Number, default: 0 },
    travellers: { type: Array, default: () => [] }, // names, for the "majority of the group" rule on saved places
    me: { type: String, default: '' },              // my traveller name (shown on travel choices I make)
    stays: { type: Array, default: () => [] },      // hotels: [{ from: 'YYYY-MM-DD', name, address, lat, lon, by }], each until the next one
    crew: { type: Object, default: () => ({}) }     // crew profiles (my flights come from here and are saved there)
  },
  data() {
    return {
      selectedDate: '', // 'YYYY-MM-DD'
      plannerStatus: { kind: 'idle', text: 'Add places to this day and the schedule balances itself.' },
      weather: [], // every forecast entry: { date, time, span, condition, rain }
      weatherError: false,
      weatherSimulation: null,
      // Example:
      // {
      //   stopId: 'abc123',
      //   condition: 'Rain'
      // }
      climate: [], // typical weather by month for each destination (for days beyond the 5-day forecast)
      climateRetried: false,
      mapsOff: false, // true once the server says Google Maps isn't set up
      saveStatus: '',
      notice: '',           // text of the pop-up (empty = hidden)
      noticeType: 'warning', // 'warning' (yellow) or 'info' (blue)
      tripVersion: 0, // the version of the trip we last saved or loaded
      saving: false,
      loaded: false,
      lastSavedKey: ''
    }
  },

  async mounted() {
    // Start from this trip's saved data (or the demo)
    if (this.isDemo) loadDemo()
    else loadFromServer({ stops: this.initialStops, wishlist: this.initialWishlist})
    this.tripVersion = this.initialVersion
    
    const firstStopDay = trip.stops.map((s) => s.date).sort()[0]
    this.selectedDate = firstStopDay || this.dayList[0] || ''

    // Load simulated weather for every day of the trip
    try {
      this.weather = await fetchWeatherForecast({ dates: this.dayList })
    } catch (err) {
      this.weatherError = true
    }

    // The user's saved preferences (keeps the defaults if this fails)
    try {
      await loadPreferences()
    } catch (err) {
      console.warn('Could not load preferences, using defaults')
    }

    this.loadClimate() // in the background: typical weather for days with no forecast

    // Load each tracked stop's forecast from our server (in parallel)
    await Promise.all(trip.stops.map((item) => this.loadForecast(item)))

    await this.updateTransitTimes()
    this.reportItinerary()

    // From here on, changes are saved
    this.lastSavedKey = this.persistKey
    this.loaded = true

    // Shared trips: check every 30 seconds whether someone else changed it
    if (!this.isDemo) this.pollTimer = setInterval(this.pollTrip, 30000)
  },

  beforeUnmount() {
    clearInterval(this.pollTimer)
    clearTimeout(this.noticeTimer)
    // Don't lose a change made just before leaving the page
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveNow()
    }
  },

  watch: {
    // If typical weather couldn't load (e.g. the server was restarting), try again when the day changes
    selectedDate() {
      if (!this.climate.length) this.loadClimate()
    },
    // Fires whenever anything worth saving changes
    persistKey(key) {
      if (!this.loaded || this.isDemo || key === this.lastSavedKey) return
      this.saveStatus = 'Saving…'
      clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(this.saveNow, 800)
    }

  },

  computed: {
    // The user's day start/end (Preferences), for the day optimizer
    dayPrefs() {
      return prefs
    },
    // For the planner's "Unscheduled" drawer: every wishlist place, and the names already planned
    allWishlist() {
      return trip.wishlist
    },
    // Stops per day (the planner says how many go back to Saved places when the last day is removed)
    dayCounts() {
      const counts = {}
      for (const s of trip.stops) counts[s.date] = (counts[s.date] || 0) + 1
      return counts
    },
    scheduledNames() {
      return trip.stops.map((s) => s.name)
    },
    isDemo() {
      return this.tripId === 'seoul'
    },
    effectiveWeather() {
      if (!this.weatherSimulation) {
        return this.weather
      }

      const stop = trip.stops.find(
        (s) => s.id === this.weatherSimulation.stopId
      )

      if (!stop) {
        return this.weather
      }

      return this.weather.map((w) => {
        const duration = stop.duration || 1

        const overlapsStop =
          w.date === stop.date &&
          w.time < stop.hour + duration &&
          w.time + (w.span || 3) > stop.hour

        if (!overlapsStop) {
          return w
        }

        const rainy =
          this.weatherSimulation.condition === 'Rain'

        return {
          ...w,
          condition: rainy ? 'Rain' : 'Clear',
          rain: rainy,
          demoSimulation: true
        }
      })
    },
    // The selected day is too far ahead for a forecast: what's the weather usually like that month?
    typicalWeather() {
      if (!this.selectedDate || !this.climate.length) return null
      const m = Number(this.selectedDate.slice(5, 7)) - 1
      // Words that say which city this day is in: the stops' names and addresses, and the city they were saved under
      let text = ''
      for (const s of this.itinerary) {
        text += ' ' + (s.name || '') + ' ' + (s.address || '')
        const saved = trip.wishlist.find((w) => w.name === s.name)
        if (saved && saved.city) text += ' ' + saved.city
      }
      text = text.toLowerCase()
      // The city this day's stops mention ("Time Out Market Lisboa" -> Lisbon), else the first city with data
      let pick = null
      for (const c of this.climate) {
        if (!c.temp || c.temp[m] == null) continue
        const city = c.label.split(', ')[0].toLowerCase()
        if (text.includes(city) || text.includes(city.slice(0, 4))) { pick = c; break }
        if (!pick) pick = c
      }
      if (!pick) return null
      return { month: MONTH_NAMES[m], place: pick.label.split(', ')[0], temp: pick.temp[m], rainyDays: pick.rain ? pick.rain[m] : null }
    },
    // What's worth saving, as text. Votes are left out: each vote is saved on its own (PlacesVoting).
    persistKey() {
      const shape = savedShape()
      for (const w of shape.wishlist) delete w.votes
      return JSON.stringify(shape)
    },

    // The days of the trip: the date range if set, otherwise the days that have stops
    // The trip city of each day: where most of its stops are (by the saved place they came from),
    // else the city of the day before, else the first destination. A hotel is set once per city.
    dayCities() {
      const map = {}
      let last = this.destinations[0] || this.destination || ''
      for (const d of this.dayList) {
        const counts = {}
        for (const s of trip.stops) {
          if (s.date !== d) continue
          const w = trip.wishlist.find((x) => x.name === s.name && x.city)
          if (w) counts[w.city] = (counts[w.city] || 0) + 1
        }
        let best = ''
        let most = 0
        for (const c in counts) {
          if (counts[c] > most) {
            best = c
            most = counts[c]
          }
        }
        if (best && this.destinations.includes(best)) last = best
        map[d] = last
      }
      return map
    },
    // My flights (from my Crew card): when and where I land, and my flight home
    myFlight() {
      const crew = this.crew || {}
      const own = crew[this.me] || {}
      const shared = own.sameFlightAs && crew[own.sameFlightAs] ? crew[own.sameFlightAs] : own // "same flight as …"
      const arrival = shared.arrival ? { date: shared.arrival.slice(0, 10), time: shared.arrival.slice(11, 16), flight: shared.flight || '', place: shared.arriveAt || null } : null
      const departure = own.departure ? { date: own.departure.slice(0, 10), time: own.departure.slice(11, 16), flight: own.departFlight || '', place: own.departFrom || null } : null
      return { arrival, departure }
    },
    // Hotels in date order, each from its first night until the next one starts (so one hotel
    // covers the whole trip, and a hotel change midway only needs adding once).
    // Older trips saved one hotel per city: those start on the first day planned in that city.
    staysByDate() {
      const list = []
      for (const st of this.stays) {
        let from = st.from || ''
        if (!from) {
          for (const d of this.dayList) {
            if (this.dayCities[d] === st.city) {
              from = d
              break
            }
          }
        }
        list.push({ ...st, from: from || this.dayList[0] || '' })
      }
      list.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
      return list
    },
    dayList() {
      if (this.startDate) {
        const end = this.endDate || this.startDate
        const days = []
        const d = new Date(this.startDate)
        const last = new Date(end)
        while (d <= last && days.length < 31) {
          days.push(d.toISOString().slice(0, 10)) // "2026-10-12"
          d.setUTCDate(d.getUTCDate() + 1)        // move to the next day
        }
        return days
      }
      // No date range: use the days that have stops
      const dates = []
      for (const stop of trip.stops) {
        if (!dates.includes(stop.date)) dates.push(stop.date)
      }
      return dates.sort()
    },
    tripDay() {
      return this.selectedDate ? DAY_NAMES[new Date(this.selectedDate + 'T00:00:00').getDay()] : ''
    },
    dayWeather() {
      return this.effectiveWeather.filter(
        (w) => w.date === this.selectedDate
      )
    },

    // The selected day's stops in time order. A new array each time, so the store itself is never reordered.
    itinerary() {
      return trip.stops.filter((s) => s.date === this.selectedDate).sort((a, b) => a.hour - b.hour)
    },

    anyLoading() {
      return trip.stops.some((item) => item.loading)
    },

    // For the day strip and All days grid: how full each day is, and how many things need a look
    // (outdoors in the rain, closed that day, or more planned than your active hours)
    dayIssues() {
      const result = {}
      for (const d of this.dayList) {
        const span = this.dayHours(d)
        const hours = Math.max(1, span.end - span.start)
        const dayName = DAY_NAMES[new Date(d + 'T00:00:00').getDay()]
        let issues = 0
        let planned = 0
        for (const s of trip.stops) {
          if (s.date !== d) continue
          const dur = s.duration || 1
          planned += dur
          let wet = false
          for (const w of this.effectiveWeather) {
            if (w.date === d && w.rain && w.time < s.hour + dur && w.time + (w.span || 3) > s.hour) wet = true
          }
          if (s.outdoor && !s.locked && wet) issues++
          const day = s.forecast && s.forecast.days && s.forecast.days[dayName]
          if (day && day.closed) issues++
        }
        if (planned > hours) issues++
        result[d] = { issues, load: planned / hours, free: hours - planned }
      }
      return result
    }
  },
  methods: {
    // A day's active hours: your Preferences, shortened by my flights
    // (start 45 min after landing; finish 2.5 h before the flight home)
    dayHours(d) {
      let start = prefs.dayStart || 8
      let end = Math.min(24, prefs.dayEnd || 23)
      const f = this.myFlight
      const hourOf = (t) => Number(t.slice(0, 2)) + Number(t.slice(3, 5)) / 60
      if (f.arrival && f.arrival.date === d && f.arrival.time) start = Math.max(start, Math.ceil((hourOf(f.arrival.time) + 0.75) * 4) / 4)
      if (f.departure && f.departure.date === d && f.departure.time) end = Math.min(end, Math.max(start + 1, hourOf(f.departure.time) - 2.5))
      return { start, end }
    },
    // Where a stop moved onto a day goes: after the last thing already planned (or at the start of the day)
    nextFreeHour(d) {
      let hour = this.dayHours(d).start
      for (const s of trip.stops) {
        if (s.date === d) hour = Math.max(hour, s.hour + (s.duration || 1))
      }
      return Math.min(23.75, Math.ceil(hour * 4) / 4)
    },
    // "Day is too full": several stops go to other days, or back to Saved places ('saved'), at once
    // (one Undo puts them all back)
    async moveStops(moves) {
      this.snapshotDays()
      for (const m of moves) {
        const stop = trip.stops.find((s) => s.id === m.id)
        if (!stop) continue
        if (m.date === 'saved') {
          const known = trip.wishlist.some((w) => w.name.toLowerCase() === stop.name.toLowerCase())
          if (!known) trip.wishlist.push({ id: newId('w'), name: stop.name, address: stop.address, outdoor: stop.outdoor, type: 'custom', city: this.dayCities[stop.date] || null, votes: [] })
          trip.stops = trip.stops.filter((s) => s.id !== stop.id)
          continue
        }
        stop.hour = this.nextFreeHour(m.date)
        stop.date = m.date
      }
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    // Day optimizer: new times (after Apply, or after dragging a stop)
    async applyOptimized(changes) {
      for (const c of changes) {
        const stop = trip.stops.find((s) => s.id === c.id)
        if (stop) stop.hour = c.hour
      }
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    // ---------- hotel and flights, set from the start / end of a day ----------
    // A hotel for one city (place = { name, address, lat, lon }, or null to remove it)
    // The hotel you sleep at on this date (the latest one that starts on or before it)
    stayOn(date) {
      let found = null
      for (const st of this.staysByDate) if (st.from <= date) found = st
      return found
    },
    // Last night's hotel (where the day starts): the day before's, or the first day's own.
    // (Uses the day list, not date maths, so it's safe before a day is picked.)
    morningStayOn(date) {
      const i = this.dayList.indexOf(date)
      return i > 0 ? this.stayOn(this.dayList[i - 1]) : this.stayOn(date)
    },
    // A hotel from the itinerary: { place, scope: 'trip' | 'onward', from } (place null = remove the one from `from`)
    //   trip:   the only hotel, every night of the trip
    //   onward: a hotel change: from that day until the next change
    async saveStay(change) {
      let list = []
      for (const st of this.staysByDate) {
        const { city, ...rest } = st // (dates replace the old one-per-city hotels)
        list.push(rest)
      }
      const dayNo = this.dayList.indexOf(change.from) + 1
      let message = 'Hotel removed.'
      if (!change.place) {
        list = list.filter((st) => st.from !== change.from)
      } else if (change.scope === 'trip') {
        list = [{ from: this.dayList[0] || change.from, ...change.place, by: this.me }]
        message = 'Hotel saved: every day of the trip starts and ends there.'
      } else {
        list = list.filter((st) => st.from !== change.from)
        list.push({ from: change.from, ...change.place, by: this.me })
        message = 'Hotel saved from Day ' + dayNo + ' until your next hotel change.'
      }
      if (this.isDemo) return this.$emit('stays-change', { stays: list })
      try {
        const res = await axios.put('/api/trips/' + this.tripId + '/stays', list)
        this.$emit('stays-change', res.data)
        notify(message, null, 'ok')
      } catch (err) {
        notify(errorText(err, 'Could not save the hotel.'), () => this.saveStay(change))
      }
    },
    // My arrival or flight home (data = { date, time, flight, place }, or null to remove it); saved on my Crew card
    async saveFlight(kind, data) {
      const crew = this.crew || {}
      const own = crew[this.me] || {}
      const body = {
        persona: own.persona || '', sameFlightAs: own.sameFlightAs || '', flight: own.flight || '', arrival: own.arrival || '',
        diet: own.diet || [], dietNote: own.dietNote || '', phone: own.phone || ''
      }
      if (kind === 'arrive') {
        body.sameFlightAs = '' // my own flight now
        body.flight = data ? data.flight : ''
        body.arrival = data ? data.date + 'T' + data.time : ''
        body.arriveAt = data ? data.place : null
      } else {
        body.departFlight = data ? data.flight : ''
        body.departure = data ? data.date + 'T' + data.time : ''
        body.departFrom = data ? data.place : null
      }
      if (this.isDemo || !this.me) return
      try {
        const res = await axios.put('/api/trips/' + this.tripId + '/crew/' + encodeURIComponent(this.me), body)
        this.$emit('crew-change', res.data.crew)
        notify(data ? (kind === 'arrive' ? 'Arrival saved: ' : 'Flight home saved: ') + 'the day is planned around it, and your Crew card shows it.' : 'Flight removed.', null, 'ok')
      } catch (err) {
        notify(errorText(err, 'Could not save the flight.'), () => this.saveFlight(kind, data))
      }
    },
    // The group chose how to get to a stop (travel = { mode, from, by }, or null = the suggestion); the day re-times
    async setTravel(id, travel, changes) {
      const stop = trip.stops.find((s) => s.id === id)
      if (stop) stop.travel = travel
      await this.applyOptimized(changes)
    },
    // Planner: new time at a place, plus the re-timed day
    async setDuration(id, hours, changes) {
      const stop = trip.stops.find((s) => s.id === id)
      if (stop) stop.duration = hours
      await this.applyOptimized(changes)
    },
    // ---------- from a stop's sheet (each one can be undone from the planner's toast) ----------
    async moveToDay(id, date) {
      const stop = trip.stops.find((s) => s.id === id)
      if (!stop) return
      this.snapshotDays()
      stop.date = date
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    // Rain: an indoor saved place takes this stop's time; the old stop goes back to Saved places
    async swapWithWish(id, wishId) {
      const stop = trip.stops.find((s) => s.id === id)
      const pick = trip.wishlist.find((w) => w.id === wishId)
      if (!stop || !pick) return
      this.snapshotDays()
      const known = trip.wishlist.some((w) => w.name.toLowerCase() === stop.name.toLowerCase())
      if (!known) {
        const city = this.destinations.length === 1 ? this.destinations[0] : null
        trip.wishlist.push({ id: newId('w'), name: stop.name, address: stop.address, outdoor: stop.outdoor, type: 'custom', city, votes: [] })
      }
      stop.name = pick.name
      stop.address = pick.address || null
      stop.outdoor = !!pick.outdoor
      stop.duration = pick.duration || null
      stop.forecast = null
      stop.dataFrom = ''
      await this.loadForecast(stop)
      if (!stop.duration) stop.duration = 1.5
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    async editStop(id, fields) {
      const stop = trip.stops.find((s) => s.id === id)
      if (!stop) return
      this.snapshotDays()
      const placeChanged = fields.name !== stop.name || fields.address !== stop.address
      stop.name = fields.name
      stop.address = fields.address
      stop.outdoor = fields.outdoor
      // A different place needs its own crowd data
      if (placeChanged) {
        stop.forecast = null
        stop.dataFrom = ''
        stop.error = ''
        await this.loadForecast(stop)
      }
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    setLocked(id, locked) {
      const stop = trip.stops.find((s) => s.id === id)
      if (stop) stop.locked = locked
    },
    // A wishlist place dropped onto the planner's timeline ('__new' in changes = this new stop)
    // (date = another day, when this one was full: the stop goes after that day's last stop)
    async scheduleWish(w, changes, date) {
      if (date && date !== this.selectedDate) {
        const later = runtimeStop({ ...this.extraOf(w), id: newId('s'), name: w.name, address: w.address || null, date, hour: this.nextFreeHour(date), duration: w.duration || 1.5, outdoor: !!w.outdoor })
        trip.stops.push(later)
        await this.applyOptimized([])
        this.loadForecast(later)
        return
      }
      const stop = runtimeStop({ ...this.extraOf(w), id: newId('s'), name: w.name, address: w.address || null, date: this.selectedDate, hour: 0, duration: w.duration || 1.5, outdoor: !!w.outdoor })
      trip.stops.push(stop)
      await this.applyOptimized(changes.map((c) => (c.id === '__new' ? { ...c, id: stop.id } : c)))
      this.loadForecast(stop)
    },
    // Planner: a stop goes back to the wishlist (Undo restores it via undoDay)
    async unscheduleStop(id) {
      const stop = trip.stops.find((s) => s.id === id)
      if (!stop) return
      this.snapshotDays()
      const known = trip.wishlist.some((w) => w.name.toLowerCase() === stop.name.toLowerCase())
      if (!known && !stop.kind) { // (flights and hotel visits aren't places to save)
        // A stop added straight to the itinerary: file it under the trip's city when there's only one
        const city = this.destinations.length === 1 ? this.destinations[0] : null
        trip.wishlist.push({ id: newId('w'), name: stop.name, address: stop.address, outdoor: stop.outdoor, type: 'custom', city, votes: [] })
      }
      trip.stops = trip.stops.filter((s) => s.id !== id)
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    // ---------- adding / removing days (the planner has already asked to confirm) ----------
    shiftDate(d, days) {
      const date = new Date(d + 'T00:00:00Z')
      date.setUTCDate(date.getUTCDate() + days)
      return date.toISOString().slice(0, 10)
    },
    // Remember how things were, for Undo
    snapshotDays() {
      this.dayUndo = { ...savedShape(), endDate: this.endDate, selectedDate: this.selectedDate }
    },
    addDay() {
      this.snapshotDays()
      this.$emit('set-end-date', this.shiftDate(this.endDate || this.startDate, 1))
    },
    // Stops on the day go back to the wishlist; later days move one day earlier; the trip gets a day shorter
    async removeDay(date) {
      this.snapshotDays()
      const keep = []

      for (const s of trip.stops) {
        // Locked bookings always stay on their original calendar date.
        if (s.locked) {
          keep.push(s)
          continue
        }

        if (s.date === date) {
          const known = trip.wishlist.some(
            (w) => w.name.toLowerCase() === s.name.toLowerCase()
          )

          if (!known) {
            trip.wishlist.push({
              id: newId('w'),
              name: s.name,
              address: s.address,
              outdoor: s.outdoor,
              type: 'custom',
              city: null,
              votes: []
            })
          }
        } else {
          // Only unlocked stops on later days move earlier.
          if (s.date > date) {
            s.date = this.shiftDate(s.date, -1)
          }

          keep.push(s)
        }
      }

      trip.stops = keep

      const newEnd = this.shiftDate(this.endDate, -1)
      if (this.selectedDate > newEnd) this.selectDay(newEnd)

      this.$emit('set-end-date', newEnd)

      await this.updateTransitTimes()
      this.reportItinerary()
    },
    async undoDay() {
      const u = this.dayUndo
      if (!u) return
      this.dayUndo = null
      loadFromServer({ stops: u.stops, wishlist: u.wishlist, version: this.tripVersion })
      if (u.endDate !== this.endDate) this.$emit('set-end-date', u.endDate)
      this.selectDay(u.selectedDate)
      await Promise.all(trip.stops.map((item) => this.loadForecast(item)))
      await this.updateTransitTimes()
      this.reportItinerary()
    },
    // "Add stop": places are found and saved in the Places tab, then dragged onto a day here
    // "Add stop": go to Places, telling it which day to come back to
    openAddPlace() {
      const i = this.dayList.indexOf(this.selectedDate)
      this.$emit('go-places', { date: this.selectedDate, day: i >= 0 ? 'Day ' + (i + 1) : 'your itinerary' })
    },
    // "Vote" on a place that's waiting for votes: open Group decisions, with a way back
    openVote() {
      const i = this.dayList.indexOf(this.selectedDate)
      this.$emit('go-places', { date: this.selectedDate, day: i >= 0 ? 'Day ' + (i + 1) : 'your itinerary', tab: 'vote' })
    },
    // "Dinner Reservation (Myeongdong Kyoja)" -> "Dinner Reservation"
    shortName(name) {
      return name.split(' (')[0]
    },

    selectDay(d) {
      this.selectedDate = d
    },

    // Show a pop-up message that hides itself after 8 seconds
    showNotice(message, type = 'warning') {
      this.notice = message
      this.noticeType = type
      clearTimeout(this.noticeTimer)
      this.noticeTimer = setTimeout(() => { this.notice = '' }, 8000)
    },

    // ---------- saving ----------
    async saveNow() {
      this.saveTimer = null
      if (this.isDemo) return
      // A save is already running: try again shortly, so the version numbers don't clash
      if (this.saving) {
        this.saveTimer = setTimeout(this.saveNow, 500)
        return
      }
      this.saving = true
      const key = this.persistKey
      const body = savedShape() // (with votes: the server keeps everyone else's as they are)
      body.version = this.tripVersion
      try {
        const res = await axios.put('/api/trips/' + this.tripId + '/itinerary', body)
        this.tripVersion = res.data.version
        this.lastSavedKey = key
        this.saveStatus = 'All changes saved'
      } catch (err) {
        if (err.response && err.response.status === 409) {
          // Someone else saved first: show their version instead of overwriting it
          this.saveStatus = 'Someone else changed this trip, so their version was loaded.'
          this.showNotice('Someone in your group saved at the same time as you, so their version was loaded. Your last change was not saved, so please redo it.')
          await this.applyServerTrip(err.response.data.trip)
        } else {
          this.saveStatus = 'Could not save changes. Is the server running?'
        }
      }
      this.saving = false
    },

    // Replace what is on screen with a saved version from the server
    async applyServerTrip(saved) {
      loadFromServer({ stops: saved.stops, wishlist: saved.wishlist })
      this.tripVersion = saved.version
      this.lastSavedKey = this.persistKey // so this load doesn't trigger a save
      await Promise.all(trip.stops.map((item) => this.loadForecast(item)))
      await this.updateTransitTimes()
      this.reportItinerary()
    },

    // Every 30 seconds: has someone else changed this trip?
    async pollTrip() {
      // Don't interrupt anything the user is in the middle of
      if (this.isDemo || this.saveTimer || this.saving || this.anyLoading) return
      if (this.persistKey !== this.lastSavedKey) return // we have unsaved changes of our own
      try {
        const res = await axios.get('/api/trips/' + this.tripId)
        if (res.data.version !== this.tripVersion || votesKey(res.data.wishlist) !== votesKey(trip.wishlist)) {
          await this.applyServerTrip(res.data)
          this.saveStatus = 'Updated with changes from your group'
          this.showNotice('Your group made changes, so this itinerary was updated.', 'info')
        }
      } catch (err) {
        // ignore, we'll try again in 30 seconds
      }
    },
    

    async removeStop(stop) {
      trip.stops = trip.stops.filter((s) => s.id !== stop.id)
      await this.updateTransitTimes()
      this.reportItinerary()
    },

    // ---------- crowd data ----------
    // Load one stop's crowd forecast (stops without an address aren't tracked)
    // What a hotel or flight brings along: its map position, its kind, the flight details (flights are locked)
    extraOf(w) {
      return { lat: w.lat ?? null, lon: w.lon ?? null, kind: w.kind || null, flight: w.flight || null, locked: w.kind === 'flight' }
    },
    async loadForecast(item) {
      if (item.kind === 'flight' || item.kind === 'hotel') return // no crowds or opening hours to look up
      // No address: look it up by name in the trip's city (breaks like "Lunch" are skipped)
      const where = item.address || (/^(breakfast|brunch|lunch|dinner|supper)( break)?$/i.test((item.name || '').trim()) ? '' : this.destination)
      if (!where) return
      item.loading = true
      item.error = ''
      try {
        item.forecast = await getForecast(item.name, where)
        item.bestTime = item.forecast.bestTimeDefault
        if (item.duration === null) item.duration = item.forecast.durationDefault
      } catch (err) {
        item.error = this.errorText(err)
      }
      item.loading = false
    },

    // Last year's weather by month for the trip's destinations (Open-Meteo, free, cached on the server)
    // A country on its own ("china") has no single weather, so use one of its cities:
    // the one the stops mention (e.g. "Statue of Mao Zedong, Chengdu"), else its best-known city
    cityForClimate(name) {
      if (name.includes(', ')) return name
      let country = ''
      for (const c in COUNTRY_CODES) {
        if (c.toLowerCase() === name.trim().toLowerCase()) country = c
      }
      if (!country) return name
      let text = ''
      for (const s of trip.stops) text += ' ' + (s.name || '') + ' ' + (s.address || '')
      text = text.toLowerCase()
      let best = null
      for (const city of DISCOVER.cities) {
        if (city.country !== country) continue
        if (text.includes(city.cityName.toLowerCase())) return city.cityName + ', ' + country
        if (!best || city.popularityRank < best.popularityRank) best = city
      }
      return best ? best.cityName + ', ' + country : name
    },
    async loadClimate() {
      if (this.isDemo) return
      const picked = (this.destinations.length ? this.destinations : [this.destination]).filter(Boolean).slice(0, 10)
      const names = []
      for (const n of picked) names.push(this.cityForClimate(n))
      if (!names.length) return
      const codes = []
      for (const n of names) codes.push(codeForDestination(n) || '')
      try {
        const res = await axios.get('/api/discover/cities', { params: { names: names.join('|'), codes: codes.join('|') }, background: true })
        this.climate = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        this.climate = [] // days beyond the forecast show "–" for now
      }
      // Nothing came back: try once more in 15 seconds (the server may have been restarting)
      if (!this.climate.length && !this.climateRetried) {
        this.climateRetried = true
        setTimeout(() => this.loadClimate(), 15000)
      }
    },
    // ---------- weather ----------
    // Find the weather that overlaps with a stop
    weatherForStop(stop) {
      if (!stop) return null

      return this.weather.find((w) => {
        const duration = stop.duration || 1

        return (
          w.date === stop.date &&
          w.time < stop.hour + duration &&
          w.time + (w.span || 3) > stop.hour
        )
      }) || null
    },

    // Start a temporary weather simulation
    simulateWeather(stopId, condition) {
      const stop = trip.stops.find(
        (s) => s.id === stopId
      )

      if (!stop) return

      this.weatherSimulation = {
        stopId,
        condition
      }

      this.showNotice(
        `Demo: ${condition} weather simulated for ${this.shortName(stop.name)}.`,
        'info'
      )
    },

    // Return to the original simulated forecast
    resetWeatherSimulation() {
      this.weatherSimulation = null

      this.showNotice(
        'Weather simulation reset.',
        'info'
      )
    },

    // ---------- transit ----------
    // Travel time from every stop to the next (all requests run at once)
    async updateTransitTimes() {
      // Travel times come from Google Maps; without a Google key on the server, stop asking
      // (the planner works out walking/transit times itself from the distance between stops)
      if (this.mapsOff) return
      const list = this.itinerary
      const place = (s) => s.address || this.shortName(s.name) + (this.destination ? ', ' + this.destination : '')
      await Promise.all(list.map(async (stop, i) => {
        const next = list[i + 1]
        if (!next) {
          stop.transitToNext = null
          stop.transitSecs = 0
          return
        }
        try {
          const t = await fetchTravelTime(place(stop), place(next))
          stop.transitToNext = t.durationText
          stop.transitSecs = t.durationValue
        } catch (err) {
          if (err.response && err.response.status === 503) this.mapsOff = true
          stop.transitToNext = '30 mins (est)'
          stop.transitSecs = 1800
        }
      }))
    },

    // A clear message for any failed request
    errorText(err) {
      if (err.response && err.response.data && err.response.data.message) return err.response.data.message
      if (err.response) return 'Server error (' + err.response.status + '). Check the server terminal.'
      return 'Server not reachable. Is it running?'
    },

    reportItinerary() {
      this.$emit('itinerary-change', trip.stops)
    },

  }
}
</script>

<style scoped>
.notice-popup {
  position: fixed;
  top: 70px;                 /* just below the navbar */
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 560px;
  z-index: 1080;             /* above the page content */
}
</style>