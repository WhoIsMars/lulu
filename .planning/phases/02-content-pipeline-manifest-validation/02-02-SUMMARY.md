---
phase: 02-content-pipeline-manifest-validation
plan: 02
subsystem: content-pipeline
tags: [vite-plugin, virtual-module, hmr, facade]
requires:
  - vite/manifest-loader.ts (Plan 02-01)
  - vite/poem-schema.ts (Plan 02-01)
  - vite/poem-parser.ts (Plan 02-01)
provides:
  - vite/plugin-poems.ts (poemsPlugin)
  - virtual:poems module (poems, getPoem, getNextPoem, getPrevPoem, Poem)
affects:
  - vite.config.ts (plugin registered)
  - src/data/poems.ts (reduced from 128 lines to 7-line facade)
  - src/env.d.ts (added declare module 'virtual:poems')
tech-stack:
  added: []
  patterns:
    - "Vite virtual module convention: `\\0` prefix on resolved id"
    - "addWatchFile inside load() to register dep-graph watches per call"
    - "configureServer + watcher.add for directory-level photo add/remove watches"
    - "Dev mode: emit error-throwing module so Vite overlay surfaces validation; build mode: rethrow to abort"
key-files:
  created:
    - vite/plugin-poems.ts
    - tests/unit/plugin-poems.spec.ts
    - .planning/phases/02-content-pipeline-manifest-validation/02-02-SUMMARY.md
  modified:
    - vite.config.ts
    - src/data/poems.ts
    - src/env.d.ts
decisions:
  - "Dev/build asymmetry on validation errors: dev returns module that throws on import (overlay), build rethrows from load() (abort) — matches plan execution_rules verbatim"
  - "Watch directory + each file separately in configureServer: addWatchFile in load covers existing files, watcher.add(dir) covers add/remove of new files"
  - "Generated module is .js-flavored TS (no type annotations on helper params): the .d.ts in env.d.ts provides typing; the emitted source is consumed by Vite's transform pipeline which handles it as plain JS"
metrics:
  duration_minutes: ~5
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  tests_added: 8
  completed_date: 2026-05-02
---

# Phase 02 Plan 02: Vite Plugin virtual:poems + HMR + Facade — Summary

Custom Vite plugin (`vite/plugin-poems.ts`) resolves the `virtual:poems` module
at build/dev time by delegating to `loadManifest()` from Plan 02-01, emits a
typed JS module exposing `poems` + `getPoem` / `getNextPoem` / `getPrevPoem`,
and wires HMR over `poems.txt` + `content/manifest.yaml` + `public/photos/`.
`src/data/poems.ts` collapses to a 7-line facade so HomeView and PolaroidView
keep working unchanged.

## Tasks

### Task 1 — Implement poemsPlugin with virtual module + HMR + watch (TDD)
**Commits:**
- `097cf5d` `test(02-02): add failing test for poemsPlugin virtual module` (RED)
- `81e0e46` `feat(02-02): implement poemsPlugin with virtual:poems + HMR + watch` (GREEN)

- **RED:** `tests/unit/plugin-poems.spec.ts` — 8 tests covering `resolveId`,
  emitted module shape (slugs + `getPoem`/`getNextPoem`/`getPrevPoem`),
  `addWatchFile` registration on the three watch paths, error behavior in both
  build (throws `ManifestValidationError`) and dev (returns import-time-throwing
  module), plus plugin shape sanity (name + 4 required hooks).
- **GREEN:** `vite/plugin-poems.ts` implements:
  - `resolveId('virtual:poems') -> '\0virtual:poems'`
  - `load()` invokes `loadManifest({rootDir})`, registers each `watchPath` via
    `this.addWatchFile`, emits TS module via `JSON.stringify(poems)` + helpers.
  - `configureServer` calls `s.watcher.add` on the photos dir, poems.txt, and
    manifest.yaml so add/remove/rename triggers `handleHotUpdate`.
  - `handleHotUpdate` checks if the changed file matches any watched path and,
    if so, invalidates the virtual module + sends `full-reload` over the WS.
  - `configResolved` flips `isBuild` so build-mode validation errors are
    rethrown (CI gate per D-06) while dev-mode errors yield a module that
    throws at import-time (Vite overlay surfaces the italian message).

### Task 2 — Wire plugin + facade + declare types
**Commit:** `63b4fea` `feat(02-02): wire poemsPlugin + reduce poems.ts to facade + declare types`

- `vite.config.ts`: `import { poemsPlugin } from './vite/plugin-poems'` +
  `plugins: [vue(), poemsPlugin()]`.
- `src/data/poems.ts`: 128 lines deleted, 7-line facade
  (`export * from 'virtual:poems'` + type re-export). All Phase 1 mock logic
  (parsePoems, normTitle, hardcoded manifest array, manual Poem interface) is
  gone — those primitives now live in `vite/poem-parser.ts` and
  `vite/poem-schema.ts` (Plan 02-01).
- `src/env.d.ts`: appended `declare module 'virtual:poems'` with the full
  `Poem` interface and the four exported symbols typed exactly as the
  generated runtime module exposes them.
- HomeView.vue and PolaroidView.vue **unchanged** — both still import
  `{ poems, getPoem, getNextPoem, getPrevPoem, type Poem }` from
  `@/data/poems` and resolve via the facade through to `virtual:poems`.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm run typecheck` (vue-tsc --noEmit) | exit 0 |
| `npm run test:unit` | 50/50 pass (8 new + 42 preserved) |
| `VITE_BASE=/lulu/ npm run build` | exit 0, `dist/index.html` + `dist/assets/poems-BQrDVyg8.js` present |
| `npm run dev` smoke (5s) | `VITE v8.0.10 ready in 196 ms` — no errors |

## Acceptance Criteria

| Criterion | Result |
|---|---|
| `grep -c "export function poemsPlugin" vite/plugin-poems.ts` == 1 | OK (1) |
| `grep -c "virtual:poems" vite/plugin-poems.ts` >= 2 | OK (3) |
| `grep -c "addWatchFile" vite/plugin-poems.ts` >= 1 | OK (3) |
| `grep -c "handleHotUpdate" vite/plugin-poems.ts` >= 1 | OK (2) |
| `grep -c "loadManifest" vite/plugin-poems.ts` >= 1 | OK (3) |
| `grep -c "getNextPoem\|getPrevPoem" vite/plugin-poems.ts` >= 2 | OK (5) |
| `grep -c "poemsPlugin()" vite.config.ts` == 1 | OK (1) |
| `grep -c "from './vite/plugin-poems'" vite.config.ts` == 1 | OK (1) |
| `wc -l src/data/poems.ts` <= 10 | OK (7) |
| `grep -c "from 'virtual:poems'" src/data/poems.ts` >= 1 | OK (2) |
| `grep -c "parsePoems\|manifest\[\]\|normTitle" src/data/poems.ts` == 0 | OK (0) |
| `grep -c "declare module 'virtual:poems'" src/env.d.ts` == 1 | OK (1) |
| `grep -c "export const poems" src/env.d.ts` == 1 | OK (1) |
| `grep -c "from '@/data/poems'" src/views/HomeView.vue src/views/PolaroidView.vue` >= 2 | OK (2) |
| dist/index.html exists after build | OK |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test for build-mode error required `configResolved` simulation**

- **Found during:** Task 1 GREEN phase (initial test for invalid manifest expected `load()` to throw, but the plugin's correct dev-mode behavior is to *return* a throwing module so the Vite overlay can render the message — only build mode rethrows from `load()`).
- **Issue:** First test ran without invoking `configResolved`, so `isBuild` defaulted to `false` (dev mode), and the plugin returned an error-module string instead of throwing — failing the test even though the plugin behavior matched the plan's `execution_rules` verbatim.
- **Fix:** Split into two tests covering both modes:
  - Build mode: invoke `configResolved.call({}, { command: 'build' })` first, then expect `load()` to throw `ManifestValidationError`.
  - Dev mode: assert the returned source contains `throw __error` and the italian validation message.
- **Files modified:** `tests/unit/plugin-poems.spec.ts`
- **Commit:** `81e0e46` (Task 1 GREEN; first commit's test was iterated within the same task)

### Auto-added critical functionality

**2. [Rule 2 - Critical] Dev-mode error module also exports stub functions**

- **Found during:** writing `generateErrorModuleSource`
- **Issue:** A bare `throw` at module top-level prevents the `export` declarations after it from being statically analyzed by Vite's transform — but consumers (`HomeView`, `PolaroidView`) use named imports of `getPoem`, `poems`, etc. Without those export bindings the dev overlay would show a misleading "module has no export named X" error rather than the actual manifest validation error.
- **Fix:** Error-module emits `export const poems = []` + stub `getPoem/getNextPoem/getPrevPoem` that each rethrow `__error`. The top-level `throw` runs first on import, so the overlay always shows the manifest validation message; the named exports exist for static analysis only.
- **Files modified:** `vite/plugin-poems.ts`
- **Commit:** `81e0e46`

## Threat Flags

None. The plugin only reads files inside `rootDir` (no path traversal),
serializes via `JSON.stringify` (T-02-05 mitigation per plan threat model),
and watches exactly the 3 paths declared by Plan 02-01's `manifest-loader`
(T-02-07 fanout bound).

## Known Stubs

None. The dev-mode error module's stub functions are intentional (graceful
overlay rendering, see Deviation #2) and only run in error paths.

## Self-Check: PASSED

Files verified:
- `vite/plugin-poems.ts` FOUND
- `tests/unit/plugin-poems.spec.ts` FOUND
- `.planning/phases/02-content-pipeline-manifest-validation/02-02-SUMMARY.md` FOUND
- `vite.config.ts` modified (poemsPlugin registered)
- `src/data/poems.ts` modified (7 lines, facade)
- `src/env.d.ts` modified (declare module 'virtual:poems')

Commits verified (`git log --oneline | head -5`):
- `097cf5d` test(02-02): add failing test for poemsPlugin virtual module — FOUND
- `81e0e46` feat(02-02): implement poemsPlugin with virtual:poems + HMR + watch — FOUND
- `63b4fea` feat(02-02): wire poemsPlugin + reduce poems.ts to facade + declare types — FOUND
