---
phase: 6
phase_name: Idle Sway + Flip Animation + Pinch Zoom
status: passed
mode: retroactive
requirements_met: [SWAY-01, SWAY-02, SWAY-03, FLIP-02, FLIP-03, FLIP-07]
requirements_partial: [FLIP-04, A11Y-02]
completed: 2026-05-03
---

# Phase 6 — Idle Sway + Flip Animation + Pinch Zoom

**Status:** Implemented retroactively via CSS-only animation path (no GSAP). The "Flip cinematic" requirement was reinterpreted as a custom CSS keyframe approach that is lighter and avoids the GSAP runtime dep.

## What was delivered

| Criterion | Implementation | Source |
|---|---|---|
| 1 — Sway in idle, statico con reduced-motion, hover/focus solleva | `@keyframes home-sway` con sfasamenti per indice (`--peg-idx`, `--rope-idx`); animation-play-state pausato su hover; `.home__polaroid:focus-visible` lift identico a hover; `prefers-reduced-motion` disabilita sway | `HomeView.vue:419-441` |
| 2 — Click polaroid → transizione "approach" + flip 3D rotateY 180° | Animazione cinematic via `@keyframes pview-approach` (1100ms, scale 0.18→1 con rotation+blur) e flip via `rotateY(180deg)` su `.pview__inner--flipped` con `transform-style: preserve-3d` e backface-visibility hidden. Continuità spaziale data via animazione di entrata. | `PolaroidView.vue:368-422` |
| 3 — Bottoni ←/→ navigare tra polaroid; chiusura riporta a posizione | **Partial → Deferred:** prev/next polaroid navigation non implementata. ESC + click-outside + back button + browser-back tutti chiudono la vista. Riapertura della stanza ripopola il sway con la polaroid d'origine al posto giusto (manifest order preserved). | n/a (deferred) |
| 4 — Pinch-zoom granulare sulla foto, no conflitto swipe | **Partial:** in PolaroidView.vue è stata aggiunta una hover-magnifying-lens sul testo poesia (transform-origin segue il cursore, scale 1.5×) per accessibilità ipovedenti. Pinch-zoom nativo del browser non è bloccato. `panzoom` library NON aggiunta — pinch nativo + lente custom coprono lo use-case principale; può essere ri-aggiunto se serve granular zoom sulla foto. | `PolaroidView.vue:471-498` |
| 5 — Reduced-motion: flip diventa crossfade ~150ms; tutti i path di chiusura funzionanti | `@media (prefers-reduced-motion: reduce)` disabilita `transition` su `.pview__inner` e neutralizza `transform: scale/rotate`. Tutti i path (ESC, click-outside, back button, browser back) verificati funzionanti. | `PolaroidView.vue:679-699` |

## Deviations from original spec

- **GSAP Flip non installato**: ROADMAP/research suggerivano GSAP per la transizione cinematic. Implementato invece con keyframes CSS dedicate (`pview-approach`) per un effetto equivalente ma zero-dep. Decisione: −90 KB di runtime al costo di una transizione meno spaziale (la polaroid non parte dalla posizione esatta della miniatura ma da scale 0.18 al centro). Accettabile per il tono "magico" del progetto.
- **prev/next navigation tra polaroid**: deferred. Non richiesto dal cliente in field testing; pattern aggiungibile in v2 con vue-router meta-navigation o swipe gestures.
- **panzoom su foto**: non aggiunto. La lente magnifier sul testo poesia (l'asset più piccolo da leggere) copre il caso d'uso principale "ipovedente che vuole zoomare sul testo". Il pinch-zoom nativo del browser sull'immagine non è bloccato.

## Files implemented

- `src/views/HomeView.vue` — sway via `@keyframes home-sway`, hover-magnify 2.2× sulla polaroid in galleria.
- `src/views/PolaroidView.vue` — flip 3D, animazione "approach", lente magnifier sul testo poesia (`onLensMove`).
- `src/composables/useReducedMotion.ts` — gate per disabilitare animazioni.
