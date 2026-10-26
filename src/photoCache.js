// Discover's city photos.
// - PHOTO_CACHE: city id -> photo link. Kept in this browser too, so after a reload every card
//   has its photo straight away (no waiting for the server to say which photo each city has).
// - photoUrl(): the copy of a Wikimedia photo that our server keeps, in the size we need.
// - loadCityPhotos(): asks the server for the photo links it doesn't know yet (all in one go).
// - warmDiscover(): shortly after the app opens, gets the links and loads the first photos in the
//   background, so opening Discover shows them all at once.
import axios from 'axios'
import DATA from './data/discoverCities.json'

const KEY = 'discover-photos-v2' // (v2: forgets a wrong photo for Bath)

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch (err) {
    return {}
  }
}
export const PHOTO_CACHE = loadSaved()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(PHOTO_CACHE))
  } catch (err) {
    // private window / storage full: they're still kept while the app is open
  }
}

// Wikimedia photo -> our server's copy at this width (330 small, 500 card, 960 banner)
export function photoUrl(src, width = 500) {
  if (src && /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(src)) return '/api/img?w=' + width + '&src=' + encodeURIComponent(src)
  return src
}

export function cityId(c) {
  return (c.cityName + '-' + c.country).toLowerCase().replace(/[^a-z]+/g, '-')
}

// Fills PHOTO_CACHE for every Discover city. The server answers within ~1.5 s with what it knows;
// cities it's still looking up are asked for again a few seconds later (onUpdate runs after each answer)
let loading = null
export function loadCityPhotos(onUpdate) {
  if (loading) return loading
  const idOf = {}
  for (const c of DATA.cities) {
    const id = cityId(c)
    if (c.heroImage) PHOTO_CACHE[id] = c.heroImage
    else if (!PHOTO_CACHE[id]) idOf[c.cityName + ', ' + c.country] = id
  }
  async function ask(titles) {
    const asks = []
    for (let i = 0; i < titles.length; i += 60) {
      asks.push(axios.get('/api/discover/photos', { params: { titles: titles.slice(i, i + 60).join('|') }, timeout: 15000 })
        .then((res) => {
          for (const t in res.data) if (res.data[t]) PHOTO_CACHE[idOf[t]] = res.data[t]
        })
        .catch(() => {})) // no photo: that card keeps its plain colour
    }
    await Promise.all(asks)
    save()
    if (onUpdate) onUpdate()
  }
  function missing() {
    const list = []
    for (const t in idOf) if (!PHOTO_CACHE[idOf[t]]) list.push(t)
    return list
  }
  loading = ask(missing()).then(() => {
    loading = null
    // Still looking some up: ask for just those again after 3, 6 and 12 seconds
    let wait = 3000
    function again() {
      const list = missing()
      if (!list.length || wait > 12000) return
      setTimeout(() => ask(list).then(again), wait)
      wait *= 2
    }
    again()
    return PHOTO_CACHE
  })
  return loading
}

// Load photos into the browser's cache, a few at a time
export function preload(urls) {
  let next = 0
  function one() {
    if (next >= urls.length) return
    const img = new Image()
    img.decoding = 'async'
    img.onload = img.onerror = one
    img.src = urls[next++]
  }
  for (let i = 0; i < 4; i++) one()
}

// Shortly after the app opens (not on a slow or data-saving connection): the photo links, then the
// card photos of the flagship cities (what Discover shows first)
let warmed = false
export function warmDiscover() {
  if (warmed) return
  warmed = true
  const conn = navigator.connection
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return
  loadCityPhotos().then(() => {
    const urls = []
    for (const c of DATA.cities) {
      const src = PHOTO_CACHE[cityId(c)]
      if (src && c.tier === 'base') urls.push(photoUrl(src, 500))
    }
    preload(urls)
  })
}
