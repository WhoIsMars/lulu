---
phase: 01-foundation-deploy-soft-gate
plan: 01-skeleton
subsystem: foundation
tags: [scaffold, vite, vue, typescript, eslint, vitest, playwright, tokens]
requires: []
provides:
  - vue-3.5-vite-8-ts-6 SPA skeleton (boots, lints, typechecks)
  - npm scripts: dev/build/preview/lint/format/typecheck/test:unit/test:e2e/gate:set
  - design tokens (colors, spacing, type, radius, shadow, motion) on :root via src/styles/tokens.css
  - Vitest jsdom environment + Playwright config (baseURL http://localhost:4173/lulu/)
  - Wave 0 test stubs (skipped) for Plans 02 and 03 to un-skip as they implement
affects:
  - all subsequent plans inherit this skeleton (vite.config.ts, gate, deploy, README)
tech-stack:
  added:
    - vue@3.5.33
    - vue-router@5.0.6
    - pinia@3.0.4
    - "@vueuse/core@14.3.0"
    - "@fontsource/cormorant-garamond@5.2.11"
    - vite@8.0.10
    - "@vitejs/plugin-vue@6.0.6"
    - typescript@6.0.3
    - vue-tsc@3.2.7
    - "@types/node@25.6.0"
    - eslint@10.3.0
    - "@eslint/js@10.0.1"  # see Deviations
    - eslint-plugin-vue@10.9.0
    - typescript-eslint@8.59.1
    - eslint-config-prettier@10.1.8
    - prettier@3.8.3
    - globals@16.0.0
    - vitest@3.0.0
    - "@vue/test-utils@2.4.6"
    - jsdom@25.0.0
    - "@playwright/test@1.48.0"
  patterns:
    - ESLint v9 flat config (typescriptEslint.config helper, eslintConfigPrettier last)
    - CSS Custom Properties on :root with @media (prefers-reduced-motion: reduce) overrides
    - Vue Router crossfade Transition disabled under reduced-motion
    - Vite path alias @/* → src/* (mirrored in tsconfig.app.json + vitest.config.ts)
key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - .gitignore
    - eslint.config.js
    - .prettierrc.json
    - index.html
    - src/main.ts
    - src/App.vue
    - src/env.d.ts
    - src/router/index.ts
    - src/styles/tokens.css
    - src/views/HomeView.vue
    - src/views/PolaroidView.vue
    - vitest.config.ts
    - playwright.config.ts
    - tests/unit/.gitkeep
    - tests/e2e/.gitkeep
    - tests/unit/gate-crypto.test.ts
    - tests/e2e/gate.spec.ts
  modified: []
decisions:
  - "Pinned exact dependency versions (no ^) to satisfy threat-model T-01-01 (supply-chain tampering)."
  - "Added @eslint/js@10.0.1 explicitly: ESLint 10.x no longer bundles it transitively, and the latest published version of that package is 10.0.1 (eslint itself is on 10.3.0 — versions decoupled)."
  - "Indirect dynamic import string in gate-crypto.test.ts so Vite's static import analyzer does not fail on the not-yet-existent @/gate/crypto module — preserves the skipped-test contract for Plan 03 to un-skip."
  - "src/router/index.ts is a TEMPORARY skeleton router; Plan 03 will overwrite it with the gate-aware version. Documented inline."
metrics:
  duration: ~7 minutes wall clock
  completed: 2026-05-02
---

# Phase 1 Plan 01: Skeleton Summary

Bootstrapped a Vue 3.5 + Vite 8 + TypeScript 6 SPA skeleton with Pinia + vue-router placeholders, ESLint v9 flat config + Prettier, the full UI-SPEC design-token CSS, and Vitest + Playwright dev infrastructure with Wave 0 skipped contract stubs.

## What Was Built

### Task 1 — Tooling foundation
- `package.json` with exact-pinned dependencies straight from RESEARCH.md Standard Stack
- `tsconfig.json` project-references split → `tsconfig.app.json` (bundler resolution, strict, `@/*` alias) + `tsconfig.node.json` (build-tool configs)
- `.gitignore` (node_modules, dist, .env*, playwright-report/, test-results/, coverage/)
- `npm install` + `npx playwright install chromium`

### Task 2 — Lint, format, app entry, design tokens
- `eslint.config.js` — typescript-eslint flat config, vue plugin, prettier last (per Pitfall E)
- `.prettierrc.json` — no semi, single-quote, trailing-comma all, printWidth 100
- `index.html` — `lang="it"`, `viewport-fit=cover` (no `maximum-scale`, allows pinch-zoom), `robots noindex,nofollow`
- `src/main.ts` — `createApp + Pinia + Router + tokens.css + Cormorant Garamond 400 (latin + latin-ext)`
- `src/App.vue` — `<RouterView>` wrapped in a `<Transition name="crossfade">` that disables CSS transitions under `prefers-reduced-motion: reduce`
- `src/views/HomeView.vue` — empty `<main aria-label="stanza">` on soffitta dark background; the void awaits Phase 3
- `src/views/PolaroidView.vue` — placeholder for the SPA-fallback deep-link (`/p/:slug`); validated in Plan 02
- `src/router/index.ts` — minimal router so the app builds; Plan 03 overwrites it
- `src/env.d.ts` — typed `VITE_BASE`, Vue SFC module shim, `vite/client` reference
- `src/styles/tokens.css` — declares every UI-SPEC token (`--c-*`, `--sp-*`, `--fs-*`, `--radius-*`, `--shadow-*`, `--blur-*`, `--motion-*`) on `:root`, plus the reduced-motion overrides (kept `--motion-duration-deliberate` per UI-SPEC §Motion accessibility-orthogonal note)

### Task 3 — Test infrastructure (Wave 0)
- `vitest.config.ts` — jsdom environment, `@/*` alias, vue plugin, `tests/unit/**/*.test.ts` glob
- `playwright.config.ts` — `baseURL http://localhost:4173/lulu/`, chromium project, webServer that runs `VITE_BASE=/lulu/ npm run build && npm run preview -- --port 4173`
- `tests/unit/gate-crypto.test.ts` — 1 skipped contract stub for Plan 03's `verifyPassword` + 1 sanity test (passes)
- `tests/e2e/gate.spec.ts` — 4 skipped contract stubs (rest state, wrong-password aria-live + focus-stays, sessionStorage flag, deep-link refresh)

## Verification Performed

| Command | Result |
|---|---|
| `npm run lint` | exit 0 (clean) |
| `npm run typecheck` | exit 0 (`vue-tsc --noEmit`) |
| `npm run test:unit` | 1 passed, 1 skipped, exit 0 |

Manual check on installed package versions confirms `vue@3.5.33`, `vite@8.0.10`, `typescript@6.0.3`, `vitest@3.0.0`, `@playwright/test@1.48.0`, `vue-tsc@3.2.7`, `eslint@10.3.0`.

## Wave 0 Stub → Plan Map

| Stub | File | Un-skipped by |
|---|---|---|
| `verifyPassword` returns false on wrong input | `tests/unit/gate-crypto.test.ts` | Plan 03 (gate) — once `src/gate/crypto.ts` exists |
| rest state: shows password input + Entra | `tests/e2e/gate.spec.ts` | Plan 03 |
| wrong password: aria-live + focus stays | `tests/e2e/gate.spec.ts` | Plan 03 |
| session persistence: sessionStorage flag set | `tests/e2e/gate.spec.ts` | Plan 03 |
| deep-link refresh `/p/test` | `tests/e2e/gate.spec.ts` | Plan 02 (vite base + SPA fallback) — and re-validated on real Pages URL |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] Added `@eslint/js@10.0.1` to devDependencies**
- **Found during:** Task 2 (`npm run lint`)
- **Issue:** `eslint.config.js` imports `@eslint/js`, but ESLint 10.x no longer bundles that package transitively. First lint run failed with `Cannot find package '@eslint/js'`.
- **Fix:** Added `@eslint/js` to devDependencies. The plan's Pitfall E mitigation suggested pinning it at `10.3.0`, but that version does not exist on npm — the published `@eslint/js` series tops out at `10.0.1` (eslint itself is on 10.3.0; the two packages have decoupled their version trains). Used `10.0.1`, the closest stable release.
- **Files modified:** `package.json`
- **Commit:** `5fe5ead` (Task 2 commit)

**2. [Rule 1 — Bug] Indirect dynamic-import string in `gate-crypto.test.ts`**
- **Found during:** Task 3 (`npm run test:unit`)
- **Issue:** Vitest's Vite-based loader statically resolves `await import('@/gate/crypto')` even when wrapped in `it.skip(...)`. Plan 03 has not yet authored `src/gate/crypto.ts`, so the file collection fails with `Failed to resolve import "@/gate/crypto"` — Vitest never gets to run a single test.
- **Fix:** Stored the path in a local `const modulePath = '@/gate/crypto'` and called `import(/* @vite-ignore */ modulePath)`. The static analyzer treats the call as dynamic and skips resolution; the runtime semantics are unchanged. Plan 03 can either keep the indirection or revert it once the module exists.
- **Files modified:** `tests/unit/gate-crypto.test.ts`
- **Commit:** `e6effc9` (Task 3 commit)

**3. [Rule 1 — Bug] Removed unused `page` parameter from session-persistence stub**
- **Found during:** Task 3 lint after writing test stubs
- **Issue:** ESLint flagged the body-less skipped test as having an unused destructured `page` parameter (`@typescript-eslint/no-unused-vars`).
- **Fix:** Replaced `async ({ page }) => {}` with `async () => {}`. Plan 03 will reintroduce the parameter when filling in the test body.
- **Files modified:** `tests/e2e/gate.spec.ts`
- **Commit:** `e6effc9` (Task 3 commit)

### Architectural deviations
None — all auto-fixes are trivial. No Rule-4 escalation occurred.

## Auth Gates Encountered
None. (No external services touched in Plan 01.)

## Known Stubs
- `src/router/index.ts` — placeholder router; Plan 03 will overwrite with the gate-aware version. Intentional handoff (called out in CONTEXT.md and the file's own header comment).
- `src/views/HomeView.vue` — empty `<main>`. Phase 3 fills it.
- `src/views/PolaroidView.vue` — placeholder with em-dash content. Real polaroid viewer arrives in Phase 3+.
- All five `*.skip(...)` test stubs across `tests/unit/gate-crypto.test.ts` and `tests/e2e/gate.spec.ts`. Wave 0 stubs by design — Plans 02 and 03 un-skip them.

None of these stubs prevent Plan 01's goal (skeleton that lints, type-checks, runs Vitest). All are tracked above.

## Threat Flags
None. Plan 01 introduces no new network endpoints, no auth surface, no file-access patterns, and no schema. The threat register entries (T-01-01 supply-chain pinning, T-01-02 source maps in Plan 02, T-01-03 robots noindex) are either honored here (T-01-01, T-01-03) or correctly deferred to Plan 02 (T-01-02).

## Self-Check: PASSED

Verification of claims:
- `package.json` ✓ found
- `eslint.config.js` ✓ found
- `src/styles/tokens.css` ✓ found, contains `--c-soot-800`, `--motion-duration-deliberate`
- `vitest.config.ts` ✓ found, contains `jsdom`
- `playwright.config.ts` ✓ found, contains `4173/lulu/`
- `tests/unit/gate-crypto.test.ts` ✓ found
- `tests/e2e/gate.spec.ts` ✓ found
- Commit `a6c345b` ✓ in `git log` (Task 1)
- Commit `5fe5ead` ✓ in `git log` (Task 2)
- Commit `e6effc9` ✓ in `git log` (Task 3)
- `npm run lint && npm run typecheck && npm run test:unit` all exit 0 ✓
