// Loads MapLibre GL (free, open-source 3D maps, no API key) from a CDN the first time it's needed
let loading = null

export function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'
    script.onload = () => resolve(window.maplibregl)
    script.onerror = () => {
      loading = null
      reject(new Error('3D map could not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}
