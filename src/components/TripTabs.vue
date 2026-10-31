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
    <div class="tt-track" role="tablist" :aria-label="label">
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
            <span class="tt-more-dots" aria-hidden="true">⋯</span>
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
// Trip section tabs, by the window's width:
//   1400px and wider: every tab
//   every 100px narrower: one more tab moves into "More" (from the end), always keeping at least one tab
//   phones (640px and narrower): one menu button
// The tab you're on is always one of the visible ones.
// <TripTabs v-model="activeTab" :tabs="tabs" :alert-key="safetyWarning ? 'safety' : ''" />
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TabIcon from './TabIcon.vue'
import CustomDropdown from './CustomDropdown.vue'

const props = defineProps({
  tabs: { type: Array, required: true }, // [{ key, label, testid? }]
  modelValue: { type: String, required: true },
  alertKey: { type: String, default: '' }, // shows a red dot on this tab
  label: { type: String, default: 'Trip sections' }
})
const emit = defineEmits(['update:modelValue'])

const FULL = 1400  // all tabs from this width up
const STEP = 100   // one tab into "More" for every this many px narrower
const PHONE = 640  // the menu button at this width and below

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1600)
function onResize() {
  width.value = window.innerWidth
}

const compact = computed(() => width.value <= PHONE)

const menuOptions = computed(() => {
  const list = []
  for (const t of props.tabs) list.push({ value: t.key, label: t.label })
  return list
})

// How many tabs show: all of them on a big window, one fewer per 100px narrower (at least one)
const shownCount = computed(() => {
  const fewer = width.value >= FULL ? 0 : Math.ceil((FULL - width.value) / STEP)
  return Math.max(1, props.tabs.length - fewer)
})
// The first ones in order; if the open tab is further along, it takes the last visible spot
const visibleTabs = computed(() => {
  const n = Math.min(shownCount.value, props.tabs.length)
  const list = props.tabs.slice(0, n)
  if (list.some((t) => t.key === props.modelValue)) return list
  const open = props.tabs.find((t) => t.key === props.modelValue)
  if (open) {
    list.pop()
    list.push(open)
  }
  return list
})
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

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
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
  border-radius: 9999px;
  overflow: hidden;
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
  background: #ffbf3c;
  color: #12324a;
  border-color: #ffbf3c;
  font-weight: 800;
  box-shadow: 0 3px 0 #d99a1c;
}
/* hand-drawn icons bounce a little when you hover a tab */
.tt-tab {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, color 0.2s;
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

@media (prefers-reduced-motion: reduce) {
  .tt-tab {
    transition: none;
  }
  .tt-tab:active {
    transform: none;
  }
}
</style>
