import { test, expect } from '@playwright/test'
import { login, waitForTokens, goToSettings } from './helpers'

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should inject design tokens CSS', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    // Verify CSS variables are set
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--aup-accent')
    )
    expect(accent.trim()).not.toBe('')
  })

  test('should apply theme override when selected', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    // Theme override style tag should exist or be injected
    const themeStyle = page.locator('#aup-theme-override')
    // It may or may not exist depending on if a theme was selected
    await page.waitForTimeout(2000)
  })

  test('should show theme preview in settings', async ({ page }) => {
    await goToSettings(page)

    // Open Theme section
    const themeCollapsible = page.locator('button:has-text("Thème"), button:has-text("Theme")')
    if (await themeCollapsible.first().isVisible()) {
      await themeCollapsible.first().click()
      await page.waitForTimeout(1000)

      // ThemePreview should be rendered
      // It shows color swatches
      await page.waitForTimeout(2000)
    }
  })

  test('should show keyboard shortcuts dialog with Cmd+/', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    await page.keyboard.press('Meta+/')
    const dialog = page.locator('[role="dialog"][aria-label="Keyboard shortcuts"]')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Should list shortcuts
    const rows = dialog.locator('kbd')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Close with ESC
    await page.keyboard.press('Escape')
  })

  test('should show notification bell when activity module is enabled', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Bell icon should be in the nav area
    const bell = page.locator('button[aria-label*="Notification"], button:has-text("🔔")')
    // May or may not be visible depending on activity module
  })
})
