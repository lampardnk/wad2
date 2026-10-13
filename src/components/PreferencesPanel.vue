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
          <CustomDropdown id="pref-start" v-model="form.dayStart" :options="startChoices" size="sm" block header-text="Day starts" testid="prefs-day-start" />
        </div>
        <div class="col-6 col-md-3">
          <label for="pref-end" class="form-label small">Day ends</label>
          <CustomDropdown id="pref-end" v-model="form.dayEnd" :options="endChoices" size="sm" block header-text="Day ends" testid="prefs-day-end" />
        </div>
        <div class="col-6 col-md-3">
          <label for="pref-crowd" class="form-label small">Crowds bother me</label>
          <CustomDropdown id="pref-crowd" v-model="form.crowdSensitivity" :options="crowdChoices" size="sm" block header-text="Crowds bother me" testid="prefs-crowd" />
        </div>
        <div class="col-6 col-md-3">
          <label for="pref-buffer" class="form-label small">Travel buffer</label>
          <CustomDropdown id="pref-buffer" v-model="form.travelBuffer" :options="bufferChoices" size="sm" block header-text="Travel buffer" testid="prefs-buffer" />
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
import CustomDropdown from './CustomDropdown.vue'

export default {
  components: { CustomDropdown },
  data() {
    // Build the hour lists up front
    const startChoices = []
    for (let h = 5; h <= 12; h++) startChoices.push({ value: h, label: formatHour(h) })
    const endChoices = []
    for (let h = 17; h <= 24; h++) endChoices.push({ value: h, label: h === 24 ? 'Midnight' : formatHour(h) })

    return {
      open: false,
      form: { ...prefs }, // a copy, so nothing changes until Save
      startChoices,
      endChoices,
      crowdChoices: [
        { value: 'low', label: 'A little', icon: '🙂' },
        { value: 'medium', label: 'Somewhat', icon: '😐' },
        { value: 'high', label: 'A lot', icon: '😣', description: 'Avoid busy times where possible' }
      ],
      bufferChoices: [
        { value: 0, label: 'None' },
        { value: 0.5, label: '30 min' },
        { value: 1, label: '1 hour' }
      ],
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
