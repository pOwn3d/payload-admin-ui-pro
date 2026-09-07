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
    const themeSection = page.locator('text=Thème').or(page.locator('text=Theme')).first()
    await themeSection.click()

    // Theme select should be visible
    const themeSelect = page.locator('[name="theme.preset"]').or(
      page.locator('[id*="theme"] [class*="react-select"]')
    )
    await expect(themeSelect.first()).toBeVisible({ timeout: 5000 })
  })

  test('should show theme preview when theme is selected', async ({ page }) => {
    await goToSettings(page)

    const themeSection = page.locator('text=Thème').or(page.locator('text=Theme')).first()
    await themeSection.click()

    // ThemePreview renders the preset's display name — one of the eight real
    // ones. Asserting on the name catches an id/name mismatch, which otherwise
    // leaves the component returning null with no warning.
    const previewName = page.locator('h4', {
      hasText: /Indigo Pro|Emerald Nature|Slate Corporate|Amber Warm|Rose Soft|Ocean Deep|Crimson Bold|Midnight Dark/,
    })
    await expect(previewName.first()).toBeVisible({ timeout: 10_000 })
  })

  test('should show export/import UI', async ({ page }) => {
    await goToSettings(page)

    // Open Export/Import section
    const exportSection = page.locator('text=Export').or(page.locator('text=Exporter')).first()
    await exportSection.click()

    // Should show copy button
    const copyBtn = page.getByRole('button', { name: /copy|copier/i })
    await expect(copyBtn.first()).toBeVisible({ timeout: 5000 })
  })

  test('should save settings without error', async ({ page }) => {
    await goToSettings(page)

    // Click save
    const saveBtn = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /save|enregistrer/i })
    ).first()
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
    await saveBtn.click()

    // Should not show an error toast
    await expect(page.locator('.toast--error')).toHaveCount(0, { timeout: 5000 })
  })
})
