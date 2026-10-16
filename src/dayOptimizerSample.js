// A sample Kyoto day for the optimizer (local only, never saved).
// The "before" order is a typical first draft: criss-crosses the city, Fushimi Inari at the
// 12:30 crowd peak and Kiyomizu-dera in the 1-4 PM rain.
export const KYOTO_SAMPLE = {
  date: '2026-10-20',
  dayName: 'Tuesday',
  // chance of rain for each hour (0 = midnight): showers 1-4 PM
  rain: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.2, 0.35, 0.8, 0.85, 0.8, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  stops: [
    { id: 'k-nishiki', name: 'Nishiki Market', hour: 9, duration: 1, outdoor: false, locked: false, lat: 35.0050, lon: 135.7649, open: 9, close: 18 },
    { id: 'k-bamboo', name: 'Arashiyama Bamboo Grove', hour: 10.5, duration: 1.5, outdoor: true, locked: false, lat: 35.0170, lon: 135.6713 },
    { id: 'k-inari', name: 'Fushimi Inari Taisha', hour: 12.5, duration: 2, outdoor: true, locked: false, lat: 34.9671, lon: 135.7727 },
    { id: 'k-kiyomizu', name: 'Kiyomizu-dera', hour: 15, duration: 1.5, outdoor: true, locked: false, lat: 34.9949, lon: 135.7850, open: 6, close: 18 },
    { id: 'k-museum', name: 'Kyoto National Museum', hour: 16.75, duration: 1.5, outdoor: false, locked: false, lat: 34.9900, lon: 135.7732, open: 9.5, close: 17 },
    { id: 'k-dinner', name: 'Dinner reservation, Gion', hour: 19, duration: 1.5, outdoor: false, locked: true, popular: false, lat: 35.0037, lon: 135.7752 }
  ]
}

// Sample for the itinerary planner: a Kyoto day with 3 stops (2 transit legs) and 2 unscheduled places
export const PLANNER_SAMPLE = {
  days: ['2026-10-16', '2026-10-17', '2026-10-18'],
  stops: [
    { id: 'p-inari', name: 'Fushimi Inari Taisha', city: 'Kyoto, Japan', date: '2026-10-16', hour: 9, duration: 2, outdoor: true, locked: false, lat: 34.9671, lon: 135.7727, address: 'Fushimi Inari Taisha, Kyoto' },
    { id: 'p-nishiki', name: 'Nishiki Market lunch', city: 'Kyoto, Japan', date: '2026-10-16', hour: 11.75, duration: 1, outdoor: false, locked: false, lat: 35.0050, lon: 135.7649, address: 'Nishiki Market, Kyoto' },
    { id: 'p-kiyomizu', name: 'Kiyomizu-dera', city: 'Kyoto, Japan', date: '2026-10-16', hour: 13.25, duration: 1.5, outdoor: true, locked: true, lat: 34.9949, lon: 135.7850, address: 'Kiyomizu-dera, Kyoto' }
  ],
  wishlist: [
    { id: 'pw-bamboo', name: 'Arashiyama Bamboo Grove', city: 'Kyoto, Japan', outdoor: true, lat: 35.0170, lon: 135.6713, address: 'Arashiyama Bamboo Grove, Kyoto' },
    { id: 'pw-kinkaku', name: 'Kinkaku-ji', city: 'Kyoto, Japan', outdoor: true, lat: 35.0394, lon: 135.7292, address: 'Kinkaku-ji, Kyoto' },
    { id: 'pw-todaiji', name: 'Todai-ji', city: 'Nara, Japan', outdoor: false, lat: 34.6890, lon: 135.8398, address: 'Todai-ji, Nara' }
  ]
}
