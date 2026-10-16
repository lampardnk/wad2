// Choices asked when creating a trip. (short = label on the small tiles) The packing list is built from these.
// (server/routes/trips.js keeps the same keys to check what is saved)

export const ACTIVITIES = [
  { key: 'sightseeing', icon: '📸', label: 'Sightseeing' , short: 'Sightseeing' },
  { key: 'food', icon: '🍜', label: 'Food hunting' , short: 'Food' },
  { key: 'shopping', icon: '🛍', label: 'Shopping' , short: 'Shopping' },
  { key: 'beach', icon: '🏖', label: 'Beach & swimming' , short: 'Beach' },
  { key: 'hiking', icon: '🥾', label: 'Hiking & nature' , short: 'Hiking' },
  { key: 'snow', icon: '⛷', label: 'Snow & skiing' , short: 'Snow' },
  { key: 'themepark', icon: '🎢', label: 'Theme parks' , short: 'Theme parks' },
  { key: 'nightlife', icon: '🍸', label: 'Nice dinners & nightlife' , short: 'Nightlife' },
  { key: 'business', icon: '💼', label: 'Business / work' , short: 'Work' },
  { key: 'camping', icon: '⛺', label: 'Camping' , short: 'Camping' }
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
