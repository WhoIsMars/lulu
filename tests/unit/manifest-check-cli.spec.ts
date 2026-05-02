/**
 * Smoke test for the standalone CLI `npm run manifest:check`.
 *
 * Detailed validation-error coverage already lives in `manifest-loader.spec.ts`.
 * Here we only check that the CLI wires `loadManifest` correctly: invoking it
 * against the real repo (which is valid after Plan 02-01) must exit 0 and
 * produce a confirmation line in italian on stdout.
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

describe('manifest:check CLI', () => {
  it('exits 0 with success message on the real repo manifest', () => {
    const out = execSync('npm run manifest:check --silent', { encoding: 'utf8' })
    expect(out).toContain('Manifest valido')
  })
})
