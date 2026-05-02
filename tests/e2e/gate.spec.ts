import { test, expect } from '@playwright/test'

test.describe('gate (Wave 0 stubs)', () => {
  test.skip('rest state: shows password input and Entra button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entra' })).toBeVisible()
  })

  test.skip('wrong password: aria-live shows "password non corretta", focus stays', async ({ page }) => {
    await page.goto('/')
    const input = page.getByLabel('password')
    await input.fill('definitely-wrong')
    await page.getByRole('button', { name: 'Entra' }).click()
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText('password non corretta')
    await expect(input).toBeFocused()
  })

  test.skip('session persistence: sessionStorage flag set on unlock', async () => {
    // Plan 03 wires this with a real password from gate.config.ts (set via gate:set).
  })

  test.skip('deep-link refresh: /p/test renders without GitHub 404', async ({ page }) => {
    await page.goto('/p/test')
    await expect(page.locator('main')).toBeVisible()
  })
})
