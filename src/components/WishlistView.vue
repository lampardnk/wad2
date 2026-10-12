<template>
  <div>
    <!-- Search + filter -->
    <div class="wl-toolbar">
      <div class="wl-search">
        <span aria-hidden="true" class="wl-search-icon">🔍</span>
        <label for="wl-search" class="visually-hidden">Search places</label>
        <input id="wl-search" v-model="search" type="search" placeholder="Search places" data-testid="wl-search">
        <button type="button" class="wl-filter-btn" :class="{ on: showFilters || filter !== 'all' }"
          :aria-expanded="showFilters" aria-controls="wl-filters" title="Filter" @click="showFilters = !showFilters">
          <span aria-hidden="true">⚙︎</span><span class="visually-hidden">Filters</span>
        </button>
      </div>
      <transition name="fade">
        <div v-if="showFilters" id="wl-filters" class="wl-filters" role="group" aria-label="Show">
          <button v-for="f in filterOptions" :key="f.value" type="button" class="wl-chip" :class="{ active: filter === f.value }"
            :aria-pressed="filter === f.value" @click="filter = f.value">{{ f.label }}</button>
        </div>
      </transition>
    </div>

    <!-- ===== Your wishlist ===== -->
    <h3 class="wl-heading">Your wishlist <span class="wl-count">{{ wishlist.length }}</span></h3>

    <transition-group v-if="shownWishlist.length" name="card" tag="div" class="wl-grid" data-testid="wishlist">
      <article v-for="w in shownWishlist" :key="w.id" class="wl-card" :style="{ background: placeStyle(w.type).color }">
        <div class="wl-card-top">
          <h4 class="wl-name" :title="w.name">{{ w.name }}</h4>
          <span v-if="w.votes && w.votes.length" class="wl-pill" :title="w.votes.join(', ') + ' want to go'">👍 {{ w.votes.length }}</span>
        </div>
        <button type="button" class="wl-heart filled" :aria-label="'Remove ' + w.name + ' from wishlist'" title="Remove" @click="remove(w)">♥</button>
        <span class="wl-art" aria-hidden="true">{{ placeStyle(w.type).icon }}</span>
        <div class="wl-bar">
          <span class="wl-bar-text">{{ placeStyle(w.type).label }}<span v-if="!w.outdoor"> · Indoor</span></span>
          <button type="button" class="wl-round" :aria-label="'Edit ' + w.name" title="Edit" @click="startEdit(w)">✎</button>
        </div>
      </article>
    </transition-group>
    <p v-else class="wl-empty">
      {{ wishlist.length ? 'No saved places match your search.' : 'No places yet. Tap ♡ on a popular place below, or add your own.' }}
    </p>

    <!-- Edit panel -->
    <transition name="fade">
      <form v-if="editId" class="wl-panel" @submit.prevent="saveEdit">
        <strong class="d-block mb-2">Edit place</strong>
        <div class="row g-2">
          <div class="col-md-5">
            <label for="wl-edit-name" class="form-label small">Name</label>
            <input id="wl-edit-name" v-model="editForm.name" class="form-control wl-input" maxlength="120">
          </div>
          <div class="col-md-5">
            <label for="wl-edit-address" class="form-label small">Address <span class="text-muted">(optional, turns on crowd info)</span></label>
            <input id="wl-edit-address" v-model="editForm.address" class="form-control wl-input" maxlength="200">
          </div>
          <div class="col-md-2 d-flex align-items-end gap-1">
            <button type="submit" class="btn btn-primary wl-pill-btn flex-fill">Save</button>
            <button type="button" class="btn btn-outline-secondary wl-pill-btn flex-fill" @click="editId = null">Cancel</button>
          </div>
        </div>
      </form>
    </transition>

    <!-- Add your own -->
    <form class="wl-add" @submit.prevent="addTyped">
      <div class="wl-add-name position-relative">
        <label for="wish-name" class="visually-hidden">Place name</label>
        <input id="wish-name" v-model="form.name" class="form-control wl-input" maxlength="120" autocomplete="off"
          :placeholder="'Add a place in ' + (activeDest ? activeDest.split(', ')[0] : 'your destination')"
          role="combobox" aria-autocomplete="list" aria-controls="wish-suggest"
          :aria-expanded="showSuggest && typedMatches.length > 0"
          :aria-activedescendant="active >= 0 ? 'wish-opt-' + active : null"
          @focus="showSuggest = true" @blur="showSuggest = false" @input="active = -1" @keydown="onKeydown"
          data-testid="wish-name">
        <ul v-if="showSuggest && typedMatches.length" id="wish-suggest" class="wl-suggest" role="listbox">
          <li v-for="(p, k) in typedMatches" :id="'wish-opt-' + k" :key="p.name" role="option"
            :class="{ active: k === active }" :aria-selected="k === active"
            @mousedown.prevent="addPopular(p)" @mouseenter="active = k">
            <span aria-hidden="true">{{ placeStyle(p.type).icon }}</span> {{ p.name }}
            <span v-if="p.indoor" class="badge text-bg-light ms-auto">Indoor</span>
          </li>
        </ul>
      </div>
      <label for="wish-address" class="visually-hidden">Address</label>
      <input id="wish-address" v-model="form.address" class="form-control wl-input wl-add-address" maxlength="200" placeholder="Address (optional)">
      <button type="submit" class="btn btn-primary wl-pill-btn" :disabled="!form.name.trim()" data-testid="wish-add">+ Add</button>
    </form>

    <!-- ===== Popular places ===== -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-5 mb-3">
      <h3 class="wl-heading mb-0">Popular in {{ activeDest ? activeDest.split(', ')[0] : '…' }}</h3>
      <div v-if="destinations.length > 1" class="d-flex flex-wrap gap-2" role="group" aria-label="Destination">
        <button v-for="d in destinations" :key="d" type="button" class="wl-chip" :class="{ active: d === activeDest }"
          :aria-pressed="d === activeDest" @click="selectDest(d)">
          {{ flagFor(d) }} {{ d.split(', ')[0] }}
        </button>
      </div>
    </div>

    <div v-if="loading" aria-busy="true">
      <p class="small text-muted">Finding popular places… the first time for a whole country can take up to a minute.</p>
      <div class="wl-grid"><div v-for="n in 6" :key="n" class="wl-card skeleton"></div></div>
    </div>
    <div v-else-if="error" class="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-outline-secondary" @click="loadPopular(activeDest, true)">Try again</button>
    </div>
    <p v-else-if="!shownPopular.length" class="wl-empty">No popular places found here. You can still add your own above.</p>

    <template v-else>
      <div class="wl-grid" data-testid="popular-list">
        <article v-for="p in shownPopular.slice(0, shown)" :key="p.name" class="wl-card" :style="{ background: placeStyle(p.type).color }">
          <div class="wl-card-top">
            <h4 class="wl-name" :title="p.name">{{ p.name }}</h4>
          </div>
          <button v-if="isAdded(p)" type="button" class="wl-heart filled" disabled :aria-label="p.name + ' is in your wishlist'">♥</button>
          <button v-else type="button" class="wl-heart" :aria-label="'Add ' + p.name + ' to wishlist'" title="Add to wishlist"
            @click="addPopular(p)" data-testid="popular-add">♡</button>
          <span class="wl-art" aria-hidden="true">{{ placeStyle(p.type).icon }}</span>
          <div class="wl-bar">
            <span class="wl-bar-text">{{ placeStyle(p.type).label }}<span v-if="p.indoor"> · Indoor</span></span>
            <span v-if="isAdded(p)" class="wl-added">Saved</span>
          </div>
        </article>
      </div>
      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="small text-muted">Showing {{ Math.min(shown, shownPopular.length) }} of {{ shownPopular.length }} · from OpenStreetMap</span>
        <button v-if="shown < shownPopular.length" type="button" class="btn btn-sm btn-outline-secondary wl-pill-btn" @click="shown += 24">Show more</button>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import { trip, newId } from '../itineraryStore.js'
import { codeForDestination, flagEmoji } from '../destinations.js'
import { placeStyle } from '../placeStyle.js'

export default {
  props: {
    // All of the trip's destinations, e.g. ['Tokyo, Japan', 'Kyoto, Japan']
    destinations: { type: Array, default: () => [] }
  },

  data() {
    return {
      activeDest: '',
      popularByDest: {}, // destination -> list from the server (switching back is instant)
      loading: false,
      error: '',
      search: '',
      filter: 'all',
      showFilters: false,
      filterOptions: [
        { value: 'all', label: 'All' },
        { value: 'indoor', label: '🏛 Indoor' },
        { value: 'outdoor', label: '🌳 Outdoor' }
      ],
      shown: 24,
      form: { name: '', address: '' },
      showSuggest: false,
      active: -1,
      editId: null,
      editForm: { name: '', address: '' }
    }
  },

  watch: {
    // Load the first destination when the trip's destinations arrive
    destinations: {
      immediate: true,
      handler(list) {
        if (list.length && !list.includes(this.activeDest)) this.selectDest(list[0])
      }
    }
  },

  computed: {
    // The shared wishlist (saved together with the itinerary)
    wishlist() {
      return trip.wishlist
    },

    shownWishlist() {
      const list = []
      for (const w of this.wishlist) {
        if (this.matches(w.name, !w.outdoor)) list.push(w)
      }
      return list
    },

    shownPopular() {
      const list = []
      for (const p of this.popularByDest[this.activeDest] || []) {
        if (this.matches(p.name, p.indoor)) list.push(p)
      }
      return list
    },

    // Type-ahead: popular places whose name contains what's typed (max 8)
    typedMatches() {
      const q = this.form.name.trim().toLowerCase()
      if (q.length < 2) return []
      const list = []
      for (const p of this.popularByDest[this.activeDest] || []) {
        if (p.name.toLowerCase().includes(q) && !this.isAdded(p)) list.push(p)
        if (list.length === 8) break
      }
      return list
    }
  },

  methods: {
    placeStyle,

    // Search box + Indoor/Outdoor filter
    matches(name, indoor) {
      if (this.filter === 'indoor' && !indoor) return false
      if (this.filter === 'outdoor' && indoor) return false
      return !this.search.trim() || name.toLowerCase().includes(this.search.trim().toLowerCase())
    },

    selectDest(d) {
      this.activeDest = d
      this.shown = 24
      this.loadPopular(d, false)
    },

    async loadPopular(dest, force) {
      if (!dest || (this.popularByDest[dest] && !force)) return
      this.loading = true
      this.error = ''
      try {
        const res = await axios.get('/api/places/attractions', { params: { destination: dest } })
        this.popularByDest[dest] = res.data
      } catch (err) {
        this.error = (err.response && err.response.data && err.response.data.message) || 'Could not load popular places. Is the server running?'
      }
      this.loading = false
    },

    isAdded(p) {
      for (const w of this.wishlist) {
        if (w.name.toLowerCase() === p.name.toLowerCase()) return true
      }
      return false
    },

    addPopular(p) {
      if (this.isAdded(p)) return
      trip.wishlist.push({ id: newId('w'), name: p.name, address: p.address || null, outdoor: !p.indoor, type: p.type, votes: [] })
      this.form = { name: '', address: '' }
      this.active = -1
    },

    // Add the highlighted suggestion, or exactly what was typed
    addTyped() {
      if (this.active >= 0 && this.typedMatches[this.active]) {
        this.addPopular(this.typedMatches[this.active])
        return
      }
      const name = this.form.name.trim()
      if (!name) return
      trip.wishlist.push({ id: newId('w'), name, address: this.form.address.trim() || null, outdoor: false, type: 'custom', votes: [] })
      this.form = { name: '', address: '' }
    },

    onKeydown(e) {
      const count = this.typedMatches.length
      if (!count) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.active = (this.active + 1) % count
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.active = (this.active - 1 + count) % count
      } else if (e.key === 'Escape') {
        this.showSuggest = false
      }
    },

    remove(w) {
      trip.wishlist = trip.wishlist.filter((x) => x.id !== w.id)
      if (this.editId === w.id) this.editId = null
    },

    startEdit(w) {
      this.editId = w.id
      this.editForm = { name: w.name, address: w.address || '' }
    },

    saveEdit() {
      const name = this.editForm.name.trim()
      if (!name) return
      for (const w of trip.wishlist) {
        if (w.id === this.editId) {
          w.name = name
          w.address = this.editForm.address.trim() || null
        }
      }
      this.editId = null
    },

    flagFor(d) {
      return flagEmoji(codeForDestination(d))
    }
  }
}
</script>

<style scoped>
/* ---------- Toolbar ---------- */
.wl-toolbar {
  margin-bottom: 24px;
}
.wl-search {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1.5px solid #dfe5e3;
  border-radius: 999px;
  height: 52px;
  padding: 0 8px 0 18px;
}
.wl-search:focus-within {
  border-color: var(--app-primary, #0b7f5f);
  box-shadow: 0 0 0 4px rgba(11, 127, 95, 0.12);
}
.wl-search-icon {
  opacity: 0.6;
  margin-right: 10px;
}
.wl-search input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 16px;
}
.wl-filter-btn {
  border: 0;
  background: transparent;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  color: #3b6fd4;
}
.wl-filter-btn.on,
.wl-filter-btn:hover {
  background: #eef3ff;
}
.wl-filters {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.wl-chip {
  border: 1px solid #dfe5e3;
  background: #fff;
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}
.wl-chip.active {
  background: var(--app-ink, #1f2d2a);
  border-color: var(--app-ink, #1f2d2a);
  color: #fff;
}

.wl-heading {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.4rem;
  margin-bottom: 14px;
}
.wl-count {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  background: #e6f5ef;
  color: #064a38;
  border-radius: 999px;
  padding: 2px 10px;
  vertical-align: middle;
}
.wl-empty {
  color: var(--app-muted, #5f6f6b);
  background: #fff;
  border: 1px dashed #dfe5e3;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
}

/* ---------- Cards ---------- */
.wl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.wl-card {
  position: relative;
  aspect-ratio: 1 / 1.08;
  border-radius: 26px;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.wl-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px rgba(16, 40, 34, 0.12);
}
.wl-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  position: relative;
  z-index: 1;
}
.wl-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2d2a;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.wl-pill {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 999px;
  padding: 3px 8px;
}
.wl-heart {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.85);
  color: #e0475b;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.15s;
}
.wl-heart:hover:not(:disabled) {
  transform: scale(1.1);
}
.wl-heart.filled {
  color: #e0475b;
}
.wl-art {
  position: absolute;
  right: 6px;
  bottom: 44px;
  font-size: 72px;
  line-height: 1;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.15));
  pointer-events: none;
}
.wl-bar {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 6px 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1;
}
.wl-bar-text {
  font-size: 13px;
  font-weight: 600;
  color: #1f2d2a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wl-round {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: #1f2d2a;
  color: #dcf5a6;
  font-size: 14px;
}
.wl-added {
  font-size: 12px;
  font-weight: 700;
  color: #064a38;
  padding-right: 8px;
}
.wl-heart:focus-visible,
.wl-round:focus-visible,
.wl-chip:focus-visible {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 2px;
}

/* ---------- Add + edit ---------- */
.wl-add {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}
.wl-add-name {
  flex: 2 1 240px;
}
.wl-add-address {
  flex: 2 1 200px;
}
.wl-input {
  border-radius: 999px;
  height: 46px;
  padding: 0 18px;
}
.wl-pill-btn {
  border-radius: 999px;
  padding: 0 22px;
  height: 46px;
  font-weight: 600;
}
.btn-sm.wl-pill-btn {
  height: auto;
  padding: 6px 16px;
}
.wl-panel {
  background: #fff;
  border: 1px solid #dfe5e3;
  border-radius: 20px;
  padding: 16px 18px;
  margin-top: 16px;
}
.wl-suggest {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: #fff;
  border: 1px solid #dfe5e3;
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(16, 40, 34, 0.14);
  max-height: 280px;
  overflow-y: auto;
}
.wl-suggest li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 12px;
  cursor: pointer;
}
.wl-suggest li.active {
  background: #e6f5ef;
}

/* ---------- Loading + animations ---------- */
.skeleton {
  background: linear-gradient(90deg, #eef2f1 25%, #f7f9f8 50%, #eef2f1 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  to { background-position: -200% 0; }
}
.card-enter-active,
.card-leave-active,
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 576px) {
  .wl-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .wl-art { font-size: 56px; }
}
@media (prefers-reduced-motion: reduce) {
  .wl-card,
  .card-enter-active,
  .card-leave-active,
  .fade-enter-active,
  .fade-leave-active { transition: none; }
  .wl-card:hover { transform: none; }
  .skeleton { animation: none; }
}
</style>
