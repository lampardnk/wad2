import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// GET /api/icons/Backpack -> a 3D picture of a backpack (PNG)
// The pictures are Microsoft's free Fluent Emoji 3D set (MIT licence, github.com/microsoft/fluentui-emoji).
// Each one is downloaded the first time it's asked for, then saved in server/data/icons, so it's only fetched once.
const router = express.Router()
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'icons')
const BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'
const missing = new Map() // name -> when we last found nothing (try again after an hour)

router.get('/:name', async (req, res) => {
  const name = String(req.params.name || '')
  // Only plain names like "Hiking boot" or "T-shirt" (nothing that could reach other folders)
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-']{0,40}$/.test(name)) return res.status(400).end()
  const file = path.join(DIR, name.toLowerCase().replace(/[ ']/g, '_') + '.png')
  res.set('Cache-Control', 'public, max-age=604800') // browsers keep it for a week

  if (fs.existsSync(file)) return res.type('png').sendFile(file)
  if (missing.has(name) && Date.now() - missing.get(name) < 3600000) return res.status(404).end()

  try {
    // "Hiking boot" -> assets/Hiking boot/3D/hiking_boot_3d.png
    const url = BASE + encodeURIComponent(name) + '/3D/' + encodeURIComponent(name.toLowerCase().replace(/ /g, '_')) + '_3d.png'
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const png = Buffer.from(await response.arrayBuffer())
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(file, png)
    res.type('png').send(png)
  } catch (err) {
    missing.set(name, Date.now())
    res.status(404).end() // the app shows the normal emoji instead
  }
})

export default router
