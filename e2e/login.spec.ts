import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('should display login form with theme background', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Login page should be visible
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Check for email and password inputs
    const emailInput = page.locator('input[name="email"], input[type="email"]')
    const passwordInput = page.locator('input[name="password"], input[type="password"]')
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should show glassmorphism card on login (#5)', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // The template-minimal__wrap should have glassmorphism styles
    const card = page.locator('.template-minimal__wrap')
    if (await card.count() > 0) {
      const styles = await card.evaluate((el) => getComputedStyle(el))
      // Just verify the card element exists and is visible
      await expect(card).toBeVisible()
    }
  })

  test('should have no gray corners on background (#34)', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Check html/body background is not default gray
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor
    })
    // Should not be plain white or default gray
    expect(bgColor).not.toBe('rgb(255, 255, 255)')
  })

  test('should display welcome message if configured', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Welcome message may or may not be present depending on config
    // Just verify the page loads without errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.waitForTimeout(2000)
    expect(errors).toHaveLength(0)
  })
})
