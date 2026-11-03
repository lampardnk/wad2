// Choices asked when creating a trip (icon = a doodle name, see doodles.js). (short = label on the small tiles) The packing list is built from these.
// (server/routes/trips.js keeps the same keys to check what is saved)

export const ACTIVITIES = [
  { key: 'sightseeing', icon: 'camera', label: 'Sightseeing' , short: 'Sightseeing' },
  { key: 'food', icon: 'bowl', label: 'Food hunting' , short: 'Food' },
  { key: 'shopping', icon: 'bag', label: 'Shopping' , short: 'Shopping' },
  { key: 'beach', icon: 'palm', label: 'Beach & swimming' , short: 'Beach' },
  { key: 'hiking', icon: 'boot', label: 'Hiking & nature' , short: 'Hiking' },
  { key: 'snow', icon: 'snowflake', label: 'Snow & skiing' , short: 'Snow' },
  { key: 'themepark', icon: 'ticket', label: 'Theme parks' , short: 'Theme parks' },
  { key: 'nightlife', icon: 'star', label: 'Nice dinners & nightlife' , short: 'Nightlife' },
  { key: 'business', icon: 'suitcase', label: 'Business / work' , short: 'Work' },
  { key: 'camping', icon: 'mountain', label: 'Camping' , short: 'Camping' }
]

export const WEATHER = [
  { key: 'hot', icon: 'sun', label: 'Hot' },
  { key: 'mild', icon: 'sun', label: 'Mild' },
  { key: 'cold', icon: 'snowflake', label: 'Cold' },
  { key: 'rain', icon: 'cloud', label: 'Rainy' }
]

export const EXTRAS = [
  { key: 'laundry', icon: 'shirt', label: 'Can do laundry' },
  { key: 'carryon', icon: 'backpack', label: 'Carry-on only' },
  { key: 'kids', icon: 'heart', label: 'Kids coming' },
  { key: 'flight', icon: 'plane', label: 'Long flight' }
]
