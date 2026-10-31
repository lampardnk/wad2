<template>
  <!-- A travel-journal pop-up: cream dotted paper, spiral rings down the spine, tape on the corners,
       and Pip (the paper-plane guide) in the top corner saying "tip" in a speech bubble.
       It flips open, and folds shut towards the spine when it closes.
       <NotebookModal :open="show" title="Plan a new trip" :tip="tipText" @close="show = false"> ...form... </NotebookModal> -->
  <Teleport to="body">
    <transition name="nb">
      <div v-if="open" class="nb-overlay" @mousedown.self="emit('close')" @keydown.esc.stop="emit('close')">
        <section class="nb" role="dialog" aria-modal="true" :aria-labelledby="titleId">
          <!-- spiral binding -->
          <div class="nb-spine" aria-hidden="true">
            <span v-for="i in 12" :key="i" class="nb-ring"></span>
          </div>
          <span class="nb-tape tl" aria-hidden="true"></span>
          <span class="nb-tape br" aria-hidden="true"></span>

          <div class="nb-page">
            <header class="nb-head">
              <p class="nb-kicker"><slot name="kicker">Traveler's adventure notebook</slot></p>
              <h2 :id="titleId" class="nb-title">{{ title }}</h2>
            </header>

            <!-- Pip + speech bubble -->
            <div class="nb-guide" aria-live="polite">
              <transition name="nb-tip" mode="out-in">
                <p :key="tip" class="nb-bubble">{{ tip }}</p>
              </transition>
              <PlaneGuide :size="78" :mood="mood" />
            </div>

            <button type="button" class="nb-x" aria-label="Close the notebook" @click="emit('close')">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" /></svg>
            </button>

            <slot />
          </div>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import PlaneGuide from './PlaneGuide.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  tip: { type: String, default: '' } // what Pip says (changes as you move between fields)
})
const emit = defineEmits(['close'])
const titleId = 'nb-title-' + Math.random().toString(36).slice(2, 7)

// Pip gives a little hop whenever the tip changes
const mood = ref('wave')
watch(() => props.tip, () => {
  mood.value = 'idle'
  requestAnimationFrame(() => { mood.value = 'talk' })
})
watch(() => props.open, (open) => { if (open) mood.value = 'wave' })
</script>

<style scoped>
.nb-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* the notebook can't be pushed wider than the screen */
  place-items: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(8, 30, 48, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  perspective: 1600px;
}
.nb {
  position: relative;
  display: flex;
  width: min(820px, 100%);
  margin: auto;
  border-radius: 26px;
  background: #24407a; /* the cover, peeking out round the page */
  padding: 10px 10px 10px 0;
  box-shadow: 0 6px 0 #182c57, 0 34px 70px -24px rgba(0, 0, 0, 0.6);
  transform-origin: 0 50%; /* opens and folds at the spine */
}
/* spiral rings down the left edge */
.nb-spine {
  flex: none;
  width: 44px;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  padding: 18px 0;
}
.nb-ring {
  width: 34px;
  height: 12px;
  border-radius: 999px;
  border: 3.5px solid #c9ced6;
  border-left-color: #8a929e;
  background: transparent;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.5), 0 2px 2px rgba(0, 0, 0, 0.35);
  margin-right: -26px; /* the rings loop through the page edge */
  position: relative;
  z-index: 2;
}
.nb-page {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 26px clamp(18px, 4vw, 40px) 26px clamp(26px, 4vw, 46px);
  border-radius: 6px 18px 18px 6px;
  /* cream dot-grid paper with a soft red margin line */
  background:
    linear-gradient(90deg, transparent 18px, rgba(217, 75, 91, 0.35) 18px, rgba(217, 75, 91, 0.35) 20px, transparent 20px),
    radial-gradient(circle, rgba(18, 50, 74, 0.16) 1.2px, transparent 1.4px) 0 0 / 22px 22px,
    linear-gradient(180deg, #fffaf0, #fbf1dd);
  color: #12324a;
}
/* washi tape on two corners */
.nb-tape {
  position: absolute;
  z-index: 3;
  width: 92px;
  height: 26px;
  background: repeating-linear-gradient(45deg, rgba(255, 191, 60, 0.75) 0 8px, rgba(255, 214, 120, 0.75) 8px 16px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}
.nb-tape.tl {
  top: -8px;
  left: 70px;
  transform: rotate(-6deg);
}
.nb-tape.br {
  bottom: -8px;
  right: 40px;
  transform: rotate(5deg);
  background: repeating-linear-gradient(45deg, rgba(25, 179, 196, 0.6) 0 8px, rgba(143, 203, 255, 0.6) 8px 16px);
}
.nb-head {
  padding-right: 230px; /* room for Pip */
}
.nb-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #d94b5b;
}
.nb-title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3.6vw, 2.2rem);
  font-weight: 900;
  letter-spacing: -0.01em;
}
/* Pip in the top-right corner with a speech bubble to its left */
.nb-guide {
  position: absolute;
  top: 14px;
  right: 58px;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  pointer-events: none;
}
.nb-bubble {
  position: relative;
  max-width: 170px;
  margin: 8px 0 0;
  padding: 8px 12px;
  border-radius: 16px;
  background: #fff;
  border: 2px solid #12324a;
  box-shadow: 0 3px 0 #12324a;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.35;
}
.nb-bubble::after {
  content: '';
  position: absolute;
  right: -9px;
  top: 16px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-top: 2px solid #12324a;
  border-right: 2px solid #12324a;
  transform: rotate(45deg);
}
.nb-x {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 2px solid #12324a;
  border-radius: 12px;
  background: #fff;
  color: #12324a;
  box-shadow: 0 3px 0 #12324a;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nb-x:hover {
  transform: rotate(8deg);
}
.nb-x:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #12324a;
}
.nb-x:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}

/* tip changes: the old bubble shrinks away, the new one pops */
.nb-tip-enter-active {
  transition: opacity 0.2s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nb-tip-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.nb-tip-enter-from,
.nb-tip-leave-to {
  opacity: 0;
  transform: scale(0.85) translateX(8px);
}

/* Opening: the book swings open from the spine. Closing: it folds shut towards the spine and fades. */
.nb-enter-active,
.nb-leave-active {
  transition: background 0.3s, backdrop-filter 0.3s;
}
.nb-enter-active .nb {
  animation: nb-open 0.55s cubic-bezier(0.25, 1.2, 0.4, 1);
}
.nb-leave-active .nb {
  animation: nb-fold 0.45s cubic-bezier(0.6, 0, 0.8, 0.4) forwards;
}
.nb-enter-from,
.nb-leave-to {
  background: rgba(8, 30, 48, 0);
}
@keyframes nb-open {
  0% { opacity: 0; transform: rotateY(-75deg) scale(0.9); }
  60% { opacity: 1; }
  100% { transform: rotateY(0) scale(1); }
}
@keyframes nb-fold {
  0% { transform: rotateY(0) scale(1); opacity: 1; }
  100% { transform: rotateY(-88deg) scale(0.9); opacity: 0; }
}

@media (max-width: 720px) {
  .nb-overlay {
    padding: 8px;
    place-items: start center;
  }
  .nb-spine {
    width: 26px;
  }
  .nb-ring {
    width: 22px;
    height: 9px;
    border-width: 3px;
    margin-right: -16px;
  }
  .nb-head {
    padding-right: 48px;
  }
  /* Pip sits under the title on phones */
  .nb-guide {
    position: static;
    flex-direction: row-reverse;
    justify-content: flex-end;
    margin: 6px 0 4px -6px;
  }
  .nb-bubble {
    max-width: none;
    flex: 1;
  }
  .nb-bubble::after {
    right: auto;
    left: -9px;
    transform: rotate(-135deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nb-enter-active .nb,
  .nb-leave-active .nb {
    animation: none;
  }
}
</style>
