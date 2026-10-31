<template>
  <!-- "New gear unlocked!": pops up once when your trips have earned something new (a tier or a souvenir).
       Your twin jumps and spins wearing your current look; "Try it on" opens the studio. -->
  <Teleport to="body">
    <transition name="tc-fade">
      <div v-if="open" class="tc-overlay" @click.self="later" @keydown.esc="later">
        <section ref="panel" class="tc" role="dialog" aria-modal="true" aria-labelledby="tc-title" tabindex="-1">
          <div class="tc-confetti" aria-hidden="true">
            <span v-for="i in 28" :key="i" :style="confetti(i)"></span>
          </div>
          <div class="tc-stage">
            <AvatarStage ref="stage" :look="avatar.look" :countries="avatar.progress.countries.length" @ready="cheer" />
          </div>
          <div class="tc-body">
            <p class="tc-kicker">{{ headline }}</p>
            <h2 id="tc-title" class="tc-title">New gear unlocked!</h2>
            <p class="tc-sub">{{ avatar.progress.xp }} XP from {{ avatar.progress.trips }} finished trip{{ avatar.progress.trips === 1 ? '' : 's' }}. Here's what you earned:</p>
            <ul class="tc-items">
              <li v-for="it in items.slice(0, 8)" :key="it.id + it.name">{{ it.name }}</li>
              <li v-if="items.length > 8" class="more">+{{ items.length - 8 }} more</li>
            </ul>
            <div class="tc-btns">
              <button type="button" class="tc-later" @click="later">Later</button>
              <button ref="cta" type="button" class="tc-go" @click="tryOn">Try it on</button>
            </div>
          </div>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../auth.js'
import { avatar, loadAvatar, loadProgress, newUnlocks, markSeen } from '../avatarStore.js'
import AvatarStage from './AvatarStage.vue'

const router = useRouter()
const stage = ref(null)
const panel = ref(null)
const cta = ref(null)
const open = ref(false)
const items = ref([])
let checkedFor = null

const headline = computed(() => avatar.progress.tierName + ' · Tier ' + avatar.progress.tier)

// A little while after the app opens (once per signed-in user): anything new?
async function check() {
  if (!auth.user || checkedFor === auth.user.id) return
  checkedFor = auth.user.id
  await loadAvatar()
  await loadProgress()
  const list = newUnlocks()
  if (!list.length || location.pathname === '/avatar') return
  items.value = list
  open.value = true
  nextTick(() => cta.value && cta.value.focus())
}
onMounted(() => setTimeout(check, 2500))
watch(() => auth.user && auth.user.id, (id) => { if (id) setTimeout(check, 2500) })

function cheer() {
  setTimeout(() => stage.value && stage.value.play('celebrate'), 250)
}
function later() {
  open.value = false
  markSeen()
}
function tryOn() {
  open.value = false
  markSeen()
  router.push('/avatar')
}
// Confetti pieces: spread across the top, different colours, delays and spins
function confetti(i) {
  const colors = ['#edae49', '#d1495b', '#00798c', '#f6f1e7', '#30638e']
  return {
    left: ((i * 37) % 100) + '%',
    background: colors[i % colors.length],
    animationDelay: ((i * 0.13) % 1.4).toFixed(2) + 's',
    animationDuration: (2.2 + (i % 5) * 0.35).toFixed(2) + 's',
    transform: 'rotate(' + i * 29 + 'deg)'
  }
}
</script>

<style scoped>
.tc-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 12, 20, 0.6);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.tc {
  position: relative;
  width: min(440px, 100%);
  border-radius: 24px;
  overflow: hidden;
  background: #001d2c;
  color: #f6f1e7;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(237, 174, 73, 0.18);
  outline: none;
  animation: tc-in 0.45s cubic-bezier(0.34, 1.5, 0.64, 1);
}
@keyframes tc-in {
  from { transform: scale(0.85) translateY(20px); opacity: 0; }
}
.tc-confetti {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}
.tc-confetti span {
  position: absolute;
  top: -12px;
  width: 7px;
  height: 12px;
  border-radius: 2px;
  animation-name: tc-fall;
  animation-timing-function: linear;
  animation-iteration-count: 2;
  animation-fill-mode: both;
}
@keyframes tc-fall {
  to { top: 105%; transform: rotate(720deg) translateX(30px); }
}
.tc-stage {
  height: 260px;
}
.tc-body {
  padding: 18px 22px 20px;
  text-align: center;
}
.tc-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #edae49;
}
.tc-title {
  margin: 4px 0 6px;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
}
.tc-sub {
  margin: 0;
  font-size: 13.5px;
  color: #9fb3c1;
}
.tc-items {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.tc-items li {
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(237, 174, 73, 0.14);
  border: 1px solid rgba(237, 174, 73, 0.4);
  color: #f3c16f;
  font-size: 12.5px;
  font-weight: 700;
}
.tc-items li.more {
  background: transparent;
  color: #9fb3c1;
}
.tc-btns {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}
.tc-later,
.tc-go {
  padding: 10px 20px;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}
.tc-later {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: #f6f1e7;
}
.tc-go {
  border: 0;
  background: #edae49;
  color: #001d2c;
  box-shadow: 0 4px 0 #b07a22;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.tc-go:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #b07a22;
}
.tc button:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.75);
  outline-offset: 2px;
}
.tc-fade-enter-active,
.tc-fade-leave-active {
  transition: opacity 0.2s;
}
.tc-fade-enter-from,
.tc-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .tc { animation: none; }
  .tc-confetti { display: none; }
}
</style>
