---
phase: 01-foundation-deploy-soft-gate
plan: 04
subsystem: ci-deploy
tags: [github-actions, github-pages, ci, deploy]
status: partial
completion: "1/2 tasks (Task 2 deferred — manual deploy verification by orchestrator)"
requires: [02-vite-base, 03-soft-gate]
provides:
  - "Single-source CI workflow that deploys to GitHub Pages on push:main"
  - "Hard gating: lint + typecheck + unit tests + build must pass before deploy"
affects:
  - ".github/workflows/deploy.yml"
tech-stack:
  added:
    - "GitHub Actions: actions/checkout@v5, actions/setup-node@v5, actions/configure-pages@v6, actions/upload-pages-artifact@v5, actions/deploy-pages@v5"
  patterns:
    - "Pages-via-Actions (modern, official) — not gh-pages npm package (D-16)"
    - "Pattern 3 from RESEARCH.md (verified 2026-05-02)"
key-files:
  created:
    - .github/workflows/deploy.yml
  modified: []
decisions:
  - "Added `npm run test:unit` step between Type-check and Build per orchestrator execution rules (treat as Rule 2 — critical correctness gate). Plan's verbatim YAML did not include it; the orchestrator's mandate to gate on unit tests takes precedence and matches CI hygiene."
  - "Node 22 LTS, npm cache enabled."
  - "VITE_BASE wired at the Build step's `env:` (not workflow-level env), matching Plan's verbatim YAML."
metrics:
  duration: "<1 minute (single-file authoring)"
  completed: 2026-05-02
---

# Phase 1 Plan 04: Deploy (CI to GitHub Pages) — Partial Summary

CI workflow authored and committed. Deploys SPA to GitHub Pages on push to `main`, gated by lint + typecheck + unit tests + build. Manual live-URL verification (Task 2) deferred to the orchestrator as the plan's blocking checkpoint.

## Status

**1/2 tasks complete. Task 2 (manual deploy verification on live GitHub Pages) is deferred — it is a `checkpoint:human-verify` requiring a real push to `main` and human inspection of the live URL.**

## Tasks Completed

### Task 1 — Author `.github/workflows/deploy.yml`

Authored verbatim from RESEARCH.md Pattern 3 (verified 2026-05-02), with `npm run test:unit` added as an extra hard gate per executor instructions.

**Commit:** `1826d06` — `feat(04-deploy): GitHub Pages workflow`

**Workflow shape:**
- Trigger: `push: branches: [main]` only (D-04 — no PR previews, no `workflow_dispatch`)
- Permissions (least-privilege): `contents: read`, `pages: write`, `id-token: write`
- Concurrency: `group: pages`, `cancel-in-progress: false`
- Two jobs: `build` (lint → typecheck → unit tests → build → post-build → upload artifact) and `deploy` (`needs: build`, deploys via `actions/deploy-pages@v5`)
- Build environment: Node 22, npm cache, `VITE_BASE=/lulu/` on the Build step

**Action versions (verified 2026-05-02):**
- `actions/checkout@v5`
- `actions/setup-node@v5`
- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`

**Gate honesty (Pitfall 14):** zero occurrences of `continue-on-error` in the file. Each `run:` step exits non-zero on failure → job fails → deploy never runs.

### Acceptance criteria checks (all pass)

| Check | Expected | Actual |
|------:|----------|--------|
| File exists | yes | yes |
| `actions/deploy-pages@v5` | 1 | 1 |
| `actions/upload-pages-artifact@v5` | 1 | 1 |
| `actions/configure-pages@v6` | 1 | 1 |
| `VITE_BASE: /lulu/` | 1 | 1 |
| `scripts/post-build.mjs` | ≥1 | 1 |
| `branches: [main]` | 1 | 1 |
| `concurrency:` | 1 | 1 |
| `node-version: '22'` | 1 | 1 |
| `continue-on-error` | 0 | 0 |
| YAML valid (PyYAML safe_load) | yes | yes |

## Tasks Deferred

### Task 2 — Manual deploy verification (checkpoint:human-verify, blocking)

The orchestrator must drive this. It requires:
1. One-time GitHub UI setup (Settings → Pages → Source = "GitHub Actions").
2. Capability check for private-repo Pages (D-03 — Pro/Team/Enterprise account).
3. Push to `main` and watch the workflow go green.
4. Open `https://<owner>.github.io/lulu/` and verify gate renders, deep-link `/lulu/p/anything` refreshes (FOUND-04), and gate unlock works with the dev placeholder password.

Resume signal: orchestrator types "approved" once all four sub-checks pass.

## Deviations from Plan

### Auto-added (Rule 2 — critical functionality per orchestrator instructions)

**1. [Rule 2] Added `npm run test:unit` step between Type-check and Build**
- **Found during:** Task 1 (executor instructions explicitly required `npm ci → npm run lint → npm run typecheck → npm run test:unit → VITE_BASE=/lulu/ npm run build`)
- **Issue:** Plan's verbatim YAML lacked the unit-test step; executor mandate listed it as required.
- **Fix:** Added a `Unit tests` step running `npm run test:unit` before the Build step. Hard gate (no `continue-on-error`).
- **Files modified:** `.github/workflows/deploy.yml`
- **Commit:** `1826d06`

No other deviations. No bugs found, no architectural decisions needed.

## Authentication Gates

None encountered during this autonomous task. The push-to-main GitHub Pages OIDC handshake happens at deploy time (Task 2), not at authoring time.

## Known Stubs

None. The workflow is functionally complete; only live verification remains.

## TDD Gate Compliance

N/A — plan type is `execute`, not `tdd`. The single auto task did not require RED/GREEN/REFACTOR cycles.

## Threat Flags

None. All security-relevant surface (workflow permissions, OIDC token use, concurrency control) was anticipated by the plan's threat model (T-04-01 through T-04-04) and mitigations are in place:
- T-04-02 (least-privilege perms): `contents:read`, `pages:write`, `id-token:write` only.
- T-04-03 (concurrent deploy DoS): `concurrency: group: pages, cancel-in-progress: false`.
- T-04-04 (broken code shipped): no `continue-on-error`; lint/typecheck/test/build are hard gates.

## Self-Check: PASSED

- File present: `.github/workflows/deploy.yml` — FOUND.
- Commit present: `1826d06` — FOUND in `git log`.
- All acceptance-criteria grep counts match expected values.
