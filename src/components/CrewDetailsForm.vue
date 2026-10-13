<template>
  <form class="cd" @submit.prevent="submit" @keydown.esc="onEsc">
    <header class="cd-head">
      <strong>{{ title }}</strong>
      <span>🔒 Only the crew sees this</span>
    </header>

    <!-- Crew title: one input, four quick picks -->
    <label class="cd-label" :for="uid + '-persona'">Crew title</label>
    <input :id="uid + '-persona'" v-model="form.persona" class="cd-input" maxlength="40" placeholder="Give yourself a title" autocomplete="off">
    <div class="cd-picks">
      <button v-for="s in PERSONAS" :key="s" type="button" class="cd-pick" :class="{ on: form.persona === s }"
        :aria-pressed="form.persona === s" @click="form.persona = form.persona === s ? '' : s">{{ s }}</button>
    </div>

    <!-- Flight: your own, or the same one as someone else (stored once, on their card) -->
    <span class="cd-label">Flight</span>
    <div v-if="flightBuddies.length" class="cd-seg" role="radiogroup" aria-label="Flight">
      <button type="button" role="radio" :aria-checked="!form.sameFlightAs" :class="{ on: !form.sameFlightAs }"
        @click="form.sameFlightAs = ''">My own</button>
      <button v-for="b in flightBuddies" :key="b.name" type="button" role="radio" :aria-checked="form.sameFlightAs === b.name"
        :class="{ on: form.sameFlightAs === b.name }" @click="form.sameFlightAs = b.name">
        Same as {{ b.name }}<span v-if="b.flight" class="cd-seg-sub"> · {{ b.flight }}</span>
      </button>
    </div>

    <p v-if="buddy" class="cd-buddy">
      ✈️ {{ buddy.flight || 'Same arrival' }}<template v-if="buddy.arrival"> · lands {{ landText(buddy.arrival) }}</template>
      <span>Updates when {{ buddy.name }} changes it</span>
    </p>
    <div v-else class="cd-grid">
      <span>
        <label class="cd-mini" :for="uid + '-flight'">Flight number</label>
        <input :id="uid + '-flight'" v-model="form.flight" class="cd-input upper" maxlength="12" placeholder="SQ618" autocomplete="off">
      </span>
      <span>
        <label class="cd-mini" :for="uid + '-arr'">Lands (local time)</label>
        <input :id="uid + '-arr'" v-model="form.arrival" type="datetime-local" class="cd-input">
      </span>
    </div>

    <!-- Food needs + WhatsApp: people without an account fill these in here;
         everyone else sets them once in Settings and they show on every trip -->
    <template v-if="showContact">
      <label class="cd-label" :for="uid + '-diet'">Food needs</label>
      <DietTagsInput :id="uid + '-diet'" v-model="form.diet" />
      <label class="cd-label" :for="uid + '-phone'">WhatsApp</label>
      <PhoneInput :id="uid + '-phone'" v-model="form.phone" />
    </template>
    <p v-else-if="settingsNote" class="cd-note">
      🍽 Food needs and 💬 WhatsApp come from your <router-link to="/settings">Settings</router-link>, so you only fill them in once.
    </p>

    <p v-if="error" class="cd-err" role="alert">{{ error }}</p>
    <div class="cd-btns">
      <button type="button" class="cd-cancel" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="cd-save" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { PERSONAS } from '../crewOptions.js'
import DietTagsInput from './DietTagsInput.vue'
import PhoneInput from './PhoneInput.vue'

const props = defineProps({
  title: { type: String, default: 'Your details' },
  profile: { type: Object, default: () => ({}) },
  // Other travellers with their own flight: [{ name, flight, arrival }]
  flightBuddies: { type: Array, default: () => [] },
  showContact: { type: Boolean, default: true },   // food needs + WhatsApp fields (people without an account)
  settingsNote: { type: Boolean, default: false }, // "these come from your Settings" line (your own card)
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['save', 'cancel'])

const uid = 'cd' + Math.random().toString(36).slice(2, 8)
const p = props.profile

// Old cards kept extra food notes in dietNote: turn that into a tag
const startDiet = (p.diet || []).slice()
if (p.dietNote && !startDiet.includes(p.dietNote)) startDiet.push(p.dietNote)

const form = reactive({
  persona: p.persona || '',
  sameFlightAs: p.sameFlightAs || '',
  flight: p.flight || '',
  arrival: p.arrival || '',
  diet: startDiet,
  phone: p.phone || ''
})

// ----- Flight -----
const buddy = computed(() => {
  for (const b of props.flightBuddies) {
    if (b.name === form.sameFlightAs) return b
  }
  return null
})

function landText(value) {
  const d = new Date(value)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) + ', ' + value.slice(11, 16)
}

function onEsc(e) {
  emit('cancel')
  e.stopPropagation()
}

function submit() {
  const result = {
    persona: form.persona.trim(),
    sameFlightAs: form.sameFlightAs,
    flight: form.sameFlightAs ? '' : form.flight.trim().toUpperCase(),
    arrival: form.sameFlightAs ? '' : form.arrival
  }
  if (props.showContact) {
    result.diet = form.diet.slice()
    result.phone = form.phone
  }
  emit('save', result)
}
</script>

<style scoped>
.cd {
  --mint: #2fe0a1;
  --line: rgba(255, 255, 255, 0.08);
  --muted: #8b949e;
  --text: #e6edf3;
  color: var(--text);
  display: flex;
  flex-direction: column;
}
.cd-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}
.cd-head span {
  font-size: 11px;
  color: var(--muted);
}
.cd-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 12px 0 5px;
}
.cd-mini {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 3px;
}
.cd-input {
  width: 100%;
  background: #0d1117;
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 10px;
  padding: 7px 10px;
  font-size: 14px;
  color-scheme: dark;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cd-input.upper {
  text-transform: uppercase;
}
.cd-input::placeholder,
.cd-input:focus,

/* Quick picks */
.cd-picks {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.cd-pick {
  flex: none;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.cd-pick:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.2);
}
.cd-pick.on {
  color: #b9ffe6;
  border-color: var(--mint);
  background: rgba(47, 224, 161, 0.12);
}

/* Own flight / same as someone */
.cd-seg {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px;
  background: #0d1117;
  border: 1px solid var(--line);
  border-radius: 12px;
  margin-bottom: 8px;
}
.cd-seg button {
  border: 0;
  background: transparent;
  color: var(--muted);
  border-radius: 9px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}
.cd-seg button:hover {
  color: var(--text);
}
.cd-seg button.on {
  background: rgba(47, 224, 161, 0.16);
  color: #b9ffe6;
}
.cd-seg-sub {
  font-weight: 400;
  opacity: 0.8;
}
.cd-buddy {
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(47, 224, 161, 0.08);
  border: 1px solid rgba(47, 224, 161, 0.25);
  font-size: 13px;
  font-weight: 600;
}
.cd-buddy span {
  display: block;
  font-weight: 400;
  font-size: 11px;
  color: var(--muted);
}
.cd-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 8px;
}

/* Food tags */

/* Phone */

.cd-note {
  margin: 12px 0 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: var(--muted);
}
.cd-note a {
  color: var(--mint);
}
.cd-err {
  color: #ff9a9a;
  font-size: 13px;
  margin: 10px 0 0;
}
.cd-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.cd-cancel {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 7px 16px;
  font-weight: 600;
  transition: color 0.15s, border-color 0.15s;
}
.cd-cancel:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.2);
}
.cd-save {
  border: 0;
  background: var(--mint);
  color: #06261b;
  border-radius: 999px;
  padding: 7px 20px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(47, 224, 161, 0.25);
  transition: transform 0.15s, filter 0.15s;
}
.cd-save:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
.cd-save:disabled {
  opacity: 0.6;
}
.cd button:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
}

@media (max-width: 420px) {
  .cd-grid {
    grid-template-columns: 1fr;
  }
}
</style>
