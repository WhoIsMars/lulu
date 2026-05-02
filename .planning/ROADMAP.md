# Roadmap: Lulu — Polaroid & Poesie

**Created:** 2026-05-02
**Granularity:** standard (5–8 phases) → 7 phases
**Coverage:** 55/55 v1 requirements mapped

## Core Value

L'esperienza emotiva di scoprire una poesia dietro una foto deve funzionare in modo magico, fluido e accessibile — la grafica e il "candle reveal" sono il prodotto, non un orpello.

## Phase Ordering Rationale

Phases derive from research synthesizer's 7-phase structure. Three architectural pitfalls (gate bypass, GH Pages base path, SPA 404) live in Phase 1 because retrofit cost is order-of-magnitude higher than upfront cost. Content pipeline precedes UI so Phase 3+ components import typed modules (no runtime parsing, no broken refs). Static room + reading view (Phase 3) ships the a11y semantic baseline before any animation; retrofitting `<button>`/dialog patterns onto existing `<div>`-based code is rework. Asset pipeline (Phase 4) ships before candle (Phase 5) so the candle's 4ms paint budget is profiled against realistic image weight. Candle (Phase 5) is the highest-novelty / highest-iOS-risk feature and ships before sway+flip (Phase 6) so additional rAF subscribers land on a verified single-loop foundation. Sway is CSS-only (zero pitfall surface); GSAP Flip layers on top of an already-correct close stack. Phase 7 is verification, not invention — every a11y pattern has shipped in the phase that introduced it, and Phase 7 audits + ships.

A11Y-* requirements are cross-cutting in spirit but each is owned by a single phase: surface-level a11y (semantic markup, focus mgmt, A−/A+) lives in Phase 3 where the surface emerges; pinch-zoom on the photo view lives in Phase 6 with the open view; reduced-motion flag lives in Phase 5 with the candle (the dominant motion source); axe-core CI lives in Phase 7 (final audit). A11y is verified continuously in every phase, not deferred.

## Phases

- [ ] **Phase 1: Foundation + Deploy + Soft Gate** — Skeleton SPA deployed to live Pages preview, gated by PBKDF2 password, base path + 404 SPA fallback solved on day one
- [ ] **Phase 2: Content Pipeline + Manifest Validation** — Typed `poems` and `manifest` modules built at compile time, build fails on drift
- [ ] **Phase 3: Static Room + Polaroid Layout + Reading View** — Semantic, a11y-correct, animation-free version of every surface (room, polaroid grid, modal route, reading view, A−/A+)
- [ ] **Phase 4: Asset Pipeline (Photos)** — AVIF/WebP/JPEG with srcset, LQIP placeholders, EXIF stripped, lazy + eager strategy
- [ ] **Phase 5: Candle Reveal** — Single-rAF GPU-composited candle following pointer/touch, reduced-motion variant, iOS Safari verified
- [ ] **Phase 6: Idle Sway + Flip Animation + Pinch Zoom** — CSS keyframe sway, GSAP Flip cinematic transition, rotateY card flip, prev/next navigation, photo pinch-zoom
- [ ] **Phase 7: Hardening + A11y Audit + Ship** — axe-core CI, perf budgets, memory-leak smoke, real-iPhone preview, README + ship

## Phase Details

### Phase 1: Foundation + Deploy + Soft Gate
**Goal**: Un sito vuoto e protetto da password è già live su GitHub Pages — base path, SPA fallback, e gate funzionano insieme su URL reale prima che qualunque feature sia scritta
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. Pushing to `main` deploys automatically a GitHub Pages, e l'URL serve il sito senza schermata bianca o asset 404 (base path corretto sia per project page che custom domain)
  2. Ricaricando una rotta tipo `/qualcosa` il sito riappare normalmente (SPA fallback via `404.html` + `.nojekyll`), non un 404 di GitHub
  3. La home mostra un singolo campo password con bottone "Entra"; password corretta sblocca il sito per la durata della tab (sessionStorage), password sbagliata mostra un errore accessibile (aria-live) senza svelare suggerimenti
  4. Il README documenta esplicitamente che il gate è "soft privacy" (PBKDF2-SHA256 200k iter via WebCrypto), include l'upgrade path AES-GCM, e spiega come configurare custom domain + `BASE_URL`
  5. CI esegue lint, format e type-check; un build rotto blocca il deploy
**Plans**: 5 plans
  - [ ] 01-skeleton-PLAN.md — Vite/Vue/TS scaffold, ESLint+Prettier, Pinia, router skeleton, tokens.css, Vitest+Playwright dev-deps + Wave 0 stubs
  - [ ] 02-vite-base-PLAN.md — vite.config.ts env-driven base + post-build SPA fallback (404.html + .nojekyll)
  - [ ] 03-soft-gate-PLAN.md — gate-set CLI, WebCrypto verifier, Pinia store, router guard, GateView per UI-SPEC, e2e tests
  - [ ] 04-deploy-PLAN.md — GitHub Actions workflow + manual live-Pages verification checkpoint
  - [ ] 05-docs-PLAN.md — README with privacy disclaimer + AES-GCM upgrade + VITE_BASE/CNAME instructions
**UI hint**: yes

### Phase 2: Content Pipeline + Manifest Validation
**Goal**: Le poesie e la mappatura foto↔poesia esistono come moduli TypeScript tipizzati, generati a build, con fallimento esplicito su drift
**Depends on**: Phase 1
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04
**Success Criteria** (what must be TRUE):
  1. `poems.txt` viene parsato a build in un modulo `virtual:poems` tipizzato (titolo, data, slug, body); modificare il file aggiorna l'app via HMR senza refresh
  2. `content/manifest.yaml` definisce per ogni foto `photo`, `poem` (slug), `alt` ed è validato con Zod a build
  3. Build fallisce con messaggio chiaro se: foto referenziata manca da `photos/`, slug poesia non esiste, `alt` è troppo corto, oppure foto/poesie sono orfane
  4. Esiste un comando locale `npm run manifest:check` che dà gli stessi errori senza richiedere un build completo
**Plans**: TBD

### Phase 3: Static Room + Polaroid Layout + Reading View
**Goal**: La stanza, i fili, le polaroid e la vista poesia esistono in forma statica e completamente accessibile — niente animazioni, ma struttura semantica, focus management e tipografia di lettura sono già definitivi
**Depends on**: Phase 1, Phase 2
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04, ROOM-05, FLIP-01, FLIP-05, FLIP-06, POEM-01, POEM-02, POEM-03, A11Y-01, A11Y-04, A11Y-05
**Success Criteria** (what must be TRUE):
  1. La home mostra una stanza con sfondo notturno, polaroid distribuite su più fili (numero di fili e di polaroid derivato dal manifest); aggiungere una foto+poesia popola la stanza senza modifiche al codice
  2. Ogni polaroid è un `<button>` accessibile con `aria-label` derivato dal titolo poesia + data; navigare con Tab mostra un focus ring visibile anche sul fondo scuro; ogni layout (desktop, tablet, mobile portrait/landscape) non taglia né fa overflow
  3. Click/tap/Enter/Space su una polaroid apre la rotta `/p/:slug` come overlay modale; ESC, bottone, click-outside e tasto "indietro" del browser tornano alla stanza; il focus torna alla polaroid d'origine, e all'apertura va sul titolo della poesia
  4. La vista poesia mostra titolo, data e corpo con tipografia serif italiana (subset latin-ext, font-display: swap), max-width leggibile, line-height ~1.6, sfondo chiaro tipo pergamena; il testo è selezionabile e gli accenti italiani (`àèéìòù «»`) renderizzano dallo stesso font
  5. Bottoni A− / A+ aumentano/diminuiscono il testo della poesia (rem-based, da 0.85x a 1.6x), preferenza salvata in localStorage; tutto il testo significativo passa contrasto WCAG AA, navigazione 100% keyboard
**Plans**: TBD
**UI hint**: yes

### Phase 4: Asset Pipeline (Photos)
**Goal**: Le foto sono servite in formati moderni, dimensioni responsive, EXIF rimosso, con placeholder che evita pop-in
**Depends on**: Phase 2, Phase 3
**Requirements**: ASSET-01, ASSET-02, ASSET-03, ASSET-04
**Success Criteria** (what must be TRUE):
  1. Ogni foto è disponibile in AVIF + WebP + JPEG con srcset responsive (più larghezze) via `vite-imagetools`; il browser sceglie automaticamente il formato/dimensione migliore
  2. Le foto fuori viewport caricano lazy (`loading="lazy"`, `decoding="async"`), le prime poche eager con `fetchpriority="high"`; il payload totale foto resta sotto un budget definito (target < 1.5 MB AVIF totale)
  3. Mentre la foto definitiva carica, una versione LQIP (BlurHash o base64 thumbnail) è già visibile, niente lampi bianchi né pop-in
  4. Le foto servite non contengono EXIF (no GPS, no timestamp); verificabile con un tool tipo `exiftool` su `dist/`
**Plans**: TBD

### Phase 5: Candle Reveal
**Goal**: La stanza è buia e una candela calda, single-rAF e GPU-composited, segue il puntatore (mouse o dito) a 60fps; l'esperienza degrada con grazia sotto reduced-motion e su iOS Safari
**Depends on**: Phase 3, Phase 4
**Requirements**: CAND-01, CAND-02, CAND-03, CAND-04, CAND-05, A11Y-03
**Success Criteria** (what must be TRUE):
  1. La stanza appare buia; un'area circolare illuminata e calda segue il cursore in tempo reale con falloff morbido, senza tearing né lag percettibile
  2. Su mobile/touch il primo tocco accende la candela e l'area illuminata segue il dito durante tap-and-drag; persiste ~500ms dopo `touchend` per permettere la lettura
  3. Quando la tab perde focus la candela si pausa (no rAF, no CPU); riprende fluidamente al ritorno senza salti
  4. Con `prefers-reduced-motion: reduce` il flicker è spento, il raggio è statico e ampio (60–80% viewport), e un toggle in-app "Mostra tutto / Spegni candela" permette di forzare luce piena; l'app resta sempre usabile
  5. Su iPhone reale (non simulatore), la candela mantiene 60fps; se il path CSS-mask non regge, il fallback Canvas con `globalCompositeOperation: destination-out` è attivo e indistinguibile per l'utente
**Plans**: TBD
**UI hint**: yes

### Phase 6: Idle Sway + Flip Animation + Pinch Zoom
**Goal**: La stanza prende vita con un'oscillazione delicata, e l'apertura di una polaroid è un momento cinematografico (Flip dalla posizione di partenza al centro, poi rotateY per rivelare la poesia); navigazione tra poesie e zoom granulare sulla foto
**Depends on**: Phase 3, Phase 5
**Requirements**: SWAY-01, SWAY-02, SWAY-03, FLIP-02, FLIP-03, FLIP-04, FLIP-07, A11Y-02
**Success Criteria** (what must be TRUE):
  1. Le polaroid oscillano leggermente in idle (CSS `@keyframes` con sfasamenti casuali per file/posizione), e con `prefers-reduced-motion: reduce` restano statiche; hover desktop e focus keyboard sollevano la polaroid con lo stesso focus ring
  2. Cliccando una polaroid, la transizione GSAP Flip la sposta dalla sua posizione attuale al centro dello schermo mantenendo continuità spaziale; un bottone "Gira" esegue un flip 3D (rotateY 180°) che rivela la poesia sul retro
  3. In vista aperta, bottoni "←" / "→" e swipe orizzontale navigano tra polaroid; chiusura riporta la polaroid alla sua posizione di partenza nella stanza
  4. La foto in vista aperta supporta pinch-zoom granulare (panzoom o equivalente) senza conflittare con lo swipe orizzontale; pinch-zoom nativo del browser non è bloccato
  5. Con reduced-motion il flip diventa un crossfade ~150ms senza rotateY né scaling Flip; tutti i path di chiusura (ESC, bottone, click-outside, browser back) restano funzionanti
**Plans**: TBD
**UI hint**: yes

### Phase 7: Hardening + A11y Audit + Ship
**Goal**: Tutti i budget di performance, le verifiche di accessibilità automatiche e manuali, e l'audit finale del bundle passano; il sito è ufficialmente live sull'URL definitivo
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6
**Requirements**: A11Y-06, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. axe-core in CI non riporta violazioni serious/critical su gate, room e polaroid view; pass manuale con VoiceOver/NVDA + keyboard-only completati
  2. Lighthouse Performance ≥ 90 su mobile per home e vista poesia; First Contentful Paint < 1.5s su 4G simulata
  3. Animazioni (candela, sway, flip) tengono 60fps su laptop di fascia media e iPhone recente; smoke test 10× navigazione polaroid → home → polaroid mostra heap stabile senza listener/rAF orfani
  4. L'URL Pages reale è stato aperto su iPhone fisico e desktop, l'esperienza completa (gate → candela → polaroid → flip → poesia) funziona end-to-end, e l'autore conferma il go-live
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Deploy + Soft Gate | 0/0 | Not started | - |
| 2. Content Pipeline + Manifest Validation | 0/0 | Not started | - |
| 3. Static Room + Polaroid Layout + Reading View | 0/0 | Not started | - |
| 4. Asset Pipeline (Photos) | 0/0 | Not started | - |
| 5. Candle Reveal | 0/0 | Not started | - |
| 6. Idle Sway + Flip Animation + Pinch Zoom | 0/0 | Not started | - |
| 7. Hardening + A11y Audit + Ship | 0/0 | Not started | - |

## Coverage

✓ All 55 v1 requirements mapped to exactly one phase
✓ No orphaned requirements
✓ No duplicate assignments

### Coverage by Category

| Category | Count | Phase(s) |
|----------|-------|----------|
| FOUND (5) | 5 | Phase 1 |
| GATE (5) | 5 | Phase 1 |
| DEPLOY (3) | 2+1 | Phase 1 (DEPLOY-01, DEPLOY-02), Phase 7 (DEPLOY-03) |
| CONT (4) | 4 | Phase 2 |
| ROOM (5) | 5 | Phase 3 |
| POEM (3) | 3 | Phase 3 |
| FLIP (7) | 3+4 | Phase 3 (FLIP-01, FLIP-05, FLIP-06), Phase 6 (FLIP-02, FLIP-03, FLIP-04, FLIP-07) |
| ASSET (4) | 4 | Phase 4 |
| CAND (5) | 5 | Phase 5 |
| SWAY (3) | 3 | Phase 6 |
| A11Y (6) | 3+1+1+1 | Phase 3 (A11Y-01, A11Y-04, A11Y-05), Phase 5 (A11Y-03), Phase 6 (A11Y-02), Phase 7 (A11Y-06) |
| PERF (5) | 5 | Phase 7 |

**Note on a11y as cross-cutting concern**: Each A11Y-* requirement is owned by the phase where its surface area emerges (semantic markup + focus + A−/A+ → Phase 3, reduced-motion → Phase 5 with candle, photo pinch-zoom → Phase 6 with open view, axe-core CI → Phase 7). However, accessibility patterns (contrast, keyboard navigation, screen reader semantics, reduced-motion alternatives) are verified continuously in every phase — never deferred to a final audit.

## Open Decisions to Resolve at Phase Kickoff

Per research SUMMARY.md, three decisions to confirm before Phase 1 ships:

1. **Custom domain vs project page** (`user.github.io/lulu/`) — affects `base` value and `public/CNAME`. Default if unspecified: project page (`base: '/lulu/'`).
2. **Soft gate (PBKDF2) vs build-time AES-GCM upgrade for v1** — user has chosen soft gate; re-confirm at Phase 1 kickoff.
3. **Font choice** — Cormorant Garamond / EB Garamond / Lora candidates; final pick before Phase 3 via a render-test page with all Italian accents + «» + em-dashes.

---
*Roadmap created: 2026-05-02*
