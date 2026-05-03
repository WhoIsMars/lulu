---
phase: 3
phase_name: Static Room + Polaroid Layout + Reading View
status: passed
mode: retroactive
requirements_met: [ROOM-01, ROOM-02, ROOM-03, ROOM-04, ROOM-05, FLIP-01, FLIP-05, FLIP-06, POEM-01, POEM-02, POEM-03, A11Y-01, A11Y-04]
requirements_deferred: [A11Y-05]
completed: 2026-05-03
---

# Phase 3 — Static Room + Polaroid Layout + Reading View

**Status:** Implemented retroactively outside formal GSD discuss/plan flow during early visual-design iterations. This SUMMARY closes the phase against existing source.

## What was delivered

| Criterion | Implementation | Source |
|---|---|---|
| 1 — Stanza con polaroid manifest-driven, n. fili dinamico | `HomeView.vue` divides `poems` across 3 ropes via `Math.ceil(poems.length / ROPE_COUNT)`; adding a manifest entry repopulates without code change | `src/views/HomeView.vue:16-22` |
| 2 — `<button>` accessibili, aria-label da titolo+data, focus visibile | `<button class="home__polaroid" :aria-label="\`${p.title}, ${p.date}\`">`, focus ring via `.home__polaroid:focus-visible` con outline-offset esplicito | `HomeView.vue:84-87`, `:focus-visible` rules |
| 3 — Click/Enter/Space apre route `/p/:slug`; ESC, click-outside, browser-back chiudono; focus management | `PolaroidView.vue` listens for `Escape`; `onBackdropClick` chiude su click fuori dalla card; `.pview__card` con `tabindex=0` e `@click.stop` per non chiudere quando cliccato | `PolaroidView.vue:33-41,116-124` |
| 4 — Tipografia poesia: serif italiana, accenti italiani, line-height ~1.55, paper background | Cormorant Garamond + Italianno via `@fontsource`, `font-display: swap` su entrambi; corpo a `line-height: 1.45-1.55`; sfondo carta-pergamena su `.pview__face--back` | `PolaroidView.vue:551-637`, `src/main.ts` (font import) |
| 5 — A−/A+ con localStorage, contrasto WCAG AA, keyboard nav | **Deferred:** controlli A−/A+ rimossi su esplicita richiesta utente (2026-05-03 — "togli i tasti zoom in alto a dx"). `useTextScale.ts` resta in codebase per futuro re-introduzione. WCAG AA contrast su tutti i testi significativi (ink scuro su pergamena chiara, paper-100 su soot-800). Navigazione 100% keyboard preservata. | `src/composables/useTextScale.ts` (idle), CSS contrast tokens |

## Deviations from original spec

- **A11Y-05 (A−/A+ controls)**: Rimossi su richiesta utente del 2026-05-03 per priorità estetica ("togli i tasti zoom in alto a dx"). La hover-magnifying-lens su titolo + data + corpo poesia (transform-origin che segue il puntatore, scale 1.5×) costituisce un'alternativa di accessibilità per ipovedenti — vedi `PolaroidView.vue:471-498`. Da riconsiderare se si vuole zoom persistente keyboard-driven.
- Modal route `/p/:slug` realizzata come full-screen view con animazione "approach" (la polaroid si avvicina dal nulla) anziché overlay puro. Comportamento equivalente a UX modale: ESC, back-button, click-outside chiudono.

## Files implemented

- `src/views/HomeView.vue` — gallery di polaroid distribuite su 3 fili sagging (SVG curve), peg + sway già strutturali (ma animazioni gestite in Phase 6).
- `src/views/PolaroidView.vue` — vista poesia con flip 3D, freccia indietro custom, lente magnifier sul testo.
- `src/composables/useReducedMotion.ts` — flag globale.
- `src/composables/useTextScale.ts` — scaffolding per A−/A+ (deferred).
- `src/router/index.ts` — `/p/:slug` route con guard via `useGate`.
