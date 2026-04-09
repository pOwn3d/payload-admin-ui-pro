import { defineConfig } from '@playwright/test'

/**
 * Playwright E2E tests for Admin UI Pro.
 * Expects a Payload dev server running on BASE_URL (default: http://localhost:3001).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
