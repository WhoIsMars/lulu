---
phase: 01-foundation-deploy-soft-gate
plan: 05-docs
subsystem: docs
tags: [readme, privacy-disclaimer, deploy-docs, italian]
requires: [03-soft-gate, 04-deploy]
provides:
  - README.md (owner-facing docs covering what, run, gate:set, deploy, custom domain)
affects:
  - GATE-05 (closed: README documents soft-gate threat model + AES-GCM upgrade path)
  - DEPLOY-02 (closed: README documents VITE_BASE switch + CNAME custom domain steps)
tech-stack:
  added: []
  patterns: [italian-primary-copy, gate-honesty-disclaimer]
key-files:
  created: [README.md]
  modified: []
decisions:
  - "Used Italian primary copy with one English aside in Privacy section per UI-SPEC Copywriting"
  - "Hardcoded `WhoIsMars.github.io` (vs `<utente>` placeholder) in URL examples per user confirmation"
metrics:
  duration: ~5m
  completed: 2026-05-02
---

# Phase 1 Plan 05: Docs (README) Summary

Authored a single `README.md` at repo root in Italian, closing GATE-05 and DEPLOY-02. The privacy section is the gate-honesty linchpin for Phase 1: explicit "soft privacy, not real auth" disclaimer with the AES-GCM upgrade path tracked as PRIV-01 for v2. Deploy section provides the `VITE_BASE` switch table (`/lulu/` for project page vs `/` for custom domain) and concrete CNAME + DNS steps.

## What was built

- `README.md` — 9 sections (Lulu / Stack / Privacy / Comandi / Gate / Deploy / Configurare un custom domain / Verifica capability / Struttura del progetto)
- Content matches the canonical Italian text from `01-RESEARCH.md` (Pattern 7 disclaimer, Pattern 3 VITE_BASE block) and the literal disclaimer wording from `01-UI-SPEC.md` Copywriting section.
- URL examples use `WhoIsMars.github.io` directly per execution-rule confirmation.

## Acceptance verification (grep gates)

| Literal | Required | Found |
|---|---|---|
| `soft privacy` | ≥1 | 1 |
| `AES-GCM` | ≥1 | 2 |
| `not real auth` | ≥1 | 1 |
| `PRIV-01` | ≥1 | 2 |
| `VITE_BASE` | ≥2 | 5 |
| `CNAME` | ≥2 | 3 |
| `gate:set` | ≥2 | 3 |
| `Pro` | ≥1 | 2 |
| `200.000\|200,000\|200000` | ≥1 | 2 |

All pass. `head -1 README.md` returns `# Lulu — Polaroid & Poesie`.

## Deviations from Plan

None. README content matches the canonical literals from RESEARCH.md and the plan's `<action>` block verbatim, with the single substitution of `WhoIsMars` for `<utente>` in URL examples (per execution-rule guidance).

## Commits

- `24dc7c7` — feat(05-docs): README with privacy disclaimer + custom domain instructions

## Self-Check: PASSED

- File exists: `README.md` ✓
- Commit `24dc7c7` exists in git log ✓
- All 9 grep gates pass ✓
- GATE-05 closed (soft-privacy disclaimer + AES-GCM upgrade path documented) ✓
- DEPLOY-02 closed (VITE_BASE switch + CNAME custom domain steps documented) ✓
