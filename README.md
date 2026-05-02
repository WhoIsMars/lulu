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
| Project page     | `/lulu/`             | `https://WhoIsMars.github.io/lulu/`    |
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
   - subdomain: CNAME → `whoismars.github.io`
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
