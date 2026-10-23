<template>
  <!-- Shared look for Log in and Sign up: a top bar, the form on the left, the aurora photo on the right -->
  <div class="as">
    <header class="as-bar">
      <!-- Back to the landing page: the arrow and hover state show it can be clicked -->
      <router-link to="/" class="as-logo" title="Back to the home page" aria-label="Back to the Chui-se Your Trip home page">
        <svg class="as-back" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5" />
          <path d="M27 13 L22 22 L13 27 L18 18 Z" fill="currentColor" />
        </svg>
        <span>Chui-se Your Trip</span>
      </router-link>
      <router-link :to="switchTo" class="as-switch">{{ switchLabel }}</router-link>
    </header>

    <div class="as-split">
      <main class="as-side">
        <div class="as-inner">
          <h1 class="as-title">{{ title }}</h1>
          <p class="as-sub">{{ subtitle }}</p>
          <slot />
        </div>
      </main>
      <div class="as-photo" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  switchTo: { type: [String, Object], required: true }, // the other page (Log in <-> Sign up)
  switchLabel: { type: String, required: true }
})

// The rounded heading font, only loaded on these pages
onMounted(() => {
  if (document.getElementById('as-fonts')) return
  const link = document.createElement('link')
  link.id = 'as-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap'
  document.head.appendChild(link)
})
</script>

<style scoped>
.as {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  color: #e6edf3;
}
.as-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.as-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #f3e3c8;
  text-decoration: none;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 15px;
}
.as-logo {
  transition: background 0.15s, border-color 0.15s;
}
.as-logo svg {
  width: 26px;
  height: 26px;
}
.as-logo .as-back {
  width: 18px;
  height: 18px;
  margin-right: -2px;
  opacity: 0.75;
  transition: transform 0.15s, opacity 0.15s;
}
.as-logo:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(237, 174, 73, 0.5);
}
.as-logo:hover .as-back {
  opacity: 1;
  transform: translateX(-3px);
}
.as-switch {
  padding: 8px 20px;
  border: 1.5px solid rgba(255, 255, 255, 0.75);
  border-radius: 10px;
  color: #e6edf3;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.as-switch:hover {
  background: #fff;
  color: #0d1117;
}
.as-split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 0;
}
.as-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
.as-inner {
  width: min(420px, 100%);
}
.as-title {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(30px, 3.4vw, 46px);
  line-height: 1.15;
  text-align: center;
  color: #f3e3c8;
}
.as-sub {
  margin: 0 0 32px;
  text-align: center;
  font-size: 17px;
  color: #c9d1d9;
}
.as-photo {
  /* anchored to the bottom so the campervan and the road always stay in the picture */
  background: #0d1117 url('../assets/auth-aurora.jpg') center bottom / cover no-repeat;
  min-height: 300px;
}
.as-logo:focus-visible,
.as-switch:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}

/* Phones and narrow windows: the photo becomes a short banner above the form */
@media (max-width: 860px) {
  .as-split {
    grid-template-columns: 1fr;
  }
  .as-photo {
    order: -1;
    min-height: 0;
    height: 210px;
    background-position: center 82%; /* the van under the aurora */
  }
  .as-side {
    padding: 28px 18px 40px;
  }
  .as-sub {
    margin-bottom: 22px;
  }
  .as-logo span {
    font-size: 13px;
  }
}
</style>

<!-- Form pieces used inside the slot by LoginView and SignupView -->
<style>
.as-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.as-input {
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid #30363d;
  background: #1c2128;
  color: #e6edf3;
  font-size: 16px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.as-input::placeholder {
  color: #8b949e;
}
.as-input:focus {
  outline: none;
  border-color: #2fe0a1;
  box-shadow: 0 0 0 3px rgba(47, 224, 161, 0.18);
}
.as-btn {
  height: 52px;
  margin-top: 4px;
  border: 0;
  border-radius: 10px;
  background: #1f8f5f;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  box-shadow: 0 8px 22px rgba(31, 143, 95, 0.3);
  transition: background 0.15s, transform 0.15s;
}
.as-btn:hover:not(:disabled) {
  background: #23a56d;
  transform: translateY(-1px);
}
.as-btn:disabled {
  opacity: 0.6;
}
.as-btn:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.as-error {
  margin: 0;
  font-size: 14px;
  color: #ff8a8d;
}
.as-success {
  margin: 0 0 4px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(47, 224, 161, 0.12);
  color: #2fe0a1;
  font-size: 14px;
  text-align: center;
}
.as-or {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 22px 0 14px;
  color: #8b949e;
  font-size: 13px;
}
.as-or::before,
.as-or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.as-foot {
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: #c9d1d9;
}
.as-foot a {
  color: #2fe0a1;
  font-weight: 700;
}
</style>
