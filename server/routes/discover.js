// City positions and monthly climate for trip destinations (Open-Meteo, free, no key)
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from './auth.js'
import { sharedCache } from '../sharedCache.js'

const router = express.Router()

// ---------- climate for any city (Open-Meteo, free, no key) ----------
// Each city is only looked up once: the cities in the repo file come ready, new ones are kept in the
// database (see sharedCache.js), so every server instance shares them
const REPO_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'discover-climate.json')
let climate = {}
try {
  climate = JSON.parse(fs.readFileSync(REPO_FILE, 'utf8'))
} catch (err) {
  // no file: everything is looked up
}
const climateCache = sharedCache('climate', { keepDays: 365 }) // last year's weather doesn't change

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

// 'Kyoto, Japan' -> { label, lat, lon, cc, temp[12], rain[12] }  (last full year's weather, by month)
async function climateFor(label, want) {
  // want = the country code the browser expects, e.g. 'TR' for "Cappadocia, Turkey"
  // A saved answer in the wrong country (an older lookup picked a same-named town) is looked up again
  if (climate[label] && (!want || climate[label].cc === want)) return climate[label]
  const known = await climateCache.get(label)
  if (known && (!want || known.value.cc === want)) return known.value
  const name = label.split(', ')[0]
  const geo = await getJson('https://geocoding-api.open-meteo.com/v1/search?' + new URLSearchParams({ name, count: '10', language: 'en' }))
  const results = geo.results || []
  // Same country code first (country names differ, e.g. "Türkiye"), else the biggest place with that name
  let place = results.find((r) => want && r.country_code === want)
  if (!place && !want) place = results.slice().sort((a, b) => (b.population || 0) - (a.population || 0))[0]
  if (!place) return null

  const year = new Date().getFullYear() - 1
  const wx = await getJson('https://archive-api.open-meteo.com/v1/archive?' + new URLSearchParams({
    latitude: place.latitude, longitude: place.longitude, start_date: year + '-01-01', end_date: year + '-12-31',
    daily: 'temperature_2m_mean,precipitation_sum', timezone: 'auto'
  }))
  const sum = new Array(12).fill(0)
  const days = new Array(12).fill(0)
  const rain = new Array(12).fill(0)
  const dates = wx.daily.time
  for (let i = 0; i < dates.length; i++) {
    const m = Number(dates[i].slice(5, 7)) - 1
    if (wx.daily.temperature_2m_mean[i] != null) {
      sum[m] += wx.daily.temperature_2m_mean[i]
      days[m]++
    }
    if (wx.daily.precipitation_sum[i] >= 1) rain[m]++
  }
  const temp = []
  for (let m = 0; m < 12; m++) temp.push(days[m] ? Math.round(sum[m] / days[m]) : null)
  const info = { label, lat: place.latitude, lon: place.longitude, cc: place.country_code, temp, rain }
  await climateCache.set(label, info)
  return info
}

// GET /api/discover/cities?names=Kyoto, Japan|Rome, Italy&codes=JP|IT  (up to 20 at a time)
router.get('/cities', requireAuth, async (req, res) => {
  const names = String(req.query.names || '').split('|').map((n) => n.trim()).slice(0, 20)
  const codes = String(req.query.codes || '').split('|')
  const out = []
  // A few at a time, to be gentle with the free API
  for (let i = 0; i < names.length; i += 4) {
    const batch = await Promise.all(names.slice(i, i + 4).map((n, k) => {
      const code = /^[A-Z]{2}$/.test(codes[i + k] || '') ? codes[i + k] : ''
      return n ? climateFor(n, code).catch(() => null) : null
    }))
    for (const c of batch) if (c) out.push(c)
  }
  res.json(out)
})

export default router
