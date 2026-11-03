// E2E test: a logged-in user works through the packing list of one of their trips.
// Needs the app running with a test account: see playwright.config.js
import { test, expect } from '@playwright/test'
import { logIn, createTrip, deleteTrip, openTab } from './helpers.js'

let tripId

test.beforeEach(async ({ page }) => {
  await logIn(page)
  tripId = await createTrip(page, { activities: ['beach'], weather: ['hot'] })
  await page.goto('/trip/' + tripId)
  await openTab(page, 'Packing')
})

test.afterEach(async ({ page }) => {
  await deleteTrip(page, tripId)
})

test('user can tick items and add their own, and it is all still there after a reload', async ({ page }) => {
  const progress = page.getByTestId('packing-progress')
  await expect(progress).toHaveText(/^0 of \d+ packed\s*$/)
  await expect(page.getByText('Swimwear')).toBeVisible() // from "beach"

  // Tick the passport, add a travel pillow
  await page.getByRole('checkbox', { name: /Passport/ }).check()
  await expect(progress).toHaveText(/^1 of \d+ packed\s*$/)
  await page.getByPlaceholder('+ Add to other').fill('Travel pillow')
  await page.getByPlaceholder('+ Add to other').press('Enter')
  await expect(page.getByText('Travel pillow')).toBeVisible()
  await expect(page.getByText('Saved ✓')).toBeVisible()

  // Reload: the server kept both
  await page.reload()
  await openTab(page, 'Packing')
  await expect(progress).toHaveText(/^1 of \d+ packed\s*$/)
  await expect(page.getByRole('checkbox', { name: /Passport/ })).toBeChecked()
  await expect(page.getByText('Travel pillow')).toBeVisible()
})

test('user cannot add a blank item or pack fewer than 1 of something', async ({ page }) => {
  const progress = page.getByTestId('packing-progress')
  const before = await progress.textContent()

  // A name made of spaces: the Add button stays off and Enter does nothing
  const input = page.getByPlaceholder('+ Add to other')
  await input.fill('    ')
  await expect(page.locator('form', { has: input }).getByRole('button', { name: 'Add' })).toBeDisabled()
  await input.press('Enter')
  await expect(progress).toHaveText(before)

  // The amount can't go below 1
  await expect(page.getByRole('button', { name: 'Fewer Passport' })).toBeDisabled()
})
