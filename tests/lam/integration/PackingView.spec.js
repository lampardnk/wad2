// Integration test: PackingView + its child components + the packing list logic + the real server.
// Needs the server running and a test account: see playwright.config.js
// Run: pnpm exec vitest run tests/lam/integration
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PackingView from '../../../src/components/trip/PackingView.vue'
import { logIn, createTrip, getTrip, deleteTrip, axios } from './api.js'

let trip

beforeAll(async () => {
  await logIn()
  // A 3-day beach trip in hot weather
  trip = await createTrip({ activities: ['beach'], weather: ['hot'] })
})

afterAll(async () => {
  await deleteTrip(trip.id)
})

function mountList(saved = null) {
  return mount(PackingView, {
    props: { tripId: trip.id, days: 3, activities: trip.activities, weather: trip.weather, extras: trip.extras, initialPacking: saved }
  })
}

function progress(wrapper) {
  return wrapper.find('[data-testid="packing-progress"]').text()
}

function checkboxOf(wrapper, name) {
  const row = wrapper.findAll('.pk-item').find((li) => li.text().includes(name))
  return row.find('input[type="checkbox"]')
}

// The list saves 0.6 s after a change; wait for "Saved ✓"
async function waitForSave(wrapper) {
  for (let i = 0; i < 40 && !wrapper.text().includes('Saved ✓'); i++) {
    await new Promise((r) => setTimeout(r, 100))
    await flushPromises()
  }
  expect(wrapper.text()).toContain('Saved ✓')
}

describe('PackingView with the server', () => {
  it('shows the list built from the trip details, with nothing packed yet', () => {
    const wrapper = mountList()
    expect(wrapper.text()).toContain('Passport')
    expect(wrapper.text()).toContain('Swimwear') // from "beach"
    expect(wrapper.text()).not.toContain('Ski goggles')
    expect(progress(wrapper)).toMatch(/^0 of \d+ packed$/)
  })

  it('saves a ticked item and an added item, and shows them after a reload', async () => {
    const wrapper = mountList()
    await checkboxOf(wrapper, 'Passport').setValue(true)
    await wrapper.find('#pk-add-other').setValue('  Travel pillow  ')
    await wrapper.find('#pk-add-other').trigger('submit')
    await waitForSave(wrapper)

    // What the server kept
    const saved = (await getTrip(trip.id)).packing
    expect(saved.checked.passport).toBe(true)
    expect(saved.custom.map((c) => c.name)).toContain('Travel pillow')

    // Opening the list again shows the same thing
    const reopened = mountList(saved)
    expect(progress(reopened)).toMatch(/^1 of \d+ packed$/)
    expect(reopened.text()).toContain('Travel pillow')
  })

  it('does not add an item with a blank name', async () => {
    const wrapper = mountList()
    const before = progress(wrapper)
    const input = wrapper.find('#pk-add-other')
    await input.setValue('   ')
    expect(input.element.form.querySelector('button').disabled).toBe(true)
    await input.trigger('submit') // even if the form is sent anyway
    expect(progress(wrapper)).toBe(before)
  })

  it('keeps the amount between 1 and 99', async () => {
    const wrapper = mountList()
    expect(wrapper.find('[aria-label="Fewer Passport"]').attributes('disabled')).toBeDefined()
    const more = wrapper.find('[aria-label="More Passport"]')
    for (let i = 0; i < 120; i++) await more.trigger('click')
    expect(wrapper.find('[aria-label="Amount of Passport"]').text()).toContain('99')
    expect(more.attributes('disabled')).toBeDefined()
  })

  it('server refuses a list with a blank item name or a bad trip id', async () => {
    const blank = axios.put('/api/trips/' + trip.id + '/packing', { packing: { custom: [{ id: 'mine-1', name: '   ', category: 'other' }] } })
    await expect(blank).rejects.toMatchObject({ response: { status: 400 } })

    const badId = axios.put('/api/trips/not-a-trip/packing', { packing: { checked: {} } })
    await expect(badId).rejects.toMatchObject({ response: { status: 404 } })
  })

  it('server drops amounts that are not whole numbers from 0 to 99', async () => {
    await axios.put('/api/trips/' + trip.id + '/packing', { packing: { qty: { passport: 500, socks: -3, shirts: 'abc', hats: 2 } } })
    const saved = (await getTrip(trip.id)).packing
    expect(saved.qty).toEqual({ hats: 2 })
  })
})
