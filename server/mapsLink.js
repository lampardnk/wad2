// Reads the map point out of a Google Maps link. Only the numbers in the link are used, never its text.
// https://www.google.com/maps/place/Kinkaku-ji/@35.0394,135.7292,17z/data=...!3d35.0393!4d135.7292
//   -> { lat: 35.0393, lon: 135.7292, name: 'Kinkaku-ji' }

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)'

export function isGoogleMapsLink(text) {
  let url
  try {
    url = new URL(String(text).trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return true
  return /^(www\.|maps\.)?google\.[a-z.]{2,6}$/.test(host) && (host.startsWith('maps.') || url.pathname.startsWith('/maps'))
}

export function isShortLink(text) {
  try {
    const host = new URL(String(text).trim()).hostname.toLowerCase()
    return host === 'maps.app.goo.gl' || host === 'goo.gl'
  } catch {
    return false
  }
}

function valid(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null
}

export function pointFromMapsLink(text) {
  let url
  try {
    url = new URL(String(text).trim())
  } catch {
    return null
  }
  const full = decodeURIComponent(url.pathname + url.search + url.hash)
  let point = null
  // 1. The place's own pin (most exact)
  const pin = full.match(new RegExp('!3d' + NUM + '!4d' + NUM))
  if (pin) point = valid(Number(pin[1]), Number(pin[2]))
  // 2. "lat,lon" given as the search, destination or centre
  if (!point) {
    for (const key of ['q', 'query', 'destination', 'll', 'center']) {
      const v = url.searchParams.get(key)
      const m = v && v.trim().match(new RegExp('^' + NUM + ',\\s*' + NUM + '$'))
      if (m) {
        point = valid(Number(m[1]), Number(m[2]))
        if (point) break
      }
    }
  }
  // 3. A place or search path that is itself "lat,lon"
  if (!point) {
    const m = full.match(new RegExp('/(?:place|search)/' + NUM + ',\\+?' + NUM))
    if (m) point = valid(Number(m[1]), Number(m[2]))
  }
  // 4. Where the map was centred (@lat,lon,zoom)
  if (!point) {
    const at = full.match(new RegExp('@' + NUM + ',' + NUM))
    if (at) point = valid(Number(at[1]), Number(at[2]))
  }
  if (!point) return null
  // The place's name, when the link has one (/maps/place/Kinkaku-ji/...)
  const named = url.pathname.match(/\/maps\/place\/([^/@]+)/)
  let name = ''
  if (named) {
    name = decodeURIComponent(named[1].replace(/\+/g, ' ')).trim()
    if (/^-?\d/.test(name)) name = '' // "35.03,135.72" is not a name
  }
  return { ...point, name: name.slice(0, 120) }
}
