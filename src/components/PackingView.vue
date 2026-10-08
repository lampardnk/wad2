<template>
  <div class="card p-3 p-md-4 packing-view">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h4 class="mb-1">Adaptive Packing List</h4>
        <p class="text-muted small mb-0">Adjust your packed quantities as you prepare for the trip.</p>
      </div>
      <span class="badge bg-primary p-2" aria-live="polite">{{ readyCount }} / {{ allItems.length }} items ready</span>
    </div>

    <div class="row g-3 bg-light rounded p-2 mb-3">
      <div class="col-sm-6">
        <label for="packing-days" class="form-label">Trip length (days)</label>
        <input id="packing-days" v-model.number="tripDays" type="number" min="1" max="30" class="form-control">
      </div>
      <div class="col-sm-6">
        <label for="packing-weather" class="form-label">Demo weather</label>
        <select id="packing-weather" v-model="weather" class="form-select">
          <option value="rainy">Rainy</option>
          <option value="sunny">Sunny</option>
          <option value="cold">Cold</option>
        </select>
      </div>
      <p class="small text-muted mb-1">{{ hasOutdoorActivity ? 'Outdoor activities included.' : 'No outdoor activities planned.' }} Recommendations update with your itinerary.</p>
    </div>

    <p class="small text-muted">Green: recommended amount met · Yellow: more needed</p>
    <section v-for="group in itemGroups" :key="group.name" class="mb-4">
      <h5 class="category-title">{{ group.name }}</h5>
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead class="table-light">
            <tr><th scope="col">Item</th><th scope="col">Recommended</th><th scope="col">Packed</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="item in group.items" :key="item.id" :class="isReady(item) ? 'table-success' : 'table-warning'">
              <th scope="row" class="fw-normal">
                {{ item.name }}<small class="d-block text-muted">{{ item.reason }}</small>
              </th>
              <td>{{ item.quantity }}</td>
              <td>
                <input :value="packedQuantities[item.id] || 0" type="number" min="0" max="999" step="1"
                  class="form-control quantity-input" :aria-label="'Packed quantity for ' + item.name"
                  @input="updateQuantity(item.id, $event.target.value)">
              </td>
              <td><span class="badge" :class="isReady(item) ? 'bg-success' : 'bg-warning text-dark'">{{ isReady(item) ? 'Ready' : 'Need ' + (item.quantity - (packedQuantities[item.id] || 0)) }}</span></td>
              <td><button v-if="item.custom" type="button" class="btn btn-sm btn-outline-danger" :aria-label="'Remove ' + item.name" @click="removeCustomItem(item.id)">Remove</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <form class="border rounded p-3 bg-light" @submit.prevent="addCustomItem">
      <h5 class="mb-3">Add a packing item</h5>
      <div class="row g-2 align-items-end">
        <div class="col-md-5">
          <label for="packing-custom" class="form-label small">Item name</label>
          <input id="packing-custom" v-model="customItemName" class="form-control" maxlength="80" placeholder="e.g. Toothbrush" required>
        </div>
        <div class="col-md-3">
          <label for="packing-category" class="form-label small">Category</label>
          <select id="packing-category" v-model="customCategory" class="form-select"><option v-for="category in categories" :key="category">{{ category }}</option></select>
        </div>
        <div class="col-8 col-md-2">
          <label for="packing-amount" class="form-label small">Recommended</label>
          <input id="packing-amount" v-model.number="customQuantity" type="number" min="1" max="999" step="1" required class="form-control">
        </div>
        <div class="col-4 col-md-2"><button type="submit" class="btn btn-primary w-100">Add</button></div>
      </div>
    </form>
  </div>
</template>

<script>
import { getPackingItems } from '../utils/packingRules.js'

export default {
  props: { hasOutdoorActivity: { type: Boolean, default: true } },
  data() {
    return {
      tripDays: 6,
      weather: 'rainy',
      packedQuantities: {},
      categories: ['Essentials', 'Clothes', 'Weather-specific', 'Activities', 'Other'],
      customItems: [],
      customItemName: '',
      customCategory: 'Other',
      customQuantity: 1,
      nextCustomId: 1
    }
  },
  computed: {
    allItems() {
      return getPackingItems(this.tripDays, this.weather, this.hasOutdoorActivity).concat(this.customItems)
    },
    itemGroups() {
      return this.categories.map(name => ({ name, items: this.allItems.filter(item => item.category === name) }))
        .filter(group => group.items.length > 0)
    },
    readyCount() {
      return this.allItems.filter(item => this.isReady(item)).length
    }
  },
  methods: {
    isReady(item) {
      return (this.packedQuantities[item.id] || 0) >= item.quantity
    },
    updateQuantity(id, value) {
      this.packedQuantities[id] = Math.min(999, Math.max(0, Math.floor(Number(value) || 0)))
    },
    addCustomItem() {
      const name = this.customItemName.trim()
      if (!name) return
      this.customItems.push({
        id: 'custom-' + this.nextCustomId++, name, category: this.customCategory,
        quantity: Math.min(999, Math.max(1, Math.floor(Number(this.customQuantity) || 1))),
        reason: 'Your packing item', custom: true
      })
      this.customItemName = ''
      this.customQuantity = 1
    },
    removeCustomItem(id) {
      this.customItems = this.customItems.filter(item => item.id !== id)
      delete this.packedQuantities[id]
    }
  }
}
</script>

<style scoped>
.category-title { font-size: 1rem; font-weight: 600; }
.quantity-input { width: 5rem; }
th:first-child { min-width: 170px; }
</style>
