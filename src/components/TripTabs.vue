<template>
  <!-- Small screens: one menu button (☰ + the open section), the sections drop down below it -->
  <div v-if="compact" class="tt-menu">
    <CustomDropdown :model-value="modelValue" :options="menuOptions" header-text="Trip sections" aria-label="Trip sections"
      :searchable="false" testid="trip-menu" @update:model-value="select">
      <template #selected="{ option }">
        <TabIcon name="menu" :size="17" class="tt-burger" />
        <span class="tt-menu-current">
          <TabIcon v-if="option" :name="option.value" :size="15" />
          <span class="tt-menu-label">{{ option ? option.label : 'Sections' }}</span>
        </span>
        <span v-if="alertKey && alertKey !== modelValue" class="tt-dot" aria-label="(warning)"></span>
      </template>
      <template #option="{ option }">
        <TabIcon :name="option.value" :size="16" />
        <span class="tt-menu-item">{{ option.label }}</span>
        <span v-if="option.value === alertKey" class="tt-dot inline" aria-label="(warning)"></span>
      </template>
    </CustomDropdown>
  </div>

  <div v-else class="tt" :class="{ 'fade-left': fadeLeft, 'fade-right': fadeRight }">
    <div ref="track" class="tt-track" role="tablist" :aria-label="label" @scroll.passive="updateFade">
      <button v-for="t in tabs" :key="t.key" :ref="(el) => setTabRef(t.key, el)" type="button" role="tab" class="tt-tab"
        :class="{ active: modelValue === t.key }" :aria-selected="modelValue === t.key" :aria-controls="'pane-' + t.key"
        :tabindex="modelValue === t.key ? 0 : -1" :data-testid="t.testid || null"
        @click="select(t.key)" @keydown="onKey($event, t.key)">
        <TabIcon :name="t.key" />
        <span class="tt-label">{{ t.label }}</span>
        <span v-if="t.key === alertKey" class="tt-dot" aria-label="(warning)"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
// Trip section tabs: one scrolling row, the open tab is kept in the middle.
// <TripTabs v-model="activeTab" :tabs="tabs" :alert-key="safetyWarning ? 'safety' : ''" />
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TabIcon from './TabIcon.vue'
import CustomDropdown from './CustomDropdown.vue'

const props = defineProps({
  tabs: { type: Array, required: true }, // [{ key, label, testid? }]
  modelValue: { type: String, required: true },
  alertKey: { type: String, default: '' }, // shows a red dot on this tab
  label: { type: String, default: 'Trip sections' }
})
const emit = defineEmits(['update:modelValue'])

// ----- Small screens: menu button -----
const compact = ref(false)
let media = null

const menuOptions = computed(() => {
  const list = []
  for (const t of props.tabs) list.push({ value: t.key, label: t.label })
  return list
})

function onMedia() {
  compact.value = media.matches
  if (!compact.value) nextTick(() => { centerTab(props.modelValue, false); updateFade() })
}

// ----- Wider screens: one scrolling row -----
const track = ref(null)
const tabEls = {}
const fadeLeft = ref(false)
const fadeRight = ref(false)

function setTabRef(key, el) {
  if (el) tabEls[key] = el
}

// Fade an edge only when there are more tabs hidden past it
function updateFade() {
  const el = track.value
  if (!el) return
  fadeLeft.value = el.scrollLeft > 4
  fadeRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

// Scroll the row so this tab sits in the middle (only the row moves, not the page)
function centerTab(key, smooth) {
  const el = track.value
  const tab = tabEls[key]
  if (!el || !tab) return
  const target = tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2
  el.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' })
}

function select(key) {
  emit('update:modelValue', key)
}

// Arrow keys move between tabs (standard tablist keyboard pattern)
function onKey(e, key) {
  let i = 0
  for (let k = 0; k < props.tabs.length; k++) if (props.tabs[k].key === key) i = k
  let next = -1
  if (e.key === 'ArrowRight') next = (i + 1) % props.tabs.length
  else if (e.key === 'ArrowLeft') next = (i - 1 + props.tabs.length) % props.tabs.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = props.tabs.length - 1
  if (next < 0) return
  e.preventDefault()
  const nextKey = props.tabs[next].key
  select(nextKey)
  nextTick(() => tabEls[nextKey] && tabEls[nextKey].focus())
}

watch(() => props.modelValue, (key) => {
  nextTick(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    centerTab(key, !reduce)
  })
})

function onResize() {
  updateFade()
}
onMounted(() => {
  media = window.matchMedia('(max-width: 640px)')
  compact.value = media.matches
  media.addEventListener('change', onMedia)
  nextTick(() => {
    centerTab(props.modelValue, false) // open tab visible on first load
    updateFade()
  })
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (media) media.removeEventListener('change', onMedia)
})
</script>

<style scoped>
.tt {
  position: relative;
  min-width: 0;
  border-radius: 9999px;
  background: rgba(0, 38, 58, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px;
}
.tt-track {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 24px;
  border-radius: 9999px;
}
.tt-track::-webkit-scrollbar {
  display: none;
}
/* Soft fade on an edge when more tabs are hidden there */
.tt.fade-right .tt-track {
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
}
.tt.fade-left .tt-track {
  -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(to left, #000 calc(100% - 36px), transparent);
}
.tt.fade-left.fade-right .tt-track {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 36px, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(to right, transparent, #000 36px, #000 calc(100% - 36px), transparent);
}

.tt-tab {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  scroll-snap-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.18s, background 0.18s, border-color 0.18s, transform 0.12s;
}
.tt-tab:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}
.tt-tab:active {
  transform: scale(0.96);
}
.tt-tab.active {
  background: rgba(237, 174, 73, 0.12);
  color: #edae49;
  border-color: rgba(237, 174, 73, 0.3);
  font-weight: 600;
}
.tt-tab:focus-visible {
  outline: 2px solid #edae49;
  outline-offset: -2px;
}
.tt-dot {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d1495b;
  box-shadow: 0 0 0 2px rgba(0, 38, 58, 0.9);
}

/* ----- Small-screen menu button ----- */
.tt-menu {
  min-width: 0;
}
.tt-menu :deep(.dd-trigger) {
  max-width: 210px;
  height: 42px;
  border-radius: 999px;
  padding: 0 12px;
  background: rgba(0, 38, 58, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.tt-burger {
  color: #94a3b8;
}
.tt-menu-current {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(237, 174, 73, 0.12);
  border: 1px solid rgba(237, 174, 73, 0.3);
  color: #edae49;
  font-weight: 600;
}
.tt-menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-menu-item {
  flex: 1;
  min-width: 0;
}
.tt-menu .tt-dot {
  position: static;
  flex: none;
}
.tt-dot.inline {
  position: static;
  flex: none;
}

@media (prefers-reduced-motion: reduce) {
  .tt-tab {
    transition: none;
  }
  .tt-tab:active {
    transform: none;
  }
}
</style>
