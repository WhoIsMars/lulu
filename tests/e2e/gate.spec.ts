import { test, expect } from '@playwright/test'

test.describe('gate', () => {
  test('rest state: shows envelope CTA, opens to password input on /gate', async ({ page }) => {
    await page.goto('./gate')
    // Closed: envelope button is the visible CTA, NOT the password input.
    const envelope = page.getByRole('button', { name: 'apri la lettera' })
    await expect(envelope).toBeVisible()
    // Open the letter to reveal the password form.
    await envelope.click()
    await expect(page.getByLabel('password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entra' })).toBeVisible()
    // Locked redirect: visiting / sends to /gate as well
    await page.goto('./')
    await expect(page).toHaveURL(/\/gate$/)
  })

  test('wrong password: aria-live shows "password non corretta", focus stays, input auto-selects', async ({
    page,
  }) => {
    await page.goto('./gate')
    await page.getByRole('button', { name: 'apri la lettera' }).click()
    const input = page.getByLabel('password')
    await expect(input).toBeVisible()
    await input.fill('definitely-not-the-password')
    const start = Date.now()
    await page.getByRole('button', { name: 'Entra' }).click()
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      'password non corretta',
    )
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(750) // D-13 floor (allow 50ms wiggle for click→submit lag)
    await expect(input).toBeFocused()
  })

  test('session persistence: correct password sets sessionStorage lulu:gate=true; refresh stays unlocked', async ({
    page,
  }) => {
    await page.goto('./gate')
    await page.getByRole('button', { name: 'apri la lettera' }).click()
    const input = page.getByLabel('password')
    await expect(input).toBeVisible()
    await input.fill('lulu-dev-placeholder')
    await page.getByRole('button', { name: 'Entra' }).click()
    // After unlock, router redirects to home; aria-label="stanza" landmark is present.
    await expect(page.locator('main[aria-label="stanza"]')).toBeVisible({ timeout: 5000 })
    const flag = await page.evaluate(() => sessionStorage.getItem('lulu:gate'))
    expect(flag).toBe('true')
    // Refresh — still unlocked, no redirect to /gate.
    await page.reload()
    await expect(page.locator('main[aria-label="stanza"]')).toBeVisible()
    await expect(page).not.toHaveURL(/\/gate$/)
  })

  test('deep-link refresh: /p/test renders without GitHub 404 (SPA fallback served via 404.html)', async ({
    page,
  }) => {
    // Playwright webServer runs `npm run preview` after `VITE_BASE=/lulu/ npm run build`,
    // so dist/404.html exists. Local preview maps unknown paths via SPA history fallback,
    // which is the local equivalent of GH Pages' 404.html serve.
    const resp = await page.goto('./p/anything')
    expect(resp?.status()).toBeLessThan(500)
    // Locked → router guard redirects to /gate; <main> from GateView is visible.
    await expect(page.locator('main')).toBeVisible()
  })
})
