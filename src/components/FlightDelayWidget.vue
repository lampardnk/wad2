<template>
  <div v-if="!dismissed" class="card p-3 mb-3 bg-light" :class="applied ? 'border-success' : delayMinutes > 0 ? 'border-danger' : ''" data-testid="flight-delay-widget">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <h5 class="mb-1" :class="applied ? 'text-success' : delayMinutes > 0 ? 'text-danger' : ''"><AppIcon name="plane" :size="18" /> Flight delay check</h5>
      <div class="d-flex align-items-center gap-2">
        <span v-if="flight" class="badge" :class="delayMinutes > 0 ? 'bg-danger' : 'bg-success'">
          {{ flight.flight }}: {{ delayMinutes > 0 ? '+' + delayMinutes + ' min delay' : 'on time' }}
        </span>
        <label class="small text-muted mb-0" for="demo-delay">Demo delay</label>
        <CustomDropdown id="demo-delay" v-model="delayMinutes" :options="delayChoices" size="sm" header-text="Demo delay"
          testid="demo-delay-select" @change="onDelayChange" />
      </div>
    </div>

    <p v-if="loading" class="small text-muted mb-0">Checking flight status…</p>
    <p v-else-if="delayMinutes === 0" class="small text-muted mb-0">No delay, so nothing on Day 1 needs to change.</p>

    <!-- Not yet fixed: show the conflicts -->
    <template v-else-if="!applied">
      <p class="small text-muted mb-2">
        New arrival: <strong>{{ formatTime(cascade.newArrival) }}</strong> (was {{ formatTime(trip.day1[0].start) }}). Knock-on effects:
      </p>
      <ul class="list-unstyled small mb-3">
        <li v-for="s in cascade.items" :key="s.id" class="py-1" :class="s.missed ? 'text-danger' : s.shifted ? 'text-warning-emphasis' : 'text-muted'" data-testid="cascade-row">
          <template v-if="s.missed"><AppIcon name="x-circle" :size="15" /> <strong>{{ s.name }}</strong> ({{ formatTime(s.start) }}): can't be reached in time, {{ s.latestNote }}. Needs rebooking.</template>
          <template v-else-if="s.shifted"><AppIcon name="alert" :size="15" /> <strong>{{ s.name }}</strong>: {{ formatTime(s.start) }} → {{ formatTime(s.newStart) }}</template>
          <template v-else><AppIcon name="check-circle" :size="15" /> <strong>{{ s.name }}</strong>: not affected ({{ formatTime(s.start) }})</template>
        </li>
      </ul>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-primary" @click="applyFixes" data-testid="cascade-apply"><AppIcon name="sparkles" :size="15" /> Re-time affected stops</button>
        <button class="btn btn-sm btn-outline-secondary" @click="dismissed = true">Dismiss</button>
      </div>
    </template>

    <!-- Fixed: show the updated schedule -->
    <template v-else>
      <p class="small text-success mb-2">Day 1 updated:</p>
      <ul class="list-unstyled small mb-2" data-testid="cascade-result">
        <li v-for="s in trip.day1" :key="s.id" class="py-1">
          <strong>{{ formatTime(s.start) }}</strong> {{ s.name }}
          <span v-if="s.status" class="text-muted">({{ s.status }})</span>
        </li>
      </ul>
      <button class="btn btn-sm btn-outline-secondary" @click="dismissed = true">Close</button>
    </template>
  </div>
</template>

<script>
import { trip, resetDay1 } from '../itineraryStore.js'
import { computeCascade, formatTime } from '../utils/delayCascade.js'
import { checkFlightStatus } from '../services/api.js'
import CustomDropdown from './CustomDropdown.vue'
import AppIcon from './AppIcon.vue'

export default {
  components: { AppIcon, CustomDropdown },
  emits: ['cascade-resolved'],
  data() {
    return {
      trip, flight: null, delayMinutes: 0, loading: true, applied: false, dismissed: false,
      delayChoices: [{ value: 0, label: 'None' }, { value: 45, label: '45 min' }, { value: 90, label: '90 min' }, { value: 180, label: '3 hours' }]
    }
  },
  computed: {
    cascade() {
      return computeCascade(this.trip.day1, this.delayMinutes)
    }
  },
  async mounted() {
    resetDay1() // start from the original Day 1 every time the widget opens
    try {
      this.flight = await checkFlightStatus('KE621')
      this.delayMinutes = this.flight.delayMinutes || 0
    } catch (err) {
      console.warn('Could not check flight status')
    }
    this.loading = false
  },
  methods: {
    formatTime,
    // Changing the demo delay starts again from the original Day 1 plan
    onDelayChange() {
      resetDay1()
      this.applied = false
    },
    applyFixes() {
      const { newArrival, items } = this.cascade
      trip.day1[0].start = newArrival
      trip.day1[0].status = 'delayed'
      for (const item of items) {
        const stop = trip.day1.find((s) => s.id === item.id)
        if (item.missed) stop.status = 'needs rebooking: ' + item.latestNote
        else if (item.shifted) {
          stop.start = item.newStart
          stop.status = 'moved from ' + formatTime(item.start)
        }
      }
      this.applied = true
      this.$emit('cascade-resolved', trip.day1)
    }
  }
}
</script>