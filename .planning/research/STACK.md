# Stack Research

**Domain:** Static, design-heavy, animation-rich, accessibility-first SPA on GitHub Pages (interactive digital poetry gallery)
**Researched:** 2026-05-02
**Confidence:** HIGH (versions verified live against the npm registry on the research date; framework/library tradeoffs verified against official docs and current ecosystem comparisons)

## TL;DR

**Recommended:** Vue 3.5 + Vite 8 + TypeScript 6 + GSAP 3.15 (now 100% free, all plugins included) + Matter.js 0.20 for the swinging strings + UnoCSS 66 for atomic styling + `vite-imagetools` for the photo pipeline + GitHub Actions official `actions/deploy-pages@v4`.

The user's proposed Vue 3 + Vite + TS stack is **validated**. Vue 3.5's reactivity (signals-style refs, `useTemplateRef`) is an excellent fit for cursor-driven canvas effects and small interactive scenes; Vite 8 ships fast, and TS gives the manifest JSON a typed shape. We do **not** recommend switching to Svelte 5, Astro, or Solid — see "Alternatives Considered" for why.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vue** | `^3.5.33` | UI framework | User preference; SFCs are ideal for a small set of well-defined components (Polaroid, CandleLayer, PoemBack, Gate); 3.5 ships `useTemplateRef` and improved reactivity perf, both helpful for cursor/RAF code. Composition API + TS gives a clean manifest-driven design. |
| **Vite** | `^8.0.10` | Build tool / dev server | De facto standard for Vue. Native ESM dev, sub-second HMR. Vite 8 has stable Environment API and improved asset handling. Trivially compatible with GitHub Pages via the `base` option. |
| **TypeScript** | `^6.0.3` | Type system | Manifest JSON (`photos[] ↔ poems[]`) wants a typed schema; types prevent broken pairings at build time. TS 6 is current latest stable. Use `verbatimModuleSyntax` and `moduleResolution: "bundler"`. |
| **GSAP** | `^3.15.0` | Animation engine for polaroid flip + swing tween + candle reveal mask | **As of April 30, 2025, Webflow made GSAP 100% free for everyone, including all formerly Club-only plugins (SplitText, MorphSVG, Flip, etc.) — even for commercial use**. Best-in-class timeline control, predictable easings, mature `prefers-reduced-motion` integration patterns, robust on iOS Safari. The "5x larger than Motion One" criticism no longer applies once you tree-shake (`gsap/Flip`, `gsap/Observer` only). |
| **Matter.js** | `^0.20.0` | 2D physics for swinging polaroid strings | The only mature, battle-tested 2D physics engine in JS. Constraints + composites model a string-with-hanging-card naturally. Stable API; we use it headlessly (no canvas renderer) and read body positions into Vue refs. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@vueuse/core** | `^14.3.0` | Composables (`useMouse`, `usePointer`, `useEventListener`, `useMediaQuery`, `usePreferredReducedMotion`, `useStorage`) | Always. Replaces dozens of small custom hooks. `usePreferredReducedMotion` is the canonical way to honor the OS setting. |
| **vue-router** | `^5.0.6` | Client routing (Gate → Gallery → Polaroid detail) | Use the `createWebHashHistory` mode on GitHub Pages to sidestep the SPA-fallback dance entirely (see "GitHub Pages gotchas"). Router 5.x targets Vue 3.5+. |
| **pinia** | `^3.0.4` | Tiny shared state (gate unlocked, current zoom level, selected polaroid) | Optional but cheap. Use a single store; do not over-architect. |
| **vite-imagetools** | `^10.0.0` | Build-time image transforms (responsive `srcset`, AVIF/WebP, blur placeholders) | Always for this project. Lets you write `import poem01 from './photos/01.jpg?w=480;960;1920&format=avif;webp;jpg&as=picture'` and get a typed `<picture>` payload. Wraps `sharp` under the hood. |
| **sharp** | `^0.34.5` | Underlying image transform engine | Transitive via `vite-imagetools`. Pin in `package.json` so CI cache stays consistent. |
| **@noble/hashes** | `^2.2.0` | SHA-256 / Argon2-light for the soft password gate | Audited, zero-dep, 100% TS, browser-friendly. Hash a project-specific salt + entered password, compare to a constant from `import.meta.env`. **Note: this is "soft" gating only — the manifest and photos are still public via DevTools/network tab. See PITFALLS.** |
| **panzoom** | `^9.4.4` (anv11/panzoom) | Pinch-zoom + pan for accessible image zoom | Tiny, no-dependency, supports touch + wheel + keyboard, respects `transform-origin`. Use over `medium-zoom` because medium-zoom does not handle pinch on mobile well, and we need true a11y zoom on both image and poem text. |

> Optional fallback for the candle effect: pure CSS `radial-gradient` mask + `mix-blend-mode: multiply` over a dark layer, position driven by CSS custom properties updated in a single `requestAnimationFrame` loop. **Try this first** — it is GPU-accelerated, no canvas needed, and is the path to 60fps on low-end mobile.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **`@vitejs/plugin-vue`** `^6.0.6` | Vue SFC support in Vite 8 | Required peer for the chosen Vite/Vue versions. |
| **vue-tsc** `latest` | Type-check `.vue` files in CI | Run as `vue-tsc --noEmit` in a separate `typecheck` GitHub Actions step. |
| **UnoCSS** `^66.6.8` | Atomic CSS engine (Tailwind-compatible presets) | Lighter and faster than Tailwind v4 in dev; great Vue 3 integration; avoids Tailwind v4's evolving Oxide engine quirks. Use `presetWind4` + `presetTypography`. **Alternative below if you prefer Tailwind.** |
| **Prettier** + **ESLint flat config** | Formatting + linting | Use `eslint-plugin-vue` with `vue-eslint-parser` and `@typescript-eslint`. Run on pre-commit. |
| **Vitest** | Unit tests for the manifest loader, gate hash, and pure helpers | Animation/visual code does not need unit tests; keep it for logic only. |
| **Playwright** *(optional)* | E2E smoke test: gate → enter → see polaroids → click → flip → zoom | Skip until milestone 2 unless you want regression safety. |

## Installation

```bash
# Scaffold
npm create vite@latest lulu -- --template vue-ts
cd lulu

# Core (already covered by template, but pin versions explicitly)
npm install vue@^3.5.33 vue-router@^5.0.6 pinia@^3.0.4

# Animation + physics
npm install gsap@^3.15.0 matter-js@^0.20.0
npm install -D @types/matter-js

# Composables
npm install @vueuse/core@^14.3.0

# Image pipeline
npm install -D vite-imagetools@^10.0.0 sharp@^0.34.5

# Soft auth
npm install @noble/hashes@^2.2.0

# A11y zoom
npm install panzoom@^9.4.4

# Styling
npm install -D unocss@^66.6.8

# Dev / quality
npm install -D typescript@^6.0.3 vue-tsc @vitejs/plugin-vue@^6.0.6 \
  vitest @vue/test-utils prettier eslint eslint-plugin-vue \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### Minimum `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { imagetools } from 'vite-imagetools'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  // Repo lives at github.com/<user>/lulu  → Pages serves at /lulu/
  // If using a custom domain via CNAME, set base: '/' instead.
  base: process.env.VITE_BASE ?? '/lulu/',
  plugins: [vue(), UnoCSS(), imagetools()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
```

### Minimum GitHub Actions deploy workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      # SPA fallback so deep links survive a refresh
      - run: cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vue 3 + Vite | **Svelte 5 + SvelteKit (static adapter)** | If you want the absolute smallest JS bundle and signals-everywhere ergonomics. Svelte 5 runes are excellent. Skip only because the user already chose Vue and the project is small — switching frameworks for a 13–16-card site is not worth retraining cost. |
| Vue 3 + Vite | **Astro 6** with a Vue island for the gallery | If 80% of the site were static content. Here the *whole* page is interactive (cursor candle, physics, flip), so Astro's island model adds complexity without payoff. |
| Vue 3 + Vite | **SolidJS 1.9 + Vite** | If you wanted the lowest possible reactivity overhead for a per-frame mouse-driven scene. The CSS-mask path makes this irrelevant. |
| Vue 3 + Vite | **Vanilla TS + Vite** | If you genuinely have <5 components and zero routing. Adds friction once the manifest/gate/router exist, so not worth it here. |
| GSAP | **Motion One (`motion`)** | If bundle size were the dominant constraint. Motion is ~5x smaller than full GSAP, but tree-shaken GSAP for this project is fine, and GSAP's timeline + Flip plugin are materially better for the polaroid card-flip + reordering. |
| GSAP | **anime.js v4 (`animejs@^4.4.1`)** | If you wanted MIT licensing and a smaller surface. v4 is excellent and a legitimate choice. We pick GSAP because Flip + Observer + ScrollTrigger are all now free and remove a lot of code from this project. |
| Matter.js | **Hand-rolled verlet** | If you only ever have ~16 polaroids. A 30-line verlet integrator is enough for two-point string + card. Matter is recommended because it gives you `Constraint`, `Composite`, sleeping, and damping for free, and the runtime cost is negligible at this scale. Choose verlet if you want zero dependencies and like the puzzle. |
| UnoCSS | **Tailwind CSS v4** (`tailwindcss@^4.2.4`) | If your team is already on Tailwind. Both are great; UnoCSS is faster in dev and slightly more flexible (custom rules without plugins). |
| UnoCSS | **Vanilla CSS + CSS Modules** | If you want zero build-time CSS magic. Defensible for a 13-card site. The downside is repeating tokens (colors, spacing, font scale) — a small `tokens.css` + `:root` custom properties solves it. |
| `panzoom` | **`medium-zoom`** | For *image-only*, no-pan, click-to-expand UX. Insufficient for poem text + true pinch-zoom. |
| @noble/hashes (soft gate) | **WebCrypto `crypto.subtle.digest('SHA-256', …)`** | Zero-dep alternative; already in the platform. Use this for SHA-256 only. We list `@noble/hashes` for ergonomics + future Argon2 if you ever want stronger KDF. **Neither is real auth.** |
| @noble/hashes (soft gate) | **age-encryption (`age-encryption.org/v1`)** in the browser | If you ever want to upgrade from "soft gate" to "the photos and poems are AES-GCM encrypted in the bundle and the password is the decryption key". This *is* real privacy: nothing in DevTools without the key. Library: `age-encryption` npm package. Out of scope for the soft-gate milestone but worth knowing. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Vue 2 / Options API only** | EOL since 2023, missing Composition API ergonomics, no `<script setup>`. | Vue 3.5 with `<script setup lang="ts">`. |
| **Webpack / CRA / Vue CLI** | Slow, deprecated, no first-class Vue 3.5 / TS 6 support. | Vite 8. |
| **`gh-pages` npm package + manual `dist/` push** | Outdated; loses type-checking step, no preview, race conditions on large repos. | `actions/deploy-pages@v4` with the official artifact upload. |
| **`createWebHistory()` (HTML5 mode) on Pages without a custom 404.html** | Deep links 404 on refresh; the 404.html-redirect hack is fiddly. | `createWebHashHistory()` *or* HTML5 mode + the `cp index.html 404.html` step shown above. |
| **`bcryptjs` for soft gate** | Bigger and slower than the alternatives, no real benefit at this threat model. | `@noble/hashes/sha256` or `crypto.subtle`. |
| **Framer Motion** | React-only. | GSAP (Vue-friendly via the bare API). |
| **Inline `<img src>` for photos with no transform** | Ships full-resolution to phones, kills LCP, no AVIF. | `vite-imagetools` `?as=picture` with `srcset`. |
| **Custom RAF loops written without throttling** | Janks the candle effect on low-end mobile. | One global RAF, write to CSS custom properties (`--candle-x`, `--candle-y`), let GPU compose. |
| **`window.matchMedia('prefers-reduced-motion')` polled in components** | Memory leaks, race conditions. | `@vueuse/core` `usePreferredReducedMotion()`. |
| **Massive single-bundle photos pre-loaded in `index.html`** | Defeats the lazy-load goal stated in PROJECT.md. | `loading="lazy"`, `fetchpriority="low"` on off-screen polaroids; `decoding="async"`. |

## Stack Patterns by Variant

**If you ever want stronger gating (so DevTools cannot read the poems):**
- Switch the gate from "compare hashes" to "AES-GCM-decrypt the manifest with PBKDF2(password, salt, 200k iterations) as key" (WebCrypto only — zero dep).
- Encrypt photos and poems at build time with a small Node script; ship ciphertext.
- Library: `age-encryption` npm package, or write ~40 lines of WebCrypto.

**If the gallery grows beyond ~50 polaroids:**
- Add `IntersectionObserver`-based virtualization (only physics-simulate on-screen + 1 viewport buffer).
- Switch image format default to AVIF only (drop WebP fallback) — browser support is ≥97%.

**If you want offline / installable:**
- Add `vite-plugin-pwa` later. Not needed for v1.
- Cache the manifest, photos, and poem text; the candle/physics is all client-side anyway.

**If you want only vanilla CSS (no UnoCSS/Tailwind):**
- Use `:root` custom properties for the night palette and a single `tokens.css`.
- CSS Modules per component (`<style module>` in Vue SFC).
- Costs you nothing in performance, costs you a bit in ergonomics (manual repeat of utility classes).

## GitHub Pages Gotchas (read this twice)

1. **`base` option must match the deploy URL.** If repo is `github.com/<user>/lulu` and you do not have a custom domain, `base: '/lulu/'`. With a custom domain (`CNAME` file in `dist/`), `base: '/'`. Wrong base = blank page with 404s on every asset.
2. **SPA deep-link refresh = 404 by default.** Two fixes:
   - **Recommended:** copy `dist/index.html` → `dist/404.html` in the build step (one line in the workflow). GitHub Pages serves `404.html` for any unknown path, so the SPA bootstraps and the router takes over.
   - Or use `createWebHashHistory()` and accept `#/polaroid/03` URLs. Simpler, uglier.
3. **Custom domain:** put a `CNAME` file in `public/` containing exactly `your-domain.tld` (no protocol). Vite copies `public/` verbatim to `dist/`, GitHub Pages reads the CNAME on deploy.
4. **HTTPS is automatic** for `*.github.io` and (after DNS validation) custom domains. Never serve mixed content.
5. **Repo must be public** for free Pages. Private repos need GitHub Pro/Team.
6. **Do not use `permissions: write-all`** in the workflow. The three-line `pages: write / id-token: write / contents: read` is the minimum and what GitHub recommends.
7. **Cache headers are immutable for hashed Vite assets** (good) but `index.html` is cached for ~10 minutes by GitHub's CDN — if a user has the page open during deploy, they keep the old shell. Acceptable for a personal site.
8. **No serverless functions, no env-injection at request time.** Anything in `import.meta.env.VITE_*` is baked into the bundle and visible. **The "password hash" is in the JS.** That is fine for this threat model; do not pretend otherwise.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vue@^3.5.33` | `@vitejs/plugin-vue@^6.0.6`, `vue-router@^5.0.6`, `pinia@^3.0.4`, `@vueuse/core@^14.3.0` | All on the modern Vue 3.5+ track. |
| `vite@^8.0.10` | Node ≥ 22, `@vitejs/plugin-vue@^6` | Vite 8 dropped Node 20 support; CI must pin Node 22. |
| `typescript@^6.0.3` | `vue-tsc` (latest), `@typescript-eslint@^8+` | TS 6 requires `moduleResolution: "bundler"` for the cleanest Vite story. |
| `gsap@^3.15.0` | Any framework | All plugins (Flip, Observer, SplitText, MorphSVG) free as of 2025-04-30. Tree-shake by importing from `gsap/Flip` etc. |
| `matter-js@^0.20.0` | `@types/matter-js` (community-maintained) | API stable since 0.18. Run headless: do *not* import `Matter.Render`. |
| `unocss@^66.6.8` | `vite@^8`, `vue@^3.5` | Use `presetWind4` for Tailwind-v4-shaped utility names. |
| `vite-imagetools@^10.0.0` | `vite@^8`, `sharp@^0.34` | Pin `sharp` to avoid CI churn. |
| `panzoom@^9.4.4` | Any framework | Wrap in a Vue composable; call `panzoom(el)` in `onMounted`, dispose in `onBeforeUnmount`. |
| `@noble/hashes@^2.2.0` | Any framework | Pure ESM. Import as `import { sha256 } from '@noble/hashes/sha2'`. |

## Confidence by Recommendation

| Item | Confidence | Why |
|------|------------|-----|
| Vue 3 + Vite + TS validated | **HIGH** | Versions checked live against npm registry on 2026-05-02; this is the standard modern Vue stack. |
| Vite 8 + Node 22 + base path / 404 trick on GitHub Pages | **HIGH** | Verified against official GitHub `actions/deploy-pages@v4` patterns and current community guidance. |
| GSAP free-for-all (incl. plugins) | **HIGH** | Verified via Webflow announcement (2025-04-30), GSAP pricing page, CSS-Tricks coverage. Sources cited below. |
| Matter.js for swinging strings | **HIGH** | De-facto standard 2D physics for browsers; API has not broken in years. |
| UnoCSS over Tailwind v4 | **MEDIUM** | Both work; this is a preference call. Tailwind v4 is fine if you prefer it. |
| `panzoom` over `medium-zoom` for a11y | **MEDIUM** | Verified API supports pinch + wheel + keyboard; `medium-zoom` is image-click-only. |
| `@noble/hashes` over `bcryptjs` | **HIGH** | Auditing track record + zero-dep + works in browser; `bcryptjs` is overkill for this threat model. |
| `vite-imagetools` for asset pipeline | **HIGH** | Standard tool for build-time image transforms in Vite; pairs naturally with `<picture>`. |
| Hash routing as a fallback | **HIGH** | Universally works on GitHub Pages without any 404 hack. |

## Sources

- npm registry — live `npm view <pkg> version` on 2026-05-02 for: vue, vite, typescript, gsap, animejs, motion, matter-js, vue-router, pinia, @vueuse/core, vite-imagetools, sharp, tailwindcss, unocss, svelte, astro, solid-js, @sveltejs/kit, @noble/hashes, panzoom, medium-zoom, @vitejs/plugin-vue. Confidence: HIGH (authoritative).
- [Webflow makes GSAP 100% free — Webflow Blog](https://webflow.com/blog/gsap-becomes-free) — Confirms full free access to all plugins, commercial use, post-acquisition. Confidence: HIGH.
- [GSAP Pricing](https://gsap.com/pricing/) — Confirms current free-for-all licensing. Confidence: HIGH.
- [GSAP Is Now Completely Free, Even for Commercial Use! — CSS-Tricks](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/) — Confidence: MEDIUM (corroborates).
- [GSAP vs Motion comparison — Motion docs](https://motion.dev/docs/gsap-vs-motion) — Bundle-size and feature comparison. Confidence: MEDIUM (vendor source, but technically accurate).
- [Handling 404 Error in SPA Deployed on GitHub Pages — DEV](https://dev.to/lico/handling-404-error-in-spa-deployed-on-github-pages-246p) — `404.html` SPA fallback pattern. Confidence: MEDIUM (community pattern; widely used).
- [vite-plugin-github-pages-spa](https://github.com/sctg-development/vite-plugin-github-pages-spa) — Reference for Pages-specific Vite plugin. Confidence: MEDIUM.
- [Best React animation libraries for 2026 — LogRocket](https://blog.logrocket.com/best-react-animation-libraries/) — Cross-checks GSAP/Motion/anime.js positioning. Confidence: LOW (third-party round-up, used as corroboration only).

---
*Stack research for: interactive accessible static SPA on GitHub Pages*
*Researched: 2026-05-02*
