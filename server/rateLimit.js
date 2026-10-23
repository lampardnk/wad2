// A simple limit on how many requests one person (by IP address) can make per minute.
// Protects logins from password guessing and our paid/limited outside APIs from a runaway loop.
// Kept in memory: fine for one server; it resets when the server restarts.

export function rateLimit({ max, windowMs = 60 * 1000, message = 'Too many requests. Please wait a moment and try again.' }) {
  const hits = new Map() // key -> { count, resetAt }

  // Forget old entries now and then so the map doesn't grow forever
  setInterval(() => {
    const now = Date.now()
    for (const [key, h] of hits) if (h.resetAt <= now) hits.delete(key)
  }, windowMs).unref()

  return (req, res, next) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    let h = hits.get(key)
    if (!h || h.resetAt <= now) {
      h = { count: 0, resetAt: now + windowMs }
      hits.set(key, h)
    }
    h.count++
    if (h.count > max) {
      res.set('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)))
      return res.status(429).json({ message })
    }
    next()
  }
}
