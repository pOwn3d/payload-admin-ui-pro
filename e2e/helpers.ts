import { type Page, expect } from '@playwright/test'

/**
 * Login to Payload admin with email/password.
 */
export async function login(page: Page, email = 'admin@test.com', password = 'admin123') {
  await page.goto('/admin')
  // Wait for login page or redirect to dashboard
  await page.waitForLoadState('networkidle')

  // If already logged in, return
  if (page.url().includes('/admin') && !page.url().includes('/login')) return

  await page.fill('input[name="email"], input[type="email"]', email)
  await page.fill('input[name="password"], input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/**', { timeout: 10_000 })
}

/**
 * Navigate to the admin settings page.
 */
export async function goToSettings(page: Page) {
  await page.goto('/admin/globals/admin-ui-pro-settings')
  await page.waitForLoadState('networkidle')
}

/**
 * Wait for AUP design tokens to be injected.
 */
export async function waitForTokens(page: Page) {
  await page.waitForSelector('#aup-design-tokens', { state: 'attached', timeout: 10_000 })
}
