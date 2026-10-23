// New accounts get a "set up your needs" prompt on Home, until they open Settings from it or close it.
// Kept per account in this browser (localStorage), so someone else logging in here doesn't see it.
function keyFor(userId) {
  return 'chuise-setup-needs-' + userId
}

export function markNewAccount(userId) {
  try {
    localStorage.setItem(keyFor(userId), '1')
  } catch (err) {
    // storage blocked (private window): just no prompt
  }
}

export function needsSetup(userId) {
  try {
    return !!userId && localStorage.getItem(keyFor(userId)) === '1'
  } catch (err) {
    return false
  }
}

export function setupDone(userId) {
  try {
    localStorage.removeItem(keyFor(userId))
  } catch (err) {
    // nothing to clear
  }
}
