<template>
  <!-- Profile button in the nav bar + its menu (Friends, Settings, Log out) -->
  <div ref="rootEl" class="upm">
    <button ref="btnEl" type="button" class="upm-avatar" :aria-expanded="open" aria-haspopup="menu" aria-controls="upm-menu"
      :aria-label="'Account menu for ' + user.name" :title="user.name" data-testid="nav-user" @click="toggle">
      <img v-if="avatar.picture" :src="avatar.picture" alt="" class="upm-twin">
      <template v-else>{{ initial }}</template>
      <span v-if="friends.requests" class="upm-avatar-dot" aria-hidden="true"></span>
    </button>

    <transition name="upm-pop">
      <div v-if="open" id="upm-menu" ref="menuEl" class="upm-menu" role="menu" :aria-label="'Account: ' + user.name" @keydown="onMenuKey">
        <!-- Who's signed in -->
        <header class="upm-head">
          <span class="upm-avatar big" aria-hidden="true"><img v-if="avatar.picture" :src="avatar.picture" alt="" class="upm-twin"><template v-else>{{ initial }}</template></span>
          <div class="upm-who">
            <strong class="upm-name">{{ user.name }}</strong>
            <span class="upm-handle">@{{ user.username }}<template v-if="user.email"> · {{ user.email }}</template></span>
            <span class="upm-status online">
              <span class="upm-status-dot" aria-hidden="true"></span>Online
            </span>
          </div>
        </header>

        <!-- Friends -->
        <div class="upm-section" role="group" aria-label="Friends">
          <button type="button" class="upm-item" role="menuitem" @click="openFriends">
            <AppIcon name="users" />
            <span class="upm-text">Friends</span>
            <span v-if="friends.online" class="upm-online">{{ friends.online }} online</span>
            <span v-if="friends.requests" class="upm-badge" :aria-label="friends.requests + ' friend requests'">{{ friends.requests }}</span>
          </button>
        </div>

        <!-- Preferences -->
        <div class="upm-section" role="group" aria-label="Preferences">
          <p class="upm-label">Preferences</p>
          <router-link to="/avatar" class="upm-item" role="menuitem" @click="open = false">
            <AppIcon name="smile" />
            <span class="upm-text">Travel twin<small class="upm-hint">Your 3D avatar and gear</small></span>
            <AppIcon name="chevron" :size="15" class="upm-chev" />
          </router-link>
          <!-- (trip pacing lives in Settings too, so it's not a separate item) -->
          <router-link to="/settings" class="upm-item" role="menuitem" data-testid="settings-link" @click="open = false">
            <AppIcon name="settings" />
            <span class="upm-text">Settings<small class="upm-hint">Food needs, currency, trip pacing</small></span>
            <AppIcon name="chevron" :size="15" class="upm-chev" />
          </router-link>
        </div>

        <footer class="upm-foot">
          <button type="button" class="upm-item danger" role="menuitem" data-testid="logout-btn" @click="logOut">
            <AppIcon name="log-out" />
            <span class="upm-text">Log out</span>
          </button>
        </footer>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth, logout } from '../auth.js'
import { friends, pingFriends } from '../friends.js'
import AppIcon from './AppIcon.vue'
import { avatar, loadAvatar } from '../avatarStore.js'

const router = useRouter()
const route = useRoute()

const open = ref(false)
const rootEl = ref(null)
const btnEl = ref(null)
const menuEl = ref(null)

const user = computed(() => auth.user || { name: '?', username: '' })
const initial = computed(() => (user.value.name || '?').charAt(0).toUpperCase())



async function toggle() {
  open.value = !open.value
  if (!open.value) return
  pingFriends() // fresh request / online counts
  await nextTick()
  focusItem(0)
}


function openFriends() {
  open.value = false
  friends.open = true
}

function logOut() {
  open.value = false
  logout()
  router.push('/login')
}

// ----- Keyboard: arrows move between items, Esc closes and goes back to the button -----
function items() {
  return menuEl.value ? Array.from(menuEl.value.querySelectorAll('[role="menuitem"]:not([disabled])')) : []
}
function focusItem(i) {
  const list = items()
  if (list.length) list[(i + list.length) % list.length].focus()
}
function onMenuKey(e) {
  const list = items()
  const i = list.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
  else if (e.key === 'End') { e.preventDefault(); focusItem(-1) }
  else if (e.key === 'Escape') { open.value = false; btnEl.value.focus() }
  else if (e.key === 'Tab') open.value = false
}

// Click anywhere else closes it
function onDocClick(e) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target)) open.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  loadAvatar() // the twin's picture for the button
})
watch(() => auth.user && auth.user.id, () => loadAvatar()) // someone else logged in
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
// Changing page closes it
watch(() => route.fullPath, () => { open.value = false })
</script>

<style scoped>
.upm {
  position: relative;
}
.upm *,
.upm *::before,
.upm *::after {
  box-sizing: border-box;
}
.upm {
  --upm-bg: rgba(0, 29, 44, 0.9);
  --upm-line: rgba(255, 255, 255, 0.08);
  --upm-text: #f6f1e7;
  --upm-muted: #9fb3c1;
  --upm-accent: #edae49;
  --upm-online: #4ade80;
  --upm-danger: #fb7185;
}

/* Avatar button */
.upm-avatar {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(135deg, #00798c, #edae49);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, transform 0.15s;
}
.upm-twin {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.upm-avatar:hover {
  border-color: var(--upm-accent);
  transform: scale(1.05);
}
.upm-avatar:focus-visible {
  outline: 3px solid var(--upm-accent);
  outline-offset: 2px;
}
.upm-avatar.big {
  width: 44px;
  height: 44px;
  font-size: 17px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px var(--upm-line), 0 0 0 4px rgba(237, 174, 73, 0.12);
}
.upm-avatar-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--upm-accent);
  border: 2px solid #002b40;
}

/* Menu */
.upm-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 1100;
  width: min(320px, calc(100vw - 24px));
  padding: 8px;
  border-radius: 18px;
  border: 1px solid var(--upm-line);
  background: var(--upm-bg);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  color: var(--upm-text);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
.upm-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 14px;
  border-bottom: 1px solid var(--upm-line);
}
.upm-who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.upm-name {
  font-size: 15px;
  line-height: 1.2;
}
.upm-handle {
  font-size: 12.5px;
  color: var(--upm-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upm-status {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  border: 1px solid var(--upm-line);
  color: var(--upm-muted);
}
.upm-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.upm-status.online {
  color: var(--upm-online);
  background: rgba(74, 222, 128, 0.1);
}

.upm-section {
  padding: 6px 0;
  border-bottom: 1px solid var(--upm-line);
}
.upm-label {
  margin: 4px 10px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--upm-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upm-item {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border: 0;
  border-radius: 11px;
  background: none;
  color: var(--upm-text);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}
.upm-item > .app-icon {
  color: var(--upm-muted);
  transition: color 0.12s;
}
a.upm-item:hover,
button.upm-item:hover,
.upm-item:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  color: var(--upm-text);
  outline: none;
}
a.upm-item:hover > .app-icon,
button.upm-item:hover > .app-icon,
.upm-item:focus-visible > .app-icon {
  color: var(--upm-accent);
}
.upm-item:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(237, 174, 73, 0.6);
}
.upm-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.upm-hint {
  font-size: 12px;
  font-weight: 500;
  color: var(--upm-muted);
}
.upm-chev {
  color: var(--upm-muted);
}
.upm-badge {
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  background: var(--upm-accent);
  color: #001d2c;
}
.upm-badge.muted {
  background: rgba(255, 255, 255, 0.08);
  color: var(--upm-text);
}
.upm-online {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--upm-online);
}
.upm-online::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}


/* Log out */
.upm-foot {
  padding-top: 6px;
}
.upm-item.danger,
.upm-item.danger > .app-icon {
  color: var(--upm-danger);
}
button.upm-item.danger:hover,
.upm-item.danger:focus-visible {
  background: rgba(251, 113, 133, 0.1);
  color: var(--upm-danger);
}
button.upm-item.danger:hover > .app-icon {
  color: var(--upm-danger);
}
.upm-item.danger:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(251, 113, 133, 0.6);
}


/* Open / close */
/* Opening: the menu unrolls downwards from the profile button (with a little spring),
   then its rows drop in one after another. Closing: it rolls back up, quickly. */
.upm-menu {
  transform-origin: calc(100% - 20px) 0;
}
.upm-pop-enter-active {
  animation: upm-unroll 0.42s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.upm-pop-leave-active {
  animation: upm-unroll 0.18s ease-in reverse;
}
@keyframes upm-unroll {
  0% { opacity: 0; transform: translateY(-8px) scale(0.9, 0.4); clip-path: inset(0 0 100% 0 round 18px); }
  60% { opacity: 1; clip-path: inset(0 0 0 0 round 18px); }
  100% { opacity: 1; transform: none; clip-path: inset(0 0 0 0 round 18px); }
}
/* the rows cascade in */
.upm-pop-enter-active .upm-head,
.upm-pop-enter-active .upm-item,
.upm-pop-enter-active .upm-label {
  animation: upm-drop 0.38s cubic-bezier(0.34, 1.5, 0.64, 1) both;
}
.upm-pop-enter-active .upm-head { animation-delay: 0.05s; }
.upm-pop-enter-active .upm-section:nth-of-type(1) .upm-item { animation-delay: 0.1s; }
.upm-pop-enter-active .upm-section:nth-of-type(2) .upm-label { animation-delay: 0.13s; }
.upm-pop-enter-active .upm-section:nth-of-type(2) .upm-item:nth-of-type(1) { animation-delay: 0.16s; }
.upm-pop-enter-active .upm-section:nth-of-type(2) .upm-item:nth-of-type(2) { animation-delay: 0.2s; }
.upm-pop-enter-active .upm-foot .upm-item { animation-delay: 0.28s; }
@keyframes upm-drop {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .upm-pop-enter-active,
  .upm-pop-leave-active,
  .upm-pop-enter-active .upm-head,
  .upm-pop-enter-active .upm-item,
  .upm-pop-enter-active .upm-label {
    animation: none;
  }
  .upm-avatar {
    transition: none;
  }
}
</style>
