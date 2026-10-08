<template>
  <!-- "Trip preferences" card. Edits a copy, then saves to MongoDB via /api/preferences. -->
  <div class="card mb-3" data-testid="prefs-panel">
    <button type="button" class="btn btn-link text-start text-decoration-none p-3 d-flex justify-content-between align-items-center"
      :aria-expanded="open" @click="toggle" data-testid="prefs-toggle">
      <span>
        <strong>Preferences</strong>
        <span class="text-muted small ms-2">{{ summary }}</span>
      </span>
      <span aria-hidden="true">{{ open ? '▲' : '▼' }}</span>
    </button>

    <form v-if="open" class="px-3 pb-3" @submit.prevent="save" novalidate>
      <div class="row g-3">
        <div class="col-6 col-md-3">
          <label for="pref-start" class="form-label small">Day starts</label>
          <select id="pref-start" v-model.number="form.dayStart" class="form-select form-select-sm" data-testid="prefs-day-start">
            <option v-for="h in startHours" :key="h" :value="h">{{ formatHour(h) }}</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label for="pref-end" class="form-label small">Day ends</label>
          <select id="pref-end" v-model.number="form.dayEnd" class="form-select form-select-sm" data-testid="prefs-day-end">
            <option v-for="h in endHours" :key="h" :value="h">{{ h === 24 ? 'Midnight' : formatHour(h) }}</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label for="pref-crowd" class="form-label small">Crowds bother me</label>
          <select id="pref-crowd" v-model="form.crowdSensitivity" class="form-select form-select-sm" data-testid="prefs-crowd">
            <option value="low">A little</option>
            <option value="medium">Somewhat</option>
            <option value="high">A lot</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label for="pref-buffer" class="form-label small">Travel buffer</label>
          <select id="pref-buffer" v-model.number="form.travelBuffer" class="form-select form-select-sm" data-testid="prefs-buffer">
            <option :value="0">None</option>
            <option :value="0.5">30 min</option>
            <option :value="1">1 hour</option>
          </select>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 mt-3">
        <button type="submit" class="btn btn-primary btn-sm" :disabled="saving" data-testid="prefs-save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <span v-if="message" class="small" :class="isError ? 'text-danger' : 'text-success'" role="status" data-testid="prefs-message">
          {{ message }}
        </span>
      </div>
    </form>
  </div>
</template>

<script>
import { prefs, savePreferences } from '../preferences.js'
import { formatHour } from '../crowd.js'

export default {
  data() {
    // Build the hour lists up front
    const startHours = []
    for (let h = 5; h <= 12; h++) startHours.push(h)
    const endHours = []
    for (let h = 17; h <= 24; h++) endHours.push(h)

    return {
      open: false,
      form: { ...prefs }, // a copy, so nothing changes until Save
      startHours,
      endHours,
      saving: false,
      message: '',
      isError: false
    }
  },
  computed: {
    summary() {
      const crowd = { low: 'Crowds: A little', medium: 'Crowds: Somewhat', high: 'Crowds: A lot' }[prefs.crowdSensitivity]
      const end = prefs.dayEnd === 24 ? 'midnight' : formatHour(prefs.dayEnd)
      return formatHour(prefs.dayStart) + '–' + end + ' · ' + crowd
    }
  },
  methods: {
    formatHour,
    toggle() {
      this.open = !this.open
      this.form = { ...prefs } // start from the saved values
      this.message = ''
    },
    async save() {
      this.message = ''
      if (this.form.dayEnd - this.form.dayStart < 4) {
        this.isError = true
        this.message = 'Your day needs to be at least 4 hours long.'
        return
      }
      this.saving = true
      try {
        await savePreferences(this.form)
        this.isError = false
        this.message = 'Saved'
      } catch (err) {
        this.isError = true
        this.message = (err.response && err.response.data && err.response.data.message) || 'Could not save. Is the server running?'
      }
      this.saving = false
    }
  }
}
</script>
