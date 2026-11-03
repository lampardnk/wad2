// One place to tell the user something went wrong (shown by AppToast in App.vue).
// notify('Could not delete the photo.', retryFunction) -> a toast with a "Try again" button.
import { reactive } from 'vue'

export const toast = reactive({
  text: '',
  kind: 'error', // 'error' | 'ok'
  retry: null,   // function to run again, or null
  offline: false // the server can't be reached (shown as a bar until it's back)
})

let timer = null

export function notify(text, retry = null, kind = 'error') {
  toast.text = text
  toast.kind = kind
  toast.retry = retry
  clearTimeout(timer)
  timer = setTimeout(() => { toast.text = '' }, retry ? 12000 : 6000)
}

export function dismiss() {
  toast.text = ''
  toast.retry = null
}

// Called by the axios check in main.js
export function setOffline(isOffline) {
  if (toast.offline === isOffline) return
  toast.offline = isOffline
  if (!isOffline) notify("You're back online. Changes are saving again.", null, 'ok')
}

// The usual "message from the server, or a fallback" text
export function errorText(err, fallback) {
  if (err && err.response && err.response.data && err.response.data.message) return err.response.data.message
  if (err && !err.response) return "Can't reach the server. Check your connection."
  return fallback
}
