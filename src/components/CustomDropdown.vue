<template>
  <div class="dd" :class="['dd-' + size, { block, open, disabled }]">
    <button :id="id || null" ref="trigger" type="button" class="dd-trigger" :disabled="disabled"
      aria-haspopup="listbox" :aria-expanded="open" :aria-controls="uid + '-list'"
      :aria-label="ariaLabel || null" :data-testid="testid || null"
      @click="toggle" @keydown="onTriggerKey">
      <slot name="selected" :option="selected">
        <span v-if="selected && selected.icon" class="dd-icon" aria-hidden="true">{{ selected.icon }}</span>
        <span class="dd-value" :class="{ placeholder: !selected }">{{ selected ? (selected.short || selected.label) : placeholder }}</span>
      </slot>
      <svg class="dd-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- The menu sits on <body> so cards with overflow:hidden can't cut it off -->
    <Teleport to="body">
      <transition name="dd-pop">
        <div v-if="open" ref="menu" class="dd-menu" :class="{ up: openUp }" :style="menuStyle" @keydown="onMenuKey">
          <p v-if="headerText" class="dd-header">{{ headerText }}</p>
          <div v-if="canSearch" class="dd-search">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
            <input ref="search" v-model="query" type="text" placeholder="Search…" aria-label="Search options"
              :aria-controls="uid + '-list'" :aria-activedescendant="activeId" autocomplete="off">
          </div>
          <ul :id="uid + '-list'" ref="list" class="dd-list" role="listbox" :aria-label="ariaLabel || headerText || placeholder"
            :aria-activedescendant="canSearch ? null : activeId" :tabindex="canSearch ? -1 : 0">
            <li v-for="(o, i) in shown" :id="uid + '-opt-' + i" :key="String(o.value)" role="option"
              :aria-selected="isSelected(o)" :aria-disabled="o.disabled || null"
              :class="{ active: i === active, selected: isSelected(o), off: o.disabled }"
              @mousedown.prevent @click="choose(o)" @mousemove="active = i">
              <slot name="option" :option="o" :selected="isSelected(o)">
                <span v-if="o.icon" class="dd-icon" aria-hidden="true">{{ o.icon }}</span>
                <span class="dd-text">
                  <span class="dd-label">{{ o.label }}</span>
                  <span v-if="o.description" class="dd-desc">{{ o.description }}</span>
                </span>
              </slot>
              <svg v-if="isSelected(o)" class="dd-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </li>
            <li v-if="!shown.length" class="dd-empty" role="presentation">No matches</li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
// One dropdown for the whole app (replaces native <select>).
// <CustomDropdown v-model="currency" :options="['SGD', 'JPY']" />
// Options can be plain values, or { value, label, icon, description, short, disabled }.
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { default: null }, // any value: string, number, null...
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select…' },
  headerText: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  searchable: { type: Boolean, default: null }, // default: on when there are more than 8 options
  size: { type: String, default: 'md' },        // 'sm' | 'md' | 'lg'
  block: { type: Boolean, default: false },     // full width
  id: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  testid: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'change'])

const uid = 'dd' + Math.random().toString(36).slice(2, 8)
const trigger = ref(null)
const menu = ref(null)
const list = ref(null)
const search = ref(null)
const open = ref(false)
const openUp = ref(false)
const query = ref('')
const active = ref(0)
const menuStyle = ref({})

// Plain values -> { value, label }
const items = computed(() => {
  const result = []
  for (const o of props.options) {
    if (o !== null && typeof o === 'object') result.push({ ...o, label: o.label !== undefined ? String(o.label) : String(o.value) })
    else result.push({ value: o, label: String(o) })
  }
  return result
})

const selected = computed(() => {
  for (const o of items.value) {
    if (o.value === props.modelValue) return o
  }
  return null
})

const canSearch = computed(() => (props.searchable === null ? items.value.length > 8 : props.searchable))

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return items.value
  const result = []
  for (const o of items.value) {
    if ((o.label + ' ' + (o.description || '')).toLowerCase().includes(q)) result.push(o)
  }
  return result
})

const activeId = computed(() => (shown.value.length ? uid + '-opt-' + active.value : null))

function isSelected(o) {
  return o.value === props.modelValue
}

// ----- Open / close -----
function place() {
  const r = trigger.value.getBoundingClientRect()
  const below = window.innerHeight - r.bottom
  openUp.value = below < 280 && r.top > below
  const width = Math.max(r.width, 200)
  const left = Math.min(r.left, window.innerWidth - width - 8)
  menuStyle.value = {
    left: Math.max(8, left) + 'px',
    minWidth: width + 'px',
    top: openUp.value ? 'auto' : r.bottom + 6 + 'px',
    bottom: openUp.value ? window.innerHeight - r.top + 6 + 'px' : 'auto'
  }
}

async function show() {
  if (props.disabled || open.value) return
  place()
  query.value = ''
  active.value = 0
  for (let i = 0; i < items.value.length; i++) {
    if (isSelected(items.value[i])) active.value = i
  }
  open.value = true
  await nextTick()
  if (canSearch.value && search.value) search.value.focus()
  else if (list.value) list.value.focus()
  scrollToActive()
}

function close(focusTrigger) {
  if (!open.value) return
  open.value = false
  if (focusTrigger && trigger.value) trigger.value.focus()
}

function toggle() {
  if (open.value) close(false)
  else show()
}

function choose(o) {
  if (!o || o.disabled) return
  if (o.value !== props.modelValue) {
    emit('update:modelValue', o.value)
    emit('change', o.value)
  }
  close(true)
}

// Close on click outside, scroll of the page, or resize
function onDocDown(e) {
  if (!open.value) return
  if (trigger.value && trigger.value.contains(e.target)) return
  if (menu.value && menu.value.contains(e.target)) return
  close(false)
}
function onScroll(e) {
  if (open.value && menu.value && !menu.value.contains(e.target)) close(false)
}
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', onDocDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
  } else {
    document.removeEventListener('mousedown', onDocDown, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', place)
  }
})
onBeforeUnmount(() => {
  open.value = false
  document.removeEventListener('mousedown', onDocDown, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', place)
})

watch(query, () => { active.value = 0 })

// ----- Keyboard -----
function onTriggerKey(e) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault()
    show()
  }
}

function move(step) {
  const n = shown.value.length
  if (!n) return
  let i = active.value
  for (let k = 0; k < n; k++) {
    i = (i + step + n) % n
    if (!shown.value[i].disabled) break
  }
  active.value = i
  scrollToActive()
}

function scrollToActive() {
  nextTick(() => {
    const el = document.getElementById(uid + '-opt-' + active.value)
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

function onMenuKey(e) {
  // Keys typed in the menu shouldn't trigger page shortcuts (e.g. N for a new expense, arrows in the photo viewer)
  if (e.key !== 'Tab') e.stopPropagation()
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Home') { e.preventDefault(); active.value = 0; scrollToActive() }
  else if (e.key === 'End') { e.preventDefault(); active.value = shown.value.length - 1; scrollToActive() }
  else if (e.key === 'Enter') { e.preventDefault(); choose(shown.value[active.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); close(true) }
  else if (e.key === 'Tab') { close(false) }
  else if (!canSearch.value && e.key.length === 1) {
    // Type a letter to jump to it
    const letter = e.key.toLowerCase()
    for (let i = 0; i < shown.value.length; i++) {
      if (shown.value[i].label.toLowerCase().startsWith(letter)) {
        active.value = i
        scrollToActive()
        break
      }
    }
  }
}
</script>

<style scoped>
.dd {
  position: relative;
  display: inline-block;
  min-width: 0;
}
.dd.block {
  display: block;
  width: 100%;
}
.dd-trigger {
  --dd-mint: #edae49;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 12px 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, #0a3550, #00283c);
  color: #e6edf3;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.dd-sm .dd-trigger {
  height: 32px;
  font-size: 13px;
  border-radius: 10px;
  padding: 0 10px;
}
.dd-lg .dd-trigger {
  height: 44px;
  border-radius: 999px;
  padding: 0 16px 0 18px;
}
.dd-trigger:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.2);
}
.dd.open .dd-trigger,
.dd-trigger:focus-visible {
  outline: none;
  border-color: var(--dd-mint);
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.15);
}
.dd-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dd-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dd-value.placeholder {
  color: #7d8590;
}
.dd-chevron {
  flex: none;
  color: #7d8590;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s;
}
.dd.open .dd-chevron {
  transform: rotate(180deg);
  color: var(--dd-mint);
}
.dd-icon {
  flex: none;
  width: 18px;
  text-align: center;
}

/* ----- Menu (on <body>, so not scoped by the trigger) ----- */
.dd-menu {
  position: fixed;
  z-index: 2000;
  max-width: min(360px, calc(100vw - 16px));
  padding: 4px;
  border-radius: 14px;
  background: rgba(10, 53, 80, 0.86);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(237, 174, 73, 0.04), 0 0 30px rgba(237, 174, 73, 0.06);
  color: #e6edf3;
  transform-origin: top left;
}
.dd-menu.up {
  transform-origin: bottom left;
}
.dd-header {
  margin: 0;
  padding: 8px 10px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7d8590;
}
.dd-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 2px 4px;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(0, 38, 58, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7d8590;
}
.dd-search:focus-within {
  border-color: rgba(237, 174, 73, 0.5);
}
.dd-search input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: #e6edf3;
  font-size: 13px;
  padding: 7px 0;
}
.dd-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 280px;
  overflow-y: auto;
  outline: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.dd-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.12s, transform 0.15s ease;
}
.dd-list li.active {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(2px);
}
.dd-list li.selected {
  color: #f8deb0;
}
.dd-list li.selected.active {
  background: rgba(237, 174, 73, 0.12);
}
.dd-list li.off {
  opacity: 0.4;
  cursor: not-allowed;
}
.dd-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dd-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dd-desc {
  font-size: 12px;
  color: #7d8590;
}
.dd-check {
  flex: none;
  color: #edae49;
  filter: drop-shadow(0 0 4px rgba(237, 174, 73, 0.5));
}
.dd-list li.dd-empty {
  color: #7d8590;
  cursor: default;
  justify-content: center;
}

/* Spring-like entrance */
.dd-pop-enter-active {
  transition: opacity 0.16s ease-out, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dd-pop-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}
.dd-pop-enter-from,
.dd-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-8px);
}
.dd-menu.up.dd-pop-enter-from,
.dd-menu.up.dd-pop-leave-to {
  transform: scale(0.96) translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .dd-chevron,
  .dd-list li,
  .dd-pop-enter-active,
  .dd-pop-leave-active {
    transition: none;
  }
}
</style>
