# Lulu — Polaroid & Poesie

## What This Is

Un sito web personale, intimo, accessibile tramite password, dove l'utente entra in una "soffitta notturna" buia: il mouse (o dito su mobile) è una candela che illumina porzioni di stanza rivelando fili tesi con polaroid appese. Cliccando una polaroid, questa si apre, si gira, e mostra sul retro la poesia associata — sempre con possibilità di zoom per ipovedenti.

## Core Value

L'esperienza emotiva di scoprire una poesia dietro una foto deve funzionare in modo magico, fluido e accessibile — la grafica e il "candle reveal" sono il prodotto, non un orpello.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Soft password gate (client-side hash) — solo chi ha la password entra
- [ ] Home con effetto "candela": area illuminata segue mouse/touch, sfondo buio
- [ ] Estetica "soffitta notturna" — fili, mollette, polaroid, texture legno/carta, palette notturna
- [ ] Una polaroid per ogni poesia in `poems.txt` (oggi ~13–16, espandibile)
- [ ] Mappatura foto↔poesia tramite manifest JSON esplicito
- [ ] Click su polaroid → apertura full-view con flip animato (foto fronte / poesia retro)
- [ ] Ritorno alla home preservando lo stato della stanza
- [ ] Zoom accessibile: pinch-zoom + bottoni A− / A+ su foto e testo poesia
- [ ] Rispetto `prefers-reduced-motion` (riduce/spegne animazioni)
- [ ] Mobile: la "candela" segue il dito; layout responsive
- [ ] UI in italiano
- [ ] Hosting su GitHub Pages con deploy automatico via GitHub Actions
- [ ] Custom domain opzionale supportato
- [ ] Performance: caricamento iniziale fluido anche con tutte le foto

### Out of Scope

- Vera autenticazione server-side — overkill per privacy soft, niente backend
- CMS o admin UI — il manifest JSON si modifica a mano
- Commenti, like, condivisione social — il sito è privato, non sociale
- Account multipli / utenti — una sola password condivisa
- Editing poesie dal sito — `poems.txt` è la fonte
- Internazionalizzazione (EN) — solo italiano per ora
- 50+ polaroid simultanee con virtualizzazione — scala attuale è bassa

## Context

- **Contenuto:** raccolta di poesie italiane intime e malinconiche datate 2025–2026 (notte, ricordi, autoinganni, "luce nel buio"). L'estetica deve risuonare con questo registro — non allegro, non corporate.
- **Foto:** cartella `./photos/` attualmente vuota; il proprietario aggiungerà le immagini, una per poesia.
- **Pubblico:** privato, regalo / progetto personale. Probabilmente decine di visitatori al massimo.
- **Sviluppatore:** singolo, vuole risultato grafico di alto livello senza eccessivo overhead operativo.

## Constraints

- **Tech stack**: Vue 3 + Vite + TypeScript (preferenza utente, modificabile se emerge alternativa migliore in research)
- **Hosting**: GitHub Pages (statico, gratuito) — vincola architettura a SPA statica
- **Auth**: solo client-side — nessun backend, nessun server di sessione
- **Accessibilità**: zoom obbligatorio per ipovedenti, supporto `prefers-reduced-motion`, contrasto leggibile
- **Performance**: tutte le foto vengono pre-caricate o lazy-load efficiente; lo "swing" dei fili e il candle-reveal devono restare a 60fps
- **Token budget**: caveman mode preferito; Opus per planning critico, Sonnet per il resto

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Soft password gate (no backend) | Privacy "regalo", non vera sicurezza; GitHub Pages è statico | — Pending |
| Manifest JSON foto↔poesia | Esplicito, riordinabile, niente magic naming | — Pending |
| GitHub Pages + Actions | Gratis, custom domain, flow git-native | — Pending |
| Estetica "soffitta notturna" | Risuona col registro malinconico/notturno delle poesie | — Pending |
| Touch-light segue dito su mobile | Stessa magia, input adatto al device | — Pending |
| Vue 3 + Vite + TS (proposto) | Preferenza utente; verificare in research se confermato | — Pending |
| Zoom: pinch + bottoni A−/A+ | Copertura accessibilità senza separare in "modalità lettura" | — Pending |
| Italiano-only UI | Coerenza con poesie | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after initialization*
