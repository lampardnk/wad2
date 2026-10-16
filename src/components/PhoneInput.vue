<template>
  <!-- Country code + number, saved together as "+65 9123 4567" -->
  <div class="pi">
    <CustomDropdown v-model="code" :options="PHONE_CODES" class="pi-code" header-text="Country code" aria-label="Country code" />
    <input :id="id || null" v-model="number" class="pi-number" maxlength="16" placeholder="9123 4567" inputmode="tel" autocomplete="tel-national">
  </div>
</template>

<script setup>
// <PhoneInput v-model="phone" />
import { ref, watch } from 'vue'
import { PHONE_CODES } from '../crewOptions.js'
import CustomDropdown from './CustomDropdown.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

// Split "+65 9123 4567" into "+65" and "9123 4567" (longest codes first, so +852 isn't read as +85…)
function split(value) {
  let text = (value || '').trim()
  const codes = PHONE_CODES.map((c) => c.value).sort((a, b) => b.length - a.length)
  for (const c of codes) {
    if (text.startsWith(c)) return { code: c, number: text.slice(c.length).trim() }
  }
  return { code: '+65', number: text }
}

const start = split(props.modelValue)
const code = ref(start.code)
const number = ref(start.number)

watch([code, number], () => {
  const n = number.value.trim()
  emit('update:modelValue', n ? code.value + ' ' + n : '')
})
// When the saved value arrives later (e.g. after loading), show it
watch(() => props.modelValue, (value) => {
  const n = number.value.trim()
  const current = n ? code.value + ' ' + n : ''
  if (value === current) return
  const parts = split(value)
  code.value = parts.code
  number.value = parts.number
})
</script>

<style scoped>
.pi {
  display: flex;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #00283c;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pi:focus-within {
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.15);
}
.pi-code {
  flex: none;
  width: 104px;
}
.pi-code :deep(.dd-trigger) {
  height: 100%;
  border: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: none;
}
.pi-number {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #e6edf3;
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
  color-scheme: dark;
}
.pi-number::placeholder {
  color: #6e7681;
}
</style>
