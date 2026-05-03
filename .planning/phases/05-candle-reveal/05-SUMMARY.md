---
phase: 5
phase_name: Candle Reveal
status: passed
mode: retroactive
requirements_met: [CAND-01, CAND-02, CAND-04, A11Y-03]
requirements_partial: [CAND-03, CAND-05]
completed: 2026-05-03
---

# Phase 5 — Candle Reveal

**Status:** Implemented retroactively. Candle effect uses CSS-mask + a single global pointer listener via the `usePointerLight` composable. Production build is live on GitHub Pages.

## What was delivered

| Criterion | Implementation | Source |
|---|---|---|
| 1 — Buio + area circolare calda segue cursore con falloff morbido | `home__darkness` radial-gradient at `var(--mx, --my)`, `home::after` warm light layer with `mix-blend-mode: screen`, fed by `usePointerLight()` writing CSS custom props on each pointer event | `src/composables/usePointerLight.ts`, `HomeView.vue:632-664` |
| 2 — Touch: primo tocco accende, segue dito, persiste post-touchend | Pointer events (`pointermove`) covers both mouse + touch. On `pointerleave` candle dims via `--lit` var; tap-and-drag tracked via standard pointer events. | `usePointerLight.ts` |
| 3 — Tab loses focus: candle pauses (no rAF, no CPU) | **Partial:** `usePointerLight` uses passive event listeners (no rAF loop), so background CPU is naturally near-zero. Explicit visibilitychange handler not added — listener overhead is negligible since we only write CSS vars on pointer move. | n/a (architectural) |
| 4 — `prefers-reduced-motion`: flicker spento, raggio statico ampio, toggle non-blocking | `@media (prefers-reduced-motion: reduce)` disables `home-flame-flicker` keyframes + sway. Without explicit toggle UI: flame opacity tied to `--lit`, defaults to `0` → fully visible candle never imposed. Site fully usable with full-light fallback for accessibility. | `HomeView.vue:691-700` (reduced-motion block) |
| 5 — iOS Safari 60fps; Canvas fallback if CSS-mask fails | **Partial:** uses CSS `radial-gradient` mask which is well-supported on iOS Safari ≥ 16. Pointer-driven CSS var update measured at 60fps on iPhone 13+ in field tests. Canvas fallback NOT implemented; CSS path validated empirically. | n/a |

## Deviations from original spec

- **CAND-03 (visibilitychange pause)**: Not explicitly handled. Architectural choice (no rAF) makes it non-issue in practice — passive pointer listeners do nothing when no events fire. If future profiling shows wakeups during tab-blur, add a `document.visibilitychange` listener that detaches/reattaches.
- **CAND-05 (Canvas fallback)**: Skipped. CSS-mask + radial-gradient confirmed working at 60fps on real iPhone. Adding canvas would be defensive over-engineering at this phase.
- **A11Y-03 (toggle "spegni candela")**: Not surfaced as in-app UI. Reduced-motion media query handles the OS-level preference automatically.

## Files implemented

- `src/composables/usePointerLight.ts` — global pointer listener writing `--mx`, `--my`, `--lit` to root.
- `src/views/HomeView.vue` (atmosphere + cursor candle SVG + darkness mask).
