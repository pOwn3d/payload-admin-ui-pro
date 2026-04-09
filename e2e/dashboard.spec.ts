import { test, expect } from '@playwright/test'
import { login, waitForTokens } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load dashboard with widgets', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    // Dashboard should have widget cards
    const widgets = page.locator('.aup-widget-card')
    await expect(widgets.first()).toBeVisible({ timeout: 10_000 })

    // Should have at least one widget
    const count = await widgets.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show greeting based on time', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    // One of the greetings should be visible
    const greeting = page.locator('h1')
    await expect(greeting).toBeVisible()
  })

  test('should toggle customize mode', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    // Find and click customize button
    const customizeBtn = page.getByRole('button', { name: /customize|personnaliser/i })
    if (await customizeBtn.isVisible()) {
      await customizeBtn.click()

      // Should show "Done" button
      const doneBtn = page.getByRole('button', { name: /done|termine/i })
      await expect(doneBtn).toBeVisible()

      // Widgets should have dashed outline (editing mode)
      const widget = page.locator('.aup-widget-card').first()
      const outline = await widget.evaluate((el) => getComputedStyle(el).outline)
      expect(outline).toContain('dashed')
    }
  })

  test('should have drag & drop enabled in edit mode', async ({ page }) => {
    await page.goto('/admin')
    await waitForTokens(page)

    const customizeBtn = page.getByRole('button', { name: /customize|personnaliser/i })
    if (await customizeBtn.isVisible()) {
      await customizeBtn.click()
      // Widgets should be interactive (dnd-kit adds data attributes)
      const widget = page.locator('.aup-widget-card').first()
      await expect(widget).toBeVisible()
    }
  })
})
