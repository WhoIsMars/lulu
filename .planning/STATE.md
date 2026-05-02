---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-02T13:28:54.741Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 0
---

# State: Lulu — Polaroid & Poesie

**Last updated:** 2026-05-02

## Project Reference

See `.planning/PROJECT.md` for full project context.

**Core value (one-liner):** L'esperienza emotiva di scoprire una poesia dietro una foto deve funzionare in modo magico, fluido e accessibile.

**Current focus:** Phase 1 — Foundation + Deploy + Soft Gate

## Current Position

Phase: 1 (Foundation + Deploy + Soft Gate) — EXECUTING
Plan: 1 of 5

- **Milestone:** v1
- **Phase:** 1 — Foundation + Deploy + Soft Gate
- **Plan:** Not yet planned (next: `/gsd-plan-phase 1`)
- **Status:** Executing Phase 1

**Progress**

```
Roadmap:  [██████████] 7/7 phases identified
Phase 1:  [░░░░░░░░░░] 0/0 plans (not yet decomposed)
Overall:  [░░░░░░░░░░] 0/7 phases complete
```

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| v1 requirements coverage | 55/55 | 55/55 ✓ |
| Phases planned | 7 | 0 |
| Phases shipped | 7 | 0 |
| Lighthouse Performance (mobile, home) | ≥ 90 | — |
| Lighthouse Performance (mobile, poem view) | ≥ 90 | — |
| FCP on simulated 4G | < 1.5s | — |
| Animation throughput | 60fps mid-range mobile | — |
| Total photo payload | < 1.5 MB | — |
| axe-core violations (serious/critical) | 0 | — |

## Accumulated Context

### Decisions Locked (from research)

- **Stack locked:** Vue 3.5.33 + Vite 8.0.10 + TypeScript 6.0.3 + GSAP 3.15 (Flip) + WebCrypto PBKDF2 + vite-imagetools 10 + sharp 0.34 + @vueuse/core 14 + vue-router 5 + pinia 3 + panzoom 9.4
- **Rejected:** Matter.js (overkill for ~16 cards), bcryptjs (wrong fit), `gh-pages` npm package (use `actions/deploy-pages@v4`), hash router, Three.js, audio
- **Source of truth for view state:** URL (`/` = RoomView with `<keep-alive>`, `/p/:slug` = PolaroidView modal)
- **Hot path discipline:** single global rAF (`useFrame` registry); pointer position is NOT a Vue ref; CSS-driven zoom (`--zoom`), JS-driven motion
- **Reduced-motion:** flag-driven, single component tree, designed in parallel with default behavior — never bolted on
- **Soft gate:** PBKDF2-SHA256 200k iter via WebCrypto, sessionStorage flag, 5-attempt throttle. Documented as "doormat, not vault" in README; AES-GCM upgrade path designed in from Phase 1 (no `<img src=...>` direct, manifest-driven URL map)

### Open Decisions (to confirm at phase kickoff)

1. **Custom domain vs project page** — affects `base` and `public/CNAME`. Default: project page (`/lulu/`).
2. **Soft gate vs AES-GCM v1** — user chose soft gate; re-confirm at Phase 1 kickoff.
3. **Font choice** — Cormorant / EB Garamond / Lora; pick before Phase 3 via Italian render-test page.

### Active Todos

- [ ] Plan Phase 1 (`/gsd-plan-phase 1`)
- [ ] Confirm custom domain choice with user before deploy workflow lands
- [ ] Confirm soft gate vs AES-GCM at Phase 1 kickoff
- [ ] Source/select serif font with Latin Extended subset before Phase 3 starts

### Blockers

- None at present
- Photo content (`./photos/`) not yet authored — does not block Phase 1–3 (placeholder rectangles match aspect ratio); blocks meaningful Phase 4–5 perf testing

### Research Flags (phases needing deeper research at planning time)

- **Phase 5 (Candle reveal):** highest novelty + iOS Safari unknowns — recommend throwaway-branch prototype on real iPhone before phase commits, comparing CSS-mask vs Canvas fallback
- **Phase 1 (Soft gate + AES-GCM hook design):** asset-resolution layer (`import.meta.glob` map vs explicit imports vs decrypted Blob URLs) deserves a focused planning session

## Session Continuity

### What's Done

- Project initialized; PROJECT.md, REQUIREMENTS.md authored
- Research synthesized across STACK / FEATURES / ARCHITECTURE / PITFALLS into SUMMARY.md (HIGH confidence)
- Roadmap derived (7 phases) with 100% requirement coverage and goal-backward success criteria

### What's Next

1. `/gsd-plan-phase 1` — decompose Phase 1 into plans (scaffold, deploy workflow, gate, base path)
2. Surface and resolve the three Open Decisions before Phase 1 ships
3. Begin Phase 1 execution (yolo mode, parallel execution enabled)

### Recovery Notes

If session resumes mid-Phase-1:

- Roadmap is the source of truth for what each phase delivers
- REQUIREMENTS.md traceability table maps every requirement to its phase
- Pitfalls 4 (gate bypass), 7+11 (Pages base/SPA), 14 (memory leaks) must be addressed in Phase 1 — do not skip even under "yolo" pressure

---
*State initialized: 2026-05-02 alongside roadmap creation*
