<template>
  <!-- App-wide messages: "can't reach the server" bar, and error / success toasts with an optional Try again -->
  <div class="at-wrap" aria-live="polite">
    <transition name="at-slide">
      <div v-if="toast.offline" class="at-bar" role="status">
        <AppIcon name="alert" :size="16" />
        <span>Can't reach the server right now. Changes you make may not save until it's back.</span>
        <button type="button" class="at-btn" @click="retryNow">Retry now</button>
      </div>
    </transition>
    <transition name="at-slide">
      <div v-if="toast.text" class="at-toast" :class="toast.kind" :role="toast.kind === 'error' ? 'alert' : 'status'">
        <AppIcon :name="toast.kind === 'error' ? 'alert' : 'check-circle'" :size="18" />
        <span class="at-text">{{ toast.text }}</span>
        <button v-if="toast.retry" type="button" class="at-btn" @click="runRetry">Try again</button>
        <button type="button" class="at-x" aria-label="Dismiss" @click="dismiss">
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import axios from 'axios'
import { toast, dismiss } from '../notify.js'
import AppIcon from './AppIcon.vue'

function runRetry() {
  const again = toast.retry
  dismiss()
  if (again) again()
}
// A tiny request: if it works, the bar goes away (main.js clears "offline" on any success)
function retryNow() {
  axios.get('/api/health').catch(() => {})
}
</script>

<style scoped>
.at-wrap {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 2000;
  transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.at-bar,
.at-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 12px 16px;
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.28);
  font-size: 14px;
  line-height: 1.35;
}
.at-bar {
  background: #fbefd9;
  color: #6b4a0e;
  border: 1px solid #edae49;
}
.at-toast {
  background: #003d5b;
  color: #fff;
}
.at-toast.error .app-icon:first-child {
  color: #f6c4cb;
}
.at-toast.ok .app-icon:first-child {
  color: #4ade80;
}
.at-text {
  flex: 1;
}
.at-btn {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: #edae49;
  color: #002a40;
  font-weight: 700;
  font-size: 13px;
}
.at-bar .at-btn {
  background: #003d5b;
  color: #fff;
}
.at-x {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.at-x:hover,
.at-x:focus-visible {
  background: rgba(255, 255, 255, 0.14);
  outline: none;
}
.at-btn:focus-visible {
  outline: 3px solid #f3c26f;
  outline-offset: 2px;
}
.at-slide-enter-active,
.at-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.at-slide-enter-from,
.at-slide-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
@media (prefers-reduced-motion: reduce) {
  .at-slide-enter-active,
  .at-slide-leave-active {
    transition: none;
  }
}
</style>
