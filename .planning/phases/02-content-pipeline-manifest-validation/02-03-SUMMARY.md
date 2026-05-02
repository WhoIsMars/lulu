---
phase: 02-content-pipeline-manifest-validation
plan: 03
subsystem: content-pipeline
tags: [cli, ci, validation, manifest, tsx]
requires:
  - vite/manifest-loader.ts (Plan 02-01: loadManifest, ManifestValidationError)
  - content/manifest.yaml (Plan 02-01)
  - poems.txt (root)
  - public/photos/ (15 files)
provides:
  - scripts/manifest-check.ts (standalone tsx CLI)
  - npm run manifest:check
  - .github/workflows/deploy.yml :: Manifest check step (CI gate)
  - tests/unit/manifest-check-cli.spec.ts (CLI smoke test)
affects:
  - package.json (added tsx@^4.21.0 devDep + manifest:check script)
  - .github/workflows/deploy.yml (new step before Build)
tech-stack:
  added:
    - tsx@^4.21.0 (devDependency — runs TS scripts directly without compile)
  patterns:
    - "CLI imports the same loadManifest the Vite plugin uses — single source of truth for validation logic"
    - "tsx runtime for TypeScript scripts (no separate compile step, fast cold start)"
    - "ANSI color codes guarded by process.stdout.isTTY (plain text in CI logs / pipes)"
    - "Three exit codes: 0 success, 1 ManifestValidationError, 2 unexpected error"
key-files:
  created:
    - scripts/manifest-check.ts
    - tests/unit/manifest-check-cli.spec.ts
    - .planning/phases/02-content-pipeline-manifest-validation/02-03-SUMMARY.md
  modified:
    - package.json
    - package-lock.json
    - .github/workflows/deploy.yml
decisions:
  - "Renamed script from .mjs to .ts + tsx runtime (per plan's preferred path) so the CLI can import vite/manifest-loader.ts directly without a compile step"
  - "CLI smoke test scope kept narrow: success path only — error-path coverage already lives in manifest-loader.spec.ts (avoid duplicate validation testing)"
metrics:
  duration: ~6 min
  completed: 2026-05-02
  tasks: 2/2
  files_created: 3
  files_modified: 3
---

# Phase 02 Plan 03: CLI manifest:check + CI Integration Summary

CONT-03 satisfied: standalone `npm run manifest:check` CLI reuses Plan 02-01's `loadManifest` to validate poems.txt + content/manifest.yaml + public/photos/ in <1s, with italian colored output and proper exit codes; CI workflow now runs it as a hard gate before Build so a broken manifest aborts deploy.

## What Was Built

### Task 1 — `scripts/manifest-check.ts` + `manifest:check` npm script

A 50-line tsx-runtime CLI that:

- Resolves repo root from `import.meta.url` (`scripts/manifest-check.ts → ../`)
- Calls `loadManifest({ rootDir })` from `vite/manifest-loader.ts` (D-09 reuse)
- On success: prints `✓ Manifest valido — N poesie verificate, tutto allineato.` (green via ANSI when stdout is a TTY, plain text in CI/pipes), exits 0
- On `ManifestValidationError`: prints `✗ Manifest invalido:` followed by each accumulated issue as a bulleted line, then a dim footer with file pointers and total error count, exits 1
- On any other error: prints `✗ Errore inatteso ...` with the message, exits 2

`tsx@^4.21.0` added to `devDependencies`. `package.json` gains `"manifest:check": "tsx scripts/manifest-check.ts"`.

`tests/unit/manifest-check-cli.spec.ts` runs the actual `npm run manifest:check` via `child_process.execSync` against the real repo and asserts stdout contains "Manifest valido" — tight smoke coverage, since the validation matrix is already exercised by `manifest-loader.spec.ts` (Plan 02-01).

**Commit:** `3396d62`

### Task 2 — CI gate before Build

Inserted into `.github/workflows/deploy.yml` between Unit tests and Build:

```yaml
- name: Manifest check
  run: npm run manifest:check
```

No `continue-on-error` — failure of this step fails the `build` job, which blocks `deploy` (which `needs: build`). Step order asserted in CI mirror locally:

`Lint → Type-check → Unit tests → Manifest check → Build → Post-build → upload-pages-artifact`

**Commit:** `1fb0997`

## Verification

Full local CI mirror passed:

```
npm run lint           ✓
npm run typecheck      ✓
npm run test:unit      ✓ 50/50 tests (incl. new CLI smoke)
npm run manifest:check ✓ 15 poesie verificate
VITE_BASE=/lulu/ npm run build ✓
```

CLI smoke test alone (`npx vitest run tests/unit/manifest-check-cli.spec.ts`): 1 passed in 870ms.

Step-order acceptance (awk one-liner from plan): exits 0 — Unit tests (line 39) < Manifest check (42) < Build (45).

## Deviations from Plan

None. Both tasks executed exactly as specified, with the plan's preferred `.ts` + `tsx` route.

## Threat Flags

None. The CLI introduces no new trust boundary: it reads the same files the Vite plugin already reads, with the same Zod-validated parser, surfacing the same accumulated errors.

## Self-Check: PASSED

- `scripts/manifest-check.ts` — FOUND
- `tests/unit/manifest-check-cli.spec.ts` — FOUND
- `.github/workflows/deploy.yml` contains "Manifest check" — FOUND
- `package.json` contains "manifest:check" + "tsx" — FOUND
- Commit `3396d62` (feat 02-03 CLI) — FOUND in git log
- Commit `1fb0997` (ci 02-03 gate) — FOUND in git log
