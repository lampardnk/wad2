import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { setOffline } from './notify.js'
import './assets/style.css'

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

// Can we reach the server? Any proper answer means yes; no answer means no.
// AppToast shows a bar while it's down, so failed background refreshes aren't silent.
axios.interceptors.response.use(
  (res) => {
    done(res.config)
    setOffline(false)
    return res
  },
  (err) => {
    done(err.config)
    if (axios.isCancel(err)) return Promise.reject(err) // we cancelled it on purpose (left the page)
    const r = err.response
    // (our server always sends JSON with a message; a 5xx without one is the dev proxy saying the server is off)
    const down = !r || (r.status >= 500 && !(r.data && typeof r.data === 'object' && r.data.message))
    if (down) setOffline(true)
    else setOffline(false)
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