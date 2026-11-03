// Unit test: buildPackingList() turns the trip details into a packing list.
// Run: pnpm exec vitest run tests/lam/unit
import { describe, it, expect } from 'vitest'
import { buildPackingList } from '../../../src/lib/trip/packingList.js'

// The item with this name, or undefined
function item(list, name) {
  return list.find((it) => it.name === name)
}

// Just the names, to check what is (or isn't) on the list
function names(list) {
  return list.map((it) => it.name)
}

describe('buildPackingList: what goes on the list', () => {
  it('always packs the travel essentials', () => {
    const list = names(buildPackingList({ days: 3 }))
    expect(list).toContain('Passport')
    expect(list).toContain('Phone & charger')
    expect(list).toContain('Personal medication')
  })

  it('adds items for the chosen activities and weather only', () => {
    const list = names(buildPackingList({ days: 3, activities: ['beach'], weather: ['rain'] }))
    expect(list).toContain('Swimwear')
    expect(list).toContain('Compact umbrella')
    expect(list).not.toContain('Ski goggles')
    expect(list).not.toContain('Warm jacket')
  })

  it('lists an item once when two choices need it', () => {
    const list = buildPackingList({ days: 3, activities: ['beach'], weather: ['hot'] })
    const sunscreen = list.filter((it) => it.name === 'Sunscreen')
    expect(sunscreen).toHaveLength(1)
  })

  it('keeps the bigger amount when two choices need the same item', () => {
    // Cold weather wants 1 set of thermals for 2 days, skiing wants at least 2
    const list = buildPackingList({ days: 2, weather: ['cold'], activities: ['snow'] })
    expect(item(list, 'Thermal innerwear').qty).toBe(2)
  })

  it('does not add sunscreen for outdoor stops in cold weather', () => {
    expect(names(buildPackingList({ days: 3, outdoor: true }))).toContain('Sunscreen')
    expect(names(buildPackingList({ days: 3, outdoor: true, weather: ['cold'] }))).not.toContain('Sunscreen')
  })

  it('gives every item a unique id and an amount of at least 1', () => {
    const list = buildPackingList({ days: 7, activities: ['beach', 'hiking', 'snow', 'camping'], weather: ['hot', 'cold', 'rain'], extras: ['kids', 'flight'] })
    const ids = new Set(list.map((it) => it.id))
    expect(ids.size).toBe(list.length)
    expect(list.every((it) => it.qty >= 1)).toBeTruthy()
  })
})

describe('buildPackingList: how many to pack', () => {
  it('packs one T-shirt per day', () => {
    expect(item(buildPackingList({ days: 5 }), 'T-shirts / tops').qty).toBe(5)
  })

  it('packs fewer daily clothes with laundry (max 4) or carry-on only (max 5)', () => {
    expect(item(buildPackingList({ days: 14, extras: ['laundry'] }), 'Underwear').qty).toBe(4)
    expect(item(buildPackingList({ days: 14, extras: ['carryon'] }), 'Underwear').qty).toBe(5)
  })

  it('never packs more than 10 of a daily item, even on long trips', () => {
    expect(item(buildPackingList({ days: 14 }), 'Socks (pairs)').qty).toBe(10)
  })
})

describe('buildPackingList: invalid and extreme input', () => {
  it('uses 3 days when the trip length is missing or not a number', () => {
    expect(item(buildPackingList({}), 'T-shirts / tops').qty).toBe(3)
    expect(item(buildPackingList({ days: 'abc' }), 'T-shirts / tops').qty).toBe(3)
    expect(item(buildPackingList({ days: null }), 'T-shirts / tops').qty).toBe(3)
  })

  it('treats a negative trip length as 1 day', () => {
    expect(item(buildPackingList({ days: -5 }), 'T-shirts / tops').qty).toBe(1)
  })

  it('treats a very long trip as 30 days', () => {
    // Hiking clothes are 1 for every 3 days: 30 days -> 10
    const list = buildPackingList({ days: 1000, activities: ['hiking'] })
    expect(item(list, 'Quick-dry activewear').qty).toBe(10)
  })

  it('rounds part days down', () => {
    expect(item(buildPackingList({ days: 4.9 }), 'T-shirts / tops').qty).toBe(4)
  })

  it('ignores options it does not know', () => {
    const plain = buildPackingList({ days: 3 })
    const unknown = buildPackingList({ days: 3, activities: ['skydiving'], weather: ['volcanic'], extras: ['pet'] })
    expect(unknown).toEqual(plain)
  })
})
