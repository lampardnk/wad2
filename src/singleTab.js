// One active tab per browser.
// Two tabs of the app in the same browser share one login, so they would edit the same trips as the
// same person and save over each other. So only one tab is "active": the newest tab (or the one where
// you press "Use here") takes over, and every other tab is paused behind a notice (see App.vue) and
// sends nothing to the server. Different devices are not affected: they are handled on the server
// (a save based on an old copy of the trip gets a 409, see server/app.js).
import { reactive } from 'vue'

export const tab = reactive({ active: true })

const myId = Math.random().toString(36).slice(2)
const KEY = 'chuise-active-tab'

// Tell the other tabs that this one is now in charge
export function useThisTab() {
  tab.active = true
  try {
    localStorage.setItem(KEY, myId + ':' + Date.now()) // other tabs get a 'storage' event
  } catch (err) {
    // storage blocked (private mode): nothing to share it with anyway
  }
}

// Another tab took over: pause this one
window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue && !e.newValue.startsWith(myId + ':')) tab.active = false
})

useThisTab() // a newly opened tab takes over
