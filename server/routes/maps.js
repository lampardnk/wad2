import express from 'express'
import { requireAuth } from './auth.js'

// GET /api/maps/config -> which map tiles the browser should use.
// With MAPTILER_KEY in server/.env: MapTiler's softer style (free account, key from maptiler.com).
// Without it: OpenStreetMap's standard tiles (free, no key).
// Map tile keys always end up in the browser (they are part of every tile URL), so in the MapTiler
// dashboard limit the key to your site's address (e.g. http://localhost:5173) so nobody else can use it.
const router = express.Router()

router.get('/config', requireAuth, (req, res) => {
  const key = (process.env.MAPTILER_KEY || '').trim()
  const style = (process.env.MAPTILER_STYLE || 'streets-v2').trim() // e.g. streets-v2, pastel, dataviz, outdoor-v2
  if (key && /^[A-Za-z0-9_-]+$/.test(key) && /^[a-z0-9-]+$/.test(style)) {
    return res.json({
      tiles: 'https://api.maptiler.com/maps/' + style + '/256/{z}/{x}/{y}.png?key=' + key,
      attribution: '© <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      provider: 'maptiler'
    })
  }
  res.json({
    tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    provider: 'osm'
  })
})

export default router
