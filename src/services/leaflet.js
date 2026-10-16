// Loads Leaflet (the map library) from a CDN the first time a map is shown,
// so it doesn't need installing and isn't downloaded on pages without a map.
let loading = null

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(window.L)
    script.onerror = () => {
      loading = null
      reject(new Error('Map could not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}
