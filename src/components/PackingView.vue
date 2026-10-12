<template>
  <div class="pk">
    <!-- ===== Trip details the list is built from ===== -->
    <section v-if="editing" class="pk-setup" aria-labelledby="pk-setup-title">
      <h3 id="pk-setup-title" class="pk-setup-title">{{ hasProfile ? 'Edit trip details' : 'Tell us about your trip' }}</h3>
      <p class="pk-muted mb-3">Pick what you'll be doing. You can change this any time.</p>

      <fieldset v-for="g in optionGroups" :key="g.key" class="mb-3">
        <legend class="pk-legend">{{ g.label }}</legend>
        <div class="pk-chips">
          <button v-for="o in g.options" :key="o.key" type="button" class="pk-chip" :class="{ on: profile[g.key].includes(o.key) }"
            :aria-pressed="profile[g.key].includes(o.key)" @click="toggleOption(profile[g.key], o.key)">
            <span aria-hidden="true">{{ o.icon }}</span> {{ o.label }}
          </button>
        </div>
      </fieldset>
      <button type="button" class="btn pk-btn-dark" @click="editing = false" data-testid="packing-build">
        {{ hasProfile ? 'Update my list' : 'Build my list' }} →
      </button>
    </section>

    <template v-else>
      <!-- ===== Progress ===== -->
      <div class="pk-top">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-baseline mb-2">
            <strong class="pk-progress-text" aria-live="polite" data-testid="packing-progress">
              {{ packedCount }} of {{ items.length }} packed
            </strong>
            <span v-if="packedCount === items.length && items.length" class="pk-done">🎉 All packed!</span>
          </div>
          <div class="pk-bar" role="progressbar" :aria-valuenow="packedCount" aria-valuemin="0" :aria-valuemax="items.length" aria-label="Packing progress">
            <div class="pk-bar-fill" :style="{ width: percent + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Built from: tap Edit to change -->
      <div class="pk-profile">
        <span class="pk-muted small">Built for {{ days }} day{{ days === 1 ? '' : 's' }}<span v-if="profileTags.length">:</span></span>
        <span v-for="t in profileTags" :key="t.key" class="pk-tag">{{ t.icon }} {{ t.label }}</span>
        <button type="button" class="pk-link" @click="editing = true">✎ Edit trip details</button>
        <label class="pk-hide ms-auto">
          <input v-model="hidePacked" type="checkbox"> Hide packed
        </label>
      </div>

      <!-- ===== Categories ===== -->
      <section v-for="cat in groups" :key="cat.key" class="pk-cat" :aria-labelledby="'pk-cat-' + cat.key">
        <button type="button" class="pk-cat-head" :aria-expanded="!collapsed[cat.key]" @click="collapsed[cat.key] = !collapsed[cat.key]">
          <span class="pk-cat-icon" aria-hidden="true">{{ cat.icon }}</span>
          <h3 :id="'pk-cat-' + cat.key" class="pk-cat-title">{{ cat.label }}</h3>
          <span class="pk-cat-count" :class="{ full: cat.packed === cat.items.length }">{{ cat.packed }}/{{ cat.items.length }}</span>
          <span class="pk-chevron" aria-hidden="true">{{ collapsed[cat.key] ? '›' : '⌄' }}</span>
        </button>

        <div v-show="!collapsed[cat.key]">
          <ul class="pk-list">
            <li v-for="it in cat.shown" :key="it.id" class="pk-item" :class="{ packed: packing.checked[it.id] }">
              <label class="pk-check">
                <input type="checkbox" :checked="!!packing.checked[it.id]" @change="toggleChecked(it.id)" data-testid="packing-check">
                <span class="pk-box" aria-hidden="true">✓</span>
                <span class="pk-name">
                  {{ it.name }}
                  <small class="d-block pk-muted">{{ it.why }}</small>
                </span>
              </label>
              <div class="pk-qty" role="group" :aria-label="'Amount of ' + it.name">
                <button type="button" :aria-label="'Fewer ' + it.name" :disabled="it.qty <= 1" @click="changeQty(it, -1)">−</button>
                <span aria-live="polite">{{ it.qty }}</span>
                <button type="button" :aria-label="'More ' + it.name" :disabled="it.qty >= 99" @click="changeQty(it, 1)">+</button>
              </div>
              <button type="button" class="pk-remove" :aria-label="'Remove ' + it.name" title="Remove" @click="removeItem(it)">✕</button>
            </li>
          </ul>
          <p v-if="!cat.shown.length" class="pk-muted small px-3 mb-2">Everything here is packed ✓</p>

          <!-- Add an item to this category -->
          <form class="pk-add" @submit.prevent="addItem(cat.key)">
            <label :for="'pk-add-' + cat.key" class="visually-hidden">Add an item to {{ cat.label }}</label>
            <input :id="'pk-add-' + cat.key" v-model="newItem[cat.key]" class="form-control" maxlength="80" :placeholder="'+ Add to ' + cat.label.toLowerCase()">
            <button type="submit" class="btn btn-sm pk-btn-dark" :disabled="!(newItem[cat.key] || '').trim()">Add</button>
          </form>
        </div>
      </section>

      <div class="d-flex flex-wrap gap-3 align-items-center mt-3">
        <button v-if="packing.removed.length" type="button" class="pk-link" @click="packing.removed = []">
          ↺ Bring back {{ packing.removed.length }} removed item{{ packing.removed.length === 1 ? '' : 's' }}
        </button>
        <button v-if="packedCount" type="button" class="pk-link" @click="packing.checked = {}">Untick everything</button>
        <span class="pk-muted small ms-auto" role="status">{{ saveStatus }}</span>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import { ACTIVITIES, WEATHER, EXTRAS } from '../tripOptions.js'
import { CATEGORIES, buildPackingList } from '../packingList.js'

export default {
  props: {
    tripId: { type: String, default: '' },
    days: { type: Number, default: 3 },
    activities: { type: Array, default: () => [] },
    weather: { type: Array, default: () => [] },
    extras: { type: Array, default: () => [] },
    initialPacking: { type: Object, default: null },
    hasOutdoorActivity: { type: Boolean, default: false }
  },

  data() {
    const saved = this.initialPacking || {}
    const profile = { activities: this.activities.slice(), weather: this.weather.slice(), extras: this.extras.slice() }
    const collapsed = {}
    const newItem = {}
    for (const c of CATEGORIES) {
      collapsed[c.key] = false
      newItem[c.key] = ''
    }
    return {
      profile,
      packing: {
        checked: saved.checked || {},
        qty: saved.qty || {},
        removed: saved.removed || [],
        custom: saved.custom || []
      },
      // Nothing chosen when the trip was created? Ask first.
      editing: !profile.activities.length && !profile.weather.length && !profile.extras.length,
      hidePacked: false,
      collapsed,
      newItem,
      optionGroups: [
        { key: 'activities', label: 'Activities', options: ACTIVITIES },
        { key: 'weather', label: 'Expected weather', options: WEATHER },
        { key: 'extras', label: 'Anything else?', options: EXTRAS }
      ],
      saveTimer: null,
      saveStatus: '',
      lastSaved: ''
    }
  },

  computed: {
    hasProfile() {
      return this.profile.activities.length + this.profile.weather.length + this.profile.extras.length > 0
    },

    // The chosen options with their icons, for the "Built for" line
    profileTags() {
      const tags = []
      for (const g of this.optionGroups) {
        for (const o of g.options) {
          if (this.profile[g.key].includes(o.key)) tags.push(o)
        }
      }
      return tags
    },

    // Suggested items + your own, minus removed ones, with your amounts
    items() {
      const list = []
      const suggested = buildPackingList({ days: this.days, ...this.profile, outdoor: this.hasOutdoorActivity })
      for (const it of suggested.concat(this.packing.custom.map((c) => ({ ...c, why: 'Added by you' })))) {
        if (this.packing.removed.includes(it.id)) continue
        const qty = this.packing.qty[it.id] !== undefined ? this.packing.qty[it.id] : it.qty
        list.push({ ...it, qty })
      }
      return list
    },

    groups() {
      const groups = []
      for (const c of CATEGORIES) {
        const items = []
        const shown = []
        let packed = 0
        for (const it of this.items) {
          if (it.category !== c.key) continue
          items.push(it)
          if (this.packing.checked[it.id]) packed++
          if (!(this.hidePacked && this.packing.checked[it.id])) shown.push(it)
        }
        // Always show "Other" so there's somewhere to add your own things
        if (items.length || c.key === 'other') groups.push({ ...c, items, shown, packed })
      }
      return groups
    },

    packedCount() {
      let count = 0
      for (const it of this.items) {
        if (this.packing.checked[it.id]) count++
      }
      return count
    },

    percent() {
      return this.items.length ? Math.round((this.packedCount / this.items.length) * 100) : 0
    },

    // Everything worth saving, as text (changes whenever something changes)
    saveKey() {
      return JSON.stringify({ ...this.profile, packing: this.packing })
    }
  },

  watch: {
    saveKey(key) {
      if (!this.tripId || this.tripId === 'seoul' || key === this.lastSaved) return // the demo trip isn't saved
      this.saveStatus = 'Saving…'
      clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(this.save, 600)
    }
  },

  created() {
    this.lastSaved = this.saveKey
  },

  methods: {
    toggleOption(list, key) {
      const i = list.indexOf(key)
      if (i >= 0) list.splice(i, 1)
      else list.push(key)
    },

    toggleChecked(id) {
      if (this.packing.checked[id]) delete this.packing.checked[id]
      else this.packing.checked[id] = true
    },

    changeQty(it, step) {
      this.packing.qty[it.id] = Math.min(99, Math.max(1, it.qty + step))
    },

    removeItem(it) {
      if (it.id.startsWith('mine-')) {
        this.packing.custom = this.packing.custom.filter((c) => c.id !== it.id)
      } else {
        this.packing.removed.push(it.id)
      }
      delete this.packing.checked[it.id]
    },

    addItem(category) {
      const name = (this.newItem[category] || '').trim()
      if (!name) return
      this.packing.custom.push({ id: 'mine-' + Date.now(), category, name, qty: 1 })
      this.newItem[category] = ''
    },

    async save() {
      const key = this.saveKey
      try {
        await axios.put('/api/trips/' + this.tripId + '/packing', { ...this.profile, packing: this.packing })
        this.lastSaved = key
        this.saveStatus = 'Saved ✓'
      } catch (err) {
        this.saveStatus = 'Could not save. Check your connection.'
      }
    }
  }
}
</script>

<style scoped>
.pk-muted {
  color: var(--app-muted, #5f6f6b);
}

/* Setup / edit */
.pk-setup {
  background: #f6f9f8;
  border: 1px solid #e3e9e7;
  border-radius: 22px;
  padding: 24px;
}
.pk-setup-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.3rem;
  margin-bottom: 4px;
}
.pk-legend {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  float: none;
}
.pk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pk-chip {
  border: 1.5px solid #e3e9e7;
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 14px;
  color: #1f2d2a;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.pk-chip:hover {
  border-color: #0b7f5f;
}
.pk-chip.on {
  background: #1f2d2a;
  border-color: #1f2d2a;
  color: #dcf5a6;
}
.pk-btn-dark {
  background: #1f2d2a;
  color: #dcf5a6;
  border-radius: 999px;
  padding: 8px 20px;
  font-weight: 600;
}
.pk-btn-dark:hover {
  background: #0b7f5f;
  color: #fff;
}

/* Progress */
.pk-top {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
}
.pk-progress-text {
  font-size: 1.1rem;
}
.pk-done {
  color: #0b7f5f;
  font-weight: 600;
}
.pk-bar {
  height: 10px;
  border-radius: 999px;
  background: #e8eeec;
  overflow: hidden;
}
.pk-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #0b7f5f, #6ff2bd);
  transition: width 0.3s ease;
}
.pk-profile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
}
.pk-tag {
  background: #eef4f2;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 13px;
}
.pk-link {
  border: 0;
  background: none;
  color: #0b7f5f;
  font-weight: 600;
  font-size: 14px;
  padding: 2px 4px;
}
.pk-link:hover {
  text-decoration: underline;
}
.pk-hide {
  font-size: 14px;
  display: flex;
  gap: 6px;
  align-items: center;
}

/* Categories */
.pk-cat {
  border: 1px solid #e3e9e7;
  border-radius: 20px;
  margin-bottom: 12px;
  overflow: hidden;
  background: #fff;
}
.pk-cat-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: #f6f9f8;
  padding: 12px 16px;
  text-align: left;
}
.pk-cat-icon {
  font-size: 20px;
}
.pk-cat-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
}
.pk-cat-count {
  font-size: 13px;
  font-weight: 600;
  background: #fff;
  border: 1px solid #e3e9e7;
  border-radius: 999px;
  padding: 2px 10px;
}
.pk-cat-count.full {
  background: #0b7f5f;
  border-color: #0b7f5f;
  color: #fff;
}
.pk-chevron {
  width: 16px;
  color: #5f6f6b;
}
.pk-list {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
}
.pk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 14px;
  transition: opacity 0.2s;
}
.pk-item:hover {
  background: #f6f9f8;
}
.pk-item.packed {
  opacity: 0.55;
}
.pk-item.packed .pk-name {
  text-decoration: line-through;
}
.pk-check {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  margin: 0;
}
.pk-check input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.pk-box {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid #b9c7c3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  font-weight: 700;
  transition: background 0.15s, border-color 0.15s;
}
.pk-check input:checked + .pk-box {
  background: #0b7f5f;
  border-color: #0b7f5f;
  color: #fff;
}
.pk-check input:focus-visible + .pk-box {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 2px;
}
.pk-name {
  min-width: 0;
}
.pk-qty {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #f1f5f4;
  border-radius: 999px;
  padding: 2px;
}
.pk-qty button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  font-weight: 700;
}
.pk-qty button:disabled {
  opacity: 0.4;
}
.pk-qty span {
  min-width: 22px;
  text-align: center;
  font-weight: 600;
}
.pk-remove {
  border: 0;
  background: none;
  color: #9aa8a4;
  width: 30px;
  height: 30px;
  border-radius: 50%;
}
.pk-remove:hover {
  background: #fdecec;
  color: #c0392b;
}
.pk-add {
  display: flex;
  gap: 8px;
  padding: 4px 16px 14px;
}
.pk-add .form-control {
  border-radius: 999px;
}

.pk-chip:focus-visible,
.pk-cat-head:focus-visible,
.pk-qty button:focus-visible,
.pk-remove:focus-visible,
.pk-link:focus-visible {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .pk-bar-fill,
  .pk-item,
  .pk-chip { transition: none; }
}
</style>
