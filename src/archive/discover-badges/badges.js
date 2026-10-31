// ---------- badges (small achievements, kept in this browser; they can feed Missions later) ----------
const BADGES = [
  { id: 'quiz', name: 'Know thyself', how: 'Finished the vibe quiz', doodle: 'sparkle' },
  { id: 'spin', name: 'Lucky spin', how: 'Spun the globe', doodle: 'compass' },
  { id: 'gem', name: 'Gem hunter', how: 'Packed a hidden gem', doodle: 'heart' },
  { id: 'legend', name: 'Legend finder', how: 'Packed a Legendary city', doodle: 'star' },
  { id: 'packed', name: 'Packed and ready', how: 'Filled your suitcase (5 cities)', doodle: 'suitcase' },
  { id: 'globetrotter', name: 'Globetrotter', how: 'Explored 5 continents', doodle: 'plane' }
]
const badges = ref(readList('dx-badges-v1'))
const badgesOpen = ref(false)
const toast = ref(null)
let toastTimer = null
function award(id) {
  if (badges.value.includes(id)) return
  badges.value = badges.value.concat(id)
  saveList('dx-badges-v1', badges.value)
  toast.value = BADGES.find((b) => b.id === id)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3800)
}
