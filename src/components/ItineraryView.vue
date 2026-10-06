<template>
  <div>
    <h4>Day 2 Itinerary & Adaptive Conflict Engine</h4>

    <!-- Weather alert (unchanged) -->
    <div v-if="hasConflict" class="alert alert-warning">
      <strong>Weather Alert:</strong> Heavy rain predicted at 14:00. Namsan Park (Outdoor) is affected.
      <button class="btn btn-sm btn-danger ms-3" @click="resolveConflict">Replace with National Museum (Indoor)</button>
    </div>

    <div class="card p-3 mb-3">
      <div v-for="(item, i) in itinerary" :key="item.name" class="mb-2 p-2 rounded"
        :class="item.highlight ? 'bg-success-subtle' : 'bg-light'" data-testid="itinerary-item">
        <strong>{{ formatHour(item.hour) }}</strong> — {{ item.name }}
        <span v-if="hasConflict && item.outdoor">🌧️ [Conflict Detected]</span>

        <!-- Crowd badge -->
        <span v-if="crowdInfo[i].hasData" class="badge ms-2" :class="crowdInfo[i].badgeClass" data-testid="crowd-badge">
          {{ crowdInfo[i].level }} ({{ crowdInfo[i].busyness }}%)
        </span>
        <span v-else-if="item.forecast" class="badge bg-secondary ms-2" data-testid="crowd-badge">No crowd data</span>

        <!-- Suggestion -->
        <div v-if="crowdInfo[i].suggestHour !== null" class="small mt-1">
          Quieter at <strong>{{ formatHour(crowdInfo[i].suggestHour) }}</strong>
          ({{ crowdInfo[i].suggestBusyness }}% busy)
          <button class="btn btn-sm btn-outline-primary ms-2" @click="moveItem(i, crowdInfo[i].suggestHour)" data-testid="crowd-move-btn">
            Move to {{ formatHour(crowdInfo[i].suggestHour) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Forecast for N Seoul Tower (inside Namsan Park) from BestTime.
// Namsan Park itself has too little data for BestTime to forecast.
import namsanForecast from '../assets/mockNamsan.json'

export default {
  data() {
    return {
      hasConflict: true,
      isResolved: false,
      tripDay: 'Tuesday', // Day 2 = Tue 13 Oct 2026
      itinerary: [
        { hour: 10, name: 'Korean Street Food Breakfast', forecast: null, outdoor: false, highlight: false },
        { hour: 14, name: 'Namsan Park (Outdoor)', forecast: namsanForecast, outdoor: true, highlight: false },
        { hour: 18, name: 'Dinner Reservation (Myeongdong Kyoja)', forecast: null, outdoor: false, highlight: false }
      ]
    }
  },

  computed: {
    // One entry per itinerary item: busyness now + a quieter suggestion
    crowdInfo() {
      const result = []

      for (let i = 0; i < this.itinerary.length; i++) {
        const item = this.itinerary[i]
        const info = { hasData: false, busyness: 0, level: '', badgeClass: '', suggestHour: null, suggestBusyness: 0 }

        if (item.forecast && item.forecast.status === 'OK') {
          // 1. Find the trip day's forecast
          let day = null
          for (const d of item.forecast.analysis) {
            if (d.day_info.day_text === this.tripDay) {
              day = d
            }
          }

          if (day) {
            const dayRaw = day.day_raw // 24 values, index 0 = 6am (BestTime's day starts at 6am)
            info.hasData = true
            info.busyness = dayRaw[(item.hour - 6 + 24) % 24]

            if (info.busyness < 35) { info.level = 'Quiet'; info.badgeClass = 'bg-success' }
            else if (info.busyness < 70) { info.level = 'Moderate'; info.badgeClass = 'bg-warning text-dark' }
            else { info.level = 'Busy'; info.badgeClass = 'bg-danger' }

            // 2. Hours already taken by other items
            const takenHours = []
            for (let j = 0; j < this.itinerary.length; j++) {
              if (j !== i) takenHours.push(this.itinerary[j].hour)
            }

            // 3. Quietest free hour while the venue is open (last start = 1h before closing)
            const openHour = day.day_info.venue_open
            const lastStart = day.day_info.venue_closed - 1
            let bestHour = item.hour
            let bestBusyness = info.busyness
            for (let h = openHour; h <= lastStart; h++) {
              const b = dayRaw[(h - 6 + 24) % 24]
              if (takenHours.includes(h)) continue
              if (b < bestBusyness) {
                bestHour = h
                bestBusyness = b
              }
            }

            // Only suggest if it's meaningfully quieter (15+ points)
            if (bestHour !== item.hour && info.busyness - bestBusyness >= 15) {
              info.suggestHour = bestHour
              info.suggestBusyness = bestBusyness
            }
          }
        }

        result.push(info)
      }

      return result
    }
  },

  methods: {
    resolveConflict() {
      this.hasConflict = false
      this.isResolved = true
      // Swap the outdoor item for the indoor one
      for (const item of this.itinerary) {
        if (item.outdoor) {
          item.name = 'National Museum (Indoor) ✨ [Replaced by Adaptive Engine]'
          item.forecast = null
          item.outdoor = false
          item.highlight = true
        }
      }
    },

    moveItem(index, newHour) {
      this.itinerary[index].hour = newHour
      this.itinerary[index].highlight = true
      // Keep the day in time order
      this.itinerary.sort((a, b) => a.hour - b.hour)
    },

    formatHour(h) {
      const suffix = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 === 0 ? 12 : h % 12
      return String(h12).padStart(2, '0') + ':00 ' + suffix
    }
  }
}
</script>
