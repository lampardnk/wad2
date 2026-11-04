<template>
  <div class="tt-root">
  <div v-if="compact" class="tt-menu">
    <!-- Small screens: one menu button (☰ + the open section), the sections drop down below it -->
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

  <!-- Wider: as many tabs as fit, the rest under "More" (the open tab is always one of the visible ones) -->
   <div v-else class="tt">
    <!-- Every tab, invisible, only to measure how wide each one is -->
    <div ref="measure" class="tt-measure" aria-hidden="true">
      <span v-for="t in tabs" :key="t.key" class="tt-tab" :data-key="t.key"><TabIcon :name="t.key" /><span class="tt-label">{{ t.label }}</span></span>
      <span class="tt-tab" data-key="__more"><AppIcon name="more" :size="16" /><span class="tt-label">More</span></span>
    </div>
    <div ref="track" class="tt-track" role="tablist" :aria-label="label">
      <button v-for="t in visibleTabs" :key="t.key" :ref="(el) => setTabRef(t.key, el)" type="button" role="tab" class="tt-tab"
        :class="{ active: modelValue === t.key }" :aria-selected="modelValue === t.key" :aria-controls="'pane-' + t.key"
        :tabindex="modelValue === t.key ? 0 : -1" :data-testid="t.testid || null"
        @click="select(t.key)" @keydown="onKey($event, t.key)">
        <TabIcon :name="t.key" />
        <span class="tt-label">{{ t.label }}</span>
        <span v-if="t.key === alertKey" class="tt-dot" aria-label="(warning)"></span>
      </button>
      <div v-if="moreTabs.length" class="tt-more">
        <CustomDropdown :model-value="null" :options="moreOptions" header-text="More sections" :aria-label="'More sections: ' + moreTabs.map((t) => t.label).join(', ')"
          :searchable="false" testid="trip-more" @update:model-value="select">
          <template #selected>
            <AppIcon class="tt-more-dots" name="more" :size="16" />
            <span class="tt-label">More</span>
            <span v-if="moreHasAlert" class="tt-dot" aria-label="(warning)"></span>
          </template>
          <template #option="{ option }">
            <TabIcon :name="option.value" :size="16" />
            <span class="tt-menu-item">{{ option.label }}</span>
            <span v-if="option.value === alertKey" class="tt-dot inline" aria-label="(warning)"></span>
          </template>
        </CustomDropdown>
      </div>
    </div>
   </div>
  </div>
</template>

<script setup>
// Trip section tabs: the bar takes the full width and shows as many tabs as fit in it;
// the rest go under "More" (from the end, always keeping at least one tab).
// Phones (640px and narrower): one menu button.
// The tab you're on is always one of the visible ones.
// <TripTabs v-model="activeTab" :tabs="tabs" :alert-key="safetyWarning ? 'safety' : ''" />
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TabIcon from './TabIcon.vue'
import AppIcon from '../common/AppIcon.vue'
import CustomDropdown from '../common/CustomDropdown.vue'

const props = defineProps({
  tabs: { type: Array, required: true }, // [{ key, label, testid? }]
  modelValue: { type: String, required: true },
  alertKey: { type: String, default: '' }, // shows a red dot on this tab
  label: { type: String, default: 'Trip sections' }
})
const emit = defineEmits(['update:modelValue'])

const PHONE = 640 // the menu button at this width and below
const GAP = 2      // px between tabs (.tt-track gap)
const BOLD = 12    // px extra for the open tab's bold label

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1600)
function onResize() {
  width.value = window.innerWidth
  nextTick(remeasure)
}

const compact = computed(() => width.value <= PHONE)

const menuOptions = computed(() => {
  const list = []
  for (const t of props.tabs) list.push({ value: t.key, label: t.label })
  return list
})

// The first n tabs in order; if the open tab is further along, it takes the last visible spot
function firstTabs(n) {
  const list = props.tabs.slice(0, n)
  if (list.some((t) => t.key === props.modelValue)) return list
  const open = props.tabs.find((t) => t.key === props.modelValue)
  if (open) {
    list.pop()
    list.push(open)
  }
  return list
}

// Measured: each tab's width, and the room the bar has
const measure = ref(null)
const track = ref(null)
const tabWidths = ref({}) // key -> px ('__more' is the "More" button)
const room = ref(0)
function remeasure() {
  if (measure.value) {
    const w = {}
    for (const el of measure.value.children) w[el.dataset.key] = el.getBoundingClientRect().width
    tabWidths.value = w
  }
  if (track.value) room.value = track.value.clientWidth
}
function widthOf(list, withMore) {
  // + BOLD: the open tab is bold, so a little wider than measured
  let total = BOLD + (withMore ? (tabWidths.value.__more || 0) + GAP : 0)
  for (const t of list) total += (tabWidths.value[t.key] || 0) + GAP
  return total
}
// As many as fit (all of them before anything is measured)
const shownCount = computed(() => {
  const all = props.tabs.length
  if (!room.value) return all
  if (widthOf(props.tabs, false) <= room.value) return all
  let n = all - 1
  while (n > 1 && widthOf(firstTabs(n), true) > room.value) n--
  return n
})
const visibleTabs = computed(() => firstTabs(Math.min(shownCount.value, props.tabs.length)))
const moreTabs = computed(() => props.tabs.filter((t) => !visibleTabs.value.some((v) => v.key === t.key)))
const moreOptions = computed(() => moreTabs.value.map((t) => ({ value: t.key, label: t.label })))
const moreHasAlert = computed(() => !!props.alertKey && moreTabs.value.some((t) => t.key === props.alertKey))

const tabEls = {}
function setTabRef(key, el) {
  if (el) tabEls[key] = el
}

function select(key) {
  emit('update:modelValue', key)
}

// Arrow keys move between the visible tabs (standard tablist keyboard pattern)
function onKey(e, key) {
  const list = visibleTabs.value
  let i = 0
  for (let k = 0; k < list.length; k++) if (list[k].key === key) i = k
  let next = -1
  if (e.key === 'ArrowRight') next = (i + 1) % list.length
  else if (e.key === 'ArrowLeft') next = (i - 1 + list.length) % list.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = list.length - 1
  if (next < 0) return
  e.preventDefault()
  const nextKey = list[next].key
  select(nextKey)
  nextTick(() => tabEls[nextKey] && tabEls[nextKey].focus())
}

let observer = null
onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
  // the bar's own width can change without the window's (the profile menu, fonts loading)
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => remeasure())
    nextTick(() => track.value && observer.observe(track.value))
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure)
})
// the tab list changes (Recap appears after the trip), or the bar comes back from the phone menu
watch(() => [props.tabs.map((t) => t.key + t.label).join(), compact.value], () => nextTick(() => {
  if (observer && track.value) { observer.disconnect(); observer.observe(track.value) }
  remeasure()
}))
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (observer) observer.disconnect()
})
</script>

<style scoped>
/* The tabs (or the menu button), on the right of the top bar */
.tt-root {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}
.tt {
  position: relative;
  flex: 1;
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
  /* room above and below so the open tab's raised edge and the hover lift aren't cut off */
  padding: 2px 0 4px;
  border-radius: 9999px;
  overflow: hidden;
}
/* Measuring row: laid out like the real tabs, never seen */
.tt-measure {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  width: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
}
/* "More": looks like one more tab */
.tt-more {
  flex: none;
  margin-left: auto;
}
.tt-more :deep(.dd-trigger) {
  position: relative;
  min-height: 40px;
  height: 40px;
  padding: 0 14px;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
}
.tt-more :deep(.dd-trigger:hover) {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}
.tt-more-dots {
  font-size: 18px;
  line-height: 1;
}
.tt-more .tt-dot {
  top: 7px;
  right: 30px;
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
}
.tt-tab:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}
.tt-tab:active {
  transform: scale(0.96);
}
.tt-tab.active {
  background: #ffbf3c;
  color: #12324a;
  border-color: #ffbf3c;
  font-weight: 800;
  box-shadow: 0 3px 0 #d99a1c;
}

.tt-tab:hover:not(.active) {
  transform: translateY(-2px);
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

</style>
