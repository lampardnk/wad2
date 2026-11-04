// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import ItineraryPlanner from './ItineraryPlanner.vue'

beforeAll(() => {
  Element.prototype.scrollTo = () => {}
})

describe('TestSuite: ItineraryPlanner', () => {

  it('Test1: mounts the itinerary planner successfully', () => {
    const wrapper = mount(ItineraryPlanner, {
      props: {
        days: [],
        selectedDate: '',
        stops: [],
        wishlist: [],
        scheduledNames: []
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('Test2: displays the selected trip day', () => {
    const wrapper = mount(ItineraryPlanner, {
        props: {
        days: ['2026-10-26', '2026-10-27'],
        selectedDate: '2026-10-26',
        stops: [],
        wishlist: [],
        scheduledNames: []
        }
    })

    expect(wrapper.text()).toContain('Day 1')
    expect(wrapper.text()).toContain('of 2')
    })

    it('Test3: displays an itinerary stop', () => {
        const wrapper = mount(ItineraryPlanner, {
            props: {
            days: ['2026-10-26'],
            selectedDate: '2026-10-26',
            stops: [
                {
                id: 'stop1',
                name: 'Tokyo Tower',
                date: '2026-10-26',
                duration: 1.5,
                hour: 10,
                lat: 35.6586,
                lon: 139.7454
                }
            ],
            wishlist: [],
            scheduledNames: []
            }
        })

        expect(wrapper.text()).toContain('Tokyo Tower')
        })

    it('Test4: emits select-day when another day is clicked', async () => {
        const wrapper = mount(ItineraryPlanner, {
            props: {
            days: ['2026-10-26', '2026-10-27'],
            selectedDate: '2026-10-26',
            stops: [],
            wishlist: [],
            scheduledNames: []
            }
        })

        const dayButtons = wrapper.findAll('.ip-day')

        await dayButtons[1].trigger('click')

        expect(wrapper.emitted('select-day')).toBeTruthy()
        expect(wrapper.emitted('select-day')[0]).toEqual(['2026-10-27'])
    })

    it('Test5: displays an empty-day message when there are no stops', () => {
        const wrapper = mount(ItineraryPlanner, {
            props: {
            days: ['2026-10-26'],
            selectedDate: '2026-10-26',
            stops: [],
            wishlist: [],
            scheduledNames: []
            }
        })

        expect(wrapper.text()).toContain('Nothing planned for Day 1 yet')
    })

    it('Test6: hides the empty-day message when there is a stop', () => {
        const wrapper = mount(ItineraryPlanner, {
            props: {
            days: ['2026-10-26'],
            selectedDate: '2026-10-26',
            stops: [
                {
                id: 'stop1',
                name: 'Tokyo Tower',
                date: '2026-10-26',
                duration: 1.5,
                hour: 10,
                lat: 35.6586,
                lon: 139.7454
                }
            ],
            wishlist: [],
            scheduledNames: []
            }
        })

        expect(wrapper.text()).not.toContain('Nothing planned for Day 1 yet')
    })

    it('Test7: displays a locked stop as locked', () => {
        const wrapper = mount(ItineraryPlanner, {
            props: {
            days: ['2026-10-26'],
            selectedDate: '2026-10-26',
            stops: [
                {
                id: 'stop1',
                name: 'Tokyo Tower',
                date: '2026-10-26',
                duration: 1.5,
                hour: 10,
                lat: 35.6586,
                lon: 139.7454,
                locked: true
                }
            ],
            wishlist: [],
            scheduledNames: []
            }
        })

        const lockButton = wrapper.find(
            'button[aria-label="Unlock Tokyo Tower"]'
        )

        expect(lockButton.exists()).toBe(true)
    })
    it('Test8: emits lock when the user locks a stop', async () => {
        const wrapper = mount(ItineraryPlanner, {
            props: {
            days: ['2026-10-26'],
            selectedDate: '2026-10-26',
            stops: [
                {
                id: 'stop1',
                name: 'Tokyo Tower',
                date: '2026-10-26',
                duration: 1.5,
                hour: 10,
                lat: 35.6586,
                lon: 139.7454,
                locked: false
                }
            ],
            wishlist: [],
            scheduledNames: []
            }
        })

        const lockButton = wrapper.find(
            'button[aria-label="Lock Tokyo Tower"]'
        )

        await lockButton.trigger('click')

        expect(wrapper.emitted('lock')).toBeTruthy()
        expect(wrapper.emitted('lock')[0]).toEqual(['stop1', true])
    })
})