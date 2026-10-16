// Discover: candidate cities, typical weather by month, yearly festivals, and the match score.
// Weather = rough monthly averages (mean °C, rainy days). Festival dates are the usual ones and can shift a little each year.

// temp/rain: Jan..Dec
export const CITIES = [
  { id: 'tokyo', label: 'Tokyo, Japan', cc: 'JP', lat: 35.68, lon: 139.69, flightH: 7, cost: 3, vibes: ['food', 'culture', 'party'],
    temp: [5, 6, 9, 14, 19, 22, 26, 27, 23, 18, 12, 8], rain: [5, 6, 10, 10, 11, 12, 11, 8, 11, 9, 7, 4] },
  { id: 'sapporo', label: 'Sapporo, Japan', cc: 'JP', lat: 43.06, lon: 141.35, flightH: 8, cost: 3, vibes: ['food', 'nature'],
    temp: [-4, -3, 1, 7, 12, 16, 21, 22, 18, 11, 5, -1], rain: [18, 15, 13, 9, 9, 8, 9, 10, 11, 13, 16, 17] },
  { id: 'seoul', label: 'Seoul, South Korea', cc: 'KR', lat: 37.57, lon: 126.98, flightH: 6.5, cost: 2, vibes: ['food', 'culture', 'party'],
    temp: [-2, 1, 6, 13, 18, 23, 25, 26, 22, 15, 7, 0], rain: [6, 5, 7, 8, 8, 10, 16, 13, 9, 6, 8, 7] },
  { id: 'taipei', label: 'Taipei, Taiwan', cc: 'TW', lat: 25.03, lon: 121.56, flightH: 4.5, cost: 2, vibes: ['food', 'culture', 'nature'],
    temp: [16, 16, 18, 22, 25, 28, 30, 29, 28, 25, 21, 17], rain: [13, 13, 15, 14, 14, 15, 12, 14, 13, 11, 11, 11] },
  { id: 'hongkong', label: 'Hong Kong', cc: 'HK', lat: 22.32, lon: 114.17, flightH: 4, cost: 3, vibes: ['food', 'party', 'culture'],
    temp: [16, 17, 19, 23, 26, 28, 29, 29, 28, 25, 22, 18], rain: [5, 8, 10, 11, 14, 18, 17, 17, 14, 7, 5, 4] },
  { id: 'bangkok', label: 'Bangkok, Thailand', cc: 'TH', lat: 13.76, lon: 100.5, flightH: 2.5, cost: 1, vibes: ['food', 'party', 'culture'],
    temp: [27, 28, 30, 31, 30, 29, 29, 29, 28, 28, 28, 27], rain: [1, 2, 3, 5, 15, 17, 18, 20, 21, 15, 5, 1] },
  { id: 'chiangmai', label: 'Chiang Mai, Thailand', cc: 'TH', lat: 18.79, lon: 98.98, flightH: 3, cost: 1, vibes: ['culture', 'nature', 'food'],
    temp: [21, 23, 26, 29, 28, 27, 27, 27, 27, 26, 24, 21], rain: [1, 1, 2, 6, 15, 17, 20, 22, 17, 10, 4, 1] },
  { id: 'bali', label: 'Bali, Indonesia', cc: 'ID', lat: -8.65, lon: 115.22, flightH: 2.5, cost: 1, vibes: ['nature', 'culture', 'party'],
    temp: [27, 27, 27, 28, 27, 27, 26, 27, 27, 28, 28, 27], rain: [16, 15, 12, 8, 6, 5, 4, 3, 4, 6, 10, 14] },
  { id: 'hanoi', label: 'Hanoi, Vietnam', cc: 'VN', lat: 21.03, lon: 105.85, flightH: 3.5, cost: 1, vibes: ['food', 'culture', 'nature'],
    temp: [17, 18, 20, 24, 28, 30, 30, 29, 28, 26, 22, 18], rain: [8, 11, 15, 13, 14, 15, 16, 17, 14, 9, 6, 5] },
  { id: 'sydney', label: 'Sydney, Australia', cc: 'AU', lat: -33.87, lon: 151.21, flightH: 8, cost: 3, vibes: ['nature', 'party', 'food'],
    temp: [23, 23, 22, 19, 16, 14, 13, 14, 16, 18, 20, 22], rain: [8, 9, 10, 8, 9, 9, 8, 7, 7, 8, 9, 8] },
  { id: 'colombo', label: 'Colombo, Sri Lanka', cc: 'LK', lat: 6.93, lon: 79.86, flightH: 3.5, cost: 1, vibes: ['nature', 'culture', 'food'],
    temp: [27, 27, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27], rain: [6, 5, 8, 14, 19, 17, 12, 11, 14, 18, 16, 9] },
  { id: 'muscat', label: 'Muscat, Oman', cc: 'OM', lat: 23.59, lon: 58.41, flightH: 7, cost: 2, vibes: ['culture', 'nature'],
    temp: [21, 22, 25, 30, 34, 35, 34, 32, 31, 29, 25, 22], rain: [2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1] },
  { id: 'istanbul', label: 'Istanbul, Turkey', cc: 'TR', lat: 41.01, lon: 28.98, flightH: 11.5, cost: 2, vibes: ['culture', 'food'],
    temp: [6, 6, 8, 12, 17, 22, 24, 25, 21, 16, 12, 8], rain: [15, 13, 11, 9, 7, 5, 3, 3, 6, 9, 12, 15] },
  { id: 'paris', label: 'Paris, France', cc: 'FR', lat: 48.86, lon: 2.35, flightH: 13.5, cost: 3, vibes: ['culture', 'food'],
    temp: [5, 6, 9, 12, 16, 19, 21, 21, 17, 13, 8, 5], rain: [10, 9, 10, 9, 10, 8, 8, 7, 8, 10, 10, 11] },
  { id: 'london', label: 'London, United Kingdom', cc: 'GB', lat: 51.51, lon: -0.13, flightH: 14, cost: 3, vibes: ['culture', 'party', 'food'],
    temp: [5, 6, 8, 10, 14, 17, 19, 19, 16, 12, 8, 6], rain: [11, 9, 9, 9, 8, 8, 7, 8, 8, 10, 10, 10] },
  { id: 'lisbon', label: 'Lisbon, Portugal', cc: 'PT', lat: 38.72, lon: -9.14, flightH: 16, cost: 2, vibes: ['culture', 'food', 'party'],
    temp: [12, 13, 15, 16, 19, 22, 24, 24, 23, 19, 15, 13], rain: [10, 9, 7, 8, 6, 2, 1, 1, 3, 8, 9, 10] }
]

// Yearly festivals: from/to = 'MM-DD' (to before from = runs over New Year). weight = how much it adds to the score.
export const FESTIVALS = [
  { city: 'sapporo', name: 'Sapporo Snow Festival', from: '02-04', to: '02-11', weight: 60 },
  { city: 'tokyo', name: 'Cherry blossom season', from: '03-25', to: '04-08', weight: 50 },
  { city: 'tokyo', name: 'New Year shrine visits', from: '12-31', to: '01-03', weight: 30 },
  { city: 'seoul', name: 'Cherry blossoms', from: '04-01', to: '04-12', weight: 40 },
  { city: 'seoul', name: 'Seoul Lantern Festival', from: '11-01', to: '11-17', weight: 35 },
  { city: 'taipei', name: 'Taipei 101 New Year fireworks', from: '12-31', to: '01-01', weight: 50 },
  { city: 'hongkong', name: 'Wine & Dine Festival', from: '10-24', to: '10-27', weight: 30 },
  { city: 'hongkong', name: 'Harbour New Year countdown', from: '12-31', to: '01-01', weight: 35 },
  { city: 'bangkok', name: 'Songkran water festival', from: '04-13', to: '04-15', weight: 70 },
  { city: 'bangkok', name: 'Loy Krathong (usually mid-Nov)', from: '11-10', to: '11-20', weight: 45 },
  { city: 'chiangmai', name: 'Yi Peng lanterns (usually mid-Nov)', from: '11-10', to: '11-20', weight: 70 },
  { city: 'chiangmai', name: 'Songkran water festival', from: '04-13', to: '04-15', weight: 70 },
  { city: 'chiangmai', name: 'Flower Festival', from: '02-01', to: '02-07', weight: 35 },
  { city: 'bali', name: 'Bali Arts Festival', from: '06-15', to: '07-15', weight: 40 },
  { city: 'sydney', name: 'New Year fireworks at the Harbour', from: '12-31', to: '01-01', weight: 70 },
  { city: 'sydney', name: 'Vivid Sydney lights', from: '05-23', to: '06-14', weight: 55 },
  { city: 'colombo', name: 'Vesak lanterns (usually May)', from: '05-10', to: '05-25', weight: 45 },
  { city: 'colombo', name: 'Esala Perahera in Kandy (3h away)', from: '07-25', to: '08-10', weight: 60 },
  { city: 'muscat', name: 'Muscat Nights', from: '01-01', to: '02-05', weight: 35 },
  { city: 'istanbul', name: 'Tulip Festival', from: '04-01', to: '04-30', weight: 40 },
  { city: 'paris', name: 'Fête de la Musique', from: '06-21', to: '06-21', weight: 40 },
  { city: 'paris', name: 'Bastille Day', from: '07-14', to: '07-14', weight: 50 },
  { city: 'paris', name: 'Christmas markets', from: '11-25', to: '12-31', weight: 40 },
  { city: 'london', name: 'Notting Hill Carnival', from: '08-23', to: '08-25', weight: 55 },
  { city: 'london', name: 'Winter Wonderland', from: '11-20', to: '01-04', weight: 40 },
  { city: 'lisbon', name: 'Santo António street parties', from: '06-12', to: '06-13', weight: 55 }
]

export const VIBES = [
  { key: 'culture', label: 'Culture', icon: '🏛' },
  { key: 'nature', label: 'Nature', icon: '🌿' },
  { key: 'food', label: 'Food', icon: '🍜' },
  { key: 'party', label: 'Festivals & nightlife', icon: '🎉' }
]

// Months (0-11) the trip touches
function monthsIn(start, end) {
  const list = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (d <= last && list.length < 12) {
    if (!list.includes(d.getMonth())) list.push(d.getMonth())
    d.setDate(d.getDate() + 1)
  }
  return list
}

// Festivals of this city that overlap the trip (checks the trip's start year and end year)
export function festivalsDuring(cityId, start, end) {
  const found = []
  const years = [Number(start.slice(0, 4)), Number(end.slice(0, 4))]
  for (const f of FESTIVALS) {
    if (f.city !== cityId) continue
    for (const y of years) {
      const from = y + '-' + f.from
      const to = (f.to < f.from ? y + 1 : y) + '-' + f.to // runs over New Year
      if (from <= end && to >= start && !found.includes(f)) found.push(f)
    }
  }
  return found
}

// Public holidays inside the trip (holidays = [{ date, name }] for that country)
export function holidaysDuring(holidays, start, end) {
  const list = []
  for (const h of holidays || []) {
    if (h.date >= start && h.date <= end) list.push(h)
  }
  return list
}

// The match score (0-100) and the reasons behind it
export function scoreCity(city, { start, end, vibes, budget, holidays }) {
  // Weather: comfy around 23°C, fewer rainy days is better
  const months = monthsIn(start, end)
  let temp = 0
  let rain = 0
  for (const m of months) {
    temp += city.temp[m]
    rain += city.rain[m]
  }
  temp = Math.round(temp / months.length)
  rain = Math.round(rain / months.length)
  const weather = Math.max(0, Math.min(100, 100 - Math.abs(temp - 23) * 4 - rain * 3))

  const festivals = festivalsDuring(city.id, start, end)
  let events = 0
  for (const f of festivals) events += f.weight
  events = Math.min(100, events)

  const hols = holidaysDuring(holidays, start, end)
  const crowds = Math.max(0, 100 - 25 * hols.length)

  let shared = 0
  for (const v of vibes) if (city.vibes.includes(v)) shared++
  const vibeFit = vibes.length ? shared / vibes.length : 1
  const budgetFit = 1 - Math.abs(city.cost - budget) / 2
  const fit = 40 * vibeFit + 30 * budgetFit + 30 * Math.max(0, 1 - city.flightH / 16)

  const score = Math.round(0.3 * weather + 0.3 * events + 0.15 * crowds + 0.25 * fit)
  return { score, temp, rain, festivals, holidays: hols, parts: { weather, events, crowds, fit: Math.round(fit) } }
}

// ---------- more cities, built from their looked-up weather ----------
// Rough cost of a trip there: 1 = cheap, 2 = mid, 3 = pricey
const COST_BY_CC = {
  TH: 1, VN: 1, ID: 1, PH: 1, KH: 1, LK: 1, NP: 1, IN: 1, MY: 1, EG: 1, MA: 1, MX: 1, PE: 1, TR: 1, JO: 2,
  JP: 3, HK: 3, SG: 3, MV: 3, AE: 3, AU: 3, NZ: 3, US: 3, CA: 3, GB: 3, FR: 3, CH: 3, IS: 3, NO: 3, DK: 3, SE: 3, IE: 3, NL: 3, FI: 3
}
const NATURE = ['Jeju', 'Phuket', 'Cebu', 'Malé', 'Kathmandu', 'Petra', 'Cappadocia', 'Cape Town', 'Interlaken', 'Zurich', 'Santorini',
  'Reykjavik', 'Oslo', 'Honolulu', 'Vancouver', 'Cancún', 'Cusco', 'Rio de Janeiro', 'Queenstown', 'Auckland', 'Perth', 'Da Nang', 'Siem Reap', 'Kandy', 'Fukuoka', 'Nice']
const PARTY = ['Busan', 'Osaka', 'Shanghai', 'Phuket', 'Manila', 'Dubai', 'Barcelona', 'Madrid', 'Amsterdam', 'Berlin', 'Prague', 'Budapest',
  'New York', 'Los Angeles', 'Las Vegas', 'Mexico City', 'Rio de Janeiro', 'Buenos Aires', 'Melbourne', 'Ho Chi Minh City', 'Dublin', 'Mykonos']

const SINGAPORE = { lat: 1.35, lon: 103.82 }
function kmBetween(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// { label, lat, lon, cc, temp[12], rain[12] } from the server -> a city Discover can score
export function buildCity(info) {
  const name = info.label.split(', ')[0]
  const vibes = ['culture', 'food']
  if (NATURE.includes(name)) vibes.push('nature')
  if (PARTY.includes(name)) vibes.push('party')
  const temp = []
  for (let m = 0; m < 12; m++) temp.push(info.temp[m] == null ? 20 : info.temp[m])
  return {
    id: info.label.toLowerCase().replace(/[^a-z]+/g, '-'),
    label: info.label, cc: info.cc, lat: info.lat, lon: info.lon,
    flightH: Math.round((kmBetween(SINGAPORE, info) / 800 + 0.6) * 2) / 2, // ~800 km/h plus take-off and landing
    cost: COST_BY_CC[info.cc] || 2,
    vibes, temp, rain: info.rain
  }
}
