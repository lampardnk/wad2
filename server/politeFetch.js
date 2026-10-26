// Being polite to the free services we use, so they don't block us with "429 Too many requests".
//
// Wikipedia / Wikidata / Wikimedia Commons: at most 3 requests at a time from this server.
// If one answers 429, every Wikimedia request waits a few seconds, then that one is tried once more.
//
// Overpass (OpenStreetMap): one big query at a time, and a server that said 429 is left alone for a minute.

const WIKI_AT_ONCE = 3
let wikiRunning = 0
// Requests waiting for a turn. "first" = something on screen right now (e.g. the sights of the country
// you just opened); "later" = big background batches (photos for every Discover city).
const wikiWaiting = { first: [], later: [] }
let wikiPausedUntil = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Wait for a free place in the queue
async function wikiTurn(priority) {
  if (wikiRunning >= WIKI_AT_ONCE) await new Promise((resolve) => wikiWaiting[priority === 'later' ? 'later' : 'first'].push(resolve))
  wikiRunning++
}
function wikiDone() {
  wikiRunning--
  const next = wikiWaiting.first.shift() || wikiWaiting.later.shift()
  if (next) next()
}

// Same as fetch(), for Wikimedia sites. priority 'later' = waits behind everything else.
export async function wikiFetch(url, options = {}, priority = 'first') {
  await wikiTurn(priority)
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const pause = wikiPausedUntil - Date.now()
      if (pause > 0) await sleep(pause)
      const response = await fetch(url, options)
      if (response.status !== 429 || attempt === 1) return response
      // Too many requests: everyone slows down for a moment (Wikimedia says how long in Retry-After)
      const seconds = Math.min(5, Number(response.headers.get('retry-after')) || 3)
      wikiPausedUntil = Date.now() + seconds * 1000
      console.warn('Wikimedia asked us to slow down; waiting ' + seconds + ' s')
    }
  } finally {
    wikiDone()
  }
}

// ----- Overpass -----
let overpassBusy = Promise.resolve()
const resting = new Map() // server -> time it can be asked again

// Run one Overpass job at a time (the next one starts when the last one ends, even if it failed)
export function overpassInTurn(job) {
  const run = overpassBusy.then(job, job)
  overpassBusy = run.catch(() => {})
  return run
}

export function serverIsResting(server) {
  return (resting.get(server) || 0) > Date.now()
}
export function restServer(server, seconds) {
  resting.set(server, Date.now() + seconds * 1000)
}
