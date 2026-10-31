// Travel Twin catalogue + unlock rules. Plain data, used by BOTH the app (src/avatarStore.js) and the
// server (server/routes/avatar.js), so the server can refuse items that aren't unlocked yet.
//
// How you earn XP (the server works it out from your trips):
//   - finish a trip: +20   (it ended before today, had at least one stop, and was planned before it ended)
//   - each new country on a finished trip: +10
//   - on a finished trip, +5 each for: 5+ stops planned, 5+ packing items ticked, 3+ expenses logged, 3+ photos shared
// Tiers unlock at 0, 40 and 120 XP. Souvenirs unlock from WHERE you've been instead (tropics, cold places, any country).

export const XP = { trip: 20, country: 10, planner: 5, packer: 5, banker: 5, photographer: 5 }

export const TIERS = [
  { tier: 1, name: 'Day Tripper', min: 0 },
  { tier: 2, name: 'Wanderer', min: 40 },
  { tier: 3, name: 'Explorer', min: 120 }
]

// Souvenirs: what you need to have done to get them
export const SOUVENIRS = {
  country: 'Finish a trip abroad',
  tropics: 'Finish a trip to a tropical country',
  cold: 'Finish a trip to a cold-climate country'
}
// Rough lists (lowercase country names as people type them in destinations, e.g. "Bali, Indonesia")
export const TROPICAL = ['indonesia', 'thailand', 'malaysia', 'philippines', 'vietnam', 'cambodia', 'laos', 'myanmar', 'sri lanka',
  'maldives', 'india', 'brazil', 'mexico', 'costa rica', 'colombia', 'peru', 'ecuador', 'cuba', 'jamaica', 'dominican republic',
  'bahamas', 'fiji', 'samoa', 'tahiti', 'french polynesia', 'mauritius', 'seychelles', 'kenya', 'tanzania', 'zanzibar', 'ghana',
  'nigeria', 'madagascar', 'panama', 'belize', 'singapore', 'brunei', 'timor-leste', 'papua new guinea', 'barbados', 'puerto rico']
export const COLD = ['iceland', 'norway', 'sweden', 'finland', 'denmark', 'greenland', 'russia', 'canada', 'mongolia', 'estonia',
  'latvia', 'lithuania', 'switzerland', 'austria', 'czech republic', 'czechia', 'poland', 'slovakia', 'scotland', 'antarctica',
  'kazakhstan', 'kyrgyzstan', 'nepal', 'bhutan', 'tibet', 'alaska']

// Tabs and the slots inside them. kind: 'swatch' (colour dots), 'item' (cards, pick one), 'gear' (cards, pick any)
export const TABS = [
  { key: 'appearance', label: 'Appearance', icon: 'smile' },
  { key: 'outfit', label: 'Outfit', icon: 'shirt' },
  { key: 'gear', label: 'Travel gear', icon: 'backpack' },
  { key: 'saved', label: 'My outfits', icon: 'archive' }
]
export const SLOTS = [
  { key: 'skin', tab: 'appearance', label: 'Skin tone', kind: 'swatch', focus: 'face' },
  { key: 'hair', tab: 'appearance', label: 'Hair', kind: 'item', focus: 'face' },
  { key: 'hairColor', tab: 'appearance', label: 'Hair colour', kind: 'swatch', focus: 'face' },
  { key: 'face', tab: 'appearance', label: 'Facial hair', kind: 'item', focus: 'face' },
  { key: 'hat', tab: 'outfit', label: 'Hat', kind: 'item', focus: 'face' },
  { key: 'top', tab: 'outfit', label: 'Top', kind: 'item', focus: 'body' },
  { key: 'topColor', tab: 'outfit', label: 'Top colour', kind: 'swatch', focus: 'body' },
  { key: 'outerwear', tab: 'outfit', label: 'Outerwear', kind: 'item', focus: 'body' },
  { key: 'bottom', tab: 'outfit', label: 'Bottoms', kind: 'item', focus: 'legs' },
  { key: 'shoes', tab: 'outfit', label: 'Shoes', kind: 'item', focus: 'feet' },
  { key: 'bag', tab: 'gear', label: 'Bag', kind: 'item', focus: 'back' },
  { key: 'gear', tab: 'gear', label: 'Accessories', kind: 'gear', focus: 'body' }
]

// Every item. color = what the 3D part is painted, tier = which tier unlocks it (or souvenir = how to earn it).
// Items with a focus of their own (e.g. sunglasses -> face) turn the camera there when picked.
export const CATALOG = {
  skin: [
    { id: 'porcelain', name: 'Porcelain', color: '#f6dcc8', tier: 1 },
    { id: 'light', name: 'Light', color: '#efc7a4', tier: 1 },
    { id: 'tan', name: 'Tan', color: '#d9a27a', tier: 1 },
    { id: 'olive', name: 'Olive', color: '#b98559', tier: 1 },
    { id: 'brown', name: 'Brown', color: '#8d5a3b', tier: 1 },
    { id: 'deep', name: 'Deep', color: '#5c3a26', tier: 1 }
  ],
  hair: [
    { id: 'buzz', name: 'Buzz cut', tier: 1 },
    { id: 'short', name: 'Short', tier: 1 },
    { id: 'long', name: 'Long', tier: 1 },
    { id: 'bob', name: 'Bob', tier: 1 },
    { id: 'braid', name: 'Side braid', tier: 2 },
    { id: 'locs', name: 'Locs', tier: 2 },
    { id: 'bun', name: 'Top bun', tier: 2 },
    { id: 'curly', name: 'Curls', tier: 2 },
    { id: 'pony', name: 'Ponytail', tier: 3 }
  ],
  hairColor: [
    { id: 'black', name: 'Black', color: '#1d1a1a', tier: 1 },
    { id: 'espresso', name: 'Espresso', color: '#3b2619', tier: 1 },
    { id: 'chestnut', name: 'Chestnut', color: '#6e4128', tier: 1 },
    { id: 'auburn', name: 'Auburn', color: '#9a3f22', tier: 1 },
    { id: 'plum', name: 'Plum', color: '#3a2a4d', tier: 1 },
    { id: 'honey', name: 'Honey', color: '#c99a52', tier: 2 },
    { id: 'silver', name: 'Silver', color: '#c9cdd3', tier: 3 }
  ],
  face: [
    { id: 'none', name: 'None', tier: 1 },
    { id: 'stubble', name: 'Stubble', tier: 1 },
    { id: 'beard', name: 'Full beard', tier: 1 }
  ],
  hat: [
    { id: 'none', name: 'None', tier: 1 },
    { id: 'bandana', name: 'Bandana', color: '#d9902b', tier: 1 },
    { id: 'tricorn', name: 'Captain’s hat', color: '#12343b', tier: 1 },
    { id: 'beanie', name: 'Beanie', color: '#2f3e4d', tier: 2 },
    { id: 'sunhat', name: 'Sun hat', color: '#e8d3a2', souvenir: 'tropics' }
  ],
  top: [
    { id: 'tee', name: 'Tee', tier: 1 },
    { id: 'stripes', name: 'Breton stripes', tier: 1 },
    { id: 'linen', name: 'Linen shirt', tier: 1 },
    { id: 'hoodie', name: 'Hoodie', tier: 2 }
  ],
  topColor: [
    { id: 'cream', name: 'Cream', color: '#f3ead8', tier: 1 },
    { id: 'navy', name: 'Navy', color: '#1f4e6e', tier: 1 },
    { id: 'teal', name: 'Teal', color: '#00798c', tier: 1 },
    { id: 'sunset', name: 'Sunset', color: '#d1495b', tier: 1 },
    { id: 'amber', name: 'Amber', color: '#edae49', tier: 2 },
    { id: 'sage', name: 'Sage', color: '#8fa98b', tier: 2 },
    { id: 'violet', name: 'Violet', color: '#5b4a9e', tier: 2 }
  ],
  outerwear: [
    { id: 'none', name: 'None', tier: 1 },
    { id: 'denim', name: 'Denim jacket', color: '#4a6d93', tier: 1 },
    { id: 'puffer', name: 'Puffer', color: '#d1495b', tier: 2 },
    { id: 'explorer', name: 'Explorer jacket', color: '#8a7a4e', tier: 3 }
  ],
  bottom: [
    { id: 'jeans', name: 'Jeans', color: '#34506e', tier: 1 },
    { id: 'shorts', name: 'Shorts', color: '#c9b48f', tier: 1 },
    { id: 'chinos', name: 'Chinos', color: '#b89f74', tier: 1 },
    { id: 'cargo', name: 'Cargo pants', color: '#5f6b4e', tier: 2 }
  ],
  shoes: [
    { id: 'sneakers', name: 'Sneakers', color: '#f2f2ee', tier: 1 },
    { id: 'slipons', name: 'Slip-ons', color: '#2b3a47', tier: 1 },
    { id: 'boots', name: 'Hiking boots', color: '#7a4e2d', tier: 2 }
  ],
  bag: [
    { id: 'none', name: 'None', tier: 1 },
    { id: 'daypack', name: 'Basic backpack', color: '#00798c', tier: 1 },
    { id: 'expedition', name: 'Expedition pack', color: '#d1495b', tier: 3 }
  ],
  gear: [
    { id: 'sunglasses', name: 'Sunglasses', icon: 'glasses', focus: 'face', tier: 1 },
    { id: 'specs', name: 'Round glasses', focus: 'face', tier: 1 },
    { id: 'goggles', name: 'Goggles', focus: 'face', tier: 1 },
    { id: 'earring', name: 'Gold earring', focus: 'face', tier: 1 },
    { id: 'headband', name: 'Headband', focus: 'face', tier: 2 },
    { id: 'eyepatch', name: 'Eyepatch', focus: 'face', tier: 3 },
    { id: 'camera', name: 'Camera', icon: 'camera', tier: 2 },
    { id: 'pillow', name: 'Neck pillow', icon: 'pillow', focus: 'face', tier: 2 },
    { id: 'pin', name: 'Map pin badge', icon: 'map-pin', tier: 2 },
    { id: 'passport', name: 'Passport holster', icon: 'book', tier: 3 },
    { id: 'badges', name: 'Global badges', icon: 'globe', tier: 3 },
    { id: 'pins', name: 'Country pins', icon: 'flag', souvenir: 'country' },
    { id: 'scarf', name: 'Wool scarf', focus: 'face', souvenir: 'cold' }
  ]
}

export const DEFAULT_LOOK = {
  skin: 'tan', hair: 'short', hairColor: 'espresso', face: 'none',
  top: 'tee', topColor: 'teal', hat: 'none', outerwear: 'none', bottom: 'jeans', shoes: 'sneakers',
  bag: 'daypack', gear: []
}

// ---------- helpers ----------
export function itemOf(slot, id) {
  for (const it of CATALOG[slot]) if (it.id === id) return it
  return CATALOG[slot][0]
}
export function tierOf(xp) {
  let t = TIERS[0]
  for (const x of TIERS) if (xp >= x.min) t = x
  return t
}
export function nextTier(xp) {
  for (const x of TIERS) if (xp < x.min) return x
  return null
}
// progress = { xp, souvenirs: { country, tropics, cold } } (from the server)
export function isUnlocked(item, progress) {
  if (item.souvenir) return !!(progress && progress.souvenirs && progress.souvenirs[item.souvenir])
  return ((progress && progress.xp) || 0) >= TIERS[(item.tier || 1) - 1].min
}
// "Unlocks at 40 XP (Progress: 25/40)" or "Souvenir: Finish a trip to a tropical country"
export function lockText(item, progress) {
  if (item.souvenir) return 'Souvenir: ' + SOUVENIRS[item.souvenir]
  const need = TIERS[(item.tier || 1) - 1].min
  const xp = (progress && progress.xp) || 0
  return 'Unlocks at ' + need + ' XP (Progress: ' + Math.min(xp, need) + '/' + need + ')'
}
// Every unlocked item id, e.g. ['skin:tan', 'gear:camera', ...] (used for "New" tags and the unlock celebration)
export function unlockedIds(progress) {
  const ids = []
  for (const slot in CATALOG) {
    for (const it of CATALOG[slot]) if (isUnlocked(it, progress)) ids.push(slot + ':' + it.id)
  }
  return ids
}
// A copy of a look with anything unknown swapped for the default
export function cleanLook(raw) {
  const look = { ...DEFAULT_LOOK, gear: [] }
  if (!raw) return look
  for (const slot of SLOTS) {
    if (slot.kind === 'gear') continue
    for (const it of CATALOG[slot.key]) if (it.id === raw[slot.key]) look[slot.key] = it.id
  }
  if (Array.isArray(raw.gear)) {
    for (const it of CATALOG.gear) if (raw.gear.includes(it.id)) look.gear.push(it.id)
  }
  return look
}
// Items in a look that aren't unlocked yet (empty = fine)
export function lockedIn(look, progress) {
  const bad = []
  for (const slot of SLOTS) {
    if (slot.kind === 'gear') continue
    const it = itemOf(slot.key, look[slot.key])
    if (!isUnlocked(it, progress)) bad.push(it.name)
  }
  for (const id of look.gear || []) {
    const it = itemOf('gear', id)
    if (!isUnlocked(it, progress)) bad.push(it.name)
  }
  return bad
}
