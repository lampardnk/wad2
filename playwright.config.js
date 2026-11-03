import { defineConfig } from '@playwright/test'

// E2E tests run in a real browser against a production build of the app (pnpm build + vite preview),
// which sends /api requests to the server on port 3000.
// Before running: start the server (pnpm dev:api) and set TEST_USERNAME / TEST_PASSWORD for a test account.
// The tests make their own trips and delete them afterwards.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e/*.spec.js',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true
  },
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120000
  }
})
