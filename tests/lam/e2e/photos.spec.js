// E2E test: a logged-in user adds, reacts to and deletes photos on one of their trips.
// Needs the app running with a test account: see playwright.config.js
import { test, expect } from '@playwright/test'
import { logIn, createTrip, deleteTrip, openTab } from './helpers.js'

// A real 1x1 PNG image
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

let tripId

test.beforeEach(async ({ page }) => {
  await logIn(page)
  tripId = await createTrip(page)
  await page.goto('/trip/' + tripId)
  await openTab(page, 'Photos')
})

test.afterEach(async ({ page }) => {
  await deleteTrip(page, tripId)
})

test('user can add a photo, react to it, and delete it', async ({ page }) => {
  await expect(page.getByText('Start the shared roll')).toBeVisible()

  // Add a photo with the file picker
  await page.locator('input[type="file"]').setInputFiles({ name: 'temple.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('Added ✓')).toBeVisible()
  await expect(page.getByText(/^1 photo/)).toBeVisible()

  // It's saved: still there after reloading the page
  await page.reload()
  await openTab(page, 'Photos')
  await expect(page.getByText(/^1 photo/)).toBeVisible()

  // React with a heart, then take it back (the reaction buttons show when you point at the photo's tile)
  await page.getByRole('figure').first().hover()
  const heart = page.getByRole('button', { name: /^❤️/ }).first()
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'false')

  // Open it and delete it (it asks first)
  await page.getByRole('button', { name: 'Open photo 1' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete for everyone' }).click()
  await expect(page.getByText(/^0 photos/)).toBeVisible()
})

test('user sees why files are refused, and nothing is added', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo') },
    { name: 'IMG_0001.heic', mimeType: 'image/heic', buffer: Buffer.from('heic') },
    { name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }
  ])

  await expect(page.getByText('notes.txt: Not a JPEG, PNG, WebP or GIF')).toBeVisible()
  await expect(page.getByText('IMG_0001.heic: HEIC photos are not supported, export as JPEG')).toBeVisible()
  await expect(page.getByText('huge.jpg: Bigger than 10 MB')).toBeVisible()
  await expect(page.getByText(/^0 photos/)).toBeVisible()
})
