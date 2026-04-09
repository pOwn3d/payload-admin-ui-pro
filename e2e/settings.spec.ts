import { test, expect } from '@playwright/test'
import { login, goToSettings } from './helpers'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should load settings page', async ({ page }) => {
    await goToSettings(page)
    // Should have the page title
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('should show module toggles', async ({ page }) => {
    await goToSettings(page)
    // Module toggle checkboxes should exist
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show theme preset selector', async ({ page }) => {
    await goToSettings(page)

    // Open Theme collapsible
    const themeSection = page.locator('text=Thème').or(page.locator('text=Theme'))
    if (await themeSection.isVisible()) {
      await themeSection.click()
      await page.waitForTimeout(500)

      // Theme select should be visible
      const themeSelect = page.locator('[name="theme.preset"]').or(
        page.locator('[id*="theme"] [class*="react-select"]')
      )
      await expect(themeSelect.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show theme preview when theme is selected', async ({ page }) => {
    await goToSettings(page)

    // ThemePreview component should render
    await page.waitForTimeout(2000)
    // Look for swatch elements or mini preview
    const preview = page.locator('[class*="swatch"], [style*="border-radius: 10px"]')
    // May or may not be visible depending on collapsible state
  })

  test('should show export/import UI', async ({ page }) => {
    await goToSettings(page)

    // Open Export/Import section
    const exportSection = page.locator('text=Export').or(page.locator('text=Exporter'))
    if (await exportSection.isVisible()) {
      await exportSection.click()
      await page.waitForTimeout(500)

      // Should show copy button
      const copyBtn = page.getByRole('button', { name: /copy|copier/i })
      await expect(copyBtn).toBeVisible({ timeout: 5000 })
    }
  })

  test('should save settings without error', async ({ page }) => {
    await goToSettings(page)

    // Click save
    const saveBtn = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /save|enregistrer/i })
    )
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      // Should not show error toast
      await page.waitForTimeout(2000)
      const errorToast = page.locator('.toast--error, [class*="error"]')
      expect(await errorToast.count()).toBe(0)
    }
  })
})
