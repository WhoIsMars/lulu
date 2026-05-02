---
phase: 01-foundation-deploy-soft-gate
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - vite.config.ts
  - scripts/post-build.mjs
  - tests/unit/vite-config.test.ts
  - tests/e2e/gate.spec.ts
autonomous: true
requirements: [FOUND-02, FOUND-04]
must_haves:
  truths:
    - "`VITE_BASE=/lulu/ npm run build` produces dist/ with all asset URLs prefixed `/lulu/`"
    - "`npm run build` (no env) builds with base `/` (custom-domain-ready)"
    - "After `npm run build`, `dist/404.html` is byte-identical to `dist/index.html`"
    - "After `npm run build`, `dist/.nojekyll` exists (zero-byte file)"
    - "Build fails non-zero on TS error (no `continue-on-error`)"
  artifacts:
    - path: vite.config.ts
      provides: "Env-driven base; sourcemap off in prod; @ alias to ./src"
      contains: "VITE_BASE"
    - path: scripts/post-build.mjs
      provides: "Copies dist/index.html → dist/404.html and writes dist/.nojekyll"
      contains: "404.html"
  key_links:
    - from: vite.config.ts
      to: "process.env.VITE_BASE"
      via: "loadEnv + base option"
      pattern: "VITE_BASE"
    - from: package.json
      to: scripts/post-build.mjs
      via: "build script chain: vue-tsc && vite build && node scripts/post-build.mjs"
      pattern: "post-build\\.mjs"
---

<objective>
Wire the Vite base path to a `VITE_BASE` env var (default `/`, CI sets `/lulu/`) and add a post-build script that creates the SPA fallback `dist/404.html` + `.nojekyll` so deep-link refresh works on GitHub Pages. Add a Vitest test that locks the base-resolution behavior.

Purpose: Closes Pitfalls 7 (white screen on subpath) and 11 (deep-link 404) before the deploy workflow ships in Plan 04.
Output: A buildable, preview-able Vite config with verified base-path discipline; SPA fallback artifacts written every build.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md
@.planning/phases/01-foundation-deploy-soft-gate/01-VALIDATION.md
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: vite.config.ts with env-driven base + sourcemap-off + @ alias</name>
  <files>vite.config.ts, tests/unit/vite-config.test.ts</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 1, lines 294-319 — vite.config.ts verbatim)
    - .planning/research/PITFALLS.md (Pitfall 7 + Pitfall 11 — base path discipline)
  </read_first>
  <behavior>
    - Test 1: `defineConfig` callback returns `base: '/lulu/'` when VITE_BASE=/lulu/ is set in env.
    - Test 2: returns `base: '/'` when VITE_BASE is unset (custom-domain default).
    - Test 3: returns `base: '/'` when VITE_BASE is the literal string '/'.
    - Test 4: `build.sourcemap` is false (Pitfall 7 / threat-model T-01-02).
    - Test 5: `resolve.alias['@']` resolves to a path ending in `/src`.
  </behavior>
  <action>
Create `vite.config.ts` per RESEARCH.md Pattern 1:

```typescript
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE ?? '/',
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      sourcemap: false,
      target: 'es2022',
    },
  }
})
```

Notes for the executor:
- Default `'/'` (not `'/lulu/'`) — D-02 says custom domain support is via env switch; CI sets `/lulu/`.
- `sourcemap: false` per Security Mistakes table in PITFALLS.md (don't ship readable JS).
- No vite-imagetools yet — Phase 4.

Then create `tests/unit/vite-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import config from '../../vite.config'

// Vite's defineConfig accepts a function. Resolve it with a minimal env to inspect the resolved object.
async function resolved(envBase: string | undefined) {
  const original = process.env.VITE_BASE
  if (envBase === undefined) delete process.env.VITE_BASE
  else process.env.VITE_BASE = envBase
  try {
    const cfg = typeof config === 'function' ? await (config as any)({ mode: 'production', command: 'build' }) : config
    return cfg
  } finally {
    if (original === undefined) delete process.env.VITE_BASE
    else process.env.VITE_BASE = original
  }
}

describe('vite.config base resolution', () => {
  it('uses /lulu/ when VITE_BASE=/lulu/', async () => {
    const cfg = await resolved('/lulu/')
    expect(cfg.base).toBe('/lulu/')
  })

  it('defaults to / when VITE_BASE is unset', async () => {
    const cfg = await resolved(undefined)
    expect(cfg.base).toBe('/')
  })

  it('uses / when VITE_BASE=/', async () => {
    const cfg = await resolved('/')
    expect(cfg.base).toBe('/')
  })

  it('disables sourcemaps in build', async () => {
    const cfg = await resolved('/lulu/')
    expect(cfg.build?.sourcemap).toBe(false)
  })

  it('aliases @ to ./src', async () => {
    const cfg = await resolved('/lulu/')
    const alias = cfg.resolve?.alias as Record<string, string>
    expect(alias['@']).toMatch(/\/src$/)
  })
})
```

RED → GREEN: write the test, run `npm run test:unit` (it fails because vite.config.ts doesn't exist yet OR test fails the assertion). Then write vite.config.ts, run again, all 5 tests green. Commit:
- `test(01-02): lock vite base resolution`
- `feat(01-02): vite.config.ts with env-driven base and sourcemap off`
  </action>
  <verify>
    <automated>test -f vite.config.ts && grep -q "VITE_BASE" vite.config.ts && grep -q "sourcemap: false" vite.config.ts && npm run test:unit -- --run tests/unit/vite-config.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `vite.config.ts` exists; `grep -c "VITE_BASE" vite.config.ts` ≥ 1.
    - `grep -c "sourcemap: false" vite.config.ts` ≥ 1.
    - `grep -c "fileURLToPath" vite.config.ts` ≥ 1 (@ alias wired).
    - `npx vitest run tests/unit/vite-config.test.ts` exits 0 with all 5 tests passing.
    - `VITE_BASE=/lulu/ npm run build` succeeds and `grep -l '/lulu/assets/' dist/index.html` finds the file (asset paths prefixed).
  </acceptance_criteria>
  <done>Base path is env-driven, custom-domain-ready, locked by tests. Sourcemaps off.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: post-build script (404.html + .nojekyll) + un-skip deep-link e2e test</name>
  <files>scripts/post-build.mjs, tests/e2e/gate.spec.ts</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 4, lines 418-437 — post-build.mjs verbatim)
    - tests/e2e/gate.spec.ts (existing skipped "deep-link refresh" stub from Plan 01)
  </read_first>
  <action>
Create `scripts/post-build.mjs` verbatim from RESEARCH.md Pattern 4:

```javascript
import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')

// 1. SPA fallback: identical copy of index.html.
//    GH Pages serves this for any unknown path; the SPA boots, router parses location, deep-link works.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

// 2. Disable Jekyll processing (otherwise GH Pages strips _-prefixed files).
writeFileSync(resolve(dist, '.nojekyll'), '')

console.log('post-build: 404.html + .nojekyll written to dist/')
```

The `package.json` build script chain from Plan 01 already calls this: `vue-tsc --noEmit && vite build && node scripts/post-build.mjs`. Verify it does — if not, fix (it must, otherwise local `npm run build` won't produce the fallback).

Then in `tests/e2e/gate.spec.ts`, un-skip the `deep-link refresh` test that Plan 01 stubbed and replace its body so it works against the placeholder routes (Plan 03 will refine when the gate is wired):

Replace the existing block (locate by `test.skip('deep-link refresh`):

```typescript
  test('deep-link refresh: /p/test renders without GitHub 404 (SPA fallback served via 404.html)', async ({ page }) => {
    // Playwright webServer runs `npm run preview` after `VITE_BASE=/lulu/ npm run build`,
    // so dist/404.html exists. Local preview maps unknown paths via SPA history fallback,
    // which is the local equivalent of GH Pages' 404.html serve.
    const resp = await page.goto('/p/anything')
    expect(resp?.status()).toBeLessThan(500)
    // Until Plan 03 wires the gate guard, /p/anything renders the placeholder PolaroidView ("—").
    // After Plan 03, this redirects to GateView — so we tolerate either:
    await expect(page.locator('main')).toBeVisible()
  })
```

Keep the other three tests skipped — Plan 03 un-skips them.

Pitfall 14 reinforcement (deploy workflow integrity, lands in Plan 04): the deploy workflow MUST exit non-zero on any failed step (no `continue-on-error: true`). This plan creates the artifacts the workflow uploads; Plan 04 enforces the gate.
  </action>
  <verify>
    <automated>test -f scripts/post-build.mjs && grep -q "404.html" scripts/post-build.mjs && grep -q ".nojekyll" scripts/post-build.mjs && rm -rf dist && VITE_BASE=/lulu/ npm run build && test -f dist/404.html && test -f dist/.nojekyll && cmp dist/index.html dist/404.html</automated>
  </verify>
  <acceptance_criteria>
    - `scripts/post-build.mjs` exists; contains both `404.html` and `.nojekyll` literals (filtered: `grep -v '^//' scripts/post-build.mjs | grep -c '404.html'` ≥ 1 and same for `.nojekyll`).
    - After `VITE_BASE=/lulu/ npm run build`: `dist/404.html` exists and is byte-identical to `dist/index.html` (`cmp` exits 0).
    - `dist/.nojekyll` exists and is zero bytes (`test ! -s dist/.nojekyll` exits 0 — `-s` is "size > 0", so negate).
    - `tests/e2e/gate.spec.ts`: the deep-link test is no longer `test.skip`; the other three tests remain skipped (un-skipped by Plan 03).
    - `grep -c "test.skip\\|test\\.skip" tests/e2e/gate.spec.ts` returns 3 (the three gate-content stubs Plan 03 owns).
  </acceptance_criteria>
  <done>SPA fallback artifacts emitted by every build. The deep-link e2e test is live (passes against either placeholder or post-Plan-03 gate). Plans 04 (workflow) and 03 (gate) are unblocked.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| build env (CI) → dist/ | `VITE_BASE` env value gets baked into HTML; wrong value = white screen on prod |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | base-path env | mitigate | Tests in `tests/unit/vite-config.test.ts` lock the resolution table; CI sets `VITE_BASE=/lulu/` explicitly (Plan 04) |
| T-02-02 | Information Disclosure | sourcemaps | mitigate | `build.sourcemap: false` enforced + tested |
| T-02-03 | Denial of Service | SPA 404 | mitigate | `dist/404.html` + `.nojekyll` written every build; deep-link e2e test verifies |
</threat_model>

<verification>
After both tasks: `VITE_BASE=/lulu/ npm run build` produces dist with prefixed asset URLs, identical 404.html, and .nojekyll. `npm run test:unit` shows the new vite-config tests green. The Playwright deep-link test passes against the local preview.
</verification>

<success_criteria>
- Asset URLs in `dist/index.html` resolve correctly under `/lulu/`.
- Refreshing on `/lulu/p/anything` does not 404 (SPA fallback works locally; GH-Pages-equivalent verified by Plan 04 manual smoke).
- vite-config tests pinned base resolution behavior.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-deploy-soft-gate/01-02-SUMMARY.md` documenting: how `VITE_BASE` flows from CI env → vite.config → built HTML; the post-build script behavior; and a one-line custom-domain switch instruction (set `VITE_BASE=/`).
</output>
