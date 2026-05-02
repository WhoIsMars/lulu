---
phase: 01-foundation-deploy-soft-gate
plan: 05
type: execute
wave: 3
depends_on: [03]
files_modified:
  - README.md
autonomous: true
requirements: [GATE-05, DEPLOY-02]
must_haves:
  truths:
    - "README.md documents what the site is (cosa è Lulu)"
    - "README.md documents the soft-gate threat model in Italian (Pitfall 4 honesty)"
    - "README.md documents the AES-GCM upgrade path (PRIV-01 / v2)"
    - "README.md documents how to switch between project page and custom domain via VITE_BASE"
    - "README.md documents how to add a CNAME for custom domain"
    - "README.md lists all npm scripts (dev, build, preview, lint, format, typecheck, test:unit, test:e2e, gate:set)"
    - "README.md documents the private-repo Pages capability check (Pitfall D / D-03)"
  artifacts:
    - path: README.md
      provides: "Owner-facing docs: what, how to run, soft-gate disclaimer, deploy + custom domain + gate:set"
      contains: "soft privacy"
  key_links:
    - from: README.md
      to: scripts/gate-set.mjs
      via: "explicit instruction to run `npm run gate:set \"<password>\"`"
      pattern: "gate:set"
---

<objective>
Author the README that closes GATE-05 (explicit "soft privacy, not real auth" disclaimer + AES-GCM upgrade path) and DEPLOY-02 (custom-domain + VITE_BASE configuration). Italian primary, with one English aside permitted in the privacy section per UI-SPEC Copywriting.

Purpose: This is the only owner-facing surface in Phase 1. Future phases (4–7) will add appendix sections (asset pipeline notes, performance budgets) but the privacy + deploy sections lock here.
Output: Single `README.md` at repo root. No other docs in Phase 1.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md
@.planning/phases/01-foundation-deploy-soft-gate/01-UI-SPEC.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Write README.md (Italian, with privacy + deploy + gate:set sections)</name>
  <files>README.md</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (lines 918-979 — exact Italian disclaimer + custom-domain switch table the README must contain)
    - .planning/phases/01-foundation-deploy-soft-gate/01-UI-SPEC.md (Copywriting section — README threat-model disclaimer literal)
    - .planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md (D-02 custom domain default; D-03 private-repo capability; D-05 PBKDF2 200k; D-06 gate:set workflow)
  </read_first>
  <action>
Create `README.md` with the following sections (Italian, anchored to the literals from RESEARCH.md and UI-SPEC). Section structure must be:

1. `# Lulu — Polaroid & Poesie` — single-line description ("un sito personale che custodisce un piccolo archivio di polaroid e poesie")
2. `## Stack` — one-paragraph technology summary (Vue 3.5 + Vite 8 + TS 6 + Pinia + vue-router + WebCrypto soft gate, GitHub Pages via Actions)
3. `## Privacy` — verbatim disclaimer from RESEARCH.md lines 932-944 (Italian)
4. `## Comandi` — npm scripts table
5. `## Gate (impostare la password)` — `npm run gate:set` workflow + warnings
6. `## Deploy` — workflow trigger + URL table + custom-domain switch instructions
7. `## Configurare un custom domain` — CNAME + VITE_BASE + DNS steps
8. `## Verifica capability (repo privato)` — Pro/Team/Enterprise check
9. `## Struttura del progetto` — minimal tree (`.github/`, `scripts/`, `src/`, `tests/`)

Exact content:

```markdown
# Lulu — Polaroid & Poesie

Un sito personale che custodisce un piccolo archivio di polaroid e poesie. L'esperienza è
intima: una soffitta notturna in cui una candela illumina i fili tesi su cui sono appese
le polaroid; cliccandone una la si apre, la si gira, e sul retro c'è la poesia.

## Stack

Vue 3.5 + Vite 8 + TypeScript 6, Pinia per lo stato, vue-router in modalità HTML5 history,
WebCrypto (PBKDF2-SHA256, 200.000 iterazioni) per il password gate. Hostato su GitHub
Pages tramite GitHub Actions. Tipografia Cormorant Garamond auto-hostata.

## Privacy

Questo sito è protetto da una password "soft": il contenuto è offuscato, non cifrato.
Chi conosce la password entra; chi è motivato e tecnico può comunque vedere i contenuti
negli strumenti del browser. È un cuscinetto di privacy, non una serratura.

La cifratura reale (AES-GCM con chiave derivata via PBKDF2 dalla password) è documentata
come upgrade in PRIV-01 (v2). Il design di Phase 1 mantiene aperto questo upgrade:

- nessun `<img src="/photos/...">` diretto in HTML
- tutti i percorsi delle foto saranno risolti a runtime via mappa derivata dal manifest
- nessuna route pre-renderizzata oltre il gate

> *English aside, for clarity:* the site uses **soft privacy only, not real auth**. The
> salt + hash are committed in the source bundle (`src/gate.config.ts`); a determined
> attacker with the bundle can brute-force the password offline (PBKDF2 200k slows them
> to ~5 attempts/sec on commodity GPU, but the contents — once revealed — are still in
> plain bytes in the same bundle). The AES-GCM upgrade path is tracked as PRIV-01 in
> the v2 roadmap.

## Comandi

| Script              | Cosa fa                                                          |
|---------------------|------------------------------------------------------------------|
| `npm run dev`       | Avvia il dev server Vite (`http://localhost:5173/`)              |
| `npm run build`     | `vue-tsc --noEmit && vite build && node scripts/post-build.mjs` |
| `npm run preview`   | Anteprima locale del build (`http://localhost:4173/`)            |
| `npm run lint`      | ESLint v9 (flat config) su `**/*.{ts,vue,mjs,js}`                |
| `npm run format`    | Prettier `--write .`                                              |
| `npm run typecheck` | `vue-tsc --noEmit`                                                |
| `npm run test:unit` | Vitest (jsdom)                                                    |
| `npm run test:e2e`  | Playwright (chromium, contro `vite preview`)                     |
| `npm run gate:set`  | Genera salt + hash della password e riscrive `src/gate.config.ts`|

## Gate (impostare la password)

La password non è in repo né in env. Solo il salt (16 byte random) e l'hash PBKDF2-SHA256
(32 byte, 200.000 iterazioni) sono committati in `src/gate.config.ts`. Per impostare o
cambiare la password:

```bash
npm run gate:set "<la tua passphrase>"
git add src/gate.config.ts
git commit -m "chore(gate): rotate password"
git push
```

Note:
- Le passphrase con spazi sono di prima classe (es. `"memento mori"`). NFC normalize
  applicato sia in fase di hashing (script Node) che in fase di verifica (browser
  WebCrypto), quindi la stessa passphrase digitata su tastiere/locali diversi viene
  riconosciuta.
- Lo script avvisa se la passphrase è < 6 caratteri ma non blocca.
- Non c'è recovery in-app: chi dimentica la password chiede al proprietario, che la
  comunica fuori-banda.

## Deploy

Il sito è pubblicato su GitHub Pages tramite GitHub Actions
(`.github/workflows/deploy.yml`) a ogni push su `main`. Lint, type-check e build devono
passare; in caso di errore il deploy non parte.

### URL di pubblicazione

| Configurazione   | `VITE_BASE` (in CI)  | URL                                    |
|------------------|----------------------|----------------------------------------|
| Project page     | `/lulu/`             | `https://<utente>.github.io/lulu/`     |
| Custom domain    | `/`                  | `https://<dominio>/`                   |

`VITE_BASE` è settato nello step `Build` del workflow:

```yaml
- name: Build
  env:
    VITE_BASE: /lulu/
  run: npm run build
```

Per dev locale `VITE_BASE` non è settato → default `/`.

## Configurare un custom domain

1. Aggiungere `public/CNAME` con il dominio (una sola riga, senza `https://`):
   ```
   esempio.tld
   ```
2. Settare il record DNS:
   - apex: A → IP GitHub (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`)
   - subdomain: CNAME → `<utente>.github.io`
3. Aggiornare `VITE_BASE` a `/` in `.github/workflows/deploy.yml` (sezione `env:` dello
   step `Build`).
4. Repo Settings → Pages → Custom domain → inserire e salvare. Spuntare "Enforce HTTPS"
   (può richiedere alcuni minuti dopo la verifica DNS).

## Verifica capability (repo privato)

GitHub Pages serve repository privati solo con piano a pagamento:

- Account personale: GitHub **Pro** o superiore.
- Organizzazione: GitHub **Team** o superiore.

Se l'account è Free e il repo è privato, il workflow gira ma Pages non pubblica nulla.
Il fallback esplicito è rendere il repo pubblico — il salt + hash del gate sono già
committati, quindi la visibilità del repo non indebolisce ulteriormente il modello di
minaccia.

Una volta sola, dopo la prima creazione del repo:

> **Repo Settings → Pages → Build and deployment → Source = "GitHub Actions"**

senza questo step la prima esecuzione del workflow non può pubblicare.

## Struttura del progetto

```
.
├── .github/workflows/deploy.yml       # CI/CD GitHub Pages
├── public/                             # asset statici copiati così come sono (CNAME va qui)
├── scripts/
│   ├── gate-set.mjs                    # CLI: genera salt + hash PBKDF2
│   └── post-build.mjs                  # SPA fallback (404.html) + .nojekyll
├── src/
│   ├── main.ts                         # bootstrap Vue + Pinia + Router
│   ├── App.vue                         # <RouterView> + crossfade transition
│   ├── gate.config.ts                  # GENERATO da gate:set
│   ├── gate/crypto.ts                  # verifyPassword (WebCrypto + constant-time compare)
│   ├── stores/gate.ts                  # Pinia store, sessionStorage 'lulu:gate'
│   ├── composables/
│   │   ├── useGate.ts                  # verify() + 800ms response floor
│   │   └── useReducedMotion.ts
│   ├── router/index.ts                 # createWebHistory(BASE_URL) + guard
│   ├── styles/tokens.css               # tutti i CSS custom properties dell'UI-SPEC
│   └── views/
│       ├── GateView.vue                # la schermata password
│       ├── HomeView.vue                # la stanza (vuota in Phase 1)
│       └── PolaroidView.vue            # placeholder /p/:slug per validare SPA fallback
├── tests/
│   ├── unit/                           # Vitest
│   └── e2e/                            # Playwright
├── vite.config.ts
├── eslint.config.js
└── README.md
```
```

Acceptance: every literal phrase that the must_haves grep against MUST be present in the README. In particular:
- `soft privacy` (case-sensitive)
- `AES-GCM`
- `VITE_BASE`
- `CNAME`
- `gate:set`
- `not real auth`
- `Pro` (capability check)
  </action>
  <verify>
    <automated>test -f README.md && grep -q "soft privacy" README.md && grep -q "AES-GCM" README.md && grep -q "VITE_BASE" README.md && grep -q "CNAME" README.md && grep -q "gate:set" README.md && grep -q "not real auth" README.md && grep -q "PRIV-01" README.md && grep -q "Pro" README.md && grep -q "200.000\|200,000\|200000" README.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "soft privacy" README.md` ≥ 1 (GATE-05).
    - `grep -c "AES-GCM" README.md` ≥ 1 (GATE-05 upgrade path).
    - `grep -c "VITE_BASE" README.md` ≥ 2 (DEPLOY-02 — table + workflow snippet).
    - `grep -c "CNAME" README.md` ≥ 2 (DEPLOY-02 — both in URL table and configure section).
    - `grep -c "gate:set" README.md` ≥ 2 (commands table + dedicated section).
    - `grep -c "PRIV-01" README.md` ≥ 1 (explicit upgrade-path tracking).
    - `grep -c "not real auth" README.md` ≥ 1 (Pitfall 4 / UI-SPEC literal copy).
    - `grep -c "Pro" README.md` ≥ 1 (private-repo capability check, Pitfall D).
    - `grep -c "200.000\\|200,000\\|200000" README.md` ≥ 1 (PBKDF2 iterations documented).
    - File is well-formed Markdown — `head -1 README.md` returns `# Lulu — Polaroid & Poesie`.
  </acceptance_criteria>
  <done>README documents the project, soft-gate honesty, AES-GCM upgrade path, deploy URL table with VITE_BASE switch, custom-domain DNS + CNAME, capability check, and gate:set workflow. Future phases extend with appendix sections; Phase 1's privacy + deploy text is locked.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No new boundaries introduced — this plan only authors documentation.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Information Disclosure | misleading users about gate strength | mitigate | Privacy section is verbatim from RESEARCH.md / UI-SPEC literals; explicitly says "not real auth" and tracks AES-GCM upgrade as PRIV-01. |
</threat_model>

<verification>
After this task: README.md exists at repo root with all required literals. Grep gates above all return ≥ expected counts.
</verification>

<success_criteria>
- GATE-05 satisfied: README documents the soft-gate threat model and the AES-GCM upgrade path, in Italian, prominently.
- DEPLOY-02 satisfied: README documents how to configure custom domain (CNAME, DNS, VITE_BASE switch).
- A new contributor (or the owner six months later) can run the project, set the gate password, and switch to a custom domain using only the README.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-deploy-soft-gate/01-05-SUMMARY.md` with: the README path, a one-line confirmation that GATE-05 + DEPLOY-02 literals are present, and any deviation from the canonical Italian text from RESEARCH.md.
</output>
