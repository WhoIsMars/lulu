# Phase 1: Foundation + Deploy + Soft Gate - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Una SPA Vue 3.5 + Vite 8 + TS 6 vuota ma protetta da password è già live su GitHub Pages, con base path corretto, SPA fallback funzionante, gate funzionante su URL Pages reale, e CI che blocca il deploy se lint/format/type-check falliscono. Nessuna feature di contenuto in questa fase: niente stanza, niente polaroid, niente parsing poesie. Solo lo scheletro deployabile + il soft password gate.

</domain>

<decisions>
## Implementation Decisions

### Repo & Dominio
- **D-01:** Nome del repo GitHub: `lulu`. URL pubblicazione iniziale: `https://<username>.github.io/lulu/`
- **D-02:** Project page (no custom domain in v1). `base` di Vite = `/lulu/` in produzione, `/` in dev. Custom domain considerato come upgrade futuro: il codice deve supportare `BASE_URL` driven da env (es. `VITE_BASE`) così che lo switch sia un cambio di variabile, non un refactor.
- **D-03:** Repo privato. ⚠ Richiede GitHub Pro / Team / Enterprise per servire Pages da repo privato — verificare lato account prima del primo deploy. Se l'account non lo permette, fallback a repo pubblico va deciso esplicitamente (non silenziosamente).
- **D-04:** Deploy trigger: solo push su `main`. Niente preview deploy per PR, niente workflow_dispatch in v1.

### Password Gate (soft, PBKDF2)
- **D-05:** Strength scelta confermata: PBKDF2-SHA256 200k iter via WebCrypto, salt 16 byte random, hash + salt committati nel sorgente in un file dedicato (es. `src/gate.config.ts`). Documentato esplicitamente come "soft privacy", non vera sicurezza. Upgrade path AES-GCM (PRIV-01) tracciato in v2.
- **D-06:** Setup della password concreta tramite script CLI npm: `npm run gate:set "<password o passphrase>"` genera salt random + hash PBKDF2 e riscrive `src/gate.config.ts`. La password in chiaro non finisce mai in repo né in env files versionati.
- **D-07:** Lo script accetta passphrase con spazi come prima classe (NFC normalize). Avvisa se la passphrase è < 6 caratteri ma non blocca.
- **D-08:** Recovery in-app: nessuno. Schermata gate non offre hint, "forgot password", suggerimenti. Il proprietario condivide la password fuori-banda.
- **D-09:** Stato sbloccato in `sessionStorage` (chiave dedicata, namespace `lulu:gate`). Nessun checkbox "ricorda dispositivo" in v1; opzione localStorage tracciata come PRIV-02 in v2.

### Gate UX
- **D-10:** Estetica gate "soffitta già da subito": sfondo scuro tipo soffitta, una candela spenta al centro, campo password come riga su un pezzo di carta sotto la candela. Crea continuità con l'esperienza post-unlock.
- **D-11:** Microcopy minimal: solo placeholder `password` e bottone `Entra`. Nessun titolo, nessuna spiegazione. Errore: messaggio breve "password non corretta" via `aria-live="polite"`. Italiano.
- **D-12:** Submit: form con `type="submit"` (Enter funziona) + bottone `Entra` visibile e accessibile. Nessuna scorciatoia "solo Enter".
- **D-13:** Failure UX: ritardo artificiale di ~800ms tra submit e responso (anti brute-force teatrale, ma anche maschera la latenza variabile di PBKDF2 200k iter). Focus rimane sul campo, campo si seleziona automaticamente per re-tentativo immediato.
- **D-14:** Unlock animation: crossfade soft (~400ms) gate → home. Reduced-motion: cambio istantaneo (no fade).

### CI / Tooling (Claude's Discretion)
- **D-15:** Stack tooling: ESLint v9 (flat config) + Prettier per JS/TS/Vue, `vue-tsc` per type-check, `npm run lint`/`format`/`typecheck` come script. Biome è una valida alternativa ma ESLint+Prettier è il sentiero ben battuto in ecosistema Vue. Claude può scegliere se in fase di pianificazione emerge una ragione concreta per Biome.

### Deploy
- **D-16:** Workflow `.github/workflows/deploy.yml` usa `actions/deploy-pages@v4` (NON il pacchetto npm `gh-pages`). Job: install → lint → typecheck → build → upload artifact → deploy.
- **D-17:** SPA fallback: post-build, lo script copia `dist/index.html` a `dist/404.html` e crea `dist/.nojekyll`. Verificare deep-link refresh almeno una volta su URL Pages reale come parte del completamento di questa fase (vincola DEPLOY-03 anche se DEPLOY-03 nominalmente è in Phase 7 — è ragionevole farlo qui per chiudere il loop).

### Claude's Discretion
- Scelte concrete di librerie WebCrypto wrapper (uso diretto di `crypto.subtle` vs un wrapper sottile come `@noble/hashes` se serve compat). Default: `crypto.subtle` direttamente, niente dipendenze.
- Struttura cartelle iniziale (`src/`, `src/gate/`, `src/views/`, `src/composables/`) — scegli la più convenzionale per Vue 3 + Vue Router.
- Pinia incluso da subito o aggiunto al primo bisogno: incluso da subito (sarà usato da Phase 5+).
- Vue Router: includere lo skeleton con almeno la route `/` (gate→room placeholder) e `/p/:slug` come stub 404 placeholder, per validare il SPA fallback contro un deep-link reale.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Core value, requirements set v1, costraints (GitHub Pages, soft auth, italiano)
- `.planning/REQUIREMENTS.md` — REQ-IDs in scope per Phase 1: FOUND-01..05, GATE-01..05, DEPLOY-01, DEPLOY-02
- `.planning/ROADMAP.md` §"Phase 1" — Goal e success criteria espliciti per questa fase
- `.planning/config.json` — Workflow toggles (research, plan_check, verifier tutti attivi; YOLO; commit_docs=true)

### Research (locked decisions)
- `.planning/research/SUMMARY.md` — Stack locked, reconciliations (gate strategy, candle approach, audio out)
- `.planning/research/STACK.md` — Versioni e librerie esatte (Vue 3.5, Vite 8, TS 6, GSAP free), GitHub Pages gotchas, deploy workflow template
- `.planning/research/ARCHITECTURE.md` — PBKDF2 200k iter design, sessionStorage flag, single-rAF pattern, Vite plugin per poems (rilevante da Phase 2 ma utile da conoscere)
- `.planning/research/PITFALLS.md` — Pitfall 4 (gate honesty), Pitfall 7 (base path / SPA fallback), Pitfall 11 (BASE_URL discipline), Pitfall 14 (CI deploy preview)

No external/third-party specs — domain è progetto personale, niente ADR esterni.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Nessuno. Repo greenfield. Cartella `photos/` esiste vuota; `poems.txt` presente ma non rilevante in Phase 1 (parsing arriva in Phase 2).

### Established Patterns
- Nessun pattern preesistente — è la fase che ne stabilisce diversi (struttura SPA, naming script npm, layout `.github/workflows`, conventional commits).

### Integration Points
- `poems.txt` resta intoccato in questa fase.
- `photos/` resta vuota; sarà popolata dal proprietario prima/durante Phase 4.
- Output di questa fase (struttura `src/`, `vite.config.ts`, deploy workflow, `src/gate/`) è la base su cui Phase 2 (content pipeline) e Phase 3 (room layout) andranno a innestarsi.

</code_context>

<specifics>
## Specific Ideas

- "Soffitta notturna già nella schermata gate" — la candela spenta al centro è il dettaglio chiave: deve preludere visivamente all'esperienza post-unlock, non sembrare una pagina di login generica.
- Italiano puro nel microcopy (no "Login", "Sign in"): solo `password`, `Entra`, `password non corretta`.
- Crossfade soft sull'unlock — il "candela che si accende" coreografato è esplicitamente posticipato (lo script NFR per Phase 5 / v2 POLI-01 sequenza arrivo).
- La password può essere una passphrase con spazi (es. "memento mori") — supporto NFC normalize obbligatorio.

</specifics>

<deferred>
## Deferred Ideas

- **Custom domain** — pianificato come upgrade futuro; il codice resta pronto via `BASE_URL` env. Non in v1 di Phase 1.
- **AES-GCM build-time encryption** (PRIV-01) — confermato in v2; Phase 1 implementa il soft gate con upgrade path *documentato*, non implementato.
- **"Ricorda dispositivo" / localStorage** (PRIV-02) — v2.
- **Animazione "candela che si accende" all'unlock** — v2 / POLI-01.
- **Hint statico sotto al campo password** — scartato esplicitamente. Non riproporre.
- **Lock progressivo dopo N tentativi sbagliati** — scartato per ora, marginal value su soft gate. Riproponibile solo se il sito diventa pubblicamente conosciuto.
- **Preview deploy per PR** — non in v1; aggiungibile dopo se servirà.

</deferred>

---

*Phase: 1-Foundation + Deploy + Soft Gate*
*Context gathered: 2026-05-02*
