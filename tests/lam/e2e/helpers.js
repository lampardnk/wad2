import { expect } from '@playwright/test'

// Log in through the login page with the test account (see playwright.config.js)
export async function logIn(page) {
  await page.goto('/login')
  await page.getByTestId('login-username').fill(process.env.TEST_USERNAME)
  await page.getByTestId('login-password').fill(process.env.TEST_PASSWORD)
  await page.getByTestId('login-password').press('Enter')
  await expect(page).toHaveURL(/\/home/)
}

function authHeader(page) {
  return page.evaluate(() => ({ Authorization: 'Bearer ' + localStorage.getItem('token') }))
}

// A trip of our own to test on, starting in 30 days (so it isn't archived). Deleted again by deleteTrip.
export async function createTrip(page, details = {}) {
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
  const res = await page.request.post('/api/trips', {
    headers: await authHeader(page),
    data: { name: 'E2E test trip', destinations: ['Kyoto, Japan'], startDate: day(30), endDate: day(32), ...details }
  })
  expect(res.status()).toBe(201)
  return (await res.json()).id
}

export async function deleteTrip(page, id) {
  await page.request.delete('/api/trips/' + id, { headers: await authHeader(page) })
}

// Open a section of the trip page. On narrower screens it may be under "More".
export async function openTab(page, name) {
  await expect(page.getByRole('tab').first()).toBeVisible() // the trip has loaded
  const tab = page.getByRole('tab', { name })
  if (await tab.isVisible()) {
    await tab.click()
  } else {
    await page.getByTestId('trip-more').click()
    await page.getByRole('option', { name }).click()
  }
}
