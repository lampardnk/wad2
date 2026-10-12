// Choices asked when creating a trip. The packing list is built from these.
// (server/routes/trips.js keeps the same keys to check what is saved)

export const ACTIVITIES = [
  { key: 'sightseeing', icon: '📸', label: 'Sightseeing' },
  { key: 'food', icon: '🍜', label: 'Food hunting' },
  { key: 'shopping', icon: '🛍', label: 'Shopping' },
  { key: 'beach', icon: '🏖', label: 'Beach & swimming' },
  { key: 'hiking', icon: '🥾', label: 'Hiking & nature' },
  { key: 'snow', icon: '⛷', label: 'Snow & skiing' },
  { key: 'themepark', icon: '🎢', label: 'Theme parks' },
  { key: 'nightlife', icon: '🍸', label: 'Nice dinners & nightlife' },
  { key: 'business', icon: '💼', label: 'Business / work' },
  { key: 'camping', icon: '⛺', label: 'Camping' }
]

export const WEATHER = [
  { key: 'hot', icon: '☀️', label: 'Hot' },
  { key: 'mild', icon: '🌤', label: 'Mild' },
  { key: 'cold', icon: '🧥', label: 'Cold' },
  { key: 'rain', icon: '🌧', label: 'Rainy' }
]

export const EXTRAS = [
  { key: 'laundry', icon: '🧺', label: 'Can do laundry' },
  { key: 'carryon', icon: '🎒', label: 'Carry-on only' },
  { key: 'kids', icon: '🧸', label: 'Kids coming' },
  { key: 'flight', icon: '✈️', label: 'Long flight' }
]
