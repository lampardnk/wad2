<template>
  <!-- Travel Crew drawer: who's on the open trip, who's online, and the invite link.
       Opened from the profile menu (currentTrip.crewOpen). -->
  <Teleport to="body">
    <transition name="tcd-fade">
      <div v-if="currentTrip.crewOpen" class="tcd-backdrop" @click.self="close">
        <aside ref="panelEl" class="tcd" role="dialog" aria-modal="true" aria-labelledby="tcd-title" @keydown="onKey">
          <header class="tcd-head">
            <div class="tcd-head-text">
              <h2 id="tcd-title" class="tcd-title">Travel Crew</h2>
              <p class="tcd-sub">
                {{ currentTrip.name }} · {{ people.length }} going<template v-if="onlineCount"> · <span class="tcd-online-text">{{ onlineCount }} online</span></template>
              </p>
            </div>
            <button ref="closeEl" type="button" class="tcd-close" aria-label="Close crew list" @click="close">
              <AppIcon name="x" :size="18" />
            </button>
          </header>

          <div class="tcd-body">
            <!-- Members -->
            <ul class="tcd-list" aria-label="People on this trip">
              <li v-for="p in people" :key="p.key" class="tcd-row">
                <span class="tcd-avatar" :style="{ background: avatarColour(p.name) }" aria-hidden="true">
                  {{ initials(p.name) }}
                  <span v-if="p.active" class="tcd-avatar-dot"></span>
                </span>
                <div class="tcd-info">
                  <div class="tcd-name-line">
                    <strong class="tcd-name">{{ p.name }}</strong>
                    <span v-if="p.isMe" class="tcd-you">You</span>
                    <span class="tcd-role" :class="p.role">
                      <AppIcon v-if="p.role === 'owner'" name="crown" :size="12" />
                      {{ p.role === 'owner' ? 'Organizer' : p.role === 'guest' ? 'Guest' : 'Member' }}
                    </span>
                  </div>
                  <p class="tcd-status" :class="{ live: p.active }">
                    <AppIcon :name="p.active ? 'eye' : 'clock'" :size="13" />
                    {{ p.statusText }}
                  </p>
                  <ul v-if="p.diet.length" class="tcd-diet" :aria-label="p.name + '\'s food needs'">
                    <li v-for="d in p.diet" :key="d.key" class="tcd-tag" :class="{ allergy: d.allergy }">
                      <AppIcon :name="d.icon" :size="12" />{{ d.label }}
                    </li>
                  </ul>
                </div>
              </li>
            </ul>

            <!-- Invite -->
            <section class="tcd-invite" aria-labelledby="tcd-invite-title">
              <div class="tcd-invite-head">
                <span class="tcd-invite-icon" aria-hidden="true"><AppIcon name="user-plus" :size="18" /></span>
                <div>
                  <h3 id="tcd-invite-title" class="tcd-invite-title">Invite to this trip</h3>
                  <p class="tcd-invite-sub">Anyone with the link or code can join.</p>
                </div>
              </div>

              <p v-if="codeError" class="tcd-error" role="alert">Couldn't get the invite link. Check your connection and try again.</p>
              <template v-else>
                <div class="tcd-code-box">
                  <span class="tcd-code-label">Trip code</span>
                  <code class="tcd-code">{{ currentTrip.code || '······' }}</code>
                  <button type="button" class="tcd-copy" :class="{ done: copied === 'code' }" :disabled="!currentTrip.code" @click="copy('code')">
                    <AppIcon :name="copied === 'code' ? 'check' : 'copy'" :size="15" />
                    {{ copied === 'code' ? 'Copied' : 'Copy' }}
                  </button>
                </div>
                <div class="tcd-link-box">
                  <AppIcon name="link" :size="15" class="tcd-link-icon" />
                  <input class="tcd-link" :value="link" readonly aria-label="Invite link" @focus="$event.target.select()">
                  <button type="button" class="tcd-copy primary" :class="{ done: copied === 'link' }" :disabled="!link" @click="copy('link')">
                    <AppIcon :name="copied === 'link' ? 'check' : 'copy'" :size="15" />
                    {{ copied === 'link' ? 'Copied' : 'Copy link' }}
                  </button>
                </div>
              </template>
            </section>
          </div>
          <p class="tcd-sr" aria-live="polite">{{ copied === 'link' ? 'Invite link copied' : copied === 'code' ? 'Trip code copied' : '' }}</p>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { currentTrip, loadCode, copyText, isActive, ping } from '../currentTrip.js'
import { dietTag } from '../crewOptions.js'
import AppIcon from './AppIcon.vue'

const panelEl = ref(null)
const closeEl = ref(null)
const copied = ref('')   // 'code' | 'link' | ''
const codeError = ref(false)
const now = ref(Date.now()) // so "Last seen 3 min ago" keeps up
let clock = null
let copiedTimer = null
let openedFrom = null

const link = computed(() => (currentTrip.code ? window.location.origin + '/join/' + currentTrip.code : ''))

// One row per person: accounts first (organizer, then whoever is online), then guests without an account
const people = computed(() => {
  now.value // re-run every 30s so the times stay right
  const rows = []
  const memberNames = []
  for (const m of currentTrip.members) {
    memberNames.push(m.name)
    const active = isActive(m)
    const diet = []
    for (const tag of m.diet || []) {
      const d = dietTag(tag)
      diet.push({ key: d.key, label: d.label, allergy: !!d.allergy, icon: d.allergy ? 'alert' : /veg/.test(d.key) ? 'leaf' : 'utensils' })
    }
    rows.push({
      key: 'm-' + m.id,
      name: m.name,
      role: m.role === 'owner' ? 'owner' : 'member',
      isMe: m.name === currentTrip.me,
      active,
      statusText: statusOf(m, active),
      diet
    })
  }
  for (const t of currentTrip.travellers) {
    if (memberNames.includes(t)) continue
    rows.push({ key: 'g-' + t, name: t, role: 'guest', isMe: false, active: false, statusText: 'No account yet · added by the organizer', diet: [] })
  }
  const rank = (p) => (p.role === 'owner' ? 0 : p.active ? 1 : p.role === 'member' ? 2 : 3)
  rows.sort((a, b) => rank(a) - rank(b))
  return rows
})

const onlineCount = computed(() => {
  let n = 0
  for (const p of people.value) if (p.active && !p.isMe) n++
  return n
})

function statusOf(m, active) {
  if (active) return m.viewing ? 'Active now · Viewing ' + m.viewing : 'Active now'
  if (!m.lastSeenAt) return "Hasn't opened the trip yet"
  const mins = Math.round((now.value - new Date(m.lastSeenAt).getTime()) / 60000)
  if (mins < 60) return 'Last seen ' + Math.max(mins, 1) + ' min ago'
  const hours = Math.round(mins / 60)
  if (hours < 24) return 'Last seen ' + hours + 'h ago'
  const days = Math.round(hours / 24)
  return 'Last seen ' + (days === 1 ? 'yesterday' : days + ' days ago')
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/)
  return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase()
}
// The same colour for the same name, every time
const COLOURS = ['#00798c', '#d1495b', '#c27c0e', '#2e7d6b', '#5b5fc7', '#9c4f96', '#3a7ca5']
function avatarColour(name) {
  let sum = 0
  for (const ch of String(name)) sum += ch.charCodeAt(0)
  return COLOURS[sum % COLOURS.length]
}

async function copy(what) {
  const text = what === 'code' ? currentTrip.code : link.value
  if (!text) return
  const ok = await copyText(text)
  copied.value = ok ? what : ''
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = '' }, 2000)
}

function close() {
  currentTrip.crewOpen = false
}

// Esc closes; Tab stays inside the drawer
function onKey(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab' || !panelEl.value) return
  const focusable = panelEl.value.querySelectorAll('button:not([disabled]), input, a[href]')
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

watch(() => currentTrip.crewOpen, async (isOpen) => {
  if (isOpen) {
    openedFrom = document.activeElement
    document.body.style.overflow = 'hidden'
    now.value = Date.now()
    clock = setInterval(() => { now.value = Date.now() }, 30000)
    ping() // fresh statuses straight away
    codeError.value = false
    loadCode().catch(() => { codeError.value = true })
    await nextTick()
    if (closeEl.value) closeEl.value.focus()
  } else {
    document.body.style.overflow = ''
    clearInterval(clock)
    copied.value = ''
    // Back to the avatar button (the menu item that opened it is gone)
    const back = openedFrom && document.contains(openedFrom) ? openedFrom : document.querySelector('.upm-avatar')
    if (back) back.focus()
  }
})

onBeforeUnmount(() => {
  clearInterval(clock)
  clearTimeout(copiedTimer)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.tcd-backdrop *,
.tcd-backdrop *::before,
.tcd-backdrop *::after {
  box-sizing: border-box;
}
.tcd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 12, 20, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  justify-content: flex-end;
  --tcd-line: rgba(255, 255, 255, 0.08);
  --tcd-text: #f6f1e7;
  --tcd-muted: #9fb3c1;
  --tcd-accent: #edae49;
  --tcd-online: #4ade80;
}
.tcd {
  width: min(420px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(0, 29, 44, 0.92);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-left: 1px solid var(--tcd-line);
  color: var(--tcd-text);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.4);
}
.tcd-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--tcd-line);
}
.tcd-head-text {
  flex: 1;
  min-width: 0;
}
.tcd-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}
.tcd-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--tcd-muted);
}
.tcd-online-text {
  color: var(--tcd-online);
  font-weight: 700;
}
.tcd-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--tcd-line);
  background: rgba(255, 255, 255, 0.04);
  color: var(--tcd-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tcd-close:hover,
.tcd-close:focus-visible {
  border-color: var(--tcd-accent);
  color: var(--tcd-accent);
  outline: none;
}
.tcd-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px 24px;
}

/* People */
.tcd-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tcd-row {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--tcd-line);
}
.tcd-avatar {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
}
.tcd-avatar-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--tcd-online);
  border: 2px solid #001d2c;
}
.tcd-info {
  min-width: 0;
  flex: 1;
}
.tcd-name-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.tcd-name {
  font-size: 15px;
}
.tcd-you {
  font-size: 11px;
  font-weight: 700;
  color: var(--tcd-muted);
}
.tcd-role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--tcd-line);
  color: var(--tcd-muted);
}
.tcd-role.owner {
  color: var(--tcd-accent);
  border-color: rgba(237, 174, 73, 0.4);
  background: rgba(237, 174, 73, 0.1);
}
.tcd-role.guest {
  border-style: dashed;
}
.tcd-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--tcd-muted);
}
.tcd-status.live {
  color: var(--tcd-online);
  font-weight: 600;
}
.tcd-diet {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 8px 0 0;
  padding: 0;
}
.tcd-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--tcd-line);
}
.tcd-tag.allergy {
  color: #fda4af;
  border-color: rgba(251, 113, 133, 0.35);
  background: rgba(251, 113, 133, 0.08);
}

/* Invite card */
.tcd-invite {
  margin-top: 20px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--tcd-line);
  background: linear-gradient(160deg, rgba(237, 174, 73, 0.08), rgba(255, 255, 255, 0.02));
}
.tcd-invite-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}
.tcd-invite-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(237, 174, 73, 0.14);
  color: var(--tcd-accent);
  flex-shrink: 0;
}
.tcd-invite-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}
.tcd-invite-sub {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--tcd-muted);
}
.tcd-code-box,
.tcd-link-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--tcd-line);
  background: rgba(0, 0, 0, 0.2);
}
.tcd-link-box {
  margin-top: 8px;
}
.tcd-code-label {
  font-size: 12px;
  color: var(--tcd-muted);
}
.tcd-code {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--tcd-accent);
  background: none;
}
.tcd-link-icon {
  color: var(--tcd-muted);
}
.tcd-link {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  color: var(--tcd-text);
  font-size: 13px;
  text-overflow: ellipsis;
}
.tcd-link:focus {
  outline: none;
}
.tcd-link-box:focus-within {
  border-color: rgba(237, 174, 73, 0.5);
}
.tcd-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid var(--tcd-line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--tcd-text);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.tcd-copy:hover:not(:disabled),
.tcd-copy:focus-visible {
  border-color: var(--tcd-accent);
  color: var(--tcd-accent);
  outline: none;
}
.tcd-copy.primary {
  background: var(--tcd-accent);
  border-color: var(--tcd-accent);
  color: #001d2c;
}
.tcd-copy.primary:hover:not(:disabled),
.tcd-copy.primary:focus-visible {
  background: #f3c26f;
  color: #001d2c;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.3);
}
.tcd-copy.done,
.tcd-copy.primary.done {
  background: rgba(74, 222, 128, 0.14);
  border-color: rgba(74, 222, 128, 0.5);
  color: var(--tcd-online);
}
.tcd-copy:disabled {
  opacity: 0.4;
}
.tcd-error {
  margin: 0;
  font-size: 13px;
  color: #fda4af;
}
.tcd-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  margin: 0;
}

/* Slide in from the right */
.tcd-fade-enter-active,
.tcd-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tcd-fade-enter-active .tcd,
.tcd-fade-leave-active .tcd {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.tcd-fade-enter-from,
.tcd-fade-leave-to {
  opacity: 0;
}
.tcd-fade-enter-from .tcd,
.tcd-fade-leave-to .tcd {
  transform: translateX(100%);
}
@media (max-width: 480px) {
  .tcd-head,
  .tcd-body {
    padding-left: 16px;
    padding-right: 16px;
  }
  .tcd-code-label {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tcd-fade-enter-active,
  .tcd-fade-leave-active,
  .tcd-fade-enter-active .tcd,
  .tcd-fade-leave-active .tcd {
    transition: none;
  }
}
</style>
