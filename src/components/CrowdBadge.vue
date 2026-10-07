<template>
  <!-- Small crowd badge: <CrowdBadge :busyness="45" />, :loading="true", :estimated="true", or :busyness="null" for no data -->
  <span v-if="loading" class="badge bg-light text-secondary" data-testid="crowd-badge">Loading…</span>
  <span v-else-if="busyness === null || busyness === undefined" class="badge bg-secondary" data-testid="crowd-badge">No crowd data</span>
  <span v-else-if="estimated" class="badge border border-secondary text-secondary bg-white" data-testid="crowd-badge"
    title="Estimated from a typical pattern for this kind of place">~{{ busyness }}% (estimate)</span>
  <span v-else class="badge" :class="level.badgeClass" data-testid="crowd-badge">{{ level.label }} {{ busyness }}%</span>
</template>

<script>
import { crowdLevel } from '../crowd.js'

export default {
  props: {
    busyness: { type: Number, default: null },
    loading: { type: Boolean, default: false },
    estimated: { type: Boolean, default: false }
  },
  computed: {
    level() {
      return crowdLevel(this.busyness)
    }
  }
}
</script>
