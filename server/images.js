// Wikimedia photos, served from our own server: GET /api/img?w=500&src=https://upload.wikimedia.org/... (or thumb.wikimedia.org)
//
// Why: Discover shows ~200 photos. Straight from Wikimedia, each one is a big file from far away, and
// lots at once get slowed down ("too many requests"). Here each photo is
//   - asked for in the size the page needs (500 px for a card, 960 for a banner, not the 5-20 MB original),
//   - downloaded once and kept on disk (server/data/cache/img/), so the next visitor gets it instantly,
//   - sent with "keep this for a year", so the browser doesn't even ask again.
// warmPhotos() downloads a list ahead of time (Discover does this when the server starts).
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'cache', 'img')
const SIZES = [330, 500, 960] // Wikimedia's standard widths (other widths are slow or refused)
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
const AT_ONCE = 4 // downloads from Wikimedia at the same time

let running = 0
// Waiting for a turn: 'first' = someone has the page open right now, 'later' = the warm-up
const waiting = { first: [], later: [] }
const downloading = new Map() // file -> promise (two people asking for the same photo share one download)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// "https://upload.wikimedia.org/.../960px-Kyoto.jpg?utm..." at 500 px -> ".../500px-Kyoto.jpg"
function sizedUrl(src, width) {
  const clean = src.split('?')[0]
  return /\/\d+px-/.test(clean) ? clean.replace(/\/\d+px-/, '/' + width + 'px-') : clean
}
function typeOf(url) {
  const ext = url.split('?')[0].split('.').pop().toLowerCase()
  return TYPES[ext] ? ext : null
}
function fileFor(url) {
  return path.join(DIR, crypto.createHash('sha1').update(url).digest('hex') + '.' + typeOf(url))
}
function allowed(src) {
  try {
    const u = new URL(src)
    return u.protocol === 'https:' && (u.hostname === 'upload.wikimedia.org' || u.hostname === 'thumb.wikimedia.org') && !!typeOf(src)
  } catch (err) {
    return false
  }
}

async function download(url, priority) {
  if (running >= AT_ONCE) await new Promise((resolve) => waiting[priority === 'later' ? 'later' : 'first'].push(resolve))
  running++
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { 'User-Agent': 'ChuiseYourTrip/1.0 (student project)' }, signal: AbortSignal.timeout(15000) })
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1)) // asked to slow down: wait, then try again
        continue
      }
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    }
    return null
  } finally {
    running--
    const next = waiting.first.shift() || waiting.later.shift()
    if (next) next()
  }
}

// The photo's file on disk (downloaded if it isn't there yet), or null
async function photoFile(src, width, priority = 'first') {
  const url = sizedUrl(src, width)
  const file = fileFor(url)
  if (fs.existsSync(file)) return file
  if (downloading.has(file)) return downloading.get(file)
  const job = (async () => {
    // A picture smaller than the width we ask for has no copy at that size: use the link as it was
    let data = await download(url, priority)
    if (!data && url !== src.split('?')[0]) data = await download(src.split('?')[0], priority)
    if (!data) return null
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(file, data)
    return file
  })()
  downloading.set(file, job)
  try {
    return await job
  } finally {
    downloading.delete(file)
  }
}

// Express handler for GET /api/img
export async function imageRoute(req, res) {
  const src = String(req.query.src || '')
  let width = Number(req.query.w) || 500
  if (!SIZES.includes(width)) width = 500
  if (!allowed(src)) return res.status(400).end()
  try {
    // Saved already: sent from disk straight away.
    // Not saved yet: the browser is sent to Wikimedia right now (no waiting, and it doesn't hold up the
    // browser's few connections to our server), and ours downloads it for next time
    const file = fileFor(sizedUrl(src, width))
    if (!fs.existsSync(file)) {
      photoFile(src, width).catch(() => null)
      res.set('Cache-Control', 'no-store') // ask us again next time: by then it's saved here
      return res.redirect(src)
    }
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.type(TYPES[typeOf(file)])
    res.sendFile(file)
  } catch (err) {
    res.redirect(src)
  }
}

// Download a list of photos ahead of time, a couple at a time (so it never gets in anyone's way)
export async function warmPhotos(list, width = 500) {
  let next = 0
  async function worker() {
    while (next < list.length) {
      const src = list[next++]
      if (src && allowed(src)) await photoFile(src, width, 'later').catch(() => null)
    }
  }
  await Promise.all([worker(), worker()])
}

// ---------- country flags ----------
// GET /api/flag/jp.svg: the flag as a small picture (a few KB), kept on disk (server/data/cache/flags/)
// so it shows instantly. Not saved yet: the browser is sent to flagcdn.com right away, and ours is saved.
const FLAG_DIR = path.join(path.dirname(DIR), 'flags')
const flagJobs = new Map()

async function flagFile(code) {
  const file = path.join(FLAG_DIR, code + '.svg')
  if (fs.existsSync(file)) return file
  if (flagJobs.has(code)) return flagJobs.get(code)
  const job = (async () => {
    const data = await download('https://flagcdn.com/' + code + '.svg', 'first')
    if (!data || !String(data.slice(0, 200)).includes('<svg')) return null
    fs.mkdirSync(FLAG_DIR, { recursive: true })
    fs.writeFileSync(file, data)
    return file
  })()
  flagJobs.set(code, job)
  try {
    return await job
  } finally {
    flagJobs.delete(code)
  }
}

export function flagRoute(req, res) {
  const code = String(req.params.code || '').toLowerCase().replace(/\.svg$/, '')
  if (!/^[a-z]{2}$/.test(code)) return res.status(400).end()
  const file = path.join(FLAG_DIR, code + '.svg')
  if (fs.existsSync(file)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.type('image/svg+xml')
    return res.sendFile(file)
  }
  flagFile(code).catch(() => null)
  res.set('Cache-Control', 'no-store')
  res.redirect('https://flagcdn.com/' + code + '.svg')
}

// Every country's flag, downloaded ahead of time (about 250 tiny files, once)
export async function warmFlags() {
  const codes = []
  const names = new Intl.DisplayNames(['en'], { type: 'region' })
  for (let a = 97; a <= 122; a++) {
    for (let b = 97; b <= 122; b++) {
      const code = String.fromCharCode(a, b)
      let label = null
      try {
        label = names.of(code.toUpperCase())
      } catch (err) {
        label = null
      }
      if (label && label.toLowerCase() !== code && !fs.existsSync(path.join(FLAG_DIR, code + '.svg'))) codes.push(code)
    }
  }
  let next = 0
  async function worker() {
    while (next < codes.length) await flagFile(codes[next++]).catch(() => null)
  }
  await Promise.all([worker(), worker()])
}
