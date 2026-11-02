// Local server: `node index.js` (on Vercel, api/index.js uses the same app instead)
import app, { connectDb } from './app.js'
import User from './models/User.js'

const PORT = process.env.PORT || 3000

connectDb()
  .then(async () => {
    console.log('Connected to MongoDB')
    // Make the database's indexes match the User model
    // (adds the unique username/email rules and removes any old ones)
    await User.syncIndexes()
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })
