// Shared login state for the whole app.
// reactive() means any component showing auth.user updates automatically.
import { reactive } from 'vue'
import axios from 'axios'

const savedUser = localStorage.getItem('user')

export const auth = reactive({
  token: localStorage.getItem('token'),
  user: savedUser ? JSON.parse(savedUser) : null
})

// Send the token with every axios request once logged in
if (auth.token) {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + auth.token
}

export function saveLogin(token, user) {
  auth.token = token
  auth.user = user
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
}

export function logout() {
  auth.token = null
  auth.user = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  delete axios.defaults.headers.common['Authorization']
}
