// Discover: public holidays per country (Nager.Date, free, no key), cached for a day
import express from 'express'
import { wikiFetch } from '../politeFetch.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from './auth.js'
import { warmPhotos, warmFlags } from '../images.js'
import { wikiGalleryPhoto } from './places.js'

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
// A flag, map or logo isn't a photo of the place (Vietnam's article starts with its flag):
// those answers are forgotten, so they're looked up again with the backups below
const NOT_A_PHOTO = /flag_of|\.svg|locator|_map|map_of|coat_of_arms|logo/i
for (const t in about) {
  if (about[t].photo && NOT_A_PHOTO.test(about[t].photo)) delete about[t]
}
// An answer from before searches were checked against the city's location (a runner for "Bath")
if (about['Bath, United Kingdom'] && /Becky_Briggs/.test(about['Bath, United Kingdom'].page || '')) delete about['Bath, United Kingdom']
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
  const photo = photoOf(data)
  return {
    text: data.extract,
    photo: photo && !NOT_A_PHOTO.test(photo) ? photo : null,
    page: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : null
  }
}

// Backup when no article has exactly that name ("Hoi An" is "Hội An", "Bath" is "Bath, Somerset",
// "Jeju" is a list of meanings): Wikipedia's own search, its top result's picture and first sentences
// near = { lat, lon } of a Discover city: the answer must be an article about a place within 60 km
// (a search for "Bath United Kingdom" once came back with a runner from Bath)
const CITY_AT = {}
try {
  const cityFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'discoverCities.json')
  for (const c of JSON.parse(fs.readFileSync(cityFile, 'utf8')).cities) CITY_AT[c.cityName + ', ' + c.country] = { lat: c.lat, lon: c.lon }
} catch (err) {
  // no city list: searches aren't checked
}
function kmBetween(a, b) {
  const rad = Math.PI / 180
  const x = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}
// A wide photo taken within 10 km of a place (Wikimedia Commons knows where many photos were taken)
async function photoTakenNear(near, priority) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', generator: 'geosearch', ggscoord: near.lat + '|' + near.lon, ggsradius: '10000',
    ggsnamespace: '6', ggslimit: '40', prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: '960', format: 'json'
  })
  const res = await wikiFetch(url, { headers: { 'User-Agent': 'ChuiseYourTrip/1.0 (student project)' }, signal: AbortSignal.timeout(10000) }, priority)
  if (!res.ok) return null
  const data = await res.json()
  const pages = Object.values((data.query && data.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0)) // nearest first
  const skip = /map|flag|logo|sign|plan|diagram|chart|icon|seal|coat|panel|ticket|menu/i
  for (const p of pages) {
    const info = p.imageinfo && p.imageinfo[0]
    if (!info || info.mime !== 'image/jpeg' || skip.test(p.title)) continue
    if (info.width < 1200 || info.width < info.height * 1.3) continue // wide, big photos only
    return info.thumburl || info.url
  }
  return null
}

async function wikiSearch(query, priority, near) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: query, gsrlimit: near ? '5' : '1', redirects: '1',
    prop: 'pageimages|extracts|info|coordinates', piprop: 'thumbnail', pithumbsize: '960',
    exintro: '1', explaintext: '1', exsentences: '3', inprop: 'url', format: 'json'
  })
  const res = await wikiFetch(url, { headers: { 'User-Agent': 'ChuiseYourTrip/1.0 (student project)' }, signal: AbortSignal.timeout(10000) }, priority)
  if (!res.ok) return null
  const data = await res.json()
  const pages = Object.values((data.query && data.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0)) // best match first
  for (const p of pages) {
    if (!p.extract) continue
    if (near && !(p.coordinates && p.coordinates[0] && kmBetween(near, p.coordinates[0]) < 60)) continue // not the place itself
    const photo = p.thumbnail ? p.thumbnail.source : null
    return { text: p.extract, photo: photo && !NOT_A_PHOTO.test(photo) ? photo : null, page: p.fullurl || null }
  }
  return null
}

// GET /api/discover/about?title=Queenstown, New Zealand
// Public: Discover works for guests too
// Wikipedia summary + photo for a title ("Kyoto, Japan" also tries "Kyoto"). Good answers are cached.
// Answers without a photo are kept for an hour only (in memory), so they're tried again later
const noPhoto = new Map() // title -> { at, answer }
// (two people asking for the same title at once share one lookup)
const lookingUp = new Map()
function lookupAbout(title, priority) {
  if (about[title]) return Promise.resolve(about[title])
  const miss = noPhoto.get(title)
  if (miss && Date.now() - miss.at < 3600 * 1000) return Promise.resolve(miss.answer)
  if (lookingUp.has(title)) return lookingUp.get(title)
  const job = findAbout(title, priority).finally(() => lookingUp.delete(title))
  lookingUp.set(title, job)
  return job
}
// The answer we have within `ms`, or null (the lookup carries on, so it's ready when asked again)
function lookupWithin(title, ms, priority) {
  const job = lookupAbout(title, priority).catch(() => null)
  return Promise.race([job, new Promise((resolve) => setTimeout(() => resolve(null), ms))])
}
async function findAbout(title, priority) {
  // "Kyoto, Japan", then "Kyoto"; a country also tries "Tourism in Vietnam" (its own article often starts with the flag)
  const tries = [title]
  if (title.includes(', ')) tries.push(title.split(', ')[0])
  else tries.push('Tourism in ' + title)
  let best = null
  for (const t of tries) {
    try {
      const found = await wikiSummary(t, priority)
      if (found && found.photo) return keep(title, found)
      if (found && !best) best = found
    } catch (err) {
      // try the next name
    }
  }
  try {
    const found = await wikiSearch(title.replace(/, /g, ' '), priority, CITY_AT[title])
    if (found && found.photo) return keep(title, best ? { ...best, photo: found.photo } : found)
    if (found && !best) best = found
  } catch (err) {
    // no answer this time
  }
  // Last try: any wide photo further down the article (e.g. Bali's first picture is a map)
  for (const t of tries) {
    try {
      const wide = await wikiGalleryPhoto(t, 960, priority)
      if (wide && wide.url) return keep(title, { text: best ? best.text : '', photo: wide.url, page: best ? best.page : wide.page })
    } catch (err) {
      // try the next name
    }
  }
  // Still nothing (small places like Maafushi have no picture in their article): a wide photo
  // someone took right there, from Wikimedia Commons, found by the city's location
  if (CITY_AT[title]) {
    try {
      const nearby = await photoTakenNear(CITY_AT[title], priority)
      if (nearby) return keep(title, { text: best ? best.text : '', photo: nearby, page: best ? best.page : null })
    } catch (err) {
      // no photo this time
    }
  }
  const answer = best || { text: '', photo: null, page: null }
  noPhoto.set(title, { at: Date.now(), answer })
  return answer
}
// Good answers (with a photo) are kept for good, on disk
function keep(title, found) {
  about[title] = found
  saveAbout()
  noPhoto.delete(title)
  return found
}

router.get('/about', async (req, res) => {
  const title = String(req.query.title || '').trim().slice(0, 100)
  if (!title) return res.status(400).json({ message: 'Which city?' })
  // Never keep the page waiting more than 1.5 s: "pending" = ask again in a moment
  const found = await lookupWithin(title, 1500, 'first')
  res.json(found || { text: '', photo: null, page: null, pending: true })
})

// GET /api/discover/photos?titles=Kyoto, Japan|Osaka, Japan  -> { "Kyoto, Japan": "https://...jpg", ... }
// Many photos in one request (Discover needs ~200), looked up a few at a time to be kind to Wikipedia.
router.get('/photos', async (req, res) => {
  const titles = String(req.query.titles || '').split('|').map((t) => t.trim().slice(0, 100)).filter(Boolean).slice(0, 300)
  // Known photos straight away; new ones get 1.5 s, then the answer goes without them (null) and
  // their lookups carry on, so the page's next ask (a few seconds later) gets them
  const out = {}
  await Promise.all(titles.map(async (t) => {
    const found = await lookupWithin(t, 1500, 'first')
    out[t] = found ? found.photo || null : null
  }))
  res.json(out)
})

// ---------- warm-up ----------
// A little after the server starts: look up every Discover city's (and country's) photo and download
// it into the disk cache, so the first person to open Discover gets them all at once.
// Already-cached ones are skipped in a moment, so after the first run this costs nothing.
setTimeout(async () => {
  try {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'discoverCities.json')
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const cityTitles = []
    for (const c of data.cities) if (!c.heroImage) cityTitles.push(c.cityName + ', ' + c.country)
    const photoOfTitle = (t) => (about[t] && about[t].photo) || null
    // 0) Every country's flag (the country banners): tiny, so first
    await warmFlags()
    // 1) Photos we already know: download them first (no lookups needed)
    await warmPhotos(cityTitles.map(photoOfTitle).filter(Boolean), 500)
    // 2) Then look up the cities we don't know yet, and download those
    const cards = []
    for (const t of cityTitles) if (!photoOfTitle(t)) cards.push((await lookupAbout(t, 'later')).photo)
    await warmPhotos(cards.filter(Boolean), 500)
    console.log('Discover photos ready')
  } catch (err) {
    console.warn('Discover photo warm-up skipped:', err.message)
  }
}, 4000)

export default router
