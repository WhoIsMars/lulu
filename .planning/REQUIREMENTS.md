# Requirements: Lulu — Polaroid & Poesie

**Defined:** 2026-05-02
**Core Value:** L'esperienza emotiva di scoprire una poesia dietro una foto deve funzionare in modo magico, fluido e accessibile.

## v1 Requirements

### Foundation (FOUND)

- [ ] **FOUND-01**: Progetto Vue 3.5 + Vite 8 + TypeScript 6 inizializzato con script `dev`, `build`, `preview`
- [ ] **FOUND-02**: Build di produzione carica correttamente su path `/lulu/` (project page) e su `/` (custom domain), con `base` driven da env
- [ ] **FOUND-03**: Workflow GitHub Actions costruisce ed effettua deploy su GitHub Pages a ogni push su `main`
- [ ] **FOUND-04**: SPA fallback funziona — ricaricando una rotta deep-link non si vede 404 (`404.html` copia di `index.html`, `.nojekyll` presente)
- [ ] **FOUND-05**: Lint + format attivi (ESLint, Prettier o equivalente) e type-check passa in CI

### Content Pipeline (CONT)

- [ ] **CONT-01**: `poems.txt` viene parsato a build-time in un modulo TypeScript tipizzato (titolo, data, corpo, slug)
- [ ] **CONT-02**: Manifest YAML/JSON (`content/manifest.yaml`) lega ogni file in `photos/` a una poesia, con campi: `photo`, `poem` (slug), `alt` (testo accessibile)
- [ ] **CONT-03**: Manifest viene validato con Zod a build; foto orfane o poesie non assegnate falliscono la build con errore chiaro
- [ ] **CONT-04**: Hot Module Replacement aggiorna senza refresh quando si modifica `poems.txt` o il manifest

### Password Gate (GATE)

- [ ] **GATE-01**: Schermata iniziale con un singolo campo password e bottone "Entra"
- [ ] **GATE-02**: Password verificata via PBKDF2-SHA256 200k iter (WebCrypto), salt + hash committati nel sorgente
- [ ] **GATE-03**: Errore mostrato in modo accessibile (aria-live, focus rimane sul campo) senza svelare suggerimenti
- [ ] **GATE-04**: Stato sbloccato salvato in `sessionStorage` (default per-tab); flag attivo lascia il sito sbloccato fino a chiusura tab
- [ ] **GATE-05**: Documentato esplicitamente in repo che il gate è "soft privacy" e non vera sicurezza, con upgrade path AES-GCM commentato

### Home Room — Static Layout (ROOM)

- [ ] **ROOM-01**: Vista home renderizza una "stanza" con sfondo scuro stile soffitta notturna (texture legno/carta, palette notturna)
- [ ] **ROOM-02**: Polaroid sono distribuite su più fili tesi, ognuna come `<button>` accessibile con `aria-label` derivato dal titolo poesia
- [ ] **ROOM-03**: Layout responsive: desktop, tablet, mobile portrait/landscape — nessuna polaroid tagliata, nessun overflow
- [ ] **ROOM-04**: Numero di polaroid e righe di filo deriva dal manifest; aggiungere una foto+poesia popola la stanza senza modifiche al codice
- [ ] **ROOM-05**: Ogni polaroid mostra la foto sul fronte; un'ombra delicata simula profondità

### Candle-Light Reveal (CAND)

- [ ] **CAND-01**: Sfondo della stanza appare buio; un'area circolare illuminata segue il cursore in tempo reale
- [ ] **CAND-02**: Implementazione single-rAF, GPU-composited (CSS radial-gradient mask + mix-blend-mode + transform), nessun reflow su mousemove
- [ ] **CAND-03**: Su mobile/touch la luce segue il dito durante tap-and-drag; il primo tocco accende la candela
- [ ] **CAND-04**: Effetto si pausa quando il tab perde focus (visibilitychange) per non sprecare CPU/batteria
- [ ] **CAND-05**: Fallback iOS Safari: se mask non performa, switch a canvas con `globalCompositeOperation: 'destination-out'`

### Idle Sway & Interaction (SWAY)

- [ ] **SWAY-01**: Le polaroid oscillano leggermente in idle (CSS `@keyframes` con sfasamenti casuali per file/posizione) — niente physics engine
- [ ] **SWAY-02**: Hover (desktop) solleva la polaroid e accende un focus ring; keyboard `Tab` produce lo stesso focus ring
- [ ] **SWAY-03**: Sway si pausa con `prefers-reduced-motion: reduce` e le polaroid restano statiche

### Polaroid View & Flip (FLIP)

- [ ] **FLIP-01**: Click/tap/Enter/Space su una polaroid apre la rotta `/p/:slug` (deep-link condivisibile dentro il gate)
- [ ] **FLIP-02**: Transizione FLIP (GSAP Flip): la polaroid attraversa lo schermo fino al centro, ingrandendosi, mantenendo continuità spaziale
- [ ] **FLIP-03**: Vista aperta mostra la foto e un bottone "Gira" che esegue un flip 3D (rotateY 180°) rivelando la poesia sul retro
- [ ] **FLIP-04**: Bottoni "←" / "→" e swipe orizzontale navigano tra polaroid (con loop opzionale)
- [ ] **FLIP-05**: Chiusura (ESC, bottone, click-outside, browser back) anima il ritorno della polaroid alla sua posizione di partenza
- [ ] **FLIP-06**: Focus management: focus va al titolo poesia all'apertura, ritorna alla polaroid d'origine alla chiusura
- [ ] **FLIP-07**: Reduced-motion: flip diventa crossfade 150ms

### Poem Reading View (POEM)

- [ ] **POEM-01**: Tipografia serif italiana per il corpo poesia, scala fluida, line-height ~1.6, max-width leggibile
- [ ] **POEM-02**: Header poesia mostra titolo e data come da `poems.txt`
- [ ] **POEM-03**: Testo è selezionabile/copiabile (default); accenti italiani renderizzati correttamente (font subset con `latin-ext`)

### Accessibility & Zoom (A11Y)

- [ ] **A11Y-01**: Bottoni `A−` / `A+` aumentano/diminuiscono la dimensione testo poesia (CSS variabili `rem`-based, da 0.85x a 1.6x), preferenza salvata in `localStorage`
- [ ] **A11Y-02**: Pinch-zoom non disabilitato; foto in vista aperta supportano pinch-zoom granulare (`panzoom` o equivalente)
- [ ] **A11Y-03**: `prefers-reduced-motion: reduce` rispettato per candela, sway, flip; toggle in-app permette di forzarlo manualmente
- [ ] **A11Y-04**: Contrasto testo AA su tutti gli stati (anche con candela "spenta"); navigazione 100% keyboard
- [ ] **A11Y-05**: Lettori schermo: ogni polaroid ha nome accessibile (titolo poesia + data), vista aperta annuncia titolo e poesia
- [ ] **A11Y-06**: Audit con axe-core in CI senza violazioni serious/critical

### Asset Pipeline (ASSET)

- [ ] **ASSET-01**: `vite-imagetools` produce AVIF + WebP + JPEG fallback con `srcset` responsive per ogni foto
- [ ] **ASSET-02**: Foto sono lazy-loaded fuori viewport (`loading="lazy"`, `decoding="async"`)
- [ ] **ASSET-03**: Placeholder LQIP (BlurHash o base64 thumbnail) finché la versione finale non si carica
- [ ] **ASSET-04**: Metadata EXIF strippati a build (privacy) — nessun GPS/timestamp nelle immagini servite

### Performance & Stability (PERF)

- [ ] **PERF-01**: Lighthouse Performance ≥ 90 su mobile per home e vista poesia
- [ ] **PERF-02**: First Contentful Paint < 1.5s su 4G simulata
- [ ] **PERF-03**: Animation throughput 60fps su laptop di fascia media e iPhone recente; degrada con grazia
- [ ] **PERF-04**: Niente memory leak: 10 navigazioni polaroid → home → polaroid mantengono heap stabile
- [ ] **PERF-05**: rAF e listener mousemove cleanup su unmount/route-change

### Deploy & Custom Domain (DEPLOY)

- [ ] **DEPLOY-01**: Push su `main` triggera GitHub Actions che builda e pubblica su `gh-pages` (via `actions/deploy-pages`)
- [ ] **DEPLOY-02**: README documenta come configurare custom domain (file `CNAME`, DNS) e come settare `BASE_URL`
- [ ] **DEPLOY-03**: Anteprima deploy verificata almeno una volta su URL Pages reale prima di considerare il sito "live"

## v2 Requirements

### Privacy Hardening

- **PRIV-01**: Manifest + foto cifrati con AES-GCM (chiave = PBKDF2(password)), niente contenuto in chiaro nel bundle
- **PRIV-02**: "Ricorda dispositivo" opzionale (localStorage anziché session)

### Polish

- **POLI-01**: Sequenza arrivo/intro (candela che si accende, prima polaroid sussurrata)
- **POLI-02**: "Easter polaroid" nascosta fuori dalla scansione tipica della candela
- **POLI-03**: Tonalità candela leggermente differente per polaroid (mood-tint)
- **POLI-04**: Suono di "fiammifero" opzionale all'unlock (silenzio resta default)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend / vera autenticazione | Statico su GitHub Pages; il gate è soft per design |
| Account utente, multi-utente | Sito privato a una password condivisa |
| CMS / admin UI | Manifest si modifica a mano via git |
| Commenti, like, condivisione social | Esperienza intima, non sociale |
| Editing poesie dal sito | `poems.txt` è source of truth |
| Audio ambient autoplay | Frammentazione UX (autoplay policy), interferisce con lettura — silenzio è feature |
| Internazionalizzazione (EN, altre lingue) | Solo italiano per coerenza con poesie |
| Virtualizzazione / 50+ polaroid simultanee | Scala attuale ~16, sproporzionato |
| 3D / WebGL scenes / Three.js | Cambierebbe registro da intimo a tech demo |
| Matter.js / physics engine | Eccessivo per ~16 cards; CSS keyframes sufficienti |
| PWA / Service Worker | Nessun caso d'uso offline che giustifichi la complessità |
| Right-click disable / anti-copy | Teatro di sicurezza, peggiora a11y |
| Analytics / tracking | Sito privato, niente tracking |

## Traceability

Mapped during roadmap creation.

**Coverage (pre-roadmap):**
- v1 requirements: 50 total
- Mapped to phases: 0 (pending roadmap)

---
*Requirements defined: 2026-05-02*
*Last updated: 2026-05-02 after initial definition*
