// Vercel runs this file for every /api/... request (see vercel.json).
// It is the same Express app as `node server/index.js`, without app.listen.
import app from '../server/app.js'

export default app
