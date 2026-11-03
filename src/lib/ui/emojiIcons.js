// The app's data still names icons with an emoji (e.g. icon: '🍜'). On screen we never show the
// emoji: lineIconFor() turns it into one of the line icons in AppIcon.vue, so every icon looks the same.
// <AppIcon :name="lineIconFor(item.icon)" />

const EMOJI_TO_ICON = {
  // weather and time of day
  '☀️': 'sun', '☀': 'sun', '🌤️': 'cloud-sun', '🌤': 'cloud-sun', '⛅': 'cloud-sun', '🌦️': 'cloud-rain',
  '🌧️': 'cloud-rain', '🌧': 'cloud-rain', '⛈️': 'cloud-rain', '🌫️': 'cloud', '❄️': 'snowflake', '⛷': 'snowflake',
  '🧥': 'snowflake', '🌙': 'moon', '🌅': 'sunrise', '🌄': 'sunrise', '🌇': 'sunset',
  // food and drink
  '🍜': 'utensils', '🍽': 'utensils', '🍔': 'utensils', '🥟': 'utensils', '🍛': 'utensils', '🥪': 'utensils',
  '🍣': 'utensils', '🍕': 'utensils', '🍲': 'utensils', '🍝': 'utensils', '🍱': 'utensils', '🌮': 'utensils',
  '🥙': 'utensils', '🐖': 'utensils', '🐄': 'utensils', '☪️': 'utensils', '✡️': 'utensils',
  '☕': 'coffee', '🥐': 'coffee', '🍰': 'cake', '🍨': 'cake', '🍸': 'wine',
  '🥦': 'leaf', '🌱': 'leaf', '🌿': 'leaf', '🦐': 'fish', '🐟': 'fish', '🥚': 'egg', '🌾': 'wheat', '🥛': 'milk', '🥜': 'nut',
  // getting around
  '✈️': 'plane', '🚶': 'footprints', '🥾': 'footprints', '🚇': 'train', '🚉': 'train', '🚆': 'train',
  '🚕': 'car', '🚲': 'bike', '🚪': 'door', '🏨': 'bed',
  // places
  '📍': 'map-pin', '📌': 'map-pin', '🗺': 'map', '🗾': 'map', '🧭': 'compass', '🏛': 'landmark', '⛩': 'landmark',
  '⛩️': 'landmark', '🌳': 'trees', '🦁': 'trees', '🐠': 'fish', '🏖': 'palm', '⛺': 'tent', '🖼': 'image',
  '🎟': 'ticket', '🎢': 'ticket', '🛍': 'shopping-bag', '🛍️': 'shopping-bag', '📸': 'camera', '📷': 'camera',
  // safety
  '🚨': 'siren', '👮': 'shield', '🛡': 'shield', '🚑': 'heart-pulse', '🏥': 'heart-pulse', '🩺': 'heart-pulse',
  '🚒': 'flame', '🔥': 'flame', '🫨': 'alert', '⚠️': 'alert', '⚠': 'alert', '🌊': 'waves', '🌀': 'wind',
  '🛂': 'book', '📵': 'phone', '✅': 'check-circle', 'ℹ️': 'phone', 'ℹ': 'phone', '🇸🇬': 'phone',
  // packing and trip
  '🎒': 'backpack', '👕': 'shirt', '🧺': 'shirt', '🧴': 'droplet', '💊': 'pill', '🔌': 'plug', '📄': 'file-text',
  '💼': 'briefcase', '🧸': 'baby', '⭐': 'star', '★': 'star', '🗓': 'calendar', '👥': 'users',
  // money, time and the rest
  '🧾': 'receipt', '💸': 'receipt', '🗂': 'archive', '⏰': 'clock', '⏳': 'clock', '🕒': 'clock', '🔒': 'lock',
  '💬': 'message', '👍': 'thumbs-up', '🔤': 'tag', '⚡': 'sparkles', '✨': 'sparkles',
  '🟢': 'circle', '🟠': 'circle', '🔴': 'circle'
}

// Takes an emoji ('🍜') or an icon name that is already right ('utensils'); unknown -> ''
export function lineIconFor(icon) {
  const text = String(icon || '')
  if (/^[a-z-]+$/.test(text)) return text
  return EMOJI_TO_ICON[text] || EMOJI_TO_ICON[text.replace('️', '')] || ''
}
