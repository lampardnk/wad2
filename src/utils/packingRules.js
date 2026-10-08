// Keep the packing rules separate from the page so they are easy to change.
export function getPackingItems(days, weather, hasOutdoorActivity) {
  const tripDays = Math.min(30, Math.max(1, Math.floor(Number(days) || 1)))
  const items = [
    { id: 'passport', category: 'Essentials', name: 'Passport / travel documents', quantity: 1, reason: 'Travel essentials' },
    { id: 'charger', category: 'Essentials', name: 'Phone charger', quantity: 1, reason: 'Travel essentials' },
    { id: 'shirts', category: 'Clothes', name: 'Shirts', quantity: tripDays, reason: 'One per day' },
    { id: 'socks', category: 'Clothes', name: 'Pairs of socks', quantity: tripDays, reason: 'One per day' }
  ]

  if (weather === 'rainy') {
    items.push({ id: 'umbrella', category: 'Weather-specific', name: 'Umbrella', quantity: 1, reason: 'Rain expected' })
    items.push({ id: 'raincoat', category: 'Weather-specific', name: 'Waterproof jacket', quantity: 1, reason: 'Rain expected' })
  }
  if (weather === 'cold') {
    items.push({ id: 'sweater', category: 'Weather-specific', name: 'Warm sweater', quantity: 1, reason: 'Cold weather' })
  }
  if (hasOutdoorActivity) {
    items.push({ id: 'shoes', category: 'Activities', name: 'Comfortable walking shoes', quantity: 1, reason: 'Outdoor activity planned' })
    items.push({ id: 'bottle', category: 'Activities', name: 'Reusable water bottle', quantity: 1, reason: 'Outdoor activity planned' })
    if (weather === 'sunny') {
      items.push({ id: 'sunscreen', category: 'Weather-specific', name: 'Sunscreen', quantity: 1, reason: 'Sunny outdoor activity' })
    }
  }

  return items
}
