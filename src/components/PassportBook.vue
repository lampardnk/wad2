<template>
  <!-- "Your passport": an open passport book. Left page: gold-foil title, countries + cities unlocked and
       who it belongs to. Right page: an inked stamp for every place you've finished a trip to.
       Click a stamp to show only the trips that went there (emits "select"; again to clear). -->
  <section class="pb" aria-labelledby="pb-title">
    <div class="pb-page pb-left">
      <p class="pb-kicker">Chui-se Your Trip</p>
      <h2 id="pb-title" class="pb-foil">Passport</h2>
      <div class="pb-counts">
        <div><b class="pb-foil">{{ countries }}</b><span>countr{{ countries === 1 ? 'y' : 'ies' }} unlocked</span></div>
        <div><b class="pb-foil">{{ stamps.length }}</b><span>cit{{ stamps.length === 1 ? 'y' : 'ies' }} unlocked</span></div>
      </div>
      <div class="pb-holder">
        <span class="pb-photo">
          <img v-if="picture" :src="picture" alt="">
          <template v-else>{{ (holder || '?').charAt(0).toUpperCase() }}</template>
        </span>
        <span class="pb-holder-text">
          <small>Holder</small>
          <strong>{{ holder }}</strong>
        </span>
      </div>
    </div>

    <div class="pb-spine" aria-hidden="true"></div>

    <div class="pb-page pb-right">
      <ul class="pb-stamps" aria-label="Stamps">
        <li v-for="st in stamps" :key="st.place" :data-place="st.place" class="pb-slot"
          :class="{ pending: hide.includes(st.place), landing: landing === st.place }">
          <PassportStamp :place="st.place" :date="st.date" :flag="st.flag" :active="active === st.place"
            @select="(p) => emit('select', active === p ? '' : p)" />
        </li>
      </ul>
      <p v-if="!stamps.length" class="pb-empty">Finish a trip to get your first stamp.</p>
    </div>
  </section>
</template>

<script setup>
import PassportStamp from './PassportStamp.vue'

defineProps({
  stamps: { type: Array, default: () => [] }, // [{ place: 'Kyoto, Japan', date: 'MAR 2025', flag: '🇯🇵' }]
  countries: { type: Number, default: 0 },
  holder: { type: String, default: '' },
  picture: { type: String, default: '' },   // Travel Twin face (optional)
  active: { type: String, default: '' },    // the stamp being used as a filter
  hide: { type: Array, default: () => [] }, // places whose stamp is still on its way (stamping ceremony)
  landing: { type: String, default: '' }    // the stamp that just landed (plays a little thump)
})
const emit = defineEmits(['select'])
</script>

<style scoped>
.pb {
  --paper: #fbf3e2;
  --paper-2: #f6ead2;
  --line: rgba(120, 90, 40, 0.18);
  --gold-1: #b07a1c;
  --gold-2: #f3d27a;
  --gold-3: #9a6512;
  position: relative;
  display: grid;
  grid-template-columns: minmax(230px, 0.75fr) 18px minmax(0, 2fr);
  margin: 6px 0 26px;
  border-radius: 26px;
  background: #24407a; /* the cover, peeking out round the pages */
  padding: 10px;
  box-shadow: 0 4px 0 #182c57, 0 26px 50px -18px rgba(18, 50, 74, 0.45);
}
.pb-page {
  position: relative;
  min-height: 260px;
  padding: 22px 24px;
  /* cream paper + a faint "security" watermark (wavy rings) */
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23b08a4a' stroke-opacity='0.13' stroke-width='0.8'%3E%3Cpath d='M60 10c28 0 50 22 50 50s-22 50-50 50S10 88 10 60 32 10 60 10Z'/%3E%3Cpath d='M60 22c21 0 38 17 38 38S81 98 60 98 22 81 22 60s17-38 38-38Z' stroke-dasharray='2 3'/%3E%3Cpath d='M0 60c10-8 20-8 30 0s20 8 30 0 20-8 30 0 20 8 30 0'/%3E%3Cpath d='M0 40c10-8 20-8 30 0s20 8 30 0 20-8 30 0 20 8 30 0'/%3E%3Cpath d='M0 80c10-8 20-8 30 0s20 8 30 0 20-8 30 0 20 8 30 0'/%3E%3C/g%3E%3C/svg%3E") 0 0 / 120px 120px,
    radial-gradient(120% 90% at 50% 50%, var(--paper), var(--paper-2));
  color: #3b2d17;
}
.pb-left {
  border-radius: 18px 4px 4px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pb-right {
  border-radius: 4px 18px 18px 4px;
}
/* the fold in the middle */
.pb-spine {
  background: linear-gradient(90deg, var(--paper-2), #e2cfa8 35%, #cdb68a 50%, #e2cfa8 65%, var(--paper-2));
}

/* gold foil text, with a slow shine passing over it */
.pb-foil {
  background: linear-gradient(100deg, var(--gold-3) 0%, var(--gold-1) 30%, var(--gold-2) 45%, var(--gold-1) 60%, var(--gold-3) 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: pb-shine 6s ease-in-out infinite;
}
@keyframes pb-shine {
  0%, 100% { background-position: 100% 0; }
  50% { background-position: 0 0; }
}
.pb-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a6a35;
}
h2.pb-foil {
  margin: -6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.pb-counts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pb-counts div {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1.5px dashed var(--line);
}
.pb-counts b {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 900;
  line-height: 1;
}
.pb-counts span {
  font-size: 11.5px;
  font-weight: 700;
  color: #6b5532;
}
.pb-holder {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1.5px solid var(--line);
}
.pb-photo {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #24407a;
  color: #fbf3e2;
  font-weight: 800;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.4);
  transform: rotate(-3deg);
}
.pb-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pb-holder-text {
  display: flex;
  flex-direction: column;
  font-family: 'Courier New', ui-monospace, monospace;
  text-transform: uppercase;
}
.pb-holder-text small {
  font-size: 10px;
  color: #8a6a35;
  letter-spacing: 0.12em;
}
.pb-holder-text strong {
  font-size: 14px;
}

.pb-stamps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 18px;
  margin: 0;
  padding: 4px;
  list-style: none;
}
.pb-slot {
  transition: opacity 0.3s;
}
.pb-slot.pending {
  opacity: 0; /* its stamp is still flying in */
}
.pb-slot.landing {
  animation: pb-land 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pb-land {
  0% { transform: scale(1.3); }
  45% { transform: scale(0.92); }
  100% { transform: scale(1); }
}
.pb-empty {
  margin: 40px 0;
  text-align: center;
  color: #6b5532;
  font-weight: 600;
}

/* Narrow screens: the pages stack (top page, bottom page) */
@media (max-width: 760px) {
  .pb {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 14px auto;
  }
  .pb-left {
    border-radius: 18px 18px 4px 4px;
    min-height: 0;
  }
  .pb-right {
    border-radius: 4px 4px 18px 18px;
  }
  .pb-spine {
    background: linear-gradient(180deg, var(--paper-2), #cdb68a 50%, var(--paper-2));
  }
  .pb-stamps {
    justify-content: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pb-foil, .pb-slot.landing { animation: none; }
}
</style>
