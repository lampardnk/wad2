// The Discover shortlist (city ids like 'kyoto-japan').
// Guests keep it in this browser; once signed in it's also saved to the account,
// and whatever a guest picked is merged in when they sign in or sign up.
import { ref, watch } from 'vue'
import axios from 'axios'

function readLocal() {
  try {
    const list = JSON.parse(localStorage.getItem('dxShortlist') || '[]')
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

export const shortlist = ref(readLocal())

let saveTimer = null
watch(shortlist, (list) => {
  try { localStorage.setItem('dxShortlist', JSON.stringify(list)) } catch (err) { /* private mode */ }
  // Signed in: save to the account too (a moment later, so quick taps become one request)
  if (!localStorage.getItem('token')) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    axios.put('/api/auth/me', { shortlist: list }).catch(() => {})
  }, 600)
})

// Right after signing in: account's list + this browser's list, no repeats
export async function syncShortlist() {
  try {
    const res = await axios.get('/api/auth/me', { keep: true })
    const merged = (res.data.shortlist || []).slice()
    for (const id of shortlist.value) if (!merged.includes(id)) merged.push(id)
    shortlist.value = merged.slice(0, 50) // the watcher above saves it
  } catch (err) {
    // keep the local list; it'll save next time it changes
  }
}
