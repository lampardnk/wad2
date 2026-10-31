import Trip from './models/trip.js'
import Photo from './models/Photo.js'
const { progressFor } = await import('./routes/avatar.js')
const mk = (o) => ({ _id: o.id, name: o.name, destination: o.d[0], destinations: o.d, startDate: o.s, endDate: o.e, createdAt: new Date(o.c), stops: Array(o.stops).fill({}), packing: o.packed ? { checked: Object.fromEntries(Array(o.packed).fill(0).map((_, i) => ['k' + i, true])) } : null, expenses: { items: Array(o.exp || 0).fill({}) } })
const trips = [
  mk({ id: 't1', name: 'Bali', d: ['Ubud, Indonesia', 'Seminyak, Indonesia'], s: '2025-06-01', e: '2025-06-08', c: '2025-05-01', stops: 6, packed: 7, exp: 4 }),
  mk({ id: 't2', name: 'Oslo', d: ['Oslo, Norway'], s: '2025-12-01', e: '2025-12-05', c: '2025-11-01', stops: 2 }),
  mk({ id: 't3', name: 'Backdated', d: ['Paris, France'], s: '2024-01-01', e: '2024-01-03', c: '2026-10-01', stops: 3 }),
  mk({ id: 't4', name: 'Empty', d: ['Rome, Italy'], s: '2025-01-01', e: '2025-01-03', c: '2024-12-01', stops: 0 }),
  mk({ id: 't5', name: 'Future', d: ['Tokyo, Japan'], s: '2027-01-01', e: '2027-01-03', c: '2026-10-01', stops: 4 })
]
Trip.find = () => ({ select: async () => trips })
Photo.aggregate = async () => [{ _id: 't1', n: 5 }]
const p = await progressFor('u1')
console.log(JSON.stringify({ xp: p.xp, tier: p.tierName, next: p.next, trips: p.trips, countries: p.countries, souvenirs: p.souvenirs }))
for (const t of p.log) console.log(t.trip, t.lines.map((l) => l.label + ' +' + l.xp).join(' | '))
process.exit(0)
