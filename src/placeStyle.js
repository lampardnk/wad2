// How each kind of place looks: icon, label and card colour (used by Wishlist and Group decisions)
export const PLACE_TYPES = {
  attraction: { icon: '📍', label: 'Attraction', color: '#ffd9b3' },
  museum: { icon: '🏛', label: 'Museum', color: '#cdd6ff' },
  gallery: { icon: '🖼', label: 'Gallery', color: '#ffcbb8' },
  viewpoint: { icon: '🌄', label: 'Viewpoint', color: '#dcf5a6' },
  zoo: { icon: '🦁', label: 'Zoo', color: '#c6ecfb' },
  theme_park: { icon: '🎢', label: 'Theme park', color: '#f5d995' },
  aquarium: { icon: '🐠', label: 'Aquarium', color: '#c6ecfb' },
  food: { icon: '🍜', label: 'Food & drink', color: '#ffe0cc' },
  shop: { icon: '🛍', label: 'Shopping', color: '#f8d4ec' },
  park: { icon: '🌳', label: 'Park', color: '#dcf5a6' },
  transport: { icon: '🚉', label: 'Transport', color: '#e2e6ea' },
  heritage: { icon: '⛩', label: 'Temple & heritage', color: '#fde2b8' },
  tour: { icon: '🎟', label: 'Tour & activity', color: '#e6dcff' },
  custom: { icon: '⭐', label: 'Your pick', color: '#cfeee1' }
}

export function placeStyle(type) {
  return PLACE_TYPES[type] || PLACE_TYPES.custom
}
