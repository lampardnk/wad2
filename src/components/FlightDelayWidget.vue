<template>
  <div class="card p-3 mb-3 border-danger bg-light" data-testid="flight-delay-widget">
    <div class="d-flex justify-content-between align-items-center">
      <h5 class="text-danger mb-1">✈️ Flight Delay Cascade Alert</h5>
      <span class="badge bg-danger">Flight KE621: +90 min delay</span>
    </div>
    <p class="small text-muted mb-2">
      New estimated arrival: <strong>14:30</strong> (Original: 13:00). This triggers downstream conflicts:
    </p>

    <ul class="list-unstyled small mb-3">
      <li class="py-1 text-danger">
        ❌ <strong>Airport Transfer (13:30):</strong> Driver will miss pickup window.
      </li>
      <li class="py-1 text-danger">
        ❌ <strong>Hotel Check-in (14:00):</strong> Arriving after standard traffic rush; front desk notified.
      </li>
      <li class="py-1 text-warning">
        ⚠️ <strong>Gyeongbokgung Palace Tour (15:00):</strong> Tight turnaround from airport.
      </li>
    </ul>

    <div class="d-flex gap-2">
      <button class="btn btn-sm btn-primary" @click="applyCascadeFixes">
        ✨ Auto-Reschedule Downstream Stops
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="dismissAlert">Dismiss</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      resolved: false
    }
  },
  methods: {
    applyCascadeFixes() {
      alert('Cascade fixes applied: Airport transfer pushed to 15:00, hotel informed of late arrival, and itinerary re-timed!')
      this.$emit('cascade-resolved')
      this.resolved = true
    },
    dismissAlert() {
      this.resolved = true
    }
  }
}
</script>