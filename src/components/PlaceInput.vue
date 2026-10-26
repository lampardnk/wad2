<template>
  <!-- A place box with our own suggestion list (grouped, with icons, keyboard friendly) and an × to clear it -->
  <div class="pi" :class="{ open: showList }">
    <label :for="id" class="pi-label">{{ label }}</label>
    <div class="pi-box">
      <AppIcon name="map-pin" :size="16" class="pi-pin" />
      <input :id="id" ref="input" :value="modelValue" class="pi-input" maxlength="120" :placeholder="placeholder" autocomplete="off"
        role="combobox" aria-autocomplete="list" :aria-expanded="showList" :aria-controls="id + '-list'"
        :aria-activedescendant="active >= 0 ? id + '-opt-' + active : null"
        @input="onInput" @focus="open = true" @blur="onBlur" @keydown="onKey">
      <button v-if="modelValue" type="button" class="pi-clear" :aria-label="'Clear ' + label" title="Clear" @mousedown.prevent @click="clear">
        <AppIcon name="x" :size="14" :stroke="2.6" />
      </button>
    </div>

    <transition name="pi-pop">
      <div v-if="showList" :id="id + '-list'" class="pi-list" role="listbox" :aria-label="label + ' suggestions'">
        <template v-for="g in shownGroups" :key="g.label">
          <p class="pi-group" role="presentation">{{ g.label }}</p>
          <div v-for="item in g.items" :id="id + '-opt-' + item.index" :key="g.label + item.label" role="option"
            class="pi-opt" :class="{ active: item.index === active }" :aria-selected="item.index === active"
            @mousedown.prevent="pick(item)" @mouseenter="active = item.index">
            <span class="pi-icon" aria-hidden="true"><AppIcon :name="g.icon" :size="15" /></span>
            <span class="pi-text">
              <span class="pi-name">{{ item.before }}<mark>{{ item.match }}</mark>{{ item.after }}</span>
              <small v-if="item.sub">{{ item.sub }}</small>
            </span>
          </div>
        </template>
        <p v-if="modelValue.trim() && !flat.length" class="pi-none">Press Enter to search for “{{ modelValue.trim() }}”</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  groups: { type: Array, default: () => [] } // [{ label: 'Your hotel', icon: 'door', items: [{ label, sub }] }]
})
const emit = defineEmits(['update:modelValue', 'enter'])

const input = ref(null)
const open = ref(false)
const active = ref(-1)

// Groups with only the items that match what's typed (all of them while the box is empty), max 6 per group
const shownGroups = computed(() => {
  const q = props.modelValue.trim().toLowerCase()
  const out = []
  let index = 0
  for (const g of props.groups) {
    const items = []
    for (const it of g.items) {
      const at = q ? it.label.toLowerCase().indexOf(q) : -1
      if (q && at < 0) continue
      if (items.length >= 6) break
      items.push({
        ...it, index: index++,
        before: at >= 0 ? it.label.slice(0, at) : it.label,
        match: at >= 0 ? it.label.slice(at, at + q.length) : '',
        after: at >= 0 ? it.label.slice(at + q.length) : ''
      })
    }
    if (items.length) out.push({ ...g, items })
  }
  return out
})
const flat = computed(() => {
  const list = []
  for (const g of shownGroups.value) for (const it of g.items) list.push(it)
  return list
})
// Hidden when the box exactly matches a suggestion (nothing left to choose)
const showList = computed(() => open.value && (flat.value.length > 0 || !!props.modelValue.trim()) &&
  !(flat.value.length === 1 && flat.value[0].label === props.modelValue))

function onInput(e) {
  emit('update:modelValue', e.target.value)
  open.value = true
  active.value = -1
}
function pick(item) {
  emit('update:modelValue', item.label)
  open.value = false
  active.value = -1
}
function clear() {
  emit('update:modelValue', '')
  active.value = -1
  open.value = true
  input.value.focus()
}
function onBlur() {
  open.value = false
  active.value = -1
}
function onKey(e) {
  const n = flat.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    open.value = true
    active.value = (active.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    active.value = (active.value - 1 + n) % n
  } else if (e.key === 'Enter') {
    if (showList.value && active.value >= 0) {
      e.preventDefault()
      pick(flat.value[active.value])
    } else {
      open.value = false
    }
  } else if (e.key === 'Escape' && showList.value) {
    e.stopPropagation()
    open.value = false
  }
}
</script>

<style scoped>
.pi {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pi-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #003d5b;
}
.pi-box {
  position: relative;
  display: flex;
  align-items: center;
}
.pi-pin {
  position: absolute;
  left: 12px;
  color: #c98a1e;
  pointer-events: none;
}
.pi-input {
  width: 100%;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: #f6f2eb;
  padding: 10px 38px 10px 36px;
  font: inherit;
  font-size: 14px;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.pi-input:focus {
  outline: none;
  background: #fff;
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.2);
}
.pi-clear {
  position: absolute;
  right: 8px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e6dfd2;
  color: #003d5b;
  transition: background 0.15s;
}
.pi-clear:hover {
  background: #d9cfbd;
}
.pi-clear:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 1px;
}
.pi-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #ece4d6;
  box-shadow: 0 18px 40px rgba(0, 29, 44, 0.16);
}
.pi-group {
  margin: 8px 10px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7a62;
}
.pi-group:first-child {
  margin-top: 4px;
}
.pi-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
}
.pi-opt.active {
  background: #fbefd9;
}
.pi-icon {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #f6f2eb;
  color: #003d5b;
}
.pi-opt.active .pi-icon {
  background: #edae49;
  color: #001d2c;
}
.pi-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pi-name {
  font-size: 14px;
  font-weight: 600;
  color: #001d2c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-name mark {
  padding: 0;
  background: none;
  color: #c98a1e;
  font-weight: 800;
}
.pi-text small {
  font-size: 12px;
  color: #5a6b78;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pi-none {
  margin: 6px 10px;
  font-size: 13px;
  color: #5a6b78;
}
.pi-pop-enter-active,
.pi-pop-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.pi-pop-enter-from,
.pi-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .pi-pop-enter-active, .pi-pop-leave-active { transition: none; }
}
</style>
