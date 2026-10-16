<template>
  <!-- Local radar: where help is, compared with where you're staying and today's stops -->
  <div class="sr">
    <div class="sr-legend" role="group" aria-label="Show on radar">
      <button v-for="k in KINDS" :key="k.key" type="button" class="sr-chip" :class="{ off: hidden.includes(k.key) }"
        :aria-pressed="!hidden.includes(k.key)" @click="toggle(k.key)">
        <span class="sr-swatch" :style="{ background: k.color }" aria-hidden="true">{{ k.glyph }}</span>
        {{ k.label }} <span class="sr-n">{{ counts[k.key] || 0 }}</span>
      </button>
      <button v-if="stops.length" type="button" class="sr-chip" :class="{ off: hidden.includes('stop') }"
        :aria-pressed="!hidden.includes('stop')" @click="toggle('stop')">
        <span class="sr-swatch stop" aria-hidden="true"></span> Your stops <span class="sr-n">{{ stops.length }}</span>
      </button>
    </div>

    <div class="sr-stage">
      <svg :viewBox="'0 0 ' + SIZE + ' ' + SIZE" class="sr-svg" role="img" :aria-label="summary">
        <!-- rings every 1 km -->
        <circle v-for="r in rings" :key="r" :cx="C" :cy="C" :r="r * scale" class="sr-ring" />
        <text v-for="r in rings" :key="'t' + r" :x="C + 4" :y="C - r * scale + 12" class="sr-ring-label">{{ r }} km</text>
        <line :x1="C" y1="8" :x2="C" :y2="SIZE - 8" class="sr-axis" />
        <line x1="8" :y1="C" :x2="SIZE - 8" :y2="C" class="sr-axis" />
        <text :x="C" y="18" class="sr-north">N</text>
        <!-- slow radar sweep -->
        <path :d="sweep" class="sr-sweep" />

        <!-- your stops -->
        <g v-for="p in shownStops" :key="p.id" class="sr-pt" tabindex="0" role="button"
          :aria-label="p.name + ', ' + p.dist.toFixed(1) + ' km ' + p.dir"
          @mouseenter="active = p" @focus="active = p" @mouseleave="active = null" @blur="active = null">
          <circle :cx="p.x" :cy="p.y" r="12" class="sr-hit" />
          <circle :cx="p.x" :cy="p.y" r="6" class="sr-stop" />
        </g>
        <!-- help nearby -->
        <g v-for="p in shownPlaces" :key="p.id" class="sr-pt" tabindex="0" role="button"
          :aria-label="kindOf(p.kind).label + ': ' + p.name + ', ' + p.dist.toFixed(1) + ' km ' + p.dir"
          @mouseenter="active = p" @focus="active = p" @mouseleave="active = null" @blur="active = null">
          <circle :cx="p.x" :cy="p.y" r="13" class="sr-hit" />
          <circle :cx="p.x" :cy="p.y" r="9" :fill="kindOf(p.kind).color" class="sr-dot" />
          <text :x="p.x" :y="p.y + 3.5" class="sr-glyph">{{ kindOf(p.kind).glyph }}</text>
        </g>
        <!-- you / where you're staying -->
        <circle :cx="C" :cy="C" r="16" class="sr-home-pulse" />
        <circle :cx="C" :cy="C" r="8" class="sr-home" />
      </svg>

      <!-- tooltip -->
      <div v-if="active" class="sr-tip" :style="{ left: (active.x / SIZE * 100) + '%', top: (active.y / SIZE * 100) + '%' }" role="status">
        <strong>{{ active.name }}</strong>
        <span>{{ active.kind ? kindOf(active.kind).label + ' · ' : 'Your stop · ' }}{{ active.dist.toFixed(1) }} km {{ active.dir }}</span>
      </div>
    </div>
    <p class="sr-caption">Centre: {{ centerLabel }} · rings every 1 km</p>
  </div>
</template>

<script>
import { haversineKm, bearingDeg } from '../services/safetyService.js'

// Category colours: validated for colour-blind separation on the dark surface; each also has a letter
const KINDS = [
  { key: 'hospital', label: 'Hospitals', glyph: 'H', color: '#d95926' },
  { key: 'clinic', label: 'Clinics', glyph: 'C', color: '#d55181' },
  { key: 'police', label: 'Police', glyph: 'P', color: '#3987e5' },
  { key: 'fire_station', label: 'Fire', glyph: 'F', color: '#c98500' },
  { key: 'shelter', label: 'Evacuation', glyph: 'E', color: '#199e70' },
  { key: 'embassy', label: 'Embassy', glyph: '★', color: '#9085e9' }
]
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export default {
  props: {
    center: { type: Object, required: true }, // { lat, lon }
    centerLabel: { type: String, default: '' },
    places: { type: Array, default: () => [] }, // [{ id, kind, name, lat, lon }]
    stops: { type: Array, default: () => [] }, // [{ id, name, lat, lon }]
    radiusKm: { type: Number, default: 3 }
  },

  data() {
    return { KINDS, SIZE: 320, C: 160, hidden: [], active: null }
  },

  computed: {
    scale() {
      return (this.C - 14) / this.radiusKm // pixels per km
    },
    rings() {
      const list = []
      for (let r = 1; r <= this.radiusKm; r++) list.push(r)
      return list
    },
    sweep() {
      const r = this.C - 14
      return 'M' + this.C + ',' + this.C + ' L' + this.C + ',' + (this.C - r) + ' A' + r + ',' + r + ' 0 0,1 ' + (this.C + r * Math.sin(Math.PI / 4)) + ',' + (this.C - r * Math.cos(Math.PI / 4)) + ' Z'
    },
    // Place every point by its distance and compass direction from the centre
    placed() {
      const list = []
      for (const p of this.places.concat(this.stops)) {
        if (p.lat === undefined || p.lat === null) continue
        const dist = haversineKm(this.center.lat, this.center.lon, p.lat, p.lon)
        if (dist > this.radiusKm) continue
        const deg = bearingDeg(this.center.lat, this.center.lon, p.lat, p.lon)
        const rad = (deg * Math.PI) / 180
        list.push({
          ...p,
          dist,
          dir: DIRS[Math.round(deg / 45) % 8],
          x: this.C + dist * this.scale * Math.sin(rad),
          y: this.C - dist * this.scale * Math.cos(rad)
        })
      }
      return list
    },
    shownPlaces() {
      return this.placed.filter((p) => p.kind && !this.hidden.includes(p.kind))
    },
    shownStops() {
      return this.hidden.includes('stop') ? [] : this.placed.filter((p) => !p.kind)
    },
    counts() {
      const c = {}
      for (const p of this.placed) if (p.kind) c[p.kind] = (c[p.kind] || 0) + 1
      return c
    },
    summary() {
      const parts = []
      for (const k of KINDS) if (this.counts[k.key]) parts.push(this.counts[k.key] + ' ' + k.label.toLowerCase())
      return 'Radar of help within ' + this.radiusKm + ' km of ' + this.centerLabel + ': ' + (parts.join(', ') || 'nothing found')
    }
  },

  methods: {
    kindOf(key) {
      return KINDS.find((k) => k.key === key) || KINDS[0]
    },
    toggle(key) {
      const i = this.hidden.indexOf(key)
      if (i >= 0) this.hidden.splice(i, 1)
      else this.hidden.push(key)
    }
  }
}
</script>

<style scoped>
.sr-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.sr-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #e8f1ee;
  border-radius: 999px;
  padding: 4px 10px 4px 4px;
  font-size: 12px;
  transition: opacity 0.15s, background 0.15s;
}
.sr-chip:hover {
  background: rgba(255, 255, 255, 0.09);
}
.sr-chip.off {
  opacity: 0.45;
  text-decoration: line-through;
}
.sr-chip:focus-visible,
.sr-pt:focus-visible {
  outline: 3px solid rgba(63, 184, 198, 0.7);
  outline-offset: 2px;
}
.sr-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sr-swatch.stop {
  background: transparent;
  border: 2px solid #fff;
}
.sr-n {
  opacity: 0.6;
}
.sr-stage {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
}
.sr-svg {
  width: 100%;
  display: block;
}
.sr-ring {
  fill: none;
  stroke: rgba(63, 184, 198, 0.22);
  stroke-width: 1;
}
.sr-ring:last-of-type {
  fill: rgba(63, 184, 198, 0.03);
}
.sr-ring-label {
  fill: rgba(241, 234, 222, 0.45);
  font-size: 10px;
}
.sr-axis {
  stroke: rgba(255, 255, 255, 0.06);
}
.sr-north {
  fill: rgba(241, 234, 222, 0.6);
  font-size: 11px;
  font-weight: 700;
  text-anchor: middle;
}
.sr-sweep {
  fill: rgba(63, 184, 198, 0.08);
  transform-box: view-box;
  transform-origin: 160px 160px;
  animation: sr-spin 6s linear infinite;
}
.sr-hit {
  fill: transparent;
}
.sr-pt {
  cursor: pointer;
  outline: none;
}
.sr-dot {
  stroke: #032739;
  stroke-width: 2;
}
.sr-glyph {
  fill: #fff;
  font-size: 9px;
  font-weight: 800;
  text-anchor: middle;
  pointer-events: none;
}
.sr-stop {
  fill: #032739;
  stroke: #fff;
  stroke-width: 2.5;
}
.sr-home {
  fill: #3fb8c6;
  stroke: #032739;
  stroke-width: 3;
}
.sr-home-pulse {
  fill: rgba(63, 184, 198, 0.25);
  transform-box: fill-box;
  transform-origin: center;
  animation: sr-pulse 2s ease-out infinite;
}
.sr-tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  background: #f6f2ea;
  color: #003d5b;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  z-index: 2;
}
.sr-caption {
  text-align: center;
  font-size: 12px;
  color: rgba(241, 234, 222, 0.55);
  margin: 6px 0 0;
}
@keyframes sr-spin {
  to { transform: rotate(360deg); }
}
@keyframes sr-pulse {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sr-sweep, .sr-home-pulse { animation: none; }
}
</style>
