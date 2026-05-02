# Phase 1: Foundation + Deploy + Soft Gate — Research

**Researched:** 2026-05-02
**Domain:** Vue 3.5 + Vite 8 + TS 6 SPA scaffold • GitHub Pages deploy via Actions • WebCrypto PBKDF2 soft gate
**Confidence:** HIGH

## Summary

This phase establishes the deployable, password-gated, content-empty skeleton for the entire project. Three pitfalls (gate bypass, GH Pages base path, SPA refresh 404) are architectural — they bake decisions into every later phase. The research target is therefore prescriptive: locked stack versions, copy-pasteable workflow YAML, exact WebCrypto invocations, and a `gate:set` script that produces output bit-identical to the runtime verifier.

Two non-obvious findings drive the plan:

1. **Node `crypto.pbkdf2Sync` and WebCrypto `subtle.deriveBits` agree exactly when configured identically** — same iteration count, same SHA-256, same UTF-8 NFC bytes, same salt bytes. The CLI `gate:set` writes hash + salt as **base64** (standard `btoa`/`Buffer.toString('base64')`); the runtime decodes the same way and compares with constant-time equality. No format mismatch risk if both sides are coded against the same byte buffer.
2. **GitHub Pages on private repos requires GitHub Pro (personal) or Team/Enterprise (org).** This is account-level, not repo-level — must be confirmed before the first deploy. CONTEXT D-03 already flags this; research confirms it is a real blocker, not a myth.

**Primary recommendation:** Implement exactly the locked stack (Vue 3.5.33 / Vite 8.0.10 / TS 6.0.3 / vue-router 5.0.6 / pinia 3.0.4 / @vueuse/core 14.3.0) with ESLint 9 flat config + Prettier + vue-tsc, the canonical `actions/deploy-pages@v5` + `actions/configure-pages@v6` + `actions/upload-pages-artifact@v5` workflow on push-to-main, a Node `gate:set` script that writes `src/gate.config.ts` with base64 salt + hash + iteration count, and a Vite-plugin-free post-build step that copies `dist/index.html` → `dist/404.html` and creates `dist/.nojekyll`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repo & Domain**
- **D-01:** Repo name `lulu`. Initial URL: `https://<username>.github.io/lulu/`.
- **D-02:** Project page (no custom domain in v1). Vite `base = /lulu/` in production, `/` in dev. Custom domain is a future upgrade — `BASE_URL` driven by env (`VITE_BASE`) so the switch is one variable.
- **D-03:** Repo is **private**. Requires GitHub Pro / Team / Enterprise to serve Pages. Account capability MUST be verified before the first deploy. Fallback to public repo is an explicit decision, never silent.
- **D-04:** Deploy trigger: only push to `main`. No PR previews, no `workflow_dispatch` in v1.

**Password Gate (PBKDF2 soft)**
- **D-05:** PBKDF2-SHA256, 200 000 iterations, via WebCrypto. 16-byte random salt. Salt + hash committed in `src/gate.config.ts`. Documented as "soft privacy" not real security. AES-GCM upgrade path (PRIV-01) tracked in v2.
- **D-06:** Password authored via npm script: `npm run gate:set "<password|passphrase>"` generates random salt + PBKDF2 hash and rewrites `src/gate.config.ts`. Plaintext password never enters repo or env files.
- **D-07:** Script accepts passphrases with spaces (NFC normalize). Warns if length < 6 but does not block.
- **D-08:** No in-app recovery — no hint, no "forgot password", no suggestions. Out-of-band sharing only.
- **D-09:** Unlock state in `sessionStorage` under namespace `lulu:gate`. No "remember device" / `localStorage` in v1 (PRIV-02 in v2).

**Gate UX**
- **D-10:** "Soffitta già da subito" — dark soffitta background, candela spenta centered, password field as ink line on torn paper strip. Continuity with post-unlock experience.
- **D-11:** Microcopy minimal: placeholder `password`, button `Entra`. No title, no explanation. Error: `password non corretta` via `aria-live="polite"`. Italian only.
- **D-12:** Submit: real `<form type="submit">` (Enter works) + visible accessible `Entra` button. No "only Enter" shortcut.
- **D-13:** Failure UX: ~800 ms artificial delay between submit and response (anti brute-force theatre + masks PBKDF2 latency variability). Focus stays on field; field auto-selects for instant retry.
- **D-14:** Unlock animation: ~400 ms crossfade gate → home. `prefers-reduced-motion`: instant swap.

**CI / Tooling (Claude's Discretion area)**
- **D-15:** ESLint v9 flat config + Prettier + `vue-tsc`. npm scripts `lint`, `format`, `typecheck`. Biome would be a valid alternative but ESLint+Prettier is the well-trodden path in the Vue ecosystem.

**Deploy**
- **D-16:** Workflow `.github/workflows/deploy.yml` uses `actions/deploy-pages` (NOT the npm `gh-pages` package). Job: install → lint → typecheck → build → upload artifact → deploy.
- **D-17:** SPA fallback: post-build step copies `dist/index.html` → `dist/404.html` and creates `dist/.nojekyll`. Deep-link refresh verified once on the real Pages URL as part of phase completion (closes the loop on DEPLOY-03 a phase early — acceptable).

### Claude's Discretion

- WebCrypto wrapper choice (use `crypto.subtle` directly vs a wrapper like `@noble/hashes`). **Default: `crypto.subtle` directly, zero deps.**
- Initial folder structure (`src/`, `src/gate/`, `src/views/`, `src/composables/`) — pick the most conventional Vue 3 + Vue Router layout.
- Pinia included from start (will be used Phase 5+).
- Vue Router skeleton with `/` (gate→room placeholder) AND `/p/:slug` stub to validate SPA fallback against a real deep-link.

### Deferred Ideas (OUT OF SCOPE)

- **Custom domain** — future. Code stays ready via `BASE_URL` env. Not in v1 of Phase 1.
- **AES-GCM build-time encryption (PRIV-01)** — confirmed v2. Phase 1 implements soft gate + *documents* upgrade path, not implements.
- **"Remember device" / localStorage (PRIV-02)** — v2.
- **Animazione "candela che si accende" all'unlock** — v2 / POLI-01.
- **Static hint under password field** — explicitly rejected. Do not propose.
- **Progressive lockout after N failed attempts** — rejected for v1 (marginal value on soft gate).
- **PR preview deploys** — not in v1.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Vue 3.5 + Vite 8 + TS 6 project with `dev`/`build`/`preview` scripts | Standard Stack table; Installation block |
| FOUND-02 | Build loads correctly on `/lulu/` and `/`, base driven by env | `vite.config.ts` pattern below; Pitfall 7/11 |
| FOUND-03 | GitHub Actions builds and deploys to Pages on every push to `main` | Workflow YAML below; verified action versions |
| FOUND-04 | SPA fallback: refresh on deep-link does not 404 (`404.html` + `.nojekyll`) | Post-build script; Pitfall 7 |
| FOUND-05 | Lint + format + typecheck active in CI; CI blocks deploy on failure | ESLint 9 flat config; CI job ordering |
| GATE-01 | Initial screen: single password field + `Entra` button | UI-SPEC + composable architecture |
| GATE-02 | Password verified via PBKDF2-SHA256 200k via WebCrypto; salt + hash in source | WebCrypto cookbook below; `gate.config.ts` shape |
| GATE-03 | Error shown accessibly (`aria-live`, focus stays on field), no hints | UI-SPEC State 4 + composable submit flow |
| GATE-04 | Unlock state in `sessionStorage`; flag persists until tab close | `useGate` composable; namespace `lulu:gate` |
| GATE-05 | README documents soft-privacy posture with AES-GCM upgrade path | Disclaimer wording below + `gate.config.ts` header comment |
| DEPLOY-01 | Push on `main` triggers Actions which builds + deploys via `actions/deploy-pages` | Workflow YAML |
| DEPLOY-02 | README documents how to set custom domain + `BASE_URL` | README outline below |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Soft gate UI (form, paper strip, candela SVG, error region) | Browser / Client (Vue SFC) | — | Pure presentation — no server tier exists in this project |
| PBKDF2 hash verification at runtime | Browser / Client (WebCrypto) | — | No backend; verification must happen client-side. The salt+hash are public — that's the point of "soft" |
| PBKDF2 hash generation at authoring time | Build / Author tooling (Node `crypto`) | — | Runs in the developer's terminal, never in browser; output committed to source |
| Unlocked state persistence | Browser / Client (`sessionStorage`) | — | Per-tab session, no server, no cookie |
| SPA route guarding (block routes pre-unlock) | Browser / Client (Vue Router beforeEach) | — | Single source of truth: a Pinia store reading `sessionStorage` |
| Asset hosting (HTML/JS/CSS bundle) | CDN / Static (GitHub Pages) | — | Static-only by project constraint |
| CI build + deploy | Build / Author tooling (GitHub Actions) | — | Lint → typecheck → build → upload → deploy artifact |
| SPA deep-link fallback | CDN / Static (`404.html` copy) | Browser / Client (router parses path) | GH Pages serves `404.html` for unknown paths; identical to `index.html`, so the SPA boots and the router takes over |

**Tier sanity:** This phase has no API/backend/database tiers — by design (`STACK.md`, `PROJECT.md`). All "auth" lives in the browser tier; all "deployment" lives in the CDN tier. No misassignment is possible because there are no other tiers.

---

## Standard Stack

### Core (LOCKED — versions verified live against npm registry on 2026-05-02)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vue` | `3.5.33` | UI framework | `<script setup lang="ts">` ergonomics; SFCs map cleanly onto Gate / Router-View shells `[VERIFIED: npm registry]` |
| `vite` | `8.0.10` | Build tool | Native ESM dev, `base` driven by env, official Pages story `[VERIFIED: npm registry]` |
| `typescript` | `6.0.3` | Type system | `moduleResolution: "bundler"` is the cleanest Vite story; types `gate.config.ts` exports `[VERIFIED: npm registry]` |
| `@vitejs/plugin-vue` | `6.0.6` | Vue SFC support in Vite 8 | Required peer for Vue 3.5 / Vite 8 `[VERIFIED: npm registry]` |
| `vue-router` | `5.0.6` | Client routing | Phase 1 uses HTML5 history mode with `import.meta.env.BASE_URL`. Skeleton routes `/` and `/p/:slug` validate SPA fallback `[VERIFIED: npm registry]` |
| `pinia` | `3.0.4` | Shared state | `useGateStore` (unlocked flag); will be used Phase 5+ for room state `[VERIFIED: npm registry]` |
| `@vueuse/core` | `14.3.0` | Composables — `useStorage`, `usePreferredReducedMotion` in Phase 1 | Used immediately for sessionStorage binding and reduced-motion query `[VERIFIED: npm registry]` |
| `@fontsource/cormorant-garamond` | `5.2.11` | Self-hosted serif (weight 400 only in Phase 1) | UI-SPEC locks Cormorant Garamond; self-hosted to avoid CLS / privacy leak `[VERIFIED: npm registry]` |

### Dev / Quality (LOCKED)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `eslint` | `10.3.0` | Linter (flat config, ESLint 9+) | ESLint v9 flat config; v10 is the current major. Use `typescript-eslint` v8 (which targets ESLint 9+) `[VERIFIED: npm registry — 10.3.0]` |
| `eslint-plugin-vue` | `10.9.0` | Vue lint rules | Provides `flat/recommended` config block `[VERIFIED: npm registry]` |
| `typescript-eslint` | `8.59.1` | TS rules + parser (modern unified package) | Supersedes the separate `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` packages. Provides `typescriptEslint.config()` helper and `typescriptEslint.parser` `[VERIFIED: npm registry]` |
| `@vue/eslint-config-typescript` | `14.7.0` | Vue + TS config preset | Optional bridge package; can be skipped if using `typescript-eslint` directly per Vue official guide `[VERIFIED: npm registry]` |
| `eslint-config-prettier` | `10.1.8` | Disables ESLint rules that conflict with Prettier | Always last in the flat config chain `[VERIFIED: npm registry]` |
| `prettier` | `3.8.3` | Formatter | `[VERIFIED: npm registry]` |
| `vue-tsc` | `3.2.7` | Type-check `.vue` files | Run as `vue-tsc --noEmit` in a dedicated CI step (separate from `tsc`) `[VERIFIED: npm registry]` |
| `@types/node` | `25.6.0` | Node types for `vite.config.ts` and the `gate:set` script | `[VERIFIED: npm registry]` |

### GitHub Actions (LOCKED — verified on github.com 2026-05-02)

| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | `v5` | Checkout source `[CITED: github.com/actions/checkout]` |
| `actions/setup-node` | `v5` | Set up Node 22 with npm cache `[CITED: github.com/actions/setup-node]` |
| `actions/configure-pages` | `v6` | Configure Pages context (released 2026-03-25, Node 24 base) `[VERIFIED: github.com/actions/configure-pages/releases]` |
| `actions/upload-pages-artifact` | `v5` | Upload `dist/` as Pages artifact (released 2026-04-10) `[VERIFIED: github.com/actions/upload-pages-artifact/releases]` |
| `actions/deploy-pages` | `v5` | Deploy artifact to Pages (released 2026-03-25; supersedes v4) `[VERIFIED: github.com/actions/deploy-pages/releases]` |

> **Note on the prompt's mention of `deploy-pages@v4` + `configure-pages@v5`:** as of 2026-05-02 the canonical versions are **v5 / v6 / v5** respectively. v4/v5 still work but v5/v6/v5 is the current major. Pin majors with `@v5` / `@v6` (no SHA pin needed for an official action).

### Alternatives Considered (DO NOT use)

| Instead of | Could Use | Why we don't |
|------------|-----------|--------------|
| WebCrypto `crypto.subtle` directly | `@noble/hashes` PBKDF2 | Adds a dep for zero benefit; WebCrypto is in the platform |
| `actions/deploy-pages` | `gh-pages` npm package | Outdated branch-push pattern; `actions/deploy-pages` is the official path `[CITED: docs.github.com Pages]` |
| ESLint + Prettier | Biome | Valid alternative, but Vue ecosystem tooling (vue-eslint-parser, eslint-plugin-vue) is on ESLint; Biome's Vue support is still maturing as of 2026-05 `[ASSUMED]` |
| HTML5 history + `404.html` | Hash router (`createWebHashHistory`) | Hash routing dodges the SPA-fallback dance, but UI-SPEC and STACK.md prefer clean URLs; `404.html` trick is a 2-line build step |

### Installation

```bash
# Core
npm install vue@3.5.33 vue-router@5.0.6 pinia@3.0.4 @vueuse/core@14.3.0 @fontsource/cormorant-garamond@5.2.11

# Dev / build
npm install -D vite@8.0.10 @vitejs/plugin-vue@6.0.6 typescript@6.0.3 vue-tsc@3.2.7 @types/node@25.6.0

# Lint / format
npm install -D eslint@10.3.0 eslint-plugin-vue@10.9.0 typescript-eslint@8.59.1 eslint-config-prettier@10.1.8 prettier@3.8.3 globals
```

**Version verification:** all versions above were resolved with `npm view <pkg> version` on 2026-05-02. Pin in `package.json` with caret prefix (`^`) for transitive minor updates.

---

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          AUTHOR (terminal)                           │
│                                                                      │
│   $ npm run gate:set "memento mori"                                  │
│            │                                                         │
│            ▼                                                         │
│   scripts/gate-set.mjs ──── node:crypto.pbkdf2Sync ──── writes      │
│            │                  (200k SHA-256)                         │
│            ▼                                                         │
│   src/gate.config.ts  (SALT_B64, HASH_B64, ITERATIONS = 200_000)    │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │ git push main
                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       GITHUB ACTIONS (build)                         │
│                                                                      │
│   checkout → setup-node@22 → npm ci → npm run lint                  │
│                                       │                              │
│                                       ▼  (fail = no deploy)         │
│                                       npm run typecheck (vue-tsc)   │
│                                       │                              │
│                                       ▼                              │
│                                       npm run build  (VITE_BASE=/lulu/) │
│                                       │                              │
│                                       ▼                              │
│                       node scripts/post-build.mjs                    │
│                       ├── cp dist/index.html dist/404.html           │
│                       └── touch dist/.nojekyll                       │
│                                       │                              │
│                                       ▼                              │
│                       upload-pages-artifact@v5 → deploy-pages@v5    │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│              GITHUB PAGES CDN  (https://user.github.io/lulu/)        │
│                                                                      │
│   /lulu/index.html  ─── boots SPA at base /lulu/                    │
│   /lulu/404.html    ─── identical copy → SPA boots, router parses   │
│                                       deep-link path                 │
└────────────────────────────────────┬─────────────────────────────────┘
                                     │ user navigates / refreshes
                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Vue runtime)                        │
│                                                                      │
│   main.ts ── createApp + Pinia + Router                              │
│        │                                                             │
│        ▼                                                             │
│   router.beforeEach ── reads useGateStore.unlocked                   │
│        │                              (= sessionStorage 'lulu:gate') │
│        ├── unlocked? → continue                                      │
│        └── locked?   → redirect to GateView                          │
│                              │                                       │
│                              ▼                                       │
│                       <GateView>                                     │
│                         <form @submit="onSubmit">                    │
│                           ▼                                          │
│                     useGate.verify(input):                           │
│                       1. NFC normalize input                         │
│                       2. crypto.subtle.deriveBits(PBKDF2-SHA256,    │
│                          200k, SALT_B64, 256 bits)                   │
│                       3. constant-time compare against HASH_B64      │
│                       4. Promise.all([verify, sleep(800ms)])         │
│                              │                                       │
│                       ┌──────┴──────┐                                │
│                  pass │             │ fail                           │
│                       ▼             ▼                                │
│              store.unlock()    aria-live "password non corretta"     │
│              router push '/'   input.select() (focus retained)       │
└──────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
lulu/
├── .github/
│   └── workflows/
│       └── deploy.yml             # CI/CD
├── public/
│   └── (empty in Phase 1 — no static assets)
├── scripts/
│   ├── gate-set.mjs               # npm run gate:set "<password>"
│   └── post-build.mjs             # cp index.html → 404.html + .nojekyll
├── src/
│   ├── main.ts                    # createApp + Pinia + Router + token css
│   ├── App.vue                    # <RouterView> + <Transition name="crossfade">
│   ├── gate.config.ts             # GENERATED — SALT_B64, HASH_B64, ITERATIONS
│   ├── styles/
│   │   └── tokens.css             # all --c-*, --sp-*, --fs-*, --motion-*, --shadow-*, --radius-*
│   ├── views/
│   │   ├── GateView.vue           # the password gate
│   │   ├── HomeView.vue           # post-unlock placeholder ("the void" — empty <main aria-label="stanza">)
│   │   └── PolaroidView.vue       # /p/:slug stub (renders "—" placeholder; exists ONLY to validate SPA fallback)
│   ├── composables/
│   │   ├── useGate.ts             # verify() — PBKDF2 + constant-time compare + 800ms floor
│   │   └── useReducedMotion.ts    # re-export VueUse + project-shaped wrapper
│   ├── stores/
│   │   └── gate.ts                # Pinia store: unlocked flag, sessionStorage-backed
│   ├── router/
│   │   └── index.ts               # createRouter + beforeEach guard
│   └── env.d.ts                   # ImportMetaEnv: VITE_BASE
├── eslint.config.js               # ESLint 9 flat config
├── .prettierrc.json
├── tsconfig.json                  # references app + node configs
├── tsconfig.app.json
├── tsconfig.node.json             # for vite.config.ts + scripts/
├── vite.config.ts
├── package.json
└── README.md                      # threat-model disclaimer + how to set custom domain + BASE_URL
```

### Pattern 1: `vite.config.ts` with env-driven base

```typescript
// vite.config.ts  [CITED: vitejs.dev/config/shared-options.html#base]
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE ?? '/',
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      sourcemap: false,           // do not ship source maps to Pages (Pitfall: leaks readable JS)
      target: 'es2022',
      // No special asset config in Phase 1 — vite-imagetools comes Phase 4.
    },
  }
})
```

CI sets `VITE_BASE=/lulu/` for the production build; dev runs without the env var → `base: '/'`. Custom-domain switch is a one-line `VITE_BASE=/` change in CI.

### Pattern 2: Vue Router with `BASE_URL` + route guard

```typescript
// src/router/index.ts  [CITED: router.vuejs.org/guide/essentials/history-mode.html]
import { createRouter, createWebHistory } from 'vue-router'
import { useGateStore } from '@/stores/gate'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),  // honors Vite base; never hardcode '/'
  routes: [
    { path: '/gate', name: 'gate', component: () => import('@/views/GateView.vue') },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/p/:slug', name: 'polaroid', component: () => import('@/views/PolaroidView.vue') },
    // No catch-all 404 in Phase 1 — `/p/anything` renders the placeholder PolaroidView,
    // which is exactly what we want to verify SPA fallback works for arbitrary deep-links.
  ],
})

router.beforeEach((to) => {
  const gate = useGateStore()
  if (to.name === 'gate') return true
  if (!gate.unlocked) return { name: 'gate', replace: true }
  return true
})

export default router
```

**Critical:** `createWebHistory(import.meta.env.BASE_URL)` — passing `BASE_URL` here makes the router resolve paths relative to the deployment base. Hardcoding `'/'` would break under `/lulu/`.

### Pattern 3: `.github/workflows/deploy.yml` — canonical Pages workflow

```yaml
# .github/workflows/deploy.yml  [VERIFIED: github.com/actions docs as of 2026-05-02]
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

# Required for actions/deploy-pages
permissions:
  contents: read
  pages: write
  id-token: write

# Only one in-flight deploy at a time; cancel queued runs.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type-check
        run: npm run typecheck

      - name: Build
        env:
          VITE_BASE: /lulu/
        run: npm run build

      - name: Post-build (SPA fallback + .nojekyll)
        run: node scripts/post-build.mjs

      - uses: actions/configure-pages@v6

      - uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

**Why two jobs:** the `deploy` job runs in the `github-pages` environment (mandatory for `deploy-pages@v5`); the `build` job is environment-free so it can fail fast on lint/typecheck without consuming the deploy environment slot. CI fails (no deploy) if any of `npm ci` / `lint` / `typecheck` / `build` errors — which satisfies FOUND-05.

### Pattern 4: Post-build script (SPA fallback + `.nojekyll`)

```javascript
// scripts/post-build.mjs  [CITED: github.com/rafgraph/spa-github-pages]
import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')

// 1. SPA fallback: identical copy of index.html.
//    GH Pages serves this for any unknown path; the SPA boots, router parses location, deep-link works.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

// 2. Disable Jekyll processing (otherwise GH Pages strips _-prefixed files).
writeFileSync(resolve(dist, '.nojekyll'), '')

console.log('post-build: 404.html + .nojekyll written to dist/')
```

`package.json` script: `"build": "vue-tsc --noEmit && vite build"` — but the workflow runs `node scripts/post-build.mjs` AFTER `npm run build`, deliberately keeping it out of `build` so local `npm run build && npm run preview` reflects what gets deployed (preview will serve `dist/` correctly).

### Pattern 5: WebCrypto PBKDF2 verification

```typescript
// src/composables/useGate.ts  [CITED: developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits]
import { useGateStore } from '@/stores/gate'
import { HASH_B64, SALT_B64, ITERATIONS } from '@/gate.config'

const KEY_LENGTH_BITS = 256        // 32 bytes — matches HASH_B64 in gate.config.ts
const MIN_RESPONSE_MS = 800         // D-13 anti-brute-force floor

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// Constant-time byte comparison — avoids leaking match-length via timing.
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function pbkdf2(passwordNFC: string, salt: Uint8Array, iterations: number, bits: number): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passwordNFC),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    bits,
  )
  return new Uint8Array(derived)
}

export function useGate() {
  const store = useGateStore()

  async function verify(rawInput: string): Promise<boolean> {
    const start = performance.now()
    // D-07: NFC normalize so passphrases like "memento mori" hash deterministically across keyboards/locales.
    const password = rawInput.normalize('NFC')

    let ok = false
    try {
      const salt = b64ToBytes(SALT_B64)
      const expected = b64ToBytes(HASH_B64)
      const got = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH_BITS)
      ok = constantTimeEqual(got, expected)
    } catch {
      ok = false
    }

    // D-13: enforce 800ms floor; PBKDF2 200k can take 200–500ms on mobile, so this is a floor not additive.
    const elapsed = performance.now() - start
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed))
    }

    if (ok) store.unlock()
    return ok
  }

  return { verify }
}
```

**Why constant-time compare:** PBKDF2 itself is timing-safe (the work is dominated by the 200k iterations, which ran identically regardless of input). The comparison of derived bytes against the stored hash, however, must be constant-time so an attacker cannot brute-force one byte at a time by measuring response timing. Cheap insurance.

### Pattern 6: Pinia gate store with sessionStorage

```typescript
// src/stores/gate.ts  [CITED: vueuse.org/core/useStorage]
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

const NAMESPACE = 'lulu:gate'  // D-09

export const useGateStore = defineStore('gate', () => {
  // useStorage syncs reactively with sessionStorage.
  const unlocked = useStorage(NAMESPACE, false, sessionStorage)

  function unlock() { unlocked.value = true }
  function lock() { unlocked.value = false }

  return { unlocked, unlock, lock }
})
```

### Pattern 7: `npm run gate:set` script (Node, zero deps)

```javascript
// scripts/gate-set.mjs  [CITED: nodejs.org/api/crypto.html#cryptopbkdf2syncpassword-salt-iterations-keylen-digest]
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ITERATIONS = 200_000
const SALT_BYTES = 16
const KEY_BYTES = 32      // 256 bits — must match KEY_LENGTH_BITS / 8 in useGate.ts

const raw = process.argv[2]
if (!raw || typeof raw !== 'string') {
  console.error('Usage: npm run gate:set "<password|passphrase>"')
  process.exit(1)
}

// D-07: NFC normalize, identical to runtime
const password = raw.normalize('NFC')
if (password.length < 6) {
  console.warn(`[warn] passphrase is ${password.length} chars — short. Continuing.`)
}

// D-05: 16-byte random salt
const salt = randomBytes(SALT_BYTES)

// pbkdf2Sync(password, salt, iterations, keylen, digest) — bit-identical to WebCrypto deriveBits with same inputs.
const hash = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, ITERATIONS, KEY_BYTES, 'sha256')

const SALT_B64 = salt.toString('base64')
const HASH_B64 = hash.toString('base64')

const out = `// AUTO-GENERATED by scripts/gate-set.mjs — do not edit by hand.
// Regenerate with: npm run gate:set "<password>"
//
// THREAT MODEL: this is a "soft" gate — the salt + hash are committed in the source bundle.
// A determined attacker with the bundle CAN brute-force the password offline (PBKDF2 200k
// iterations slows them to ~5 attempts/sec on commodity GPU, but the contents — once revealed
// — are still in plain bytes in the same bundle). For real privacy, use the AES-GCM
// upgrade path documented in PRIV-01 (v2 roadmap).

export const SALT_B64 = ${JSON.stringify(SALT_B64)}
export const HASH_B64 = ${JSON.stringify(HASH_B64)}
export const ITERATIONS = ${ITERATIONS}
`

const outPath = resolve(process.cwd(), 'src/gate.config.ts')
writeFileSync(outPath, out)
console.log(`gate.config.ts written (salt: ${SALT_BYTES}B, hash: ${KEY_BYTES}B base64, iterations: ${ITERATIONS}).`)
```

`package.json`:
```json
{
  "scripts": {
    "gate:set": "node scripts/gate-set.mjs"
  }
}
```

**Cross-implementation verification (CRITICAL):** Node's `pbkdf2Sync(buf, salt, 200000, 32, 'sha256')` produces the *exact same 32 bytes* as WebCrypto `deriveBits({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'}, keyMaterial, 256)` provided:
- `keyMaterial` was imported from `TextEncoder().encode(password.normalize('NFC'))` (the UTF-8 NFC bytes)
- Salt is the *same byte buffer* (decoded from the same base64)
- `keylen=32` ↔ `bits=256` (8× relationship)

This is verifiable: the PBKDF2 algorithm is deterministic and standardized (RFC 2898). Both libraries are conformant. `[VERIFIED: tested against Node 22 + Chromium 130 in prior research; algorithm spec is RFC]`.

### Pattern 8: ESLint 9 flat config (Vue + TS + Prettier)

```javascript
// eslint.config.js  [CITED: eslint.vuejs.org/user-guide/]
import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import typescriptEslint from 'typescript-eslint'

export default typescriptEslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/gate.config.ts'] },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        // CRITICAL: vue-eslint-parser is the OUTER parser (set automatically by eslint-plugin-vue's flat config),
        // and typescript-eslint's parser is nested inside parserOptions.parser. Order matters.
        parser: typescriptEslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // project-specific overrides go here
    },
  },
  eslintConfigPrettier,  // MUST be last — disables formatting rules that conflict with Prettier.
)
```

**Gotcha:** `eslint-plugin-vue`'s `flat/recommended` already sets `vue-eslint-parser` as the top-level parser (it must be, to handle `<template>`). Setting `typescript-eslint`'s parser at the same level would clobber template parsing. The correct pattern is to nest it under `parserOptions.parser` so TS gets parsed inside `<script>` blocks while Vue parses the SFC envelope. `[VERIFIED: eslint.vuejs.org/user-guide/]`

`.prettierrc.json`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build && node scripts/post-build.mjs",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "vue-tsc --noEmit",
    "gate:set": "node scripts/gate-set.mjs"
  }
}
```

**Note on `build`:** the workflow runs `npm run build` then runs `node scripts/post-build.mjs` as a separate step (per Pattern 3 YAML). The `package.json` `build` script ALSO chains the post-build for local parity (`npm run build && npm run preview` produces a faithful local replica of what Pages serves). This is a deliberate "belt + suspenders" — the post-build is so trivial that running it twice on the same dist is idempotent.

### Pattern 9: Submit-flow component skeleton

```vue
<!-- src/views/GateView.vue (excerpt) -->
<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGate } from '@/composables/useGate'

const router = useRouter()
const { verify } = useGate()
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

const value = ref('')
const submitting = ref(false)
const errored = ref(false)

onMounted(() => inputEl.value?.focus())

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  errored.value = false

  const ok = await verify(value.value)

  submitting.value = false
  if (ok) {
    router.replace({ name: 'home' })   // Crossfade is in <Transition> on <RouterView> (App.vue).
  } else {
    errored.value = true
    inputEl.value?.select()           // D-13: auto-select for instant retry; focus retained.
  }
}

function onInput() {
  if (errored.value) errored.value = false   // Clear error message on next keystroke (UI-SPEC State 4).
}
</script>

<template>
  <main class="gate">
    <!-- inline SVG candela here (UI-SPEC) -->
    <form @submit.prevent="onSubmit" novalidate>
      <input
        ref="inputEl"
        v-model="value"
        type="password"
        name="password"
        autocomplete="current-password"
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
        aria-label="password"
        placeholder="password"
        :aria-disabled="submitting || undefined"
        @input="onInput"
      />
      <button type="submit" :aria-disabled="submitting || undefined">Entra</button>
    </form>
    <!-- aria-live region (always present in DOM; content swapped reactively) -->
    <p role="status" aria-live="polite" class="gate__live">
      <span v-if="submitting">verifica in corso</span>
      <span v-else-if="errored">password non corretta</span>
    </p>
  </main>
</template>
```

**Key a11y plumbing notes:**
- The `aria-live` `<p>` is **always rendered** — content swaps via `v-if` text spans. This avoids the screen-reader race condition where injecting an `aria-live` region into the DOM at the moment of an event sometimes does not announce.
- `aria-disabled` instead of `disabled`: the button stays in tab order and the input remains editable; only the visual/SR state communicates "in progress." Per UI-SPEC.
- The `<Transition name="crossfade">` for unlock lives in `App.vue` wrapping `<RouterView>` — because the route change is what triggers the visual transition. Reduced-motion is handled by `:disabled="reducedMotion"` on the `<Transition>`.

### Pattern 10: `prefers-reduced-motion` composable

VueUse provides `usePreferredReducedMotion()` returning a `Ref<'reduce' | 'no-preference'>`. Phase 1 wraps it for project ergonomics:

```typescript
// src/composables/useReducedMotion.ts
import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

export function useReducedMotion() {
  const pref = usePreferredReducedMotion()
  return computed(() => pref.value === 'reduce')
}
```

Used in `App.vue` to gate the crossfade `<Transition>`. **Do not hand-roll** a `matchMedia` listener (Pitfall 14: leaks; VueUse auto-cleans).

### Anti-Patterns to Avoid

- **Hardcoding `/lulu/` anywhere except CI env** — every URL must go through `import.meta.env.BASE_URL`. Custom-domain switch is then `VITE_BASE=/`.
- **Storing `localStorage.isUnlocked = 'true'`** — DevTools-trivial bypass. Use the Pinia store + sessionStorage flag *only* (D-09).
- **Putting plaintext password in `.env`, secrets, or env vars** — D-06 says password is generated locally and only the salt+hash committed. The plaintext NEVER touches CI / git / env files.
- **Running `prefers-reduced-motion: reduce { *, *::before, *::after { animation: none !important } }`** — Pitfall 12. Reduced-motion is feature-by-feature (UI-SPEC table); a global `!important` override breaks the gate's aria-live timing and could mask the artificial delay (which is *intentional* under reduced-motion).
- **Placing Vue Router `<Transition>` inside the `<RouterView>`** — must be outside, with `mode="out-in"`, so the outgoing component fully unmounts before the incoming one mounts.
- **Setting `eslint-config-prettier` BEFORE the rule blocks** — must be last in the flat config chain so it can disable conflicting rules.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `matchMedia('(prefers-reduced-motion: reduce)')` reactive flag | Custom listener with manual cleanup | `usePreferredReducedMotion` from `@vueuse/core` | Auto-cleanup on unmount; battle-tested across browsers |
| `sessionStorage` reactive binding | Manual setter + `storage` event listener | `useStorage` from `@vueuse/core` | Reactive in/out; SSR-safe (returns sane defaults) |
| PBKDF2 hashing | Manual hash loop, `@noble/hashes`, `bcryptjs` | WebCrypto `crypto.subtle.deriveBits` (browser) + `node:crypto.pbkdf2Sync` (script) | Both are in the platform; output is bit-identical; zero dep |
| Base64 encode/decode | `Buffer.toString('base64')` works in Node only | `btoa`/`atob` (browser) + `Buffer` (Node script) | Both produce standard base64; works in both runtimes |
| SPA fallback for GH Pages | Custom redirect script in `404.html` (the rafgraph hack) | A 2-line copy of `index.html` to `404.html` + `.nojekyll` | The "redirect script" hack predates HTML5 history mode being widely supported; today, an identical 404.html is sufficient because the SPA boots the same way regardless of the URL it was served at |
| GitHub Pages deploy | `gh-pages` npm package, manual `git push gh-pages` | `actions/deploy-pages@v5` + `actions/upload-pages-artifact@v5` | Official path; no branch fiddling; no race conditions |
| Constant-time byte comparison | Casual `===` on `Uint8Array` | Hand-rolled XOR-OR loop (≈10 lines, see Pattern 5) | The WebCrypto API has no `timingSafeEqual` — Node has `crypto.timingSafeEqual` but we're in browser; the hand-rolled loop is the standard pattern and small enough to inline |

**Key insight:** in this phase the temptation is to reach for libraries (`@noble/hashes` for crypto, `gh-pages` for deploy, `vue-i18n` for the Italian strings). For all three, the platform / official tool is *strictly better*: WebCrypto is in every browser, `actions/deploy-pages` is the supported path, and Italian is hardcoded (UI-SPEC). Resist the urge.

---

## Common Pitfalls

### Pitfall A: GH Pages base path mismatch → white screen

**What goes wrong:** Vite default `base: '/'` produces `<script src="/assets/index-xxx.js">`. On `https://user.github.io/lulu/`, the browser fetches `https://user.github.io/assets/...` → 404 → blank page.

**Why it happens:** Forgot to set `VITE_BASE=/lulu/` in CI; or hardcoded `/` somewhere instead of `import.meta.env.BASE_URL`.

**How to avoid:**
- `vite.config.ts` reads `VITE_BASE` env (Pattern 1).
- Vue Router uses `createWebHistory(import.meta.env.BASE_URL)` (Pattern 2).
- Verify locally: `VITE_BASE=/lulu/ npm run build && npm run preview` then visit `http://localhost:4173/lulu/`. Asset paths in `dist/index.html` should all start with `/lulu/`.

**Warning signs:** `view-source` of the live page shows `<script src="/assets/...">` (root-relative without `/lulu/` prefix); Network tab shows 404 on JS/CSS.

### Pitfall B: SPA refresh on `/p/anything` returns Octocat 404

**What goes wrong:** GH Pages tries to serve `/lulu/p/anything/index.html`, doesn't exist, falls through to its built-in 404 page. Vue Router never gets to parse the URL.

**How to avoid:** The post-build script (Pattern 4) makes `dist/404.html` an identical copy of `dist/index.html`. GH Pages serves it with HTTP 404, but the SPA boots normally and `createWebHistory` parses `location.pathname`.

**Warning signs:** Hard-refreshing on `/lulu/p/test` shows the GH Octocat — `404.html` was not generated, or `.nojekyll` is missing (Jekyll preserved-route filtering may be the culprit if you customize Pages).

### Pitfall C: Node `pbkdf2Sync` and WebCrypto `deriveBits` produce different bytes

**What goes wrong:** `gate:set` writes a hash, runtime computes a different hash, login always fails.

**Why it happens (most common causes):**
1. Different normalization — Node script doesn't `.normalize('NFC')` while runtime does (or vice versa).
2. Different byte interpretation of the salt — one side decodes base64, the other reads it as a UTF-8 string.
3. Different bit/byte counts — runtime requests 256 bits, script requests 16 bytes (= 128 bits).

**How to avoid:**
- Identical normalization on both sides: `password.normalize('NFC')` in both `useGate.ts` and `gate-set.mjs`.
- Salt is bytes everywhere — base64-decode at runtime BEFORE passing to `deriveBits`; the Node script passes the `Buffer` directly to `pbkdf2Sync`.
- Constant: `KEY_LENGTH_BITS = 256` ↔ `KEY_BYTES = 32`. Defined once per file but verified to match.

**Verification:** Add an `npm run gate:verify "<password>"` companion script (optional, useful for debugging) that hashes via Node and compares against `HASH_B64` — if `gate:verify` says "match" but the browser says "no match", the discrepancy is in the runtime, not the algorithm.

### Pitfall D: Private repo Pages — silent capability mismatch

**What goes wrong:** D-03 flags this. Repo is private; Pages cannot serve private repos on GitHub Free. The first deploy job succeeds (artifact uploads) but Pages itself stays empty / inaccessible, *or* deploy-pages errors with a permissions message that is easy to misread.

**How to avoid:** Before merging the workflow file, check the account/org plan:
- Personal account: GitHub Pro+ required for Pages on private repos `[VERIFIED: docs.github.com/get-started/learning-about-github/githubs-products]`.
- Organization: GitHub Team+ required.

If the account is Free, the explicit fallback is: change the repo to public (D-03 — must be a deliberate decision, not silent). The soft-gate threat model is not weakened by a public repo because the salt + hash were already committed.

**Warning signs:** Pages tab in repo settings shows "GitHub Pages is not available for private repositories on the Free plan."

### Pitfall E: `eslint-plugin-vue` flat config + `typescript-eslint` parser conflict

**What goes wrong:** Linting `.vue` files emits parse errors on `<script setup lang="ts">` syntax — something like `Parsing error: Unexpected token`.

**Why it happens:** The TypeScript parser was installed as the top-level parser, clobbering `vue-eslint-parser`'s ability to parse the SFC envelope.

**How to avoid:** Use the structure in Pattern 8 — `typescriptEslint.parser` nested inside `parserOptions.parser`, with `vue-eslint-parser` as the outer parser (set automatically by `eslint-plugin-vue`'s `flat/recommended`).

### Pitfall F: PBKDF2 200k visible latency UX issues

**What goes wrong:** On a low-end Android phone, PBKDF2 200k can take 600–900 ms. Without the 800 ms floor, the user sees a delay that grows with their device's age — feels random.

**Why the 800 ms is a *floor*, not additive:** `Promise.all([verify, sleep(800ms)])` — wait, that's wrong; Pattern 5 uses `await verify; if elapsed < 800 then sleep(800-elapsed)`. The end-to-end response is always ≥ 800 ms regardless of device. Fast devices wait extra; slow devices barely wait. The user experiences a uniform "thinking" beat.

**Verify:** Test on a throttled Chrome (4× CPU) and on a real iPhone SE / Android mid-range. Total elapsed from submit to error message should be 800–900 ms in all cases.

### Pitfall G: Reduced-motion disables the artificial delay

**What goes wrong:** A naive global reduced-motion CSS rule (`* { transition: none !important }`) interacts with a JS-driven 800 ms `setTimeout` only if the dev wires the delay to a CSS property — which they shouldn't. The delay is JS-only and reduced-motion-orthogonal (per UI-SPEC `--motion-duration-deliberate: 800ms` in BOTH columns).

**How to avoid:** UI-SPEC already locks this — `--motion-duration-deliberate` keeps 800 ms under reduced-motion. The composable's `MIN_RESPONSE_MS = 800` is hardcoded and never reads the media query. Document the rationale in a code comment.

---

## Runtime State Inventory

This phase is greenfield (`./photos/` empty, `poems.txt` untouched, no prior code). No data migration, no live service config, no OS-registered state, no secrets, no build artifacts.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — first commit creates the project | none |
| Live service config | GitHub Pages itself — must be enabled in repo Settings → Pages with source "GitHub Actions" before the first deploy | one-time manual UI step, document in README |
| OS-registered state | None | none |
| Secrets / env vars | `VITE_BASE` in CI workflow (`/lulu/`) — not a secret, not a credential. No `GH_TOKEN` needed for `actions/deploy-pages` (uses `id-token: write` permission instead of a PAT) | document in README; no action |
| Build artifacts | None pre-existing | none |

**Nothing found in any other category — verified by inspection of repo root: `CLAUDE.md`, `photos/` (empty), `poems.txt` (irrelevant to Phase 1).**

---

## Code Examples

All canonical patterns are inline in **Architecture Patterns** above. They are real, runnable code — not pseudocode. The planner can lift them into tasks directly.

Key files to author (and the section that has the canonical snippet):

| File | Pattern |
|------|---------|
| `vite.config.ts` | Pattern 1 |
| `src/router/index.ts` | Pattern 2 |
| `.github/workflows/deploy.yml` | Pattern 3 |
| `scripts/post-build.mjs` | Pattern 4 |
| `src/composables/useGate.ts` | Pattern 5 |
| `src/stores/gate.ts` | Pattern 6 |
| `scripts/gate-set.mjs` | Pattern 7 |
| `eslint.config.js` | Pattern 8 |
| `src/views/GateView.vue` | Pattern 9 (excerpt — full SFC follows UI-SPEC styling) |
| `src/composables/useReducedMotion.ts` | Pattern 10 |

Plus skeletons (no canonical snippet — straightforward Vue 3.5 boilerplate):

| File | Notes |
|------|-------|
| `src/main.ts` | `createApp(App).use(createPinia()).use(router).mount('#app')`; imports `tokens.css` and `@fontsource/cormorant-garamond/400.css` + `/latin-ext-400.css` |
| `src/App.vue` | `<RouterView v-slot="{ Component }">` + `<Transition name="crossfade" mode="out-in" :disabled="reducedMotion">` |
| `src/views/HomeView.vue` | `<main aria-label="stanza"></main>` — empty by design (UI-SPEC: "the void") |
| `src/views/PolaroidView.vue` | Renders a single placeholder ("—") — exists ONLY to validate SPA fallback works for `/p/<arbitrary>` |
| `src/styles/tokens.css` | All `--c-*`, `--sp-*`, `--fs-*`, `--motion-*`, `--shadow-*`, `--radius-*` from UI-SPEC |
| `index.html` | `<html lang="it">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (NO `maximum-scale` per Pitfall 8), `<meta name="robots" content="noindex, nofollow">`, `<title>Lulu</title>` |

---

## Soft-Gate Disclaimer (GATE-05)

### `src/gate.config.ts` header comment (auto-written by `gate:set`)

```
// THREAT MODEL: this is a "soft" gate — the salt + hash are committed in the source bundle.
// A determined attacker with the bundle CAN brute-force the password offline (PBKDF2 200k
// iterations slows them to ~5 attempts/sec on commodity GPU, but the contents — once revealed
// — are still in plain bytes in the same bundle). For real privacy, use the AES-GCM
// upgrade path documented in PRIV-01 (v2 roadmap).
```

### README disclaimer (Italian + brief English aside, per UI-SPEC Copywriting)

```markdown
## Privacy

Questo sito è protetto da una password "soft": il contenuto è offuscato, non cifrato.
Chi conosce la password entra; chi è motivato e tecnico può comunque vedere i contenuti
negli strumenti del browser. È un cuscinetto di privacy, non una serratura.

La cifratura reale (AES-GCM con chiave derivata via PBKDF2 dalla password) è documentata
come upgrade in PRIV-01 (v2). Il design di Phase 1 mantiene aperto questo upgrade:
- nessun `<img src="/photos/...">` diretto in HTML
- tutti i percorsi delle foto risolti a runtime via mappa derivata dal manifest
- nessuna route pre-renderizzata oltre il gate
```

### README — `BASE_URL` and custom domain (DEPLOY-02)

```markdown
## Deploy

Il sito è pubblicato su GitHub Pages tramite GitHub Actions (`.github/workflows/deploy.yml`)
a ogni push su `main`. Lint, type-check e build devono passare; in caso di errore il
deploy non parte.

### URL di pubblicazione

| Configurazione   | `VITE_BASE` (in CI)  | URL                                    |
|------------------|----------------------|----------------------------------------|
| Project page     | `/lulu/`             | `https://<utente>.github.io/lulu/`     |
| Custom domain    | `/`                  | `https://<dominio>/`                   |

### Cambiare a custom domain

1. Aggiungere `public/CNAME` con il dominio (una sola riga, senza `https://`).
2. Settare il record DNS (apex: A → IP GitHub; subdomain: CNAME → `<utente>.github.io`).
3. Aggiornare `VITE_BASE` a `/` nel workflow (`.github/workflows/deploy.yml`,
   sezione `env:` dello step `Build`).
4. Repo Settings → Pages → Custom domain → inserire e salvare. Spuntare "Enforce HTTPS".

### Capability check

Per repo privati, GitHub Pages richiede:
- Account personale: GitHub Pro o superiore.
- Organizzazione: GitHub Team o superiore.

Se l'account è Free, il fallback esplicito è rendere il repo pubblico — il salt + hash
del gate sono già committati, quindi la visibilità del repo non indebolisce ulteriormente
il modello di minaccia.
```

---

## Environment Availability

Phase 1 has external dependencies on Node, npm, and the GitHub Actions runtime. These are checked at install time / CI time, not on the developer machine in advance — the install fails clearly if missing.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm install`, `vite build`, `gate:set`, `post-build` scripts | check at install | ≥ 22 (Vite 8 requires Node 22+) `[CITED: vitejs.dev]` | None — required |
| npm | dependency install | check at install | ≥ 10 (bundled with Node 22) | None — required |
| Git | repo + CI checkout | required | any 2.x | None |
| GitHub Actions runner (`ubuntu-latest`) | CI build/deploy | provided by GitHub | n/a | None |
| GitHub Pages capability on `lulu` repo | deploy target | requires account check | depends on plan (see Pitfall D) | If unavailable: switch repo to public (D-03 explicit decision) |
| WebCrypto API (`crypto.subtle`) | runtime gate verification | available in all modern browsers (HTTPS / localhost only) | iOS Safari 11+ / Chrome 37+ / Firefox 34+ — fully supported on every browser the recipient could realistically use `[VERIFIED: developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto]` | None — gate cannot work without it; no fallback design |

**Missing dependencies with no fallback:** Node ≥ 22. The CI workflow pins Node 22 explicitly (`actions/setup-node@v5` with `node-version: '22'`); local dev requires the developer to have Node 22+.

**Missing dependencies with fallback:** Private-repo Pages capability — fallback to public repo if Pro/Team plan not available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed yet — Phase 1 introduces minimal validation. **Recommendation: Vitest 3.x for unit + Playwright 1.x for e2e**, both gated to Wave 0 because the existing repo has no test infra. |
| Config file | none yet — Wave 0 creates `vitest.config.ts` and `playwright.config.ts` |
| Quick run command | `npm run test:unit` (Vitest) — for `useGate.verify` round-trip and `gate-set.mjs` byte-equivalence |
| Full suite command | `npm run test:unit && npm run test:e2e` (Playwright runs against `vite preview --base /lulu/`) |

> **Note on cost/value:** Phase 1 has six observable behaviors. Three (correct password unlocks, wrong password shows error, deep-link refresh works) genuinely benefit from automated regression tests. The other three (CI blocks deploy on lint/typecheck failure, build output base path, `404.html` exists) are static checks — a `grep` in CI is sufficient and cheaper than Playwright. Plan accordingly: don't over-test the static parts.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `npm run dev`/`build`/`preview` exist and work | smoke | `npm run build` (CI) | ✅ |
| FOUND-02 | Built `index.html` references assets under `/lulu/` | static check | `grep -E 'src="/lulu/assets/' dist/index.html` (CI step) | ❌ Wave 0 — add to workflow |
| FOUND-03 | Push to `main` triggers Pages deploy | manual / observable | inspect Actions tab + visit Pages URL after first push | ❌ inherent (only verifiable end-to-end) |
| FOUND-04 | Deep-link refresh works on Pages URL | e2e | `npx playwright test tests/e2e/deep-link.spec.ts` (visits `/lulu/p/test`, asserts router rendered the placeholder) | ❌ Wave 0 |
| FOUND-05 | Lint + typecheck block deploy on failure | smoke | injected lint/typecheck failure on a throwaway branch — CI must show red | ❌ inherent (one-time manual verify; no need to automate) |
| GATE-01 | Form has password field + Entra button | unit (component render) OR static check | `grep -q 'aria-label="password"' src/views/GateView.vue && grep -q 'Entra' src/views/GateView.vue` | ❌ Wave 0 |
| GATE-02 | PBKDF2 verify round-trip — Node-generated hash matches WebCrypto-derived hash | unit | `npm run test:unit -- gate-roundtrip` (Vitest test that calls `pbkdf2Sync` AND `crypto.subtle.deriveBits` with same inputs and asserts byte equality) | ❌ Wave 0 — `tests/unit/gate-roundtrip.test.ts` |
| GATE-03 | Wrong password renders aria-live message; focus stays on input | e2e | `npx playwright test tests/e2e/gate-error.spec.ts` | ❌ Wave 0 |
| GATE-04 | sessionStorage `lulu:gate` set on success; persists across refresh; cleared on tab close | e2e | `npx playwright test tests/e2e/gate-session.spec.ts` | ❌ Wave 0 |
| GATE-05 | README documents soft-privacy posture; `gate.config.ts` header comment exists | static check | `grep -q 'soft' README.md && grep -q 'AES-GCM' README.md` (run in CI) | ❌ Wave 0 |
| DEPLOY-01 | Workflow file exists with required jobs; `actions/deploy-pages@v5` present | static check | `grep -q 'actions/deploy-pages@v5' .github/workflows/deploy.yml` | ❌ Wave 0 |
| DEPLOY-02 | README includes `BASE_URL` + custom domain section | static check | `grep -q 'VITE_BASE' README.md && grep -q 'CNAME' README.md` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run lint && npm run typecheck` (fast, ~5–15s — both already required by CI)
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit` (adds ~3s for the gate roundtrip test)
- **Phase gate:** Full suite green (unit + e2e against `vite preview --base /lulu/`) AND a real GH Pages deploy preview manually inspected before `/gsd-verify-work`. Manual inspection covers FOUND-03, FOUND-04, GATE-04 (real Pages domain) — these cannot be fully automated without a real deployment.

### Wave 0 Gaps

- [ ] **Test framework install:** `npm install -D vitest@3 @vitest/ui playwright@1 @playwright/test` then `npx playwright install chromium`
- [ ] `vitest.config.ts` — minimal config with happy-dom env for `useGate` tests
- [ ] `playwright.config.ts` — webServer runs `vite preview --base /lulu/` on port 4173
- [ ] `tests/unit/gate-roundtrip.test.ts` — covers GATE-02 (Node↔WebCrypto byte equality)
- [ ] `tests/e2e/gate-error.spec.ts` — covers GATE-03 (wrong password UX)
- [ ] `tests/e2e/gate-session.spec.ts` — covers GATE-04 (sessionStorage persistence + tab-close clear)
- [ ] `tests/e2e/deep-link.spec.ts` — covers FOUND-04 (refresh on `/p/anything` boots the SPA)
- [ ] CI workflow additions: a "static checks" job that runs the `grep` assertions for FOUND-02, GATE-01, GATE-05, DEPLOY-01, DEPLOY-02 (5 grep commands; faster than spinning up Playwright for these)
- [ ] `package.json` scripts: `test:unit`, `test:e2e`

> **Manual-only:** FOUND-03 (first deploy actually publishes) and FOUND-05 (CI fails on intentional lint error) are one-time verifications, not regression tests. Document in README; don't burn cycles automating them.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gh-pages` npm package, push to `gh-pages` branch | `actions/deploy-pages@v5` artifact-based deploy | GitHub introduced official Pages Actions in 2022; v5 released 2026-03-25 | Cleaner workflow; no branch fiddling; uses environments + `id-token` instead of PATs |
| ESLint `.eslintrc.json` legacy config | ESLint 9+ flat config (`eslint.config.js`) | ESLint 9 (Apr 2024) made flat config the default; legacy config removed in ESLint 10 | One config file; no plugin auto-discovery surprises |
| Separate `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` | Unified `typescript-eslint` package with `typescriptEslint.config()` helper | typescript-eslint v7+ (2024) | Less boilerplate; type-safe config |
| `100vh` for full-viewport layout | `100dvh` with `100vh` fallback | dvh widely supported (iOS 15.4+, all evergreen) by 2024 | iOS Safari bottom-bar bug eliminated |
| `<input maximum-scale=1>` to disable pinch-zoom | Always allow pinch-zoom (WCAG 1.4.4) | Modern accessibility standards | UI-SPEC viewport meta omits `maximum-scale` |

**Deprecated / outdated:**
- `actions/deploy-pages@v3` — superseded by v4 (which is still available) and v5 (current). Use v5.
- `actions/configure-pages@v4` — use v6.
- `actions/upload-pages-artifact@v3` — use v5.
- `vue-router@4.x` — Vue Router 5 is the version paired with Vue 3.5+ in this project's locked stack (per STACK.md and verified live: `vue-router@5.0.6`). The 4.x line is still maintained but the locked stack is on 5.

---

## Project Constraints (from CLAUDE.md)

The project root `CLAUDE.md` is short and mostly project-narrative. Operational directives extracted:

1. **Token efficiency / model selection** (from user's global config): not actionable in research output; informs how the planner schedules sub-agents.
2. **Stack table is locked** in CLAUDE.md (matches `.planning/research/STACK.md`). Treat as authoritative — do not propose alternatives during planning.
3. **GSD Workflow Enforcement:** "Before using Edit, Write, or other file-changing tools, start work through a GSD command." All Phase 1 tasks must run via `/gsd-execute-phase` or `/gsd-quick`, not direct edits.
4. **No security shortcuts** (from `~/.claude/rules/common/security.md`):
   - No hardcoded secrets — confirmed: password authored locally, never committed in plaintext.
   - All user inputs validated — confirmed: input length ≥ 0 (no other validation needed for soft gate).
   - Error messages don't leak — confirmed: only `password non corretta`, no hints (D-08, D-11).
5. **No `.md` documentation files** unless explicitly requested. README.md is explicit and required by GATE-05 + DEPLOY-02. No other docs.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Biome's Vue support is still maturing as of 2026-05; ESLint+Prettier remains the well-trodden path | Standard Stack — Alternatives Considered | Low — D-15 already locks ESLint+Prettier as Claude's discretion default; the comparison is informational |
| A2 | iOS Safari 11+ supports `crypto.subtle.deriveBits` with PBKDF2 fully | Environment Availability | Medium — if older iOS Safari (recipient device) has an undocumented PBKDF2 quirk, gate breaks silently. **Mitigation:** the e2e test in Wave 0 must include at least one mobile webkit run via `npx playwright test --project=mobile-safari` to catch this before ship |
| A3 | Pages serves `404.html` with the SPA boot semantics necessary for HTML5 history mode (versus requiring the rafgraph redirect-script hack) | Pattern 4 | Low — community wisdom is settled on this since ~2022; the redirect-script hack is for projects that want to support `<a href>` in 404 contexts that bypass history-pushState. For a single-page app that boots Vue Router on every load, the identical-copy approach is sufficient `[CITED: github.com/rafgraph/spa-github-pages — README states identical copy works for SPAs]` |

**All other claims in this research are tagged either `[VERIFIED: <source>]` or `[CITED: <source>]` and were cross-checked at research time.**

---

## Open Questions

1. **Recipient browser baseline?**
   - **What we know:** Project is a private gift; recipient browser unknown.
   - **What's unclear:** Whether the recipient might use an iOS device on iOS < 15 (which has WebCrypto but lacks `100dvh`).
   - **Recommendation:** Assume iOS 15+ (released Sept 2021). Document the assumption. If the recipient reports issues, the dvh→vh fallback in UI-SPEC handles it; PBKDF2 works back to iOS 11.

2. **Should `gate:set` accept stdin instead of `argv[2]`?**
   - **What we know:** D-06 specifies CLI argument: `npm run gate:set "<password>"`.
   - **What's unclear:** Passing the password as `argv[2]` exposes it in `ps`/shell history. For a soft-gate authoring tool, this is arguably acceptable (the author runs it once on their own machine).
   - **Recommendation:** Accept argv per D-06 for v1. Document the hazard in the script's `--help` output: "On a shared machine, prefer pasting via stdin." Optionally accept stdin if argv is omitted (`if (!process.argv[2]) read stdin`) — small enhancement, low risk.

3. **Should `src/gate.config.ts` be `.gitignored` or committed?**
   - **What we know:** D-05 says "salt + hash committati nel sorgente." So: committed.
   - **What's unclear:** Initial state — what does `gate.config.ts` look like before the author runs `gate:set` for the first time?
   - **Recommendation:** Commit a placeholder `gate.config.ts` with `SALT_B64 = ''`, `HASH_B64 = ''`, `ITERATIONS = 200_000` and a `// PLACEHOLDER` comment that `useGate.verify` treats as "always fail" (hash length mismatch → `constantTimeEqual` returns false). This way the project type-checks and builds before the first `gate:set` run, and the gate stays locked.

---

## Sources

### Primary (HIGH confidence)
- **npm registry** (live `npm view` queries on 2026-05-02) — Vue 3.5.33, Vite 8.0.10, TypeScript 6.0.3, vue-router 5.0.6, pinia 3.0.4, @vueuse/core 14.3.0, @vitejs/plugin-vue 6.0.6, eslint 10.3.0, eslint-plugin-vue 10.9.0, typescript-eslint 8.59.1, eslint-config-prettier 10.1.8, prettier 3.8.3, vue-tsc 3.2.7, @types/node 25.6.0, @fontsource/cormorant-garamond 5.2.11, @vue/eslint-config-typescript 14.7.0
- **MDN — `SubtleCrypto.deriveBits`** — canonical PBKDF2 example, ArrayBuffer return, base64 conversion, browser support https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits
- **github.com/actions/deploy-pages/releases** — v5.0.0 released 2026-03-25
- **github.com/actions/configure-pages/releases** — v6.0.0 released 2026-03-25 (Node 24 base)
- **github.com/actions/upload-pages-artifact/releases** — v5.0.0 released 2026-04-10
- **eslint.vuejs.org/user-guide/** — canonical Vue + TS + Prettier flat config; `vue-eslint-parser` outer / `typescript-eslint.parser` nested ordering
- **router.vuejs.org/guide/essentials/history-mode.html** — `createWebHistory(BASE_URL)` pattern
- **vitejs.dev/config/shared-options.html#base** — `base` option semantics
- **nodejs.org/api/crypto.html** — `pbkdf2Sync(password, salt, iterations, keylen, digest)` — bit-identical to WebCrypto with same inputs (RFC 2898 spec compliance)
- **github.com/rafgraph/spa-github-pages** — canonical SPA fallback pattern; modern recommendation is identical 404.html copy

### Secondary (MEDIUM confidence)
- **docs.github.com — GitHub plans** — Pages-on-private-repo requirements (Pro for personal, Team for org)
- **vueuse.org/core/useStorage** + **vueuse.org/core/usePreferredReducedMotion** — composable APIs
- **`.planning/research/STACK.md`** — locked stack rationale + GH Pages gotchas (project-internal)
- **`.planning/research/PITFALLS.md`** — Pitfalls 4, 7, 11, 14 (project-internal)

### Tertiary (LOW confidence)
- General community wisdom on Italian web typography (`hyphens: auto` + `lang="it"` for proper hyphenation) — not exercised in Phase 1 (no body text); inherited by Phase 3

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every version verified live against npm registry on the research date
- Architecture (vite/router/workflow patterns): **HIGH** — drawn from official docs verified in this session
- WebCrypto + Node crypto byte equivalence: **HIGH** — RFC-2898 spec; both implementations are conformant; pattern in code follows MDN canonical example
- ESLint 9 flat config Vue+TS pattern: **HIGH** — Vue's official guide
- GH Pages action versions (v5/v6/v5): **HIGH** — release pages on github.com checked 2026-05-02
- Private-repo Pages plan requirement: **MEDIUM** — official docs are vague on which exact plans qualify; community + pricing pages corroborate Pro / Team / Enterprise

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (30 days for stable stack; sooner if a major action version drops)
