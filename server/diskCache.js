// A Map that is also kept in a file (server/data/cache/<name>.json), so lookups we've already done
// (where a place is, which photo it has) survive a server restart instead of being asked for again.
// Saving waits a few seconds, so a burst of new entries is written once.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'cache')

export function diskMap(name, maxEntries = 5000) {
  const file = path.join(DIR, name + '.json')
  const map = new Map()
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
    for (const [k, v] of saved) map.set(k, v)
  } catch (err) {
    // no file yet: start empty
  }
  let timer = null
  function save() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        fs.mkdirSync(DIR, { recursive: true })
        fs.writeFileSync(file, JSON.stringify([...map]))
      } catch (err) {
        console.warn('Could not save the ' + name + ' cache:', err.message)
      }
    }, 3000)
  }
  // Same use as a Map: get, has, set, delete, size, keys
  return {
    get: (k) => map.get(k),
    has: (k) => map.has(k),
    keys: () => map.keys(),
    get size() {
      return map.size
    },
    set(k, v) {
      if (!map.has(k) && map.size >= maxEntries) map.delete(map.keys().next().value) // drop the oldest
      map.set(k, v)
      save()
      return this
    },
    delete(k) {
      const had = map.delete(k)
      if (had) save()
      return had
    }
  }
}
