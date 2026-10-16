<template>
  <!-- Exchange rates: live rates, or the group's own rate (e.g. what you got at the money changer) -->
  <div class="er" @keydown.esc="close">
    <button ref="triggerEl" type="button" class="er-trigger" :class="{ group: groupCount, warn: liveError && !groupCount }"
      :aria-expanded="open" aria-haspopup="dialog" @click="open ? close() : (open = true)">
      <span aria-hidden="true">💱</span>
      <template v-if="liveError && !groupCount">Rates unavailable · set your own</template>
      <template v-else-if="groupCount">{{ groupCount }} group rate{{ groupCount === 1 ? '' : 's' }}<span v-if="liveDate" class="er-dim"> · live {{ shortDate(liveDate) }}</span></template>
      <template v-else>Live rates<span v-if="liveDate" class="er-dim"> · {{ shortDate(liveDate) }}</span></template>
      <span class="er-caret" aria-hidden="true">▾</span>
    </button>

    <transition name="er-pop">
      <div v-if="open" class="er-panel" role="dialog" aria-labelledby="er-title" @click.stop>
        <header class="er-head">
          <div>
            <h4 id="er-title" class="er-title">Exchange rates</h4>
            <p class="er-sub">Used for every total and for who owes whom. A group rate is used instead of the live rate.</p>
          </div>
          <button type="button" class="er-x" aria-label="Close" @click="close">✕</button>
        </header>

        <p v-if="!rows.length" class="er-empty">Add an expense in another currency, or pick one below to set its rate.</p>

        <ul class="er-list">
          <li v-for="r in rows" :key="r.code" class="er-row" :class="{ editing: draftFor === r.code }">
            <div class="er-row-top">
              <span class="er-code">{{ r.code }}</span>
              <span class="er-name">{{ r.name }}</span>
              <span class="er-badge" :class="r.group ? 'group' : r.live ? 'live' : 'none'">
                {{ r.group ? 'Group rate' : r.live ? 'Live rate' : 'No rate' }}
              </span>
            </div>

            <!-- Showing -->
            <template v-if="draftFor !== r.code">
              <p class="er-rate">
                1 {{ home }} = <strong>{{ fmt(r.used) }}</strong> {{ r.code }}
                <span v-if="r.used" class="er-dim">· 1 {{ r.code }} = {{ fmt(1 / r.used) }} {{ home }}</span>
              </p>
              <p v-if="r.group" class="er-meta">
                Set by {{ r.group.by === me ? 'you' : r.group.by }} · {{ shortDate(r.group.at) }}
                <span v-if="r.live">· live is {{ fmt(r.live) }}</span>
              </p>
              <p v-else-if="!r.live" class="er-meta warn">No live rate, so {{ r.code }} amounts aren't converted. Set one so totals add up.</p>
              <div class="er-actions">
                <button type="button" class="er-btn" @click="startEdit(r)">{{ r.group ? 'Change' : 'Set group rate' }}</button>
                <button v-if="r.group" type="button" class="er-btn ghost" @click="resetRate(r)">Use live rate</button>
              </div>
            </template>

            <!-- Editing -->
            <form v-else class="er-edit" @submit.prevent="saveRate(r)">
              <label class="er-field">
                <span>1 {{ home }} =</span>
                <input ref="draftEl" v-model="draft" type="number" min="0" step="any" inputmode="decimal" :aria-label="'How many ' + r.code + ' for 1 ' + home"
                  :aria-invalid="!!draftError" @keydown.esc.stop="cancelEdit">
                <span>{{ r.code }}</span>
              </label>
              <p v-if="r.live" class="er-meta">Live rate: {{ fmt(r.live) }} <button type="button" class="er-link" @click="draft = String(round(r.live))">use it</button></p>
              <p v-if="draftError" class="er-msg bad" role="alert">{{ draftError }}</p>
              <p v-else-if="draftWarning" class="er-msg warn">{{ draftWarning }}</p>
              <p v-if="impactText(r)" class="er-msg">{{ impactText(r) }}</p>
              <div class="er-actions">
                <button type="submit" class="er-btn primary" :disabled="!!draftError || !draft">Save for the group</button>
                <button type="button" class="er-btn ghost" @click="cancelEdit">Cancel</button>
              </div>
            </form>
          </li>
        </ul>

        <!-- Another currency -->
        <div v-if="otherCurrencies.length" class="er-add">
          <CustomDropdown :model-value="null" :options="otherCurrencies" size="sm" placeholder="+ Add a currency" header-text="Currency"
            aria-label="Add a currency" @update:model-value="addCurrency" />
        </div>
        <p class="er-foot">Tip: use the rate on your money-changer receipt so everyone's split matches what was really paid.</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { currencyOptions, money } from '../expenses.js'
import CustomDropdown from './CustomDropdown.vue'

const props = defineProps({
  home: { type: String, default: 'SGD' },
  live: { type: Object, default: () => ({}) },      // { JPY: 112.4 } = 1 home -> 112.4 JPY
  liveDate: { type: String, default: '' },
  liveError: { type: String, default: '' },
  group: { type: Object, default: () => ({}) },     // { JPY: { base, rate, by, at } }
  totals: { type: Object, default: () => ({}) },    // { JPY: 15400 } amounts spent per currency
  me: { type: String, default: '' }
})
const emit = defineEmits(['set', 'reset'])

const open = ref(false)
const triggerEl = ref(null)
const draftEl = ref(null)
const draftFor = ref(null)
const draft = ref('')
const added = ref([])
const NAMES = {}
for (const o of currencyOptions()) NAMES[o.value] = o.description

// Group rates only count for the currency totals are shown in
function groupFor(code) {
  const g = props.group && props.group[code]
  return g && g.base === props.home ? g : null
}
const groupCount = computed(() => {
  let n = 0
  for (const c in props.group || {}) if (groupFor(c)) n++
  return n
})

// One row per currency used on this trip (plus any you added), not the home currency
const rows = computed(() => {
  const codes = []
  for (const c of Object.keys(props.totals).concat(Object.keys(props.group || {}), added.value)) {
    if (c !== props.home && !codes.includes(c)) codes.push(c)
  }
  return codes.map((code) => {
    const group = groupFor(code)
    const live = props.live[code] || null
    return { code, name: NAMES[code] || '', live, group, used: group ? group.rate : live }
  })
})
const otherCurrencies = computed(() => currencyOptions().filter((o) => o.value !== props.home && !rows.value.some((r) => r.code === o.value)))

function addCurrency(code) {
  if (!code) return
  added.value.push(code)
  const row = rows.value.find((r) => r.code === code)
  if (row) startEdit(row)
}

// ----- editing one rate -----
function startEdit(r) {
  draftFor.value = r.code
  draft.value = r.used ? String(round(r.used)) : ''
  nextTick(() => {
    const el = Array.isArray(draftEl.value) ? draftEl.value[0] : draftEl.value
    if (el) { el.focus(); el.select() }
  })
}
function cancelEdit() {
  draftFor.value = null
}
const draftNumber = computed(() => Number(draft.value))
const draftError = computed(() => {
  if (draft.value === '') return ''
  if (!Number.isFinite(draftNumber.value) || draftNumber.value <= 0) return 'Enter a number above 0.'
  return ''
})
// Probably a typo, or entered the wrong way round (e.g. 0.0089 instead of 112)?
const draftWarning = computed(() => {
  const r = rows.value.find((x) => x.code === draftFor.value)
  if (!r || !r.live || draftError.value || !draft.value) return ''
  const off = Math.abs(draftNumber.value - r.live) / r.live
  if (Math.abs(draftNumber.value * r.live - 1) < 0.2) return 'This looks like the rate the other way round (1 ' + r.code + ' = ' + draft.value + ' ' + props.home + '). Enter how many ' + r.code + ' you get for 1 ' + props.home + '.'
  if (off > 0.15) return "That's " + Math.round(off * 100) + "% away from today's live rate. Double-check it before saving."
  return ''
})
// What saving would do to the totals (so the change isn't a surprise)
function impactText(r) {
  const spent = props.totals[r.code]
  if (!spent || draftError.value || !draft.value || !r.used) return ''
  const before = spent / r.used
  const after = spent / draftNumber.value
  const diff = after - before
  if (Math.abs(diff) < 0.005) return ''
  return 'Your ' + r.code + ' expenses would come to ' + money(after, props.home) + ' (' + (diff > 0 ? '+' : '−') + money(Math.abs(diff), props.home) + ' compared with now).'
}
function saveRate(r) {
  if (draftError.value || !draft.value) return
  emit('set', r.code, draftNumber.value)
  draftFor.value = null
}
function resetRate(r) {
  emit('reset', r.code)
}

function close() {
  open.value = false
  draftFor.value = null
  nextTick(() => triggerEl.value && triggerEl.value.focus())
}
function onDocClick(e) {
  // (the currency dropdown's menu lives on <body>, so clicks in it count as inside)
  if (open.value && !e.target.closest('.er') && !e.target.closest('.dd-menu')) close()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// ----- text -----
function round(n) {
  return n >= 100 ? Math.round(n * 100) / 100 : Math.round(n * 10000) / 10000
}
function fmt(n) {
  if (!n) return '—'
  return round(n).toLocaleString('en-SG', { maximumFractionDigits: n >= 100 ? 2 : 4 })
}
function shortDate(d) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.er {
  position: relative;
  --primary: #00798c;
  --ink: #003d5b;
  --muted: #5a6b78;
  --line: #e6dfd2;
}
.er-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fbf5ea;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.er-trigger:hover,
.er-trigger[aria-expanded='true'] {
  border-color: var(--primary);
}
.er-trigger.group {
  border-color: rgba(0, 121, 140, 0.4);
  background: #fbefd9;
  color: #004e5a;
}
.er-trigger.warn {
  border-color: #f0b44c;
  background: #fff6e5;
  color: #7a4b00;
}
.er-dim {
  font-weight: 400;
  color: var(--muted);
}
.er-caret {
  font-size: 9px;
  opacity: 0.6;
}

.er-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 60;
  width: min(380px, calc(100vw - 32px));
  max-height: 70vh;
  overflow-y: auto;
  padding: 14px;
  border-radius: 18px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  box-shadow: 0 18px 44px rgba(0, 40, 62, 0.18);
  color: var(--ink);
}
.er-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.er-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.1rem;
  margin: 0;
}
.er-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.er-x {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fbf5ea;
  color: var(--muted);
}
.er-empty {
  font-size: 13px;
  color: var(--muted);
  margin: 12px 0 0;
}
.er-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.er-row {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.er-row.editing {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 121, 140, 0.12);
}
.er-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.er-code {
  font-weight: 700;
}
.er-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.er-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #efe9df;
  color: var(--muted);
}
.er-badge.group {
  background: var(--primary);
  color: #fff;
}
.er-badge.none {
  background: #fff6e5;
  color: #7a4b00;
}
.er-rate {
  margin: 6px 0 0;
  font-size: 14px;
}
.er-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.er-meta.warn {
  color: #7a4b00;
}
.er-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.er-btn {
  border: 1px solid var(--primary);
  border-radius: 999px;
  background: #fbf5ea;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
}
.er-btn.primary {
  background: var(--primary);
  color: #fff;
}
.er-btn.primary:disabled {
  opacity: 0.5;
}
.er-btn.ghost {
  border-color: var(--line);
  color: var(--muted);
}
.er-btn.ghost:hover {
  color: var(--ink);
}
.er-edit {
  margin-top: 8px;
}
.er-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.er-field input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.er-field input:focus {
  outline: none;
  border-color: var(--primary);
}
.er-field input[aria-invalid='true'] {
  border-color: #d1495b;
}
.er-link {
  border: 0;
  background: none;
  padding: 0;
  color: var(--primary);
  font-weight: 600;
  text-decoration: underline;
  font-size: 12px;
}
.er-msg {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.er-msg.bad {
  color: #d1495b;
}
.er-msg.warn {
  color: #7a4b00;
}
.er-add {
  margin-top: 10px;
}
.er-foot {
  margin: 10px 0 0;
  font-size: 11px;
  color: var(--muted);
}
.er button:focus-visible,
.er input:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.35);
  outline-offset: 2px;
}
.er-pop-enter-active {
  transition: opacity 0.15s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.er-pop-leave-active {
  transition: opacity 0.1s;
}
.er-pop-enter-from,
.er-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .er-pop-enter-active,
  .er-pop-leave-active {
    transition: none;
  }
}
</style>
