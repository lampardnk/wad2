// Friends: the numbers for the profile menu (requests waiting, friends online) and the drawer's open state.
// While you're logged in the app pings the server every minute, which is also what shows you as "Online" to your friends.
import { reactive } from 'vue'
import axios from 'axios'

export const friends = reactive({
  requests: 0, // friend requests waiting for my answer
  online: 0,   // friends online right now
  open: false  // the Friends drawer
})

let timer = null

export async function pingFriends() {
  if (document.hidden) return // a tab in the background doesn't count as online
  try {
    const res = await axios.post('/api/friends/ping')
    friends.requests = res.data.requests
    friends.online = res.data.online
  } catch (err) {
    // offline for a moment: try again next minute
  }
}

// Logged in: start pinging. Logged out: stop and reset.
export function startFriends() {
  clearInterval(timer)
  timer = setInterval(pingFriends, 60 * 1000)
  pingFriends()
}
export function stopFriends() {
  clearInterval(timer)
  friends.requests = 0
  friends.online = 0
  friends.open = false
}

// "Online" / "Active 5 min ago" / "Active 2 days ago"
export function lastActiveText(f) {
  if (f.online) return 'Online'
  if (!f.lastActiveAt) return 'Not active yet'
  const mins = Math.round((Date.now() - new Date(f.lastActiveAt).getTime()) / 60000)
  if (mins < 60) return 'Active ' + Math.max(mins, 1) + ' min ago'
  const hours = Math.round(mins / 60)
  if (hours < 24) return 'Active ' + hours + 'h ago'
  const days = Math.round(hours / 24)
  return days === 1 ? 'Active yesterday' : 'Active ' + days + ' days ago'
}

// Copy text; falls back to the old way where the Clipboard API is blocked
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    const box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.position = 'fixed'
    box.style.opacity = '0'
    document.body.appendChild(box)
    box.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch (e) {
      ok = false
    }
    box.remove()
    return ok
  }
}
