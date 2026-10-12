<template>
  <div>
    <!-- Error: nothing in the wishlist yet -->
    <div v-if="!places.length" class="pv-error" role="alert" data-testid="vote-error">
      <div class="pv-error-icon">!</div>
      <div class="flex-grow-1">
        <strong>Your wishlist is empty.</strong>
        <div>Add at least one place to the wishlist before the group can vote.</div>
      </div>
      <button type="button" class="btn btn-danger pv-pill" @click="$emit('go-wishlist')">← Go to wishlist</button>
    </div>

    <template v-else>
    <!-- How it works -->
    <div class="pv-intro">
      <div>
        <strong>Vote on your wishlist together.</strong>
        Tap a traveller's name to record their vote. A place becomes a <strong>group pick</strong>
        when {{ needed }} of {{ travellers.length }} want to go.
      </div>
      <span class="pv-summary" data-testid="vote-summary">✓ {{ picks }} group pick{{ picks === 1 ? '' : 's' }}</span>
    </div>

    <div class="d-flex justify-content-end mb-3">
      <label class="small text-muted d-flex align-items-center gap-2">
        Sort by
        <select v-model="sortBy" class="form-select form-select-sm w-auto">
          <option value="votes">Most votes</option>
          <option value="name">Name</option>
        </select>
      </label>
    </div>

    <transition-group name="pv" tag="div" class="pv-list" data-testid="vote-list">
      <article v-for="w in sorted" :key="w.id" class="pv-card" :class="{ picked: isPick(w) }">
        <span class="pv-icon" :style="{ background: placeStyle(w.type).color }" aria-hidden="true">{{ placeStyle(w.type).icon }}</span>

        <div class="pv-body">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <h4 class="pv-name">{{ w.name }}</h4>
            <span v-if="isPick(w)" class="pv-badge">✓ Group pick</span>
          </div>
          <p v-if="whereOf(w)" class="pv-where">📍 {{ whereOf(w) }}</p>

          <!-- Progress towards a group pick -->
          <div class="pv-progress" role="progressbar" :aria-valuenow="w.votes.length" aria-valuemin="0" :aria-valuemax="travellers.length"
            :aria-label="w.votes.length + ' of ' + travellers.length + ' votes'">
            <div class="pv-progress-fill" :style="{ width: (w.votes.length / Math.max(travellers.length, 1) * 100) + '%' }"></div>
          </div>

          <!-- One button per traveller -->
          <div class="pv-voters" role="group" :aria-label="'Votes for ' + w.name">
            <button v-for="person in travellers" :key="person" type="button" class="pv-voter" :class="{ yes: w.votes.includes(person) }"
              :aria-pressed="w.votes.includes(person)" @click="toggle(w, person)" data-testid="vote-btn">
              <span aria-hidden="true">{{ w.votes.includes(person) ? '👍' : '＋' }}</span> {{ person }}
            </button>
          </div>
        </div>

        <span class="pv-count" :aria-hidden="true">{{ w.votes.length }}/{{ travellers.length }}</span>
      </article>
    </transition-group>
    </template>
  </div>
</template>

<script>
import { trip } from '../itineraryStore.js'
import { placeStyle } from '../placeStyle.js'

export default {
  props: {
    travellers: { type: Array, default: () => [] }
  },
  emits: ['go-wishlist'],

  data() {
    return { sortBy: 'votes' }
  },

  computed: {
    places() {
      return trip.wishlist
    },
    // More than half the group (2 of 3, 3 of 4, 3 of 5...)
    needed() {
      return Math.floor(this.travellers.length / 2) + 1
    },
    picks() {
      let count = 0
      for (const w of this.places) {
        if (this.isPick(w)) count++
      }
      return count
    },
    sorted() {
      const list = this.places.slice()
      if (this.sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
      else list.sort((a, b) => (b.votes || []).length - (a.votes || []).length)
      return list
    }
  },

  methods: {
    placeStyle,
    // e.g. "Kyoto · 13 Okazaki Park"
    whereOf(w) {
      const parts = []
      if (w.city) parts.push(w.city.split(', ')[0])
      const street = w.address ? w.address.split(',')[0].trim() : ''
      if (street && street !== w.name && !parts.includes(street)) parts.push(street)
      return parts.join(' · ')
    },
    isPick(w) {
      return this.travellers.length > 0 && (w.votes || []).length >= this.needed
    },
    toggle(w, person) {
      if (!w.votes) w.votes = []
      if (w.votes.includes(person)) w.votes = w.votes.filter((p) => p !== person)
      else w.votes.push(person)
    }
  }
}
</script>

<style scoped>
.pv-intro {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #dfe5e3;
  border-radius: 20px;
  padding: 14px 18px;
  margin-bottom: 12px;
}
.pv-summary {
  background: #e6f5ef;
  color: #064a38;
  font-weight: 700;
  border-radius: 999px;
  padding: 6px 14px;
  white-space: nowrap;
}
.pv-error {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  background: #fdecec;
  border: 1px solid #f3b7b7;
  color: #8a1f1f;
  border-radius: 20px;
  padding: 18px 20px;
  animation: pv-shake 0.4s ease;
}
.pv-error-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #d93636;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
@keyframes pv-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
.pv-pill {
  border-radius: 999px;
  padding: 8px 20px;
  font-weight: 600;
}
.pv-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pv-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1.5px solid #e3e9e7;
  border-radius: 22px;
  padding: 14px 18px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pv-card.picked {
  border-color: #8fd9b6;
  box-shadow: 0 6px 18px rgba(11, 127, 95, 0.1);
}
.pv-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
}
.pv-body {
  flex: 1;
  min-width: 0;
}
.pv-name {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
}
.pv-badge {
  font-size: 12px;
  font-weight: 700;
  background: #0b7f5f;
  color: #fff;
  border-radius: 999px;
  padding: 3px 10px;
}
.pv-where {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--app-muted, #5f6f6b);
}
.pv-progress {
  height: 6px;
  background: #eef2f1;
  border-radius: 999px;
  margin: 10px 0;
  overflow: hidden;
}
.pv-progress-fill {
  height: 100%;
  background: #3ee8a5;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.pv-voters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pv-voter {
  border: 1.5px solid #dfe5e3;
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.pv-voter.yes {
  background: #e6f5ef;
  border-color: #8fd9b6;
  color: #064a38;
}
.pv-voter:focus-visible {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 2px;
}
.pv-count {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.4rem;
  color: var(--app-muted, #5f6f6b);
}
.pv-move,
.pv-enter-active,
.pv-leave-active {
  transition: all 0.3s ease;
}
.pv-enter-from,
.pv-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (max-width: 576px) {
  .pv-icon { width: 48px; height: 48px; font-size: 26px; }
  .pv-count { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .pv-move, .pv-enter-active, .pv-leave-active, .pv-progress-fill { transition: none; }
}
</style>
