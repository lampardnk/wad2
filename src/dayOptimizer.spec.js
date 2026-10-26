import { describe, it, expect } from 'vitest'
import { haversineKm, travelBetween, scheduleInOrder, warningsFor, rainFromBlocks, defaultDuration } from './dayOptimizer.js'

describe('TestSuite: dayOptimizer', () => {

  it('Test1: distance between the same location is 0 km', () => {
    const location = {
      lat: 1.3521,
      lon: 103.8198
    }

    expect(haversineKm(location, location)).toBe(0)
  })

  it('Test2: recommends walking for two nearby places', () => {
    const placeA = {
        id: 'A',
        lat: 1.3521,
        lon: 103.8198
    }

    const placeB = {
        id: 'B',
        lat: 1.3530,
        lon: 103.8200
    }

    const result = travelBetween(placeA, placeB)

    expect(result.mode).toBe('walk')
    })

    it('Test3: recommends transit for places more than 1.3 km apart', () => {
        const placeA = {
            id: 'A',
            lat: 1.3521,
            lon: 103.8198
        }

        const placeB = {
            id: 'B',
            lat: 1.3000,
            lon: 103.8500
        }

        const result = travelBetween(placeA, placeB)

        expect(result.mode).toBe('transit')
    })

    it('Test4: waits until a place opens before starting the activity', () => {
        const museum = {
            id: 'museum',
            name: 'Museum',
            duration: 2,
            open: 10,
            close: 18
        }

        const matrix = {
            museum: {
            museum: {
                min: 0,
                mode: 'walk',
                km: 0
            }
            }
        }

        const result = scheduleInOrder(
            [museum],
            [],
            matrix,
            {
            dayStart: 9,
            dayEnd: 21,
            meals: false
            }
        )

        expect(result[0].start).toBe(10)
    })

    it('Test5: warns when an outdoor activity is scheduled during rain', () => {
        const itineraryItem = {
            stop: {
            id: 'park',
            name: 'Park',
            outdoor: true,
            duration: 1,
            locked: false
            },
            start: 15,
            travelMin: 0,
            waitMin: 0,
            lateMin: 0
        }

        const rainByHour = new Array(24).fill(0)

        rainByHour[15] = 1

        const warnings = warningsFor(
            itineraryItem,
            rainByHour,
            {
            dayStart: 9,
            dayEnd: 21
            }
        )

        expect(warnings.map(warning => warning.text))
            .toContain('Outdoors during predicted rain')
    })

    it('Test6: does not warn about rain for an indoor activity', () => {
        const itineraryItem = {
            stop: {
            id: 'museum',
            name: 'Museum',
            outdoor: false,
            duration: 1,
            locked: false
            },
            start: 15,
            travelMin: 0,
            waitMin: 0,
            lateMin: 0
        }

        const rainByHour = new Array(24).fill(0)

        rainByHour[15] = 1

        const warnings = warningsFor(
            itineraryItem,
            rainByHour,
            {
            dayStart: 9,
            dayEnd: 21
            }
        )

        expect(warnings.map(warning => warning.text))
            .not.toContain('Outdoors during predicted rain')
    })

    it('Test7: keeps a locked stop at its fixed time', () => {
        const booking = {
            id: 'dinner',
            name: 'Dinner Reservation',
            duration: 1,
            locked: true,
            hour: 18,
            open: 17,
            close: 22
        }

        const matrix = {
            dinner: {
            dinner: {
                min: 0,
                mode: 'walk',
                km: 0
            }
            }
        }

        const result = scheduleInOrder(
            [],
            [booking],
            matrix,
            {
            dayStart: 9,
            dayEnd: 21,
            meals: false
            }
        )

        expect(result[0].start).toBe(18)
    })

    it('Test8: converts a rainy weather block into hourly rain values', () => {
        const weatherBlocks = [
            {
            time: 15,
            span: 3,
            rain: true
            }
        ]

        const rainByHour = rainFromBlocks(weatherBlocks)

        expect(rainByHour[15]).toBe(0.8)
        expect(rainByHour[16]).toBe(0.8)
        expect(rainByHour[17]).toBe(0.8)
        expect(rainByHour[18]).toBe(0.1)
    })

    it('Test9: gives a museum a default duration of 2 hours', () => {
        const stop = {
            name: 'National Museum'
        }

        const duration = defaultDuration(stop)

        expect(duration).toBe(2)
    })

    it('Test10: uses 1.5 hours when the stop has no recognised category', () => {
        const stop = {
            name: 'Random Attraction'
        }

        const duration = defaultDuration(stop)

        expect(duration).toBe(1.5)
    })

})