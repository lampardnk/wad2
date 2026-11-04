import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { setOffline, notify } from './lib/ui/notify.js'
import './assets/style.css'
import './assets/scrapbook.css'
import './assets/playful.css' // the playful look: colours, chunky buttons, cards

// ---------- A "background lane" for slow lookups ----------
// Photos, map positions, crowd forecasts and popular places can take seconds each, and a trip page asks
// for dozens. If they all went at once they'd fill the browser's ~6 connections, and saving a change or
// opening a tab would wait behind them. Requests marked { background: true } go at most 3 at a time,
// so there are always connections free for everything else.
// (Registered before the "leaving a page" step below: axios runs these in reverse order, so a waiting
// request already has its cancel switch and is dropped quickly if you leave the page meanwhile.)
const BACKGROUND_AT_ONCE = 3
let backgroundRunning = 0
const backgroundWaiting = []
axios.interceptors.request.use(async (config) => {
  if (!config.background) return config
  if (backgroundRunning >= BACKGROUND_AT_ONCE) await new Promise((resolve) => backgroundWaiting.push(resolve))
  backgroundRunning++
  config.inLane = true
  return config
})
function leaveLane(config) {
  if (!config || !config.inLane) return
  config.inLane = false
  backgroundRunning--
  const next = backgroundWaiting.shift()
  if (next) next()
}

// ---------- Leaving a page cancels its unfinished lookups ----------
// The browser only talks to the server over about 6 connections at a time. Slow lookups from the page
// you just left (crowds, places, photos...) would otherwise keep them busy, and the next page
// (e.g. your trips) would wait behind them. Only loading (GET) is cancelled; saves always finish.
const pending = new Set()
axios.interceptors.request.use((config) => {
  // (a request can opt out with { keep: true }, e.g. something the whole app needs)
  if ((config.method || 'get').toLowerCase() === 'get' && !config.signal && !config.keep) {
    const controller = new AbortController()
    config.signal = controller.signal
    config.pageRequest = controller
    pending.add(controller)
  }
  return config
})
function done(config) {
  if (config && config.pageRequest) pending.delete(config.pageRequest)
}
router.beforeEach((to, from) => {
  if (to.path === from.path) return // same page, e.g. a different tab
  if (!from.matched.length) return     // the app is just starting: nothing to cancel yet
  for (const controller of pending) controller.abort()
  pending.clear()
})

// ---------- Saves give up after 30 s ----------
// So a server that doesn't answer shows "could not save" instead of a save that never finishes.
// (Photo uploads are left alone: big files on a slow connection can take longer.)
axios.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase()
  if (method !== 'get' && !config.timeout && !(config.data instanceof FormData)) config.timeout = 30000
  return config
})

// Can we reach the server? Any proper answer means yes; no answer means no.
// AppToast shows a bar while it's down, so failed background refreshes aren't silent.
axios.interceptors.response.use(
  (res) => {
    done(res.config)
    leaveLane(res.config)
    setOffline(false)
    return res
  },
  (err) => {
    done(err.config)
    leaveLane(err.config)
    if (axios.isCancel(err)) return Promise.reject(err) // we cancelled it on purpose (left the page)
    // A lookup that took longer than its time limit is just slow, not a sign the server is off
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return Promise.reject(err)
    const r = err.response
    // (our server always sends JSON with a message; a 5xx without one is the dev proxy saying the server is off)
    const down = !r || (r.status >= 500 && !(r.data && typeof r.data === 'object' && r.data.message))
    if (down) setOffline(true)
    else setOffline(false)
    // 409 = someone on another device changed the same thing first. Say so, and let the open trip
    // page load their version (TripView listens for 'trip-conflict').
    if (r && r.status === 409) {
      notify((r.data && r.data.message) || 'Someone else changed this at the same time. The latest version is loaded: please try again.')
      window.dispatchEvent(new CustomEvent('trip-conflict'))
    }
    // The trip ended while the page was open: it's archived now (server/archived.js). Say so, and let the
    // open trip page load the trip again so it turns read only (TripView listens for 'trip-archived').
    if (r && r.status === 403 && r.data && r.data.archived) {
      notify(r.data.message)
      window.dispatchEvent(new CustomEvent('trip-archived'))
    }
    return Promise.reject(err)
  }
)

const app = createApp(App)
app.use(router)
// If a page hits an error, log it instead of leaving a blank screen
app.config.errorHandler = (err, instance, info) => {
  console.error('[app error]', info, err)
}
app.mount('#app')

