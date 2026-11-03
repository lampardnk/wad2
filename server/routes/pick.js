// Picking a real place. Typed text goes to Geoapify and nowhere else; everything after this
// works with the map point ({ name, address, lat, lon }) the user picked.
//   GET /api/place/suggest?q=kinkakuji&near=35.01,135.76  -> [place]   (empty = nothing matches)
//   GET /api/place/reverse?lat=35.03&lon=135.72          -> place     (a dropped pin)
//   GET /api/place/from-link?url=https://maps.app.goo.gl/... -> place (a pasted Google Maps link)
import express from 'express'
import { requireAuth } from './auth.js'
import { geoapifyReady, geoapifyAutocomplete, geoapifyReverse } from '../geoapify.js'
import { isGoogleMapsLink, isShortLink, pointFromMapsLink } from '../mapsLink.js'
import { sharedCache } from '../sharedCache.js'

const router = express.Router()
const suggestions = sharedCache('place-suggest', { keepDays: 30 })
const NOT_READY = 'Place search is not set up on this server (GEOAPIFY_KEY is missing).'

function point(lat, lon) {
  lat = Number(lat)
  lon = Number(lon)
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null
}

router.get('/suggest', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 2 || q.length > 120) return res.json([])
  if (!geoapifyReady()) return res.status(503).json({ message: NOT_READY })
  const [lat, lon] = String(req.query.near || '').split(',')
  const near = point(lat, lon)
  const key = q.toLowerCase() + '|' + (near ? near.lat.toFixed(2) + ',' + near.lon.toFixed(2) : '')
  const saved = await suggestions.get(key)
  if (saved) return res.json(saved.value)
  try {
    const list = await geoapifyAutocomplete({ q, near })
    await suggestions.set(key, list)
    res.json(list)
  } catch (err) {
    console.error('Place suggest failed:', err.message)
    res.status(502).json({ message: 'Place search is unavailable right now. Try again in a moment.' })
  }
})

router.get('/reverse', requireAuth, async (req, res) => {
  const p = point(req.query.lat, req.query.lon)
  if (!p) return res.status(400).json({ message: 'That is not a point on the map.' })
  const pinned = { name: 'Pinned spot', address: p.lat.toFixed(5) + ', ' + p.lon.toFixed(5), lat: p.lat, lon: p.lon }
  if (!geoapifyReady()) return res.json(pinned)
  try {
    const found = await geoapifyReverse(p.lat, p.lon)
    // Keep the exact pin; the lookup only gives it a name and address
    res.json(found ? { ...found, lat: p.lat, lon: p.lon } : pinned)
  } catch (err) {
    res.json(pinned)
  }
})

// Short links (maps.app.goo.gl) are followed hop by hop, only ever to Google's own addresses
async function expand(link) {
  let url = link
  for (let hop = 0; hop < 5 && isShortLink(url); hop++) {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000) })
    const next = r.headers.get('location')
    if (!next) break
    url = new URL(next, url).toString()
    if (!isGoogleMapsLink(url)) {
      // Google's consent page carries the real link in ?continue=
      const cont = new URL(url).searchParams.get('continue')
      if (cont && isGoogleMapsLink(cont)) url = cont
      else return null
    }
  }
  return url
}

router.get('/from-link', requireAuth, async (req, res) => {
  const link = String(req.query.url || '').trim().slice(0, 2000)
  if (!isGoogleMapsLink(link)) return res.status(400).json({ message: 'That is not a Google Maps link.' })
  let full = link
  try {
    if (isShortLink(link)) full = await expand(link)
  } catch (err) {
    full = null
  }
  const found = full && pointFromMapsLink(full)
  if (!found) {
    return res.status(422).json({ message: 'This link has no location in it. Open the place in Google Maps, tap Share, and paste that link, or pick from the suggestions.' })
  }
  let place = { name: found.name || 'Pinned spot', address: found.lat.toFixed(5) + ', ' + found.lon.toFixed(5), lat: found.lat, lon: found.lon }
  if (geoapifyReady()) {
    try {
      const near = await geoapifyReverse(found.lat, found.lon)
      if (near) place = { ...near, name: found.name || near.name, lat: found.lat, lon: found.lon }
    } catch (err) {
      // keep the point and the name from the link
    }
  }
  res.json(place)
})

export default router
