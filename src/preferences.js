// The logged-in user's trip preferences, shared by every page.
// reactive() = any component showing prefs updates when they change.
import { reactive } from 'vue'
import axios from 'axios'
import { DEFAULT_PREFS } from './crowd.js'

export const prefs = reactive({ ...DEFAULT_PREFS })

// Load from the server (call this when a page opens)
export async function loadPreferences() {
  const res = await axios.get('/api/preferences')
  Object.assign(prefs, res.data)
}

// Save to the server; throws if the server rejects the values
export async function savePreferences(newPrefs) {
  const res = await axios.put('/api/preferences', newPrefs)
  Object.assign(prefs, res.data)
}
