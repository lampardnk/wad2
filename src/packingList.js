// Builds a packing list from the trip details chosen when creating the trip.
// trip = { days, activities: ['beach', ...], weather: ['hot', ...], extras: ['laundry', ...], outdoor: true/false }
// Returns [{ id, category, name, qty, why }]

export const CATEGORIES = [
  { key: 'docs', icon: '📄', label: 'Documents & money' },
  { key: 'clothes', icon: '👕', label: 'Clothes' },
  { key: 'toiletries', icon: '🧴', label: 'Toiletries' },
  { key: 'health', icon: '💊', label: 'Health' },
  { key: 'tech', icon: '🔌', label: 'Electronics' },
  { key: 'gear', icon: '🎒', label: 'Activity gear' },
  { key: 'other', icon: '⭐', label: 'Other' }
]

export function buildPackingList(trip) {
  const days = Math.min(30, Math.max(1, Math.floor(Number(trip.days) || 3)))
  const has = (list, key) => (list || []).includes(key)
  const act = (key) => has(trip.activities, key)
  const weather = (key) => has(trip.weather, key)
  const extra = (key) => has(trip.extras, key)

  // Daily clothes: one per day, fewer if you can wash or only bring a carry-on
  let perDay = days
  if (extra('laundry')) perDay = Math.min(days, 4)
  else if (extra('carryon')) perDay = Math.min(days, 5)
  else perDay = Math.min(days, 10)

  const items = []
  const add = (category, name, qty, why) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    // Same item from two reasons: keep the bigger amount
    for (const it of items) {
      if (it.id === id) {
        it.qty = Math.max(it.qty, qty)
        return
      }
    }
    items.push({ id, category, name, qty, why })
  }

  // Always
  add('docs', 'Passport', 1, 'Travel essentials')
  add('docs', 'Wallet, cards & some cash', 1, 'Travel essentials')
  add('docs', 'Travel insurance details', 1, 'Travel essentials')
  add('clothes', 'T-shirts / tops', perDay, extra('laundry') ? 'One per day, washing halfway' : 'One per day')
  add('clothes', 'Underwear', perDay, 'One per day')
  add('clothes', 'Socks (pairs)', perDay, 'One per day')
  add('clothes', 'Pants / shorts', Math.max(1, Math.ceil(perDay / 3)), 'One for every 3 days')
  add('clothes', 'Sleepwear', 1, 'Every trip')
  add('clothes', 'Comfortable walking shoes', 1, 'Lots of walking')
  add('toiletries', 'Toothbrush & toothpaste', 1, 'Every trip')
  add('toiletries', 'Deodorant', 1, 'Every trip')
  add('toiletries', 'Shampoo & body wash', 1, extra('carryon') ? 'Under 100 ml for carry-on' : 'Every trip')
  add('health', 'Personal medication', 1, 'Every trip')
  add('health', 'Small first-aid kit', 1, 'Every trip')
  add('tech', 'Phone & charger', 1, 'Every trip')
  add('tech', 'Power bank', 1, 'Maps and photos drain the battery')
  add('tech', 'Plug adapter', 1, 'Check the socket type for your destination')

  // Weather
  if (weather('hot')) {
    add('health', 'Sunscreen', 1, 'Hot weather')
    add('clothes', 'Sunglasses', 1, 'Hot weather')
    add('clothes', 'Hat or cap', 1, 'Hot weather')
    add('gear', 'Reusable water bottle', 1, 'Hot weather')
  }
  if (weather('cold')) {
    add('clothes', 'Warm jacket', 1, 'Cold weather')
    add('clothes', 'Sweaters / fleece', Math.max(1, Math.ceil(perDay / 3)), 'Cold weather')
    add('clothes', 'Thermal innerwear', Math.max(1, Math.ceil(perDay / 2)), 'Cold weather')
    add('clothes', 'Gloves & beanie', 1, 'Cold weather')
    add('toiletries', 'Lip balm & moisturiser', 1, 'Cold, dry air')
  }
  if (weather('mild')) {
    add('clothes', 'Light jacket or cardigan', 1, 'Cool mornings and evenings')
  }
  if (weather('rain')) {
    add('gear', 'Compact umbrella', 1, 'Rain expected')
    add('clothes', 'Waterproof jacket', 1, 'Rain expected')
    add('gear', 'Ziplock bags for electronics', 2, 'Rain expected')
  }

  // Activities
  if (act('sightseeing')) {
    add('gear', 'Day bag', 1, 'Sightseeing')
    add('tech', 'Camera', 1, 'Sightseeing')
  }
  if (act('food')) {
    add('health', 'Stomach / digestion medicine', 1, 'Food hunting')
    add('toiletries', 'Wet wipes', 1, 'Food hunting')
  }
  if (act('shopping')) {
    add('gear', 'Foldable shopping bag', 1, 'Shopping')
  }
  if (act('beach')) {
    add('clothes', 'Swimwear', 2, 'Beach & swimming')
    add('clothes', 'Flip-flops', 1, 'Beach & swimming')
    add('gear', 'Quick-dry towel', 1, 'Beach & swimming')
    add('health', 'Sunscreen', 1, 'Beach & swimming')
    add('clothes', 'Sunglasses', 1, 'Beach & swimming')
  }
  if (act('hiking')) {
    add('clothes', 'Hiking shoes', 1, 'Hiking & nature')
    add('clothes', 'Quick-dry activewear', Math.max(1, Math.ceil(days / 3)), 'Hiking & nature')
    add('health', 'Insect repellent', 1, 'Hiking & nature')
    add('gear', 'Reusable water bottle', 1, 'Hiking & nature')
    add('gear', 'Snacks for the trail', 2, 'Hiking & nature')
  }
  if (act('snow')) {
    add('clothes', 'Ski jacket & pants', 1, 'Snow & skiing')
    add('clothes', 'Thermal innerwear', Math.max(2, Math.ceil(perDay / 2)), 'Snow & skiing')
    add('clothes', 'Waterproof gloves', 1, 'Snow & skiing')
    add('clothes', 'Wool socks (pairs)', Math.max(2, Math.ceil(perDay / 2)), 'Snow & skiing')
    add('gear', 'Ski goggles', 1, 'Snow & skiing')
  }
  if (act('themepark')) {
    add('gear', 'Small crossbody bag', 1, 'Theme parks: hands free on rides')
    add('clothes', 'Poncho', 1, 'Water rides')
  }
  if (act('nightlife')) {
    add('clothes', 'Smart outfit', Math.max(1, Math.ceil(days / 4)), 'Nice dinners & nightlife')
    add('clothes', 'Dress shoes', 1, 'Nice dinners & nightlife')
  }
  if (act('business')) {
    add('clothes', 'Work outfits', Math.max(1, Math.min(days, 5)), 'Business / work')
    add('tech', 'Laptop & charger', 1, 'Business / work')
    add('docs', 'Business cards', 1, 'Business / work')
  }
  if (act('camping')) {
    add('gear', 'Headlamp / torch', 1, 'Camping')
    add('gear', 'Sleeping bag', 1, 'Camping')
    add('health', 'Insect repellent', 1, 'Camping')
  }
  if (trip.outdoor && !weather('cold')) {
    add('health', 'Sunscreen', 1, 'Outdoor stops in your itinerary')
  }

  // Extras
  if (extra('laundry')) add('toiletries', 'Laundry soap sheets', 1, 'Washing during the trip')
  if (extra('kids')) {
    add('other', 'Snacks for the kids', 3, 'Kids coming')
    add('other', 'Toys / tablet for the journey', 1, 'Kids coming')
    add('health', "Kids' medicine", 1, 'Kids coming')
  }
  if (extra('flight')) {
    add('other', 'Neck pillow', 1, 'Long flight')
    add('other', 'Earplugs / eye mask', 1, 'Long flight')
    add('tech', 'Headphones', 1, 'Long flight')
  }

  return items
}
