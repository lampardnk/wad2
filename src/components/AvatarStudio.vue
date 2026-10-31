<template>
  <!-- Travel Twin studio (opened from Settings): the 3D twin on the left, the wardrobe on the right.
       Changes are only kept when you press Save. Items unlock with XP from your trips (or as souvenirs). -->
  <Teleport to="body">
    <transition name="as-fade">
      <div v-if="open" class="as-overlay" @click.self="askClose" @keydown.esc.stop="askClose">
        <section ref="panel" class="as" role="dialog" aria-modal="true" aria-labelledby="as-title" tabindex="-1">
          <!-- ===== Header: title, tier + XP, close ===== -->
          <header class="as-head">
            <div class="as-title-wrap">
              <p class="as-kicker">Travel Twin</p>
              <h2 id="as-title" class="as-title">Style your twin</h2>
            </div>
            <button type="button" class="as-tier" :aria-expanded="xpOpen" aria-controls="as-xp" @click="xpOpen = !xpOpen">
              <span class="as-tier-badge">Tier {{ P.tier }}</span>
              <span class="as-tier-text">
                <strong>{{ P.tierName }} · {{ P.xp }} XP</strong>
                <span>{{ progressText }}</span>
              </span>
              <span class="as-bar" aria-hidden="true"><span :style="{ width: progress + '%' }"></span></span>
              <span class="as-tier-q" aria-hidden="true">?</span>
            </button>
            <button type="button" class="as-x" aria-label="Close" @click="askClose"><AppIcon name="x" :size="18" /></button>
          </header>

          <!-- How XP works + where mine came from -->
          <div v-if="xpOpen" id="as-xp" class="as-xp">
            <div>
              <h3>How to earn XP</h3>
              <ul class="as-xp-rules">
                <li><b>+{{ XP.trip }}</b> finish a trip (it had stops planned, and it's over)</li>
                <li><b>+{{ XP.country }}</b> each new country</li>
                <li><b>+{{ XP.planner }}</b> each for 5+ stops, 5+ items packed, 3+ expenses, 3+ photos on a finished trip</li>
                <li><b>Souvenirs</b> come from where you go: tropics, cold places, any country abroad</li>
              </ul>
            </div>
            <div>
              <h3>Your XP</h3>
              <p v-if="!P.log.length" class="as-xp-empty">Nothing yet. Your first finished trip gives {{ XP.trip }} XP.</p>
              <ul v-else class="as-xp-log">
                <li v-for="t in P.log.slice(0, 6)" :key="t.trip + t.endDate">
                  <strong>{{ t.trip }}</strong>
                  <span v-for="l in t.lines" :key="l.label">{{ l.label }} <b>+{{ l.xp }}</b></span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Unlocked something since they last looked -->
          <div v-if="fresh.length" class="as-unlock" role="status">
            <AppIcon name="sparkles" :size="16" />
            <span><strong>New:</strong> {{ freshNames }}</span>
          </div>

          <div class="as-body">
            <!-- ===== Left: the 3D stage ===== -->
            <div class="as-stage" data-tour="avatar-stage">
              <AvatarStage ref="stage" :look="comparing ? savedLook : draft" :focus="focus" :countries="P.countries.length" @ready="onReady" />
              <span v-if="comparing" class="as-comparing">Your saved look</span>
              <div class="as-views" role="group" aria-label="Camera">
                <button v-for="v in VIEW_BUTTONS" :key="v.key" type="button" class="as-view" :class="{ on: focus === v.key }"
                  :aria-pressed="focus === v.key" @click="focus = v.key">{{ v.label }}</button>
              </div>
              <p class="as-hint" aria-hidden="true"><AppIcon name="swap" :size="13" /> Drag to turn</p>
              <button v-if="dirty" type="button" class="as-compare" @pointerdown="comparing = true" @pointerup="comparing = false"
                @pointerleave="comparing = false" @keydown.space.prevent="comparing = true" @keyup.space="comparing = false"
                @blur="comparing = false">
                <AppIcon name="eye" :size="14" /> Hold to compare
              </button>
            </div>

            <!-- ===== Right: the wardrobe ===== -->
            <div class="as-wardrobe">
              <div class="as-tabs" role="tablist" aria-label="Wardrobe" @keydown="onTabKey">
                <button v-for="t in TABS" :key="t.key" :id="'as-tab-' + t.key" type="button" role="tab" class="as-tab"
                  :class="{ on: tab === t.key }" :aria-selected="tab === t.key" :tabindex="tab === t.key ? 0 : -1"
                  :aria-controls="'as-panel-' + t.key" @click="pickTab(t.key)">
                  <AppIcon :name="t.icon" :size="16" /> {{ t.label }}
                </button>
              </div>

              <div :id="'as-panel-' + tab" class="as-panel" role="tabpanel" :aria-labelledby="'as-tab-' + tab" data-tour="avatar-wardrobe">
                <!-- ===== My outfits: 3 saved looks + what to wear on each trip ===== -->
                <template v-if="tab === 'saved'">
                  <section class="as-slot" aria-labelledby="as-slot-outfits">
                    <h3 id="as-slot-outfits" class="as-slot-title">Saved outfits <span class="as-slot-pick">Up to 3</span></h3>
                    <div class="as-outfits">
                      <div v-for="i in 3" :key="i" class="as-outfit" :class="{ empty: !avatar.outfits[i - 1] }">
                        <template v-if="avatar.outfits[i - 1]">
                          <span class="as-outfit-pic">
                            <img v-if="avatar.outfits[i - 1].picture" :src="avatar.outfits[i - 1].picture" alt="">
                            <AppIcon v-else name="shirt" :size="22" />
                          </span>
                          <strong>{{ avatar.outfits[i - 1].name }}</strong>
                          <div class="as-outfit-btns">
                            <button type="button" class="as-mini primary" @click="wearOutfit(i - 1)">Wear</button>
                            <button type="button" class="as-mini" @click="storeOutfit(i - 1)">Replace</button>
                            <button type="button" class="as-mini icon" :aria-label="'Delete ' + avatar.outfits[i - 1].name" @click="deleteOutfit(i - 1)"><AppIcon name="trash" :size="13" /></button>
                          </div>
                        </template>
                        <button v-else type="button" class="as-outfit-add" :disabled="i - 1 > avatar.outfits.length" @click="storeOutfit(i - 1)">
                          <AppIcon name="plus" :size="18" />
                          Save this look
                        </button>
                      </div>
                    </div>
                  </section>

                  <section class="as-slot" aria-labelledby="as-slot-trips">
                    <h3 id="as-slot-trips" class="as-slot-title">Trip outfits <span class="as-slot-pick">Your crew sees it on that trip</span></h3>
                    <p v-if="tripsLoading" class="as-muted">Loading your trips…</p>
                    <p v-else-if="!myTrips.length" class="as-muted">No upcoming trips yet. Plan one, then pick what your twin wears on it.</p>
                    <ul v-else class="as-trips">
                      <li v-for="t in myTrips" :key="t.id" class="as-trip">
                        <span class="as-trip-text">
                          <strong>{{ t.name }}</strong>
                          <small>{{ t.when }}<template v-if="avatar.tripLooks[t.id]"> · outfit set</template></small>
                        </span>
                        <template v-if="avatar.tripLooks[t.id]">
                          <button type="button" class="as-mini" @click="wearTrip(t.id)">Wear</button>
                          <button type="button" class="as-mini primary" @click="setTrip(t.id)">Update</button>
                          <button type="button" class="as-mini icon" :aria-label="'Remove the outfit for ' + t.name" @click="dropTrip(t.id)"><AppIcon name="x" :size="13" /></button>
                        </template>
                        <button v-else type="button" class="as-mini primary" @click="setTrip(t.id)">Use this look</button>
                      </li>
                    </ul>
                  </section>
                  <p v-if="outfitMsg" class="as-locknote" role="status">{{ outfitMsg }}</p>
                </template>

                <section v-for="s in tabSlots" :key="s.key" class="as-slot" :aria-labelledby="'as-slot-' + s.key">
                  <h3 :id="'as-slot-' + s.key" class="as-slot-title">
                    {{ s.label }}
                    <span v-if="s.kind !== 'gear'" class="as-slot-pick">{{ nameOf(s.key) }}</span>
                    <span v-else class="as-slot-pick">{{ draft.gear.length ? draft.gear.length + ' on' : 'Pick any' }}</span>
                  </h3>

                  <!-- Colour dots -->
                  <div v-if="s.kind === 'swatch'" class="as-swatches">
                    <button v-for="it in CATALOG[s.key]" :key="it.id" type="button" class="as-swatch"
                      :class="{ on: draft[s.key] === it.id, locked: !isUnlocked(it) }"
                      :style="{ '--sw': it.color }" :aria-pressed="draft[s.key] === it.id"
                      :aria-disabled="!isUnlocked(it)"
                      :aria-label="it.name + (isUnlocked(it) ? '' : '. ' + lockText(it))"
                      :data-tip="isUnlocked(it) ? it.name : lockText(it)"
                      @click="pick(s, it)">
                      <AppIcon v-if="!isUnlocked(it)" name="lock" :size="13" :stroke="2.4" />
                      <span v-if="isNew(s.key, it)" class="as-new-dot" aria-hidden="true"></span>
                    </button>
                  </div>

                  <!-- Item cards -->
                  <div v-else class="as-grid">
                    <button v-for="it in CATALOG[s.key]" :key="it.id" type="button" class="as-card"
                      :class="{ on: chosen(s, it), locked: !isUnlocked(it) }"
                      :aria-pressed="chosen(s, it)" :aria-disabled="!isUnlocked(it)"
                      :aria-label="it.name + (isUnlocked(it) ? '' : '. ' + lockText(it))"
                      :data-tip="isUnlocked(it) ? null : lockText(it)"
                      @click="pick(s, it)">
                      <span class="as-thumb">
                        <AppIcon v-if="it.icon" :name="it.icon" :size="26" :stroke="1.8" />
                        <svg v-else viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" v-html="thumb(s.key, it)"></svg>
                      </span>
                      <span class="as-card-name">{{ it.name }}</span>
                      <span v-if="!isUnlocked(it)" class="as-lock">
                        <AppIcon name="lock" :size="11" :stroke="2.6" /> {{ it.souvenir ? 'Souvenir' : TIERS[it.tier - 1].min + ' XP' }}
                      </span>
                      <span v-else-if="isNew(s.key, it)" class="as-new">New</span>
                      <span v-else-if="it.souvenir" class="as-souvenir">Souvenir</span>
                      <span v-if="chosen(s, it)" class="as-check" aria-hidden="true"><AppIcon name="check" :size="12" :stroke="3" /></span>
                    </button>
                  </div>

                  <p v-if="lockNote && lockNote.slot === s.key" class="as-locknote" role="status">
                    <AppIcon name="lock" :size="13" /> <strong>{{ lockNote.name }}</strong>: {{ lockNote.text }}
                  </p>
                </section>
              </div>
            </div>
          </div>

          <!-- ===== Footer ===== -->
          <footer class="as-foot">
            <template v-if="confirmClose">
              <span class="as-foot-msg">Leave without saving your new look?</span>
              <button type="button" class="as-ghost" @click="confirmClose = false">Keep editing</button>
              <button type="button" class="as-ghost danger" @click="close">Discard</button>
            </template>
            <template v-else>
              <button type="button" class="as-ghost" @click="surprise"><AppIcon name="sparkles" :size="15" /> Surprise me</button>
              <button type="button" class="as-ghost" :disabled="!dirty" @click="undo"><AppIcon name="refresh" :size="15" /> Undo changes</button>
              <span v-if="error" class="as-err" role="alert">{{ error }}</span>
              <span v-else-if="savedFlash" class="as-saved" role="status"><AppIcon name="check" :size="14" :stroke="3" /> Saved</span>
              <button type="button" class="as-save" data-tour="avatar-save" :disabled="saving || (!dirty && avatar.version > 0)" @click="save">
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
            </template>
          </footer>

          <AvatarTour v-if="stageReady" />
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import {
  avatar, CATALOG, TABS, SLOTS, TIERS, XP, itemOf, isUnlocked, lockText, isNew, newUnlocks, cleanLook, lockedIn,
  saveAvatar, saveOutfits, saveTripLook, removeTripLook, markSeen, loadAvatar, loadProgress
} from '../avatarStore.js'
import AvatarStage from './AvatarStage.vue'
import AvatarTour from './AvatarTour.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'saved'])

const VIEW_BUTTONS = [
  { key: 'full', label: 'Full' },
  { key: 'face', label: 'Face' },
  { key: 'body', label: 'Outfit' },
  { key: 'back', label: 'Back' }
]
const TAB_FOCUS = { appearance: 'face', outfit: 'body', gear: 'full', saved: 'full' }

const panel = ref(null)
const stage = ref(null)
const stageReady = ref(false)
const draft = ref(cleanLook(avatar.look))
const tab = ref('appearance')
const focus = ref('full')
const saving = ref(false)
const savedFlash = ref(false)
const error = ref('')
const confirmClose = ref(false)
const lockNote = ref(null) // { slot, name, text } after tapping a locked item
const xpOpen = ref(false)
const comparing = ref(false)
const fresh = ref([])      // items unlocked since last time (shown in the banner)
const myTrips = ref([])
const tripsLoading = ref(false)
const outfitMsg = ref('')

const P = computed(() => avatar.progress)
const savedLook = computed(() => cleanLook(avatar.look))

// Fresh copy every time it opens, with the latest XP from the server
watch(() => props.open, async (open) => {
  if (!open) return
  draft.value = cleanLook(avatar.look)
  tab.value = 'appearance'
  focus.value = 'full'
  error.value = ''
  confirmClose.value = false
  lockNote.value = null
  stageReady.value = false
  xpOpen.value = false
  outfitMsg.value = ''
  nextTick(() => panel.value && panel.value.focus())
  await loadAvatar()
  await loadProgress()
  draft.value = cleanLook(avatar.look)
  fresh.value = newUnlocks()
}, { immediate: true }) // immediate: on the /avatar page it's open from the start

const tabSlots = computed(() => {
  const list = []
  for (const s of SLOTS) if (s.tab === tab.value) list.push(s)
  return list
})
const dirty = computed(() => JSON.stringify(cleanLook(draft.value)) !== JSON.stringify(savedLook.value))

// ----- tier + progress -----
const progress = computed(() => {
  const next = P.value.next
  if (!next) return 100
  const from = TIERS[P.value.tier - 1].min
  return Math.round(((P.value.xp - from) / (next.min - from)) * 100)
})
const progressText = computed(() => {
  if (!P.value.next) return P.value.tier === 3 ? 'Everything unlocked' : 'Loading your XP…'
  return P.value.next.min - P.value.xp + ' XP to ' + P.value.next.name
})
const freshNames = computed(() => {
  const names = []
  for (const it of fresh.value) names.push(it.name)
  return names.slice(0, 6).join(', ') + (names.length > 6 ? ' and more' : '')
})

// ----- picking -----
function nameOf(slotKey) {
  return itemOf(slotKey, draft.value[slotKey]).name
}
function chosen(s, it) {
  return s.kind === 'gear' ? draft.value.gear.includes(it.id) : draft.value[s.key] === it.id
}
function pick(s, it) {
  if (!isUnlocked(it)) {
    lockNote.value = { slot: s.key, name: it.name, text: lockText(it) }
    return
  }
  lockNote.value = null
  error.value = ''
  if (s.kind === 'gear') {
    const list = draft.value.gear.slice()
    const i = list.indexOf(it.id)
    if (i >= 0) list.splice(i, 1)
    else list.push(it.id)
    draft.value.gear = list
  } else {
    draft.value[s.key] = it.id
  }
  focus.value = it.focus || s.focus
}
function pickTab(key) {
  tab.value = key
  focus.value = TAB_FOCUS[key]
  lockNote.value = null
  if (key === 'saved') loadTrips()
}
function onTabKey(e) {
  const keys = TABS.map((t) => t.key)
  let i = keys.indexOf(tab.value)
  if (e.key === 'ArrowRight') i = (i + 1) % keys.length
  else if (e.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length
  else return
  e.preventDefault()
  pickTab(keys[i])
  nextTick(() => document.getElementById('as-tab-' + keys[i]).focus())
}
function onReady() {
  stageReady.value = true
}

// A random look from what's unlocked
function surprise() {
  const look = { gear: [] }
  for (const s of SLOTS) {
    const open = []
    for (const it of CATALOG[s.key]) if (isUnlocked(it)) open.push(it.id)
    if (s.kind === 'gear') {
      for (const id of open) if (Math.random() < 0.3) look.gear.push(id)
    } else {
      look[s.key] = open[Math.floor(Math.random() * open.length)]
    }
  }
  draft.value = cleanLook(look)
  focus.value = 'full'
  lockNote.value = null
}
function undo() {
  draft.value = cleanLook(avatar.look)
  lockNote.value = null
}

// ----- saved outfits -----
function errorText(err, fallback) {
  return err.response && err.response.data && err.response.data.message ? err.response.data.message : fallback
}
async function storeOutfit(i) {
  const list = avatar.outfits.slice()
  const name = list[i] ? list[i].name : 'Outfit ' + (i + 1)
  list[i] = { name, look: cleanLook(draft.value), snapshot: stage.value ? stage.value.snapshot() : '' }
  try {
    await saveOutfits(list)
    outfitMsg.value = name + ' saved.'
  } catch (err) {
    outfitMsg.value = errorText(err, "Couldn't save the outfit. Try again.")
  }
}
async function deleteOutfit(i) {
  const list = avatar.outfits.slice()
  list.splice(i, 1)
  try {
    await saveOutfits(list)
    outfitMsg.value = ''
  } catch (err) {
    outfitMsg.value = errorText(err, "Couldn't delete it. Try again.")
  }
}
function wearOutfit(i) {
  const bad = lockedIn(avatar.outfits[i].look, avatar.progress)
  draft.value = cleanLook(avatar.outfits[i].look)
  outfitMsg.value = bad.length ? 'Heads up: ' + bad.join(', ') + " isn't unlocked, so you can't save it yet." : 'Wearing ' + avatar.outfits[i].name + '. Save to keep it.'
  focus.value = 'full'
}

// ----- trip outfits -----
async function loadTrips() {
  if (myTrips.value.length || tripsLoading.value) return
  tripsLoading.value = true
  try {
    const res = await axios.get('/api/trips')
    const d = new Date()
    const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const list = []
    for (const t of res.data) {
      if (t.endDate && t.endDate < today) continue // only trips still to come (or happening now)
      list.push({ id: t.id || t._id, name: t.name, when: t.startDate ? t.startDate + (t.endDate ? ' to ' + t.endDate : '') : 'No dates yet' })
    }
    myTrips.value = list
  } catch (err) {
    outfitMsg.value = "Couldn't load your trips."
  } finally {
    tripsLoading.value = false
  }
}
async function setTrip(id) {
  try {
    await saveTripLook(id, draft.value, stage.value ? stage.value.snapshot() : '')
    outfitMsg.value = 'Your crew will see this look on that trip.'
  } catch (err) {
    outfitMsg.value = errorText(err, "Couldn't save it. Try again.")
  }
}
// Put a trip's outfit on the twin to change it (then Update saves it back to that trip)
function wearTrip(id) {
  draft.value = cleanLook(avatar.tripLooks[id].look)
  focus.value = 'full'
  outfitMsg.value = 'Wearing the trip outfit. Change anything, then press Update on that trip.'
}
async function dropTrip(id) {
  try {
    await removeTripLook(id)
  } catch (err) {
    outfitMsg.value = errorText(err, "Couldn't remove it. Try again.")
  }
}

// ----- save / close -----
async function save() {
  saving.value = true
  error.value = ''
  try {
    const shot = stage.value ? stage.value.snapshot() : ''
    await saveAvatar(draft.value, shot)
    savedFlash.value = true
    setTimeout(() => { savedFlash.value = false }, 1800)
    if (stage.value) stage.value.play('hop')
    emit('saved')
  } catch (err) {
    error.value = errorText(err, "Couldn't save. Check your connection and try again.")
  } finally {
    saving.value = false
  }
}
function askClose() {
  if (dirty.value && !confirmClose.value) {
    confirmClose.value = true
    return
  }
  close()
}
function close() {
  confirmClose.value = false
  markSeen()
  emit('close')
}

// ----- little pictures for the cards (48 x 48) -----
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) + amount
  let g = ((n >> 8) & 255) + amount
  let b = (n & 255) + amount
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
const TEE = 'M16 10l-8 5 3 7 4-2v18h18V20l4 2 3-7-8-5c-1 3-4 4-8 4s-7-1-8-4z'
const LONG = 'M16 10l-9 6 2 18 5-1 1-13v19h18V20l1 13 5 1 2-18-9-6c-1 3-4 4-8 4s-7-1-8-4z'
const PANTS = 'M15 8h18l2 32h-7l-4-22-4 22h-7z'
const NONE = '<circle cx="24" cy="24" r="12" fill="none" stroke="#6f8796" stroke-width="2" stroke-dasharray="3 3"/><path d="M16 32 32 16" stroke="#6f8796" stroke-width="2"/>'
function thumb(slot, it) {
  const skin = itemOf('skin', draft.value.skin).color
  const hair = itemOf('hairColor', draft.value.hairColor).color
  const top = itemOf('topColor', draft.value.topColor).color
  const p = (d, fill) => '<path d="' + d + '" fill="' + fill + '"/>'
  if (slot === 'hair') {
    const face = '<circle cx="24" cy="27" r="11" fill="' + skin + '"/><circle cx="20" cy="28" r="1.3" fill="#1b1b22"/><circle cx="28" cy="28" r="1.3" fill="#1b1b22"/>'
    const fringe = p('M12.5 27a11.5 11.5 0 0 1 23 0c-2-4-5-6-8-6-4 3-9 4-15 6z', hair)
    if (it.id === 'buzz') return face + p('M13 25a11 11 0 0 1 22 0c-3-4-7-6-11-6s-8 2-11 6z', hair)
    if (it.id === 'short') return face + fringe
    if (it.id === 'long') return p('M11 26a13 13 0 0 1 26 0v15h-6V30H17v11h-6z', hair) + face + fringe
    if (it.id === 'bob') return p('M12 26a12 12 0 0 1 24 0v10h-5v-8H17v8h-5z', hair) + face + fringe
    if (it.id === 'braid') return face + fringe + '<circle cx="35" cy="31" r="3.4" fill="' + hair + '"/><circle cx="36" cy="37" r="3" fill="' + hair + '"/><circle cx="36.5" cy="42.5" r="2.6" fill="' + hair + '"/>'
    if (it.id === 'locs') return '<path d="M13 22v18M16 22v20M32 22v20M35 22v18" stroke="' + hair + '" stroke-width="3" stroke-linecap="round"/>' + face + p('M13 26a11 11 0 0 1 22 0c-3-4-7-6-11-6s-8 2-11 6z', hair)
    if (it.id === 'bun') return '<circle cx="24" cy="11" r="5" fill="' + hair + '"/>' + face + fringe
    if (it.id === 'pony') return p('M33 21c6 2 8 10 4 16-1-5-3-8-6-10z', hair) + face + fringe + '<circle cx="34" cy="21" r="2" fill="#d1495b"/>'
    // curls round the top
    let curls = face
    for (let a = 160; a <= 380; a += 22) {
      const r = (a * Math.PI) / 180
      curls += '<circle cx="' + (24 + Math.cos(r) * 11).toFixed(1) + '" cy="' + (26 + Math.sin(r) * 11).toFixed(1) + '" r="4.4" fill="' + hair + '"/>'
    }
    return curls
  }
  const head = '<circle cx="24" cy="27" r="11" fill="' + skin + '"/><circle cx="20" cy="28" r="1.3" fill="#1b1b22"/><circle cx="28" cy="28" r="1.3" fill="#1b1b22"/>'
  if (slot === 'face') {
    if (it.id === 'none') return NONE
    return head + p('M13 29c1 8 5 13 11 13s10-5 11-13c-3 3-6 4-11 4s-8-1-11-4z', hair).replace('/>', it.id === 'stubble' ? ' opacity="0.35"/>' : '/>')
  }
  if (slot === 'hat') {
    if (it.id === 'none') return NONE
    const c = it.color
    if (it.id === 'tricorn') return head + p('M6 20c6-2 11-10 18-10s12 8 18 10c-3 3-9 4-18 4s-15-1-18-4z', c) + '<path d="M9 21c5 2 10 2.6 15 2.6s10-.6 15-2.6" fill="none" stroke="#edae49" stroke-width="1.6"/><circle cx="24" cy="16" r="2" fill="#edae49"/>'
    if (it.id === 'bandana') return head + p('M13 25c1-8 6-12 11-12s10 4 11 12c-4-2-7-2.5-11-2.5s-7 .5-11 2.5z', c) + p('M34 22l6 1-3 5z', c)
    if (it.id === 'sunhat') return head + '<ellipse cx="24" cy="20" rx="20" ry="4" fill="' + c + '"/>' + p('M15 20c0-6 4-9 9-9s9 3 9 9z', c) + '<rect x="15" y="16.5" width="18" height="3" fill="#d1495b"/>'
    return head + p('M13 25c0-8 5-13 11-13s11 5 11 13z', c) + '<rect x="12" y="22" width="24" height="5" rx="2.5" fill="#ff8a3d"/><circle cx="24" cy="10" r="3" fill="#ff8a3d"/>'
  }
  if (slot === 'gear') {
    if (it.id === 'specs') return head + '<g fill="none" stroke="#2a2433" stroke-width="1.6"><circle cx="20" cy="28" r="3.6"/><circle cx="28" cy="28" r="3.6"/><path d="M23.6 28h.8"/></g>'
    if (it.id === 'goggles') return head + '<path d="M13 22q11-4 22 0" stroke="#5a4632" stroke-width="2" fill="none"/><circle cx="20" cy="21" r="3.6" fill="#9fd8f0" stroke="#5a4632" stroke-width="1.6"/><circle cx="28" cy="21" r="3.6" fill="#9fd8f0" stroke="#5a4632" stroke-width="1.6"/>'
    if (it.id === 'earring') return head + '<circle cx="35" cy="28" r="2.6" fill="' + skin + '"/><circle cx="35.5" cy="32.5" r="2" fill="none" stroke="#f2c14e" stroke-width="1.4"/>'
    if (it.id === 'headband') return head + p('M13 24a11 11 0 0 1 22 0c-3-3-7-5-11-5s-8 2-11 5z', hair) + '<rect x="13" y="20" width="22" height="3.4" rx="1.7" fill="#ff6f91"/>'
    if (it.id === 'scarf') return '<rect x="17" y="22" width="14" height="10" fill="' + skin + '"/>' + p('M12 30c4-3 8-4 12-4s8 1 12 4v4c-4-2-8-3-12-3s-8 1-12 3z', '#b23a48') + '<rect x="27" y="31" width="5" height="12" rx="1" fill="#b23a48"/><path d="M27 37h5M27 40h5" stroke="#f3ead8" stroke-width="1.2"/>'
    if (it.id === 'eyepatch') return head + '<path d="M14 23l20 7" stroke="#16131a" stroke-width="1.2"/><ellipse cx="28" cy="28" rx="3.4" ry="3" fill="#16131a"/>'
  }
  if (slot === 'top') {
    const dark = shade(top, -30)
    const line = top === '#f3ead8' ? '#1f4e6e' : '#f7f3ea'
    if (it.id === 'tee') return p(TEE, top)
    if (it.id === 'stripes') return p(TEE, top) + '<path d="M15 23h18M15 28h18M15 33h18" stroke="' + line + '" stroke-width="2.6"/>'
    if (it.id === 'linen') return p(LONG, top) + '<path d="M19 10l5 6 5-6" fill="none" stroke="' + dark + '" stroke-width="1.6"/><circle cx="24" cy="22" r="1" fill="' + dark + '"/><circle cx="24" cy="28" r="1" fill="' + dark + '"/><circle cx="24" cy="34" r="1" fill="' + dark + '"/>'
    return p(LONG, top) + p('M17 10c0-3 3-5 7-5s7 2 7 5c-2 2-4 3-7 3s-5-1-7-3z', dark) + '<rect x="18" y="29" width="12" height="7" rx="2" fill="' + dark + '"/>'
  }
  if (slot === 'outerwear') {
    if (it.id === 'none') return NONE
    const c = it.color
    const dark = shade(c, -30)
    if (it.id === 'puffer') return p(LONG, c) + '<path d="M14 20h20M14 26h20M14 32h20" stroke="' + dark + '" stroke-width="1.6"/><path d="M24 14v24" stroke="#2b2b2b" stroke-width="1.2"/>'
    let svg = p(LONG, c) + '<rect x="21.5" y="14" width="5" height="24" fill="' + top + '"/>'
    if (it.id === 'explorer') svg += '<rect x="15.5" y="21" width="5" height="5" rx="1" fill="' + dark + '"/><rect x="27.5" y="21" width="5" height="5" rx="1" fill="' + dark + '"/><rect x="15" y="30" width="6" height="6" rx="1" fill="' + dark + '"/><rect x="27" y="30" width="6" height="6" rx="1" fill="' + dark + '"/>'
    return svg
  }
  if (slot === 'bottom') {
    const c = it.color
    if (it.id === 'shorts') return p('M14 12h20l2 16h-8l-4-9-4 9h-8z', c)
    let svg = p(PANTS, c)
    if (it.id === 'cargo') svg += '<rect x="13" y="22" width="4" height="7" rx="1" fill="' + shade(c, -25) + '"/><rect x="31" y="22" width="4" height="7" rx="1" fill="' + shade(c, -25) + '"/>'
    if (it.id === 'jeans') svg += '<path d="M15.6 36h7M25.4 36h7" stroke="' + shade(c, 30) + '" stroke-width="2"/>'
    return svg
  }
  if (slot === 'shoes') {
    const c = it.color
    const sole = it.id === 'sneakers' ? '#c9c2b2' : '#2a1d14'
    if (it.id === 'boots') return p('M12 12h12v12c5 1 13 3 15 7v4H12z', c) + '<rect x="11" y="34" width="29" height="5" rx="2" fill="' + sole + '"/><path d="M16 16h6M16 20h6" stroke="#edae49" stroke-width="1.6"/>'
    if (it.id === 'slipons') return p('M8 32c1-4 4-6 8-6 4 2 10 3 16 3 5 0 8 2 8 5v1H8z', c) + '<rect x="8" y="34" width="32" height="4" rx="2" fill="' + sole + '"/>'
    return p('M8 30c0-4 3-8 6-8 3 4 9 6 16 6 5 0 9 2 9 6v2H8z', c) + '<rect x="8" y="34" width="31" height="4" rx="2" fill="' + sole + '"/><path d="M20 27l2-3M24 28l2-3" stroke="#00798c" stroke-width="1.5"/>'
  }
  if (slot === 'bag') {
    if (it.id === 'none') return NONE
    const c = it.color
    const dark = shade(c, -30)
    let svg = '<path d="M19 13a5 5 0 0 1 10 0" stroke="' + dark + '" fill="none" stroke-width="2.5"/>'
    if (it.id === 'expedition') svg = '<rect x="11" y="5" width="26" height="7" rx="3.5" fill="#edae49"/>' + svg + '<rect x="12" y="11" width="24" height="31" rx="8" fill="' + c + '"/>'
    else svg += '<rect x="13" y="12" width="22" height="28" rx="8" fill="' + c + '"/>'
    return svg + '<rect x="17" y="27" width="14" height="9" rx="3" fill="' + dark + '"/>'
  }
  return ''
}
</script>

<style scoped>
.as-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 12, 20, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.as {
  --line: rgba(255, 255, 255, 0.08);
  --text: #f6f1e7;
  --muted: #9fb3c1;
  --accent: #edae49;
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1120px, 100%);
  height: min(780px, calc(100vh - 32px));
  border-radius: 24px;
  overflow: hidden;
  background: #001d2c;
  color: var(--text);
  border: 1px solid var(--line);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  outline: none;
  animation: as-in 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
}
@keyframes as-in {
  from { transform: translateY(18px) scale(0.98); opacity: 0; }
}
.as *,
.as *::before,
.as *::after {
  box-sizing: border-box;
}

/* ----- header ----- */
.as-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px 14px 22px;
  border-bottom: 1px solid var(--line);
}
.as-title-wrap {
  flex: 1;
  min-width: 0;
}
.as-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}
.as-title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 800;
}
.as-tier {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 10px;
  row-gap: 6px;
  min-width: 250px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
}
.as-tier-badge {
  grid-row: span 2;
  padding: 6px 9px;
  border-radius: 10px;
  background: rgba(237, 174, 73, 0.14);
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}
.as-tier-text {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.3;
}
.as-tier-text strong {
  color: var(--text);
  font-size: 13.5px;
}
.as-bar {
  grid-column: 2;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.as-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d1495b, #edae49);
  transition: width 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.as-x {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.as-x:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}
.as-unlock {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 22px;
  font-size: 13px;
  color: #001d2c;
  background: linear-gradient(90deg, #edae49, #f3c16f);
}

/* ----- body ----- */
.as-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
}
.as-stage {
  position: relative;
  min-height: 0;
  border-right: 1px solid var(--line);
}
.as-views {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(0, 20, 31, 0.72);
  border: 1px solid var(--line);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.as-view {
  border: 0;
  border-radius: 999px;
  padding: 6px 13px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.as-view:hover {
  color: var(--text);
}
.as-view.on {
  background: var(--accent);
  color: #001d2c;
}
.as-hint {
  position: absolute;
  top: 14px;
  left: 16px;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(246, 241, 231, 0.6);
  pointer-events: none;
}

/* ----- wardrobe ----- */
.as-wardrobe {
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #00263a;
}
.as-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px 0;
  border-bottom: 1px solid var(--line);
}
.as-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: -1px;
}
.as-tab:hover {
  color: var(--text);
}
.as-tab.on {
  color: var(--text);
  border-bottom-color: var(--accent);
}
.as-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 18px 20px;
}
.as-slot {
  padding: 14px 0 6px;
}
.as-slot + .as-slot {
  border-top: 1px solid var(--line);
}
.as-slot-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.as-slot-pick {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text);
}

/* colour dots */
.as-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.as-swatch {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: var(--sw);
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
}
.as-swatch:hover {
  transform: scale(1.08);
}
.as-swatch.on {
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.18), 0 0 0 3px #00263a, 0 0 0 5px var(--accent);
}
.as-swatch.locked {
  filter: saturate(0.4) brightness(0.65);
  cursor: help;
}

/* item cards */
.as-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}
.as-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px 10px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.035);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.15s, background 0.15s;
}
.as-card:hover:not(.locked) {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
}
.as-card:active:not(.locked) {
  transform: scale(0.96);
}
.as-card.on {
  border-color: var(--accent);
  background: rgba(237, 174, 73, 0.1);
}
.as-card.locked {
  cursor: help;
}
.as-card.locked .as-thumb,
.as-card.locked .as-card-name {
  opacity: 0.38;
  filter: grayscale(0.7);
}
.as-thumb {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02));
  color: var(--accent);
}
.as-card-name {
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  line-height: 1.25;
}
.as-lock {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 700;
}
.as-new {
  padding: 2px 7px;
  border-radius: 999px;
  background: #d1495b;
  color: #fff;
  font-size: 10.5px;
  font-weight: 800;
}
.as-new-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d1495b;
  border: 2px solid #00263a;
}
.as-check {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: #001d2c;
}

/* tooltips for locked items (and colour names) */
[data-tip] {
  position: relative;
}
[data-tip]:hover::after,
[data-tip]:focus-visible::after {
  content: attr(data-tip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  z-index: 3;
  width: max-content;
  max-width: 220px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #f6f1e7;
  color: #001d2c;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  text-transform: none;
  letter-spacing: 0;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.as-locknote {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--muted);
}
.as-locknote strong {
  color: var(--text);
}

/* ----- footer ----- */
.as-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
  background: #001d2c;
}
.as-foot-msg {
  margin-right: auto;
  font-size: 14px;
  font-weight: 600;
}
.as-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
}
.as-ghost:first-child:not(:only-child) {
  margin-right: auto;
}
.as-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}
.as-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.as-ghost.danger {
  border-color: rgba(209, 73, 91, 0.6);
  color: #f19aa5;
}
.as-err {
  font-size: 13px;
  color: #f19aa5;
}
.as-saved {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}
.as-save {
  padding: 11px 22px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #001d2c;
  font: inherit;
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 #b07a22, 0 10px 24px rgba(237, 174, 73, 0.25);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
}
.as-save:hover:not(:disabled) {
  transform: translateY(-1px);
}
.as-save:active:not(:disabled) {
  transform: translateY(3px) scale(0.98);
  box-shadow: 0 1px 0 #b07a22, 0 4px 10px rgba(237, 174, 73, 0.2);
  transition-duration: 0.08s;
}
.as-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.as button:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.75);
  outline-offset: 2px;
}

.as-fade-enter-active,
.as-fade-leave-active {
  transition: opacity 0.2s;
}
.as-fade-enter-from,
.as-fade-leave-to {
  opacity: 0;
}

/* ----- smaller screens: twin on top, wardrobe below ----- */
@media (max-width: 860px) {
  .as-overlay {
    padding: 0;
  }
  .as {
    width: 100%;
    height: 100%;
    border-radius: 0;
    border: 0;
  }
  .as-head {
    flex-wrap: wrap;
    padding: 12px 14px;
    gap: 10px;
  }
  .as-tier {
    order: 3;
    width: 100%;
    min-width: 0;
  }
  .as-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 40vh minmax(0, 1fr);
  }
  .as-stage {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .as-tabs {
    padding: 8px 10px 0;
    overflow-x: auto;
  }
  .as-tab {
    flex: none;
    padding: 9px 11px 11px;
  }
  .as-panel {
    padding: 4px 14px 16px;
  }
  .as-foot {
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  }
}
@media (max-width: 480px) {
  .as-ghost {
    padding: 9px 11px;
  }
  .as-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .as,
  .as-card,
  .as-swatch,
  .as-save,
  .as-bar span {
    animation: none;
    transition: none;
  }
}

/* ----- XP panel, compare, outfits ----- */
.as-tier {
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  position: relative;
}
.as-tier:hover {
  border-color: rgba(237, 174, 73, 0.4);
}
.as-tier-q {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  color: var(--muted);
}
.as-xp {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--line);
  background: #00263a;
  font-size: 13px;
  max-height: 34vh;
  overflow-y: auto;
}
.as-xp h3 {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.as-xp ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.as-xp-rules b {
  display: inline-block;
  min-width: 34px;
  color: var(--accent);
}
.as-xp-log li {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  color: var(--muted);
}
.as-xp-log strong {
  width: 100%;
  color: var(--text);
}
.as-xp-log b {
  color: var(--accent);
}
.as-xp-empty {
  margin: 0;
  color: var(--muted);
}
.as-compare {
  position: absolute;
  top: 10px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(0, 20, 31, 0.72);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.as-compare:active {
  background: var(--accent);
  color: #001d2c;
}
.as-comparing {
  position: absolute;
  top: 50px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: #001d2c;
  font-size: 12px;
  font-weight: 800;
}
.as-souvenir {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(0, 121, 140, 0.25);
  color: #7fd3df;
  font-size: 10.5px;
  font-weight: 700;
}
.as-outfits {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.as-outfit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.035);
  text-align: center;
  font-size: 13px;
}
.as-outfit.empty {
  padding: 0;
  border-style: dashed;
  background: transparent;
}
.as-outfit-pic {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #001d2c;
  border: 2px solid rgba(237, 174, 73, 0.5);
  color: var(--accent);
}
.as-outfit-pic img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.as-outfit-btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}
.as-outfit-add {
  width: 100%;
  min-height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.as-outfit-add:hover:not(:disabled) {
  color: var(--accent);
  background: rgba(237, 174, 73, 0.06);
}
.as-outfit-add:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.as-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.as-mini:hover {
  background: rgba(255, 255, 255, 0.06);
}
.as-mini.primary {
  border-color: transparent;
  background: var(--accent);
  color: #001d2c;
}
.as-mini.icon {
  padding: 5px 7px;
}
.as-trips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.as-trip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.03);
}
.as-trip-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.as-trip-text strong {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.as-trip-text small,
.as-muted {
  font-size: 12.5px;
  color: var(--muted);
}
@media (max-width: 860px) {
  .as-xp {
    grid-template-columns: 1fr;
  }
}
</style>
