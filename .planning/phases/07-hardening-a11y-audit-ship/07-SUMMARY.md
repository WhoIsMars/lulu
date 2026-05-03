---
phase: 7
plan: 7
subsystem: hardening
status: human_needed
requirements:
  verified_automated: [A11Y-06, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, DEPLOY-03]
  deferred_to_manual: [LIGHTHOUSE-MOBILE, REAL-DEVICE-IOS-GOLDEN-PATH, FINAL-LIVE-URL]
metrics:
  js_gzip_total_kb: 58.3
  js_gzip_budget_kb: 200
  avif_smallest_per_photo_total_kb: 164.3
  avif_budget_kb: 1536
  photo_count: 15
  image_files_total: 186
  axe_serious_critical_violations: 0
  heap_growth_10_cycles_mb: 0
  heap_growth_threshold_mb: 5
  e2e_tests_passing: 8
  e2e_tests_failing: 1
key-files:
  created:
    - tests/e2e/a11y.spec.ts
    - tests/e2e/smoke-navigation.spec.ts
    - .planning/phases/07-hardening-a11y-audit-ship/deferred-items.md
  modified:
    - scripts/post-build.mjs
    - .github/workflows/deploy.yml
    - src/views/GateView.vue
    - src/views/PolaroidView.vue
    - tests/e2e/gate.spec.ts
    - package.json
    - package-lock.json
decisions:
  - "axe-core gate is wcag2a + wcag2aa; only serious/critical block the build"
  - "smallest-AVIF-per-slug used for the photo budget (mobile LCP path)"
  - "Lighthouse mobile audit is owner-run, not CI-gated (no infra to run it cleanly in CI today)"
---

# Phase 7 Plan 7: Hardening + A11y Audit + Ship Summary

Wired axe-core into Playwright across the three real views, hardened the post-build with explicit JS-gzip and AVIF photo-payload budgets, added a heap-stability smoke test, gated deploy on the full e2e suite, fixed the two real serious-impact a11y violations the axe scan surfaced (duplicate `aria-label="password"` on the gate envelope; missing keyboard access on the scrollable poem region), and verified the production build is well under every committed budget.

## What was done

### T1 — axe-core e2e (`tests/e2e/a11y.spec.ts`)
- Installed `@axe-core/playwright`.
- Four tests: GateView (closed envelope), GateView (opened letter / password form), HomeView, PolaroidView.
- Each test runs `AxeBuilder().withTags(['wcag2a','wcag2aa']).analyze()` and asserts zero `serious`/`critical` violations. All non-blocking violations are still console-logged for visibility.
- Excludes only `.home__cursor-candle` (presentational pointer-following SVG, no text content).
- Gate bypass uses sessionStorage prime (`lulu:gate=true`) — matches the existing gate test pattern.

### T2 — bundle-budget guard (`scripts/post-build.mjs`)
Extends the existing EXIF-clean check with two budgets enforced at build time:

| Budget | Limit | Current | Headroom |
|--------|-------|---------|----------|
| JS gzip total | 200 KB | **58.3 KB** | 71% under |
| AVIF smallest-per-photo total | 1.5 MB | **164.3 KB** | 89% under |

15 photos detected (matches manifest); 186 image files verified EXIF-clean. Slug detection anchors on the 8-char Vite hash to avoid mis-grouping basenames that themselves contain hyphens.

### T3 — heap-stability smoke (`tests/e2e/smoke-navigation.spec.ts`)
- 10× cycles of `home → /p/<slug> → home`, measured via `performance.memory.usedJSHeapSize`.
- **Result:** 0 MB heap growth across 10 cycles (threshold 5 MB).
- Skips gracefully on non-Chromium runs (no `performance.memory`).

### T4 — CI hardening (`.github/workflows/deploy.yml`)
- New `test` job runs in parallel with `build` on every push to `main`.
- Installs Playwright chromium, runs `npx playwright test` (gate + a11y + smoke), uploads `playwright-report/` + `test-results/` on failure.
- `deploy` job now `needs: [build, test]` — a11y/perf regressions can no longer ship.

### T5 — README check
README already covered all required topics (gate password rotation, custom domain setup, base path, soft-gate disclaimer in both Italian and English). No edits needed.

### T6 — Final verification
Build passes with new budgets. 8 of 9 e2e tests pass (the remaining failure is pre-existing, see Deferred).

## Deviations from Plan

### Auto-fixed issues (Rule 1 — bugs surfaced by the new test)

1. **[Rule 1 — Bug] Duplicate `aria-label="password"` on gate**
   - **Found during:** T1, axe scan + Playwright `getByLabel('password')` strict-mode violation.
   - **Issue:** GateView's closed-envelope button had the same accessible name as the password input → screen readers announced two "password" controls; existing `gate.spec.ts` selectors were ambiguous.
   - **Fix:** Renamed envelope button to `aria-label="apri la lettera"`. Updated the three gate tests to drive through the now-distinct CTA.
   - **Files:** `src/views/GateView.vue`, `tests/e2e/gate.spec.ts`
   - **Commit:** `9310357`

2. **[Rule 1 — Bug] Scrollable poem region has no keyboard access**
   - **Found during:** T1, axe rule `scrollable-region-focusable` (serious).
   - **Issue:** `.pview__poem-body` is `overflow-y:auto` but had no `tabindex`. Long poems were not arrow-scrollable for keyboard users.
   - **Fix:** Added `tabindex="0"` + `role="region"` + `aria-label="testo della poesia"`.
   - **Files:** `src/views/PolaroidView.vue`
   - **Commit:** `9310357`

## Deferred — manual / owner action required

The site cannot be marked fully shipped from automation alone. The remaining acceptance items require either real hardware or external infrastructure not provisioned in this repo.

- [ ] **Lighthouse Performance ≥ 90 on mobile (home + polaroid view)** — not run. Lighthouse CI / `lhci` is not installed in this repo and emulated mobile in headless Chrome consistently under-reports. Owner action: run `npx lighthouse https://<live-url>/lulu/ --preset=mobile --view` against the deployed URL on a desktop with a non-throttled network, OR add `lhci-action` in a follow-up plan if a stable budget is desired in CI.
- [ ] **Real-iPhone golden-path smoke** — gate → enter → see polaroids → click one → flip → read poem → pinch-zoom → close. The candle-reveal + flip + sway are the prime risk on iOS Safari; emulators cannot fully validate touch + 60fps. Owner action: 5-minute manual run on a real device against the deployed Pages URL.
- [ ] **Final live URL confirmed** — first deploy after this PR will produce the canonical `https://<owner>.github.io/lulu/`. Owner action: visit, paste the URL into ROADMAP / STATE once stable.
- [ ] **Pre-existing test data drift** (see `deferred-items.md`) — `gate.spec.ts` "session persistence" test fills `lulu-dev-placeholder`, but the committed gate hash is for the real password. After the Phase 7 aria-label fix removed the previously-blocking strict-mode error, this test now fails further down on the password verification step. Owner action: either rotate dev gate to `lulu-dev-placeholder` for CI, or read password from `process.env.LULU_GATE_TEST_PASSWORD` and skip when unset.

## Bundle stats (production build, `VITE_BASE=/lulu/`)

```
JS gzip total:                 58.3 KB / 200.0 KB     (7 chunks)
AVIF smallest-per-photo:      164.3 KB / 1536.0 KB   (15 photos)
Total image files emitted:     186 (avif + webp + jpeg variants, all EXIF-clean)
```

## Self-Check: PASSED

Files created exist:
- `tests/e2e/a11y.spec.ts` — FOUND
- `tests/e2e/smoke-navigation.spec.ts` — FOUND
- `.planning/phases/07-hardening-a11y-audit-ship/deferred-items.md` — FOUND

Commits exist on `main`:
- `e47a43b` — feat(07): axe-core e2e a11y check
- `9310357` — fix(07): a11y violations
- `98fae54` — feat(07): bundle-budget guard
- `44e6174` — test(07): heap-stability smoke
- `169314b` — ci(07): e2e test job blocks deploy
