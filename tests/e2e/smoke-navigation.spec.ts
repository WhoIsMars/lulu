import { test, expect } from '@playwright/test'

/**
 * Phase 7 — heap stability smoke test.
 *
 * Repeatedly navigates home → /p/<slug> → home for N cycles and asserts that
 * `performance.memory.usedJSHeapSize` does not grow by more than `MAX_GROWTH`
 * bytes between the warm baseline and the final snapshot.
 *
 * Notes on `performance.memory`:
 *  - Chromium-only (which is what our Playwright project runs against).
 *  - Quantised in 100KB-ish increments, so we use a generous 5MB threshold.
 *  - We force a GC if `gc()` is exposed (it isn't by default on Playwright's
 *    Chromium — that's fine; the threshold accommodates that).
 *
 * If a real listener/closure leak appears (e.g. a window-level listener
 * registered without cleanup in a view), the heap will grow linearly per
 * cycle and easily blow past 5MB.
 */

const SLUG = 'un-altro-sogno'
const CYCLES = 10
const MAX_GROWTH_BYTES = 5 * 1024 * 1024

async function unlock(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('./gate')
  await page.evaluate(() => sessionStorage.setItem('lulu:gate', 'true'))
}

async function heap(page: import('@playwright/test').Page): Promise<number | null> {
  return page.evaluate(() => {
    interface PerfWithMemory extends Performance {
      memory?: { usedJSHeapSize: number }
    }
    const m = (performance as PerfWithMemory).memory
    return m ? m.usedJSHeapSize : null
  })
}

test('heap is stable across 10× home ↔ polaroid navigations', async ({ page }) => {
  await unlock(page)

  // Warm the SPA: hit home + one polaroid before we start measuring, so the
  // initial code-split chunks + image decoders are already resident.
  await page.goto('./')
  await expect(page.locator('main[aria-label="stanza"]')).toBeVisible()
  await page.goto(`./p/${SLUG}`)
  await expect(page.locator('main')).toBeVisible()
  await page.goto('./')
  await expect(page.locator('main[aria-label="stanza"]')).toBeVisible()

  const baseline = await heap(page)
  test.skip(baseline === null, 'performance.memory not available in this browser')

  for (let i = 0; i < CYCLES; i++) {
    await page.goto(`./p/${SLUG}`)
    await expect(page.locator('main')).toBeVisible()
    await page.goto('./')
    await expect(page.locator('main[aria-label="stanza"]')).toBeVisible()
  }

  // Settle: wait a tick for any pending microtasks / image decodes to release.
  await page.waitForTimeout(500)
  const final = await heap(page)
  expect(final).not.toBeNull()

  const growth = (final ?? 0) - (baseline ?? 0)
  // eslint-disable-next-line no-console
  console.log(
    `[smoke] heap baseline=${(baseline ?? 0) / 1024 / 1024 | 0}MB ` +
      `final=${(final ?? 0) / 1024 / 1024 | 0}MB ` +
      `growth=${(growth / 1024 / 1024).toFixed(2)}MB ` +
      `over ${CYCLES} cycles`,
  )
  expect(
    growth,
    `Heap grew by ${growth} bytes over ${CYCLES} navigation cycles ` +
      `(threshold ${MAX_GROWTH_BYTES} bytes). Investigate listener / closure leaks.`,
  ).toBeLessThan(MAX_GROWTH_BYTES)
})
