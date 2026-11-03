// Shared login state for the whole app.
// reactive() means any component showing auth.user updates automatically.
import { reactive } from 'vue'
import axios from 'axios'
import { shortlist, syncShortlist } from './lib/itinerary/shortlist.js'

// A corrupted value in localStorage shouldn't crash the whole app on load
function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch (err) {
      return null
    }
  }


export const auth = reactive({
  token: localStorage.getItem('token'),
  user: readSavedUser(),
  endedHere: '' // why another tab ended this tab's session: 'other-tab' | 'signed-out' (App.vue shows /login)
})

// ---------- One login session per browser, used by one tab ----------
// Rule: the tab that signed in (or opened the app) last owns the session. Every other tab of this
// browser is signed out, so two tabs can never edit the same trips at once.
// Different devices are handled by the server instead (out-of-date saves get a 409).
const SESSION_TAB = 'session-tab' // localStorage: which tab owns the session
const myTab = Math.random().toString(36).slice(2)

function takeSession() {
  localStorage.setItem(SESSION_TAB, myTab) // the other tabs get a 'storage' event
}

// Signed out because of another tab: only this tab forgets the login (the other tab keeps it)
function endSessionHere(reason) {
  auth.token = null
  auth.user = null
  auth.endedHere = reason
  delete axios.defaults.headers.common['Authorization']
}

window.addEventListener('storage', (e) => {
  if (!auth.token) return // already signed out here
  const otherTabTookIt = e.key === SESSION_TAB && e.newValue !== myTab
  const signedOutElsewhere = e.key === 'token' && !e.newValue
  if (signedOutElsewhere) endSessionHere('signed-out')
  else if (otherTabTookIt) endSessionHere('other-tab')
})

if (auth.token) takeSession() // opening the app in this tab

// Send the token with every axios request once logged in
if (auth.token) {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + auth.token
}

export function saveLogin(token, user) {
  auth.token = token
  auth.user = user
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  auth.endedHere = ''
  takeSession() // signs out the other tabs
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
  syncShortlist() // a guest's Discover picks move into the account
}

export function logout() {
  auth.token = null
  auth.user = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem(SESSION_TAB) // (removing the token signs out the other tabs too)
  delete axios.defaults.headers.common['Authorization']
  shortlist.value = [] // the next person on this browser starts fresh
}

// If the server says our token is invalid/expired, log out and go to /login.
// (Uses window.location because importing the router here would be a circular import.)
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401 && auth.token) {
      logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      }
    }
    return Promise.reject(err)
  }
)