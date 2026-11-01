const COMMON = new Set([
  'password', 'password1', 'password123', 'qwerty123', 'iloveyou', 'admin123', 'welcome1', 'letmein1'
])
const MAX_RUN = 3 // 4 or more in a row is rejected

// True if the password has a run longer than max of the same character
// (aaaa, 1111) or of sequential letters/digits (abcd, 1234, dcba, 4321)
function hasLongRun(p, max) {
  const s = p.toLowerCase()
  let asc = 1, desc = 1, same = 1
  for (let i = 1; i < s.length; i++) {
    const bothAlnum = /[a-z0-9]/.test(s[i]) && /[a-z0-9]/.test(s[i - 1])
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1)
    asc = bothAlnum && d === 1 ? asc + 1 : 1
    desc = bothAlnum && d === -1 ? desc + 1 : 1
    same = s[i] === s[i - 1] ? same + 1 : 1
    if (asc > max || desc > max || same > max) return true
  }
  return false
}

// Returns an error message, or null if the password is acceptable
export function passwordProblem(password, { username = '', email = '' } = {}) {
  const p = String(password || '')
  const lower = p.toLowerCase()

  if (p.length < 8) return 'Password must be at least 8 characters.'
  if (p.length > 72) return 'Password must be 72 characters or fewer.' // bcrypt ignores anything past 72 bytes
  if (!/[a-z]/.test(p)) return 'Password needs at least one lowercase letter.'
  if (!/[A-Z]/.test(p)) return 'Password needs at least one uppercase letter.'
  if (!/\d/.test(p)) return 'Password needs at least one number.'
  if (!/[^A-Za-z0-9\s]/.test(p)) return 'Password needs at least one special character (e.g. ! @ # $ %).'
  if (hasLongRun(p, MAX_RUN)) {
    return "Password can't have more than 3 repeated or sequential characters in a row (like 1111, 1234 or abcd)."
  }
  if (COMMON.has(lower)) return 'That password is too easy to guess. Try something less common.'

  const local = String(email).split('@')[0].toLowerCase()
  if (username.length >= 3 && lower.includes(username.toLowerCase())) {
    return "Your password can't contain your username."
  }
  if (local.length >= 4 && lower.includes(local)) {
    return "Your password can't contain your email name."
  }
  return null
}