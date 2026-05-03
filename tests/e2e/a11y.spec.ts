import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Phase 7 (A11Y-06) — axe-core scan on the three real views.
 *
 * Strategy:
 * - GateView: load `/gate`, run axe.
 * - HomeView: prime sessionStorage `lulu:gate=true` BEFORE navigation so the
 *   router guard does not bounce us back to /gate, then load `/`.
 * - PolaroidView: same prime + load `/p/<slug>` for a known slug.
 *
 * We assert there are zero `serious` or `critical` violations under
 * `wcag2a` + `wcag2aa`. Lower-severity violations are surfaced via console.log
 * for awareness but do not fail the build.
 *
 * Decorative SVGs in this codebase are already marked `aria-hidden="true"`
 * and do not need to be excluded — axe correctly ignores them. We only
 * exclude the candle-cursor element (`.home__cursor-candle`) because it is
 * a follow-the-pointer presentational element and axe's color-contrast rule
 * has no notion of "this never carries text content".
 */

const SLUG = 'un-altro-sogno'

async function unlockGate(page: import('@playwright/test').Page): Promise<void> {
  // Visit the base URL once so we have a same-origin context to set storage on.
  await page.goto('./gate')
  await page.evaluate(() => sessionStorage.setItem('lulu:gate', 'true'))
}

async function expectNoSeriousOrCritical(
  page: import('@playwright/test').Page,
  label: string,
): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])
  // The candle-cursor is a presentational, pointer-following SVG. It carries
  // no text content; excluding it avoids spurious color-contrast hits without
  // hiding any real failure surface.
  builder.exclude('.home__cursor-candle')
  const results = await builder.analyze()

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )

  if (results.violations.length > 0) {
    // Surface ALL violations (including minor/moderate) for visibility.
    // eslint-disable-next-line no-console
    console.log(
      `[axe:${label}] ${results.violations.length} violation(s):`,
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        help: v.help,
      })),
    )
  }

  expect(
    blocking,
    `axe found ${blocking.length} serious/critical violation(s) on ${label}: ` +
      JSON.stringify(
        blocking.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
        null,
        2,
      ),
  ).toEqual([])
}

test.describe('a11y (axe-core, wcag2a + wcag2aa)', () => {
  test('GateView (closed envelope) has no serious/critical violations', async ({ page }) => {
    await page.goto('./gate')
    await expect(page.getByRole('button', { name: 'apri la lettera' })).toBeVisible()
    await expectNoSeriousOrCritical(page, 'GateView:closed')
  })

  test('GateView (opened letter, password form visible) has no serious/critical violations', async ({
    page,
  }) => {
    await page.goto('./gate')
    await page.getByRole('button', { name: 'apri la lettera' }).click()
    await expect(page.getByLabel('password')).toBeVisible()
    await expectNoSeriousOrCritical(page, 'GateView:opened')
  })

  test('HomeView has no serious/critical violations', async ({ page }) => {
    await unlockGate(page)
    await page.goto('./')
    await expect(page.locator('main[aria-label="stanza"]')).toBeVisible()
    await expectNoSeriousOrCritical(page, 'HomeView')
  })

  test('PolaroidView has no serious/critical violations', async ({ page }) => {
    await unlockGate(page)
    await page.goto(`./p/${SLUG}`)
    // PolaroidView's <main> uses dynamic aria-label "<title>, <date>"; we just
    // wait for any <main> with role=main to settle.
    await expect(page.locator('main')).toBeVisible()
    await expectNoSeriousOrCritical(page, 'PolaroidView')
  })
})
