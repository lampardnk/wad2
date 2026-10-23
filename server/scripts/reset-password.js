// Set a new password for an account (for testing, when you've forgotten one).
// Run from the server folder:  node scripts/reset-password.js <username> <new password>
// Passwords are stored hashed, so the old one can't be read back, only replaced.
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const [username, password] = process.argv.slice(2)
if (!username || !password) {
  console.log('Usage: node scripts/reset-password.js <username> <new password>')
  process.exit(1)
}
if (password.length < 8) {
  console.log('Pick a password with at least 8 characters (same rule as sign-up).')
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI)
const user = await User.findOne({ username: username.toLowerCase() })
if (!user) {
  console.log('No account with the username "' + username + '".')
} else {
  user.passwordHash = await bcrypt.hash(password, 10)
  await user.save()
  console.log('Done: @' + user.username + ' can now sign in with the new password.')
}
await mongoose.disconnect()
