// How each kind of place looks: icon, label and card colour (used by Wishlist and Group decisions)
export const PLACE_TYPES = {
  attraction: { icon: '📍', label: 'Attraction', color: '#ffd9b3' },
  museum: { icon: '🏛', label: 'Museum', color: '#cdd6ff' },
  gallery: { icon: '🖼', label: 'Gallery', color: '#ffcbb8' },
  viewpoint: { icon: '🌄', label: 'Viewpoint', color: '#dcf5a6' },
  zoo: { icon: '🦁', label: 'Zoo', color: '#c6ecfb' },
  theme_park: { icon: '🎢', label: 'Theme park', color: '#f5d995' },
  aquarium: { icon: '🐠', label: 'Aquarium', color: '#c6ecfb' },
  custom: { icon: '⭐', label: 'Your pick', color: '#cfeee1' }
}

export function placeStyle(type) {
  return PLACE_TYPES[type] || PLACE_TYPES.custom
}
