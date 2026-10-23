<template>
  <!-- Your travel map: every trip drawn as dotted flight routes between its places, like a travel journal -->
  <div ref="root" class="tm" :class="{ ready: outlines.length }">
    <svg :viewBox="view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h" preserveAspectRatio="xMidYMid meet" role="img"
      :aria-label="'Map of your trips: ' + placeCount + ' places'">
      <!-- Countries (the ones you're going to or have been to are filled in) -->
      <g class="tm-land">
        <path v-for="c in outlines" :key="c.id" :d="c.d" :class="{ been: visited.includes(c.id) }" />
      </g>
      <!-- Each route draws itself in once (a mask that grows along it), then stays still -->
      <defs>
        <mask v-for="(r, n) in routes" :id="uid + '-' + n" :key="r.id" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="900">
          <path :d="r.d" pathLength="1" class="tm-reveal" :style="{ strokeWidth: 12 * scale + 'px', animationDelay: (0.15 + n * 0.12) + 's' }" />
        </mask>
      </defs>
      <!-- One dotted route per trip; the hovered (or next) trip is highlighted, the others fade back -->
      <g class="tm-routes" :class="{ focusing: !!hoverId }">
        <g v-for="(r, n) in routes" :key="r.id" @mouseenter="$emit('hover', r.id)" @mouseleave="$emit('hover', '')" @click="$emit('open', r.id)">
          <path :d="r.d" class="tm-route" :class="{ on: r.id === focusId, done: r.done }" :mask="'url(#' + uid + '-' + n + ')'"
            :style="{ strokeWidth: 2.2 * scale + 'px', strokeDasharray: (0.2 * scale) + ' ' + (5 * scale) }" />
          <!-- A wider invisible line, so the route is easy to point at -->
          <path :d="r.d" class="tm-hit" :style="{ strokeWidth: 14 * scale + 'px' }" />
        </g>
      </g>
      <!-- Places -->
      <g v-for="p in dots" :key="p.key" class="tm-dot" :class="{ on: p.tripIds.includes(focusId), dim: hoverId && !p.tripIds.includes(hoverId) }"
        @mouseenter="hover = p; $emit('hover', p.tripIds[0])" @mouseleave="hover = null; $emit('hover', '')" @click="$emit('open', p.tripIds[0])">
        <circle :cx="p.x" :cy="p.y" :r="7 * scale" class="tm-halo" />
        <circle :cx="p.x" :cy="p.y" :r="3.6 * scale" class="tm-pin" />
      </g>
      <text v-if="hover" :x="hover.x" :y="hover.y - 10 * scale" class="tm-label" :style="{ fontSize: 13 * scale + 'px' }">{{ hover.label }}</text>
    </svg>
    <p v-if="!points.length" class="tm-empty">Plan a trip and it shows up here as a route.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { topoFeatures, unwrapLongitudes } from '../topo.js'

const props = defineProps({
  // [{ id, name, done, points: [{ label, lat, lon }] }] in travel order
  trips: { type: Array, default: () => [] },
  activeId: { type: String, default: '' }, // the trip highlighted when nothing is hovered
  hoverId: { type: String, default: '' }   // a trip being pointed at (here or in the trip list)
})
defineEmits(['open', 'hover'])

// Unique names for this map's masks (there can be two maps on a page)
const uid = 'tm' + Math.random().toString(36).slice(2, 8)
// Which trip stands out: the one being pointed at, else the default
const focusId = computed(() => props.hoverId || props.activeId)

const ARC = 0.16 // how much the routes bow upwards (flatter = stays on the map)
const W = 1000
const H = 500
const outlines = ref([])   // [{ id, d, rings }]
const hover = ref(null)

// Longitude/latitude -> map position (a simple flat "equirectangular" world map)
function px(lon, lat) {
  return [(lon + 180) / 360 * W, (90 - lat) / 180 * H]
}

const points = computed(() => {
  const list = []
  for (const t of props.trips) for (const p of t.points) list.push(p)
  return list
})
const placeCount = computed(() => dots.value.length)

// The box's size on screen (the map fits its shape, and lines/dots keep one size)
const root = ref(null)
const widthPx = ref(600)
const heightPx = ref(250)
let sizeWatcher = null
// Zoom to fit your places (never closer than a region, never wider than the world)
const view = computed(() => {
  if (!points.value.length) return { x: 0, y: 40, w: W, h: H - 110 }
  let minX = W, maxX = 0, minY = H, maxY = 0
  for (const p of points.value) {
    const [x, y] = px(p.lon, p.lat)
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  // The arcs bow upwards: make room for their highest point too
  for (const t of props.trips) {
    for (let i = 1; i < t.points.length; i++) {
      const [x0, y0] = px(t.points[i - 1].lon, t.points[i - 1].lat)
      const [x1, y1] = px(t.points[i].lon, t.points[i].lat)
      const peak = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * ARC / 2
      minY = Math.min(minY, peak)
    }
  }
  const margin = 24
  let w = Math.max(160, (maxX - minX) * 1.25 + margin * 2)
  const ratio = widthPx.value / Math.max(1, heightPx.value) // the box's shape on screen
  let h = w / ratio
  const needH = (maxY - minY) * 1.25 + margin * 2
  if (needH > h) { h = needH; w = h * ratio }
  // Centre on your places; only keep inside the world when the view is smaller than it
  let x = (minX + maxX) / 2 - w / 2
  let y = (minY + maxY) / 2 - h / 2
  if (w <= W) x = Math.min(W - w, Math.max(0, x))
  if (h <= H) y = Math.min(H - h, Math.max(0, y))
  return { x, y, w, h }
})
// Lines and dots keep the same size on screen whatever the zoom: 1 = one map unit per screen pixel
const scale = computed(() => {
  // The map is drawn with "meet" (everything fits; the rest of the map shows around it), so the tighter side decides
  const unitPx = Math.min(widthPx.value / view.value.w, heightPx.value / view.value.h)
  return 1.3 / unitPx
})

// Each trip: a gentle arc from place to place (like a flight path)
const routes = computed(() => {
  const list = []
  for (const t of props.trips) {
    if (t.points.length < 1) continue
    let d = ''
    for (let i = 0; i < t.points.length; i++) {
      const [x, y] = px(t.points[i].lon, t.points[i].lat)
      if (i === 0) {
        d += 'M' + x.toFixed(1) + ' ' + y.toFixed(1)
        continue
      }
      const [x0, y0] = px(t.points[i - 1].lon, t.points[i - 1].lat)
      const lift = Math.hypot(x - x0, y - y0) * ARC // bend upwards more for longer hops
      const cx = (x0 + x) / 2
      const cy = (y0 + y) / 2 - lift
      d += ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1)
    }
    list.push({ id: t.id, d, done: t.done })
  }
  return list
})

// One dot per place (a place in several trips is one dot)
const dots = computed(() => {
  const list = []
  for (const t of props.trips) {
    for (const p of t.points) {
      let dot = list.find((x) => x.key === p.label)
      if (!dot) {
        const [x, y] = px(p.lon, p.lat)
        dot = { key: p.label, label: p.label.split(', ')[0], x, y, lon: p.lon, lat: p.lat, tripIds: [] }
        list.push(dot)
      }
      if (!dot.tripIds.includes(t.id)) dot.tripIds.push(t.id)
    }
  }
  return list
})

// Countries with at least one of your places in them
function inside(lon, lat, ring) {
  let yes = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) yes = !yes
  }
  return yes
}
const visited = computed(() => {
  const ids = []
  for (const c of outlines.value) {
    for (const p of dots.value) {
      for (const poly of c.polys) {
        if (inside(p.lon, p.lat, poly[0]) && !ids.includes(c.id)) ids.push(c.id)
      }
    }
  }
  return ids
})

// Country outlines from the free world-atlas file (the same one Discover's map uses)
onMounted(async () => {
  if (root.value && window.ResizeObserver) {
    sizeWatcher = new ResizeObserver(() => {
      if (!root.value) return
      widthPx.value = root.value.clientWidth || 600
      heightPx.value = root.value.clientHeight || 250
    })
    sizeWatcher.observe(root.value)
  }
  for (const host of ['https://unpkg.com/', 'https://cdn.jsdelivr.net/npm/']) {
    try {
      const res = await fetch(host + 'world-atlas@2.0.2/countries-110m.json')
      if (!res.ok) continue
      const features = unwrapLongitudes(topoFeatures(await res.json(), 'countries').filter((f) => f.properties.name !== 'Antarctica'))
      const list = []
      for (const f of features) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        let d = ''
        for (const poly of polys) {
          for (const ring of poly) {
            for (let i = 0; i < ring.length; i++) {
              const [x, y] = px(ring[i][0], ring[i][1])
              d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
            }
            d += 'Z'
          }
        }
        list.push({ id: String(f.id || f.properties.name), d, polys })
      }
      outlines.value = list
      return
    } catch (err) {
      // try the next host; without outlines the routes still show
    }
  }
})
onBeforeUnmount(() => {
  if (sizeWatcher) sizeWatcher.disconnect()
})
</script>

<style scoped>
.tm {
  position: relative;
  height: 100%;
  min-height: 220px;
  border-radius: 20px;
  overflow: hidden;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1.5px) 0 0 / 14px 14px,
    linear-gradient(160deg, #0b3550, #001d2c);
}
.tm svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.tm-land path {
  fill: #134a66;
  stroke: #0b3550;
  stroke-width: 0.4;
  transition: fill 0.4s;
}
.tm-land path.been {
  fill: #2c6b7a;
}
.tm-route {
  fill: none;
  stroke: rgba(237, 174, 73, 0.55);
  stroke-linecap: round;
}
.tm-route.done {
  stroke: rgba(255, 255, 255, 0.4);
}
.tm-route.on {
  stroke: #edae49;
}
.tm-route {
  transition: stroke 0.25s, opacity 0.25s;
}
/* Pointing at one trip: the others fade back */
.tm-routes.focusing .tm-route:not(.on) {
  opacity: 0.25;
}
.tm-dot.dim {
  opacity: 0.35;
}
.tm-dot {
  transition: opacity 0.25s;
}
.tm-hit {
  fill: none;
  stroke: transparent;
  cursor: pointer;
}
/* The draw-in: the mask's line grows from start to end */
.tm-reveal {
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
  animation: tm-draw 1.3s cubic-bezier(.4, 0, .2, 1) forwards;
}
@keyframes tm-draw {
  to { stroke-dashoffset: 0; }
}
.tm-dot {
  cursor: pointer;
}
.tm-halo {
  fill: rgba(237, 174, 73, 0.25);
  transform-box: fill-box;
  transform-origin: center;
}
.tm-dot.on .tm-halo {
  animation: tm-pulse 2.4s ease-out infinite;
}
.tm-pin {
  fill: #edae49;
  stroke: #001d2c;
  stroke-width: 1;
}
.tm-dot:hover .tm-pin {
  fill: #fff;
}
.tm-label {
  fill: #fff;
  font-weight: 700;
  text-anchor: middle;
  paint-order: stroke;
  stroke: #001d2c;
  stroke-width: 3px;
  pointer-events: none;
}
.tm-empty {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
}
@keyframes tm-pulse {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .tm-dot.on .tm-halo { animation: none; }
  .tm-reveal { animation: none; stroke-dashoffset: 0; }
}
</style>
