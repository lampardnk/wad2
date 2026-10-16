<template>
  <!-- Food needs as removable tags in one box, with a small menu of common ones -->
  <div class="dt" :class="{ focus: menuOpen }" @click="input.focus()">
    <span v-for="t in tags" :key="t.key" class="dt-tag" :class="{ allergy: t.allergy }">
      {{ t.icon }} {{ t.label }}
      <button type="button" class="dt-x" :aria-label="'Remove ' + t.label" @click.stop="removeTag(t.key)">✕</button>
    </span>
    <input :id="id || null" ref="input" v-model="query" class="dt-input" maxlength="30" autocomplete="off"
      :placeholder="tags.length ? 'Add more…' : '+ Add dietary need or allergy…'"
      role="combobox" aria-autocomplete="list" :aria-expanded="menuOpen" :aria-controls="uid + '-menu'"
      :aria-activedescendant="menuOpen && options.length ? uid + '-o' + active : null"
      @focus="menuOpen = true" @blur="menuOpen = false" @keydown="onKey">

    <ul v-if="menuOpen && options.length" :id="uid + '-menu'" class="dt-menu" role="listbox">
      <li v-for="(o, i) in options" :id="uid + '-o' + i" :key="o.key" role="option" :aria-selected="i === active"
        :class="{ active: i === active }" @mousedown.prevent="addTag(o.key)" @mouseenter="active = i">
        <span aria-hidden="true">{{ o.icon }}</span> {{ o.label }}
        <span v-if="o.custom" class="dt-hint">custom</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
// <DietTagsInput v-model="diet" />  -> ['halal', 'No spicy food']
import { ref, computed, watch } from 'vue'
import { DIETS, dietTag } from '../crewOptions.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  id: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const uid = 'dt' + Math.random().toString(36).slice(2, 8)
const input = ref(null)
const query = ref('')
const menuOpen = ref(false)
const active = ref(0)

const tags = computed(() => {
  const list = []
  for (const t of props.modelValue) list.push(dietTag(t))
  return list
})

// Common choices when empty, matching ones while typing, plus "add what I typed"
const options = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = []
  for (const d of DIETS) {
    if (props.modelValue.includes(d.key)) continue
    if (q ? d.label.toLowerCase().includes(q) : d.common) list.push(d)
  }
  let exact = false
  for (const d of list) if (d.label.toLowerCase() === q) exact = true
  const typed = query.value.trim()
  if (typed && !exact && !props.modelValue.includes(typed)) {
    list.push({ key: typed, icon: '＋', label: 'Add "' + typed + '"', custom: true })
  }
  return list
})
watch(query, () => { active.value = 0 })

function addTag(key) {
  if (key && !props.modelValue.includes(key) && props.modelValue.length < 8) {
    emit('update:modelValue', props.modelValue.concat([key]))
  }
  query.value = ''
  active.value = 0
}
function removeTag(key) {
  const list = []
  for (const t of props.modelValue) if (t !== key) list.push(t)
  emit('update:modelValue', list)
}
function onKey(e) {
  const n = options.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    menuOpen.value = true
    active.value = (active.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    active.value = (active.value - 1 + n) % n
  } else if (e.key === 'Enter') {
    // While typing, Enter adds the tag instead of submitting the form
    if (query.value.trim()) {
      e.preventDefault()
      if (n) addTag(options.value[active.value].key)
    }
  } else if (e.key === 'Escape' && menuOpen.value) {
    e.stopPropagation()
    input.value.blur()
  } else if (e.key === 'Backspace' && !query.value && props.modelValue.length) {
    emit('update:modelValue', props.modelValue.slice(0, -1))
  }
}
</script>

<style scoped>
.dt {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-height: 38px;
  padding: 4px 6px;
  background: #00283c;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.dt.focus {
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.15);
}
.dt-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 4px 2px 8px;
  border-radius: 999px;
  background: rgba(237, 174, 73, 0.12);
  border: 1px solid rgba(237, 174, 73, 0.3);
  color: #f8deb0;
  animation: dt-pop 0.15s ease-out;
}
.dt-tag.allergy {
  background: rgba(209, 73, 91, 0.14);
  border-color: rgba(209, 73, 91, 0.4);
  color: #f6c4cb;
}
.dt-x {
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  font-size: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  line-height: 1;
  padding: 0;
}
.dt-x:hover,
.dt-x:focus-visible {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
}
.dt-input {
  flex: 1;
  min-width: 120px;
  border: 0;
  background: transparent;
  color: #e6edf3;
  font-size: 14px;
  padding: 3px 4px;
  outline: none;
}
.dt-input::placeholder {
  color: #6e7681;
}
.dt-menu {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: 220px;
  overflow-y: auto;
  background: rgba(10, 53, 80, 0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  color: #e6edf3;
  animation: dt-pop 0.12s ease-out;
}
.dt-menu li {
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.dt-menu li.active {
  background: rgba(237, 174, 73, 0.12);
  color: #f8deb0;
}
.dt-hint {
  float: right;
  font-size: 11px;
  color: #8b949e;
}
@keyframes dt-pop {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .dt-tag,
  .dt-menu {
    animation: none;
  }
}
</style>
