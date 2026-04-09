import { test, expect } from '@playwright/test'
import { login, waitForTokens } from './helpers'

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin')
    await waitForTokens(page)
  })

  test('should open with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.locator('.aup-palette-dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
  })

  test('should close with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.locator('.aup-palette-dialog')
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('should show search results when typing', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const input = page.locator('.aup-palette-dialog input')
    await expect(input).toBeVisible()

    await input.fill('pages')
    // Should have at least one result item
    const items = page.locator('.aup-palette-item')
    await expect(items.first()).toBeVisible({ timeout: 5000 })
  })

  test('should navigate results with keyboard', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    const input = page.locator('.aup-palette-dialog input')
    await input.fill('a')
    await page.waitForTimeout(500)

    // Press arrow down
    await page.keyboard.press('ArrowDown')
    // Some item should have aria-selected=true
    const selected = page.locator('.aup-palette-item[aria-selected="true"]')
    await expect(selected).toBeVisible()
  })
})
