// Real requests to the running server, as the test account (see playwright.config.js for the env vars).
// Each test file makes its own trip and deletes it afterwards, so no real data is touched.
import axios from 'axios'

axios.defaults.baseURL = process.env.API_URL || 'http://localhost:3000'

export async function logIn() {
  const res = await axios.post('/api/auth/login', { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD })
  axios.defaults.headers.common.Authorization = 'Bearer ' + res.data.token
  return res.data.user
}

// A trip starting in 30 days (so it isn't archived)
export async function createTrip(details = {}) {
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
  const res = await axios.post('/api/trips', { name: 'Test trip', destinations: ['Kyoto, Japan'], startDate: day(30), endDate: day(32), ...details })
  return res.data
}

export async function getTrip(id) {
  return (await axios.get('/api/trips/' + id)).data
}

export async function deleteTrip(id) {
  await axios.delete('/api/trips/' + id)
}

export { axios }

// Real requests take a moment: check again every 50 ms (up to 3 s) until check() is true
export async function waitFor(check, ms = 3000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await check()) return true
    await new Promise((r) => setTimeout(r, 50))
  }
  return false
}
