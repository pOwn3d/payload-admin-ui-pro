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

/** Slug of the settings global, as declared in createAdminUiProSettingsGlobal. */
export const SETTINGS_GLOBAL_SLUG = 'aup-settings'

/**
 * Navigate to the admin settings page.
 *
 * The URL used to be `/admin/globals/admin-ui-pro-settings`, a slug that does
 * not exist — every settings spec was asserting against Payload's 404 page and
 * still going green, because each assertion sat behind an `isVisible()` guard.
 * The explicit not-found check below makes that failure mode loud.
 *
 * The two assertions are deliberately separate: Playwright does not accept the
 * `text=` engine inside a comma-separated CSS list, so a single
 * `locator('.not-found, text=/nothing found/i')` throws
 * `Unexpected token "=" while parsing css selector` on every call — which would
 * make the helper itself the failure, not the 404 it is meant to catch.
 */
export async function goToSettings(page: Page) {
  await page.goto(`/admin/globals/${SETTINGS_GLOBAL_SLUG}`)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.not-found')).toHaveCount(0)
  await expect(page.getByText(/nothing found/i)).toHaveCount(0)
}

/**
 * Wait for AUP design tokens to be injected.
 */
export async function waitForTokens(page: Page) {
  await page.waitForSelector('#aup-design-tokens', { state: 'attached', timeout: 10_000 })
}
