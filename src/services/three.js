// Loads Three.js (3D drawing in the browser, MIT licence) from a CDN the first time it's needed,
// so the app itself doesn't get bigger. Used by the Travel Twin studio.
const HOSTS = [
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
]
let loading = null

export function loadThree() {
  if (loading) return loading
  loading = (async () => {
    for (const url of HOSTS) {
      try {
        return await import(/* @vite-ignore */ url)
      } catch (err) {
        // try the next host
      }
    }
    loading = null
    throw new Error('3D preview could not load')
  })()
  return loading
}
