// Discover: public holidays per country (Nager.Date, free, no key), cached for a day
import express from 'express'
import { wikiFetch } from '../politeFetch.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from './auth.js'

const router = express.Router()
const cache = {} // 'JP-2026' -> { at, list }

async function holidaysFor(cc, year) {
  const key = cc + '-' + year
  if (cache[key] && Date.now() - cache[key].at < 24 * 3600 * 1000) return cache[key].list
  let list = []
  try {
    const res = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + year + '/' + cc, { signal: AbortSignal.timeout(8000) })
    if (res.ok && res.status === 200) {
      const data = await res.json()
      for (const h of data) list.push({ date: h.date, name: h.localName && h.localName !== h.name ? h.name + ' (' + h.localName + ')' : h.name })
    }
  } catch (err) {
    list = null // unknown, try again next time
  }
  if (list) cache[key] = { at: Date.now(), list }
  return list || []
}

// GET /api/discover/holidays?countries=JP,TH&years=2026,2027 -> { JP: [{ date, name }], TH: [...] }
router.get('/holidays', requireAuth, async (req, res) => {
  const countries = String(req.query.countries || '').split(',').filter((c) => /^[A-Z]{2}$/.test(c)).slice(0, 30)
  const years = String(req.query.years || '').split(',').map(Number).filter((y) => y >= 2024 && y <= 2035).slice(0, 2)
  const out = {}
  await Promise.all(countries.map(async (cc) => {
    out[cc] = []
    for (const y of years) out[cc] = out[cc].concat(await holidaysFor(cc, y))
  }))
  res.json(out)
})

// ---------- climate for any city (Open-Meteo, free, no key) ----------
// Saved to a file, so each city is only looked up once ever
const CACHE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'discover-climate.json')
let climate = {}
try {
  climate = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
} catch (err) {
  climate = {}
}
let saveTimer = null
function saveClimate() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
      fs.writeFileSync(CACHE_FILE, JSON.stringify(climate))
    } catch (err) {
      console.warn('Could not save the climate cache:', err.message)
    }
  }, 1000)
}

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
  climate[label] = info
  saveClimate()
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

// ---------- a short description + photo (Wikipedia) ----------
// Tries "Queenstown, New Zealand" first, then "Queenstown", skipping "may refer to" (disambiguation) pages
// Kept on disk too (server/data/discover-about.json), so a server restart doesn't ask Wikipedia for
// hundreds of photos again (that's what got us "too many requests" before)
const ABOUT_FILE = path.join(path.dirname(CACHE_FILE), 'discover-about.json')
let about = {}
try {
  about = JSON.parse(fs.readFileSync(ABOUT_FILE, 'utf8'))
} catch (err) {
  about = {}
}
let aboutTimer = null
function saveAbout() {
  clearTimeout(aboutTimer)
  aboutTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(ABOUT_FILE), { recursive: true })
      fs.writeFileSync(ABOUT_FILE, JSON.stringify(about))
    } catch (err) {
      console.warn('Could not save the Wikipedia cache:', err.message)
    }
  }, 2000)
}

// The article's photo at a sensible size. The original can be 5-20 MB (that's why cards stayed empty);
// Wikimedia makes copies in standard widths, and 960 px is plenty for a card or a banner.
function photoOf(data) {
  const original = data.originalimage
  const thumb = data.thumbnail
  if (!thumb) return original ? original.source : null
  if (original && original.width > 960 && /\/\d+px-/.test(thumb.source)) return thumb.source.replace(/\/\d+px-/, '/960px-')
  return original ? original.source : thumb.source
}

async function wikiSummary(title, priority) {
  const res = await wikiFetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')), {
    headers: { 'User-Agent': 'ChuiseYourTrip/1.0 (student project)' },
    signal: AbortSignal.timeout(10000)
  }, priority)
  if (!res.ok) return null
  const data = await res.json()
  if (data.type === 'disambiguation' || !data.extract) return null
  return {
    text: data.extract,
    photo: photoOf(data),
    page: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : null
  }
}

// GET /api/discover/about?title=Queenstown, New Zealand
// Public: Discover works for guests too
// Wikipedia summary + photo for a title ("Kyoto, Japan" also tries "Kyoto"). Good answers are cached.
async function lookupAbout(title, priority) {
  if (about[title]) return about[title]
  const tries = [title]
  if (title.includes(', ')) tries.push(title.split(', ')[0])
  for (const t of tries) {
    try {
      const found = await wikiSummary(t, priority)
      if (found) {
        about[title] = found // only good answers are kept, so a hiccup is retried next time
        saveAbout()
        return found
      }
    } catch (err) {
      // try the next name
    }
  }
  return { text: '', photo: null, page: null }
}

router.get('/about', async (req, res) => {
  const title = String(req.query.title || '').trim().slice(0, 100)
  if (!title) return res.status(400).json({ message: 'Which city?' })
  res.json(await lookupAbout(title))
})

// GET /api/discover/photos?titles=Kyoto, Japan|Osaka, Japan  -> { "Kyoto, Japan": "https://...jpg", ... }
// Many photos in one request (Discover needs ~200), looked up a few at a time to be kind to Wikipedia.
router.get('/photos', async (req, res) => {
  const titles = String(req.query.titles || '').split('|').map((t) => t.trim().slice(0, 100)).filter(Boolean).slice(0, 50)
  const out = {}
  let next = 0
  async function worker() {
    while (next < titles.length) {
      const t = titles[next++]
      out[t] = (await lookupAbout(t, 'later')).photo || null // behind the photos someone is looking at
    }
  }
  const workers = []
  for (let i = 0; i < 6; i++) workers.push(worker())
  await Promise.all(workers)
  res.json(out)
})

export default router
