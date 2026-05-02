# Project Research Summary

**Project:** Lulu — Polaroid & Poesie
**Domain:** Animation-rich, accessibility-first, password-gated personal microsite (static SPA on GitHub Pages)
**Researched:** 2026-05-02
**Confidence:** HIGH

## Executive Summary

Lulu is a single-room digital diorama — a private gift, not a portfolio: ~13–16 polaroids hanging on strings inside a dark "soffitta notturna," revealed by a warm candle that follows the cursor (or finger), opening into a flip-card reading view of an Italian poem. The bar for adding any feature is "does this make the room feel more alive?" and most generic SPA reflexes (audio, analytics, sharing, PWA, WebGL) are anti-features here. The whole product is mood, typography, and four interactions — gate, reveal, flip, zoom — done well.

The research converges on a **locked Vue 3.5 + Vite 8 + TypeScript 6** stack, deployed via the official `actions/deploy-pages@v4` workflow with the `404.html` SPA-fallback trick and a `base` switch for custom-domain vs project-page hosting. The candle reveal is a single fixed-overlay CSS radial-gradient mask driven by **one global `requestAnimationFrame` loop** writing CSS custom properties (no Vue reactivity in the hot path). String swing is intentionally **not** Matter.js — at 13–16 elements the right answer is staggered CSS `@keyframes` for idle sway, with an optional damped-spring impulse on pointer proximity if more life is wanted; both survive `visibilitychange` because they are CSS-driven or RAF-driven with `dt` clamping. The polaroid open uses GSAP Flip on a real `/p/:slug` route with `<keep-alive>` over the room — the route is the source of truth, the FLIP technique animates the spatial transition.

The dominant risks are not technical novelty but discipline: (1) the soft password gate ships poems and photos in plain bytes — the user has chosen this consciously, but a build-time AES-GCM upgrade is documented as a one-step path if real privacy is ever wanted; (2) accessibility regressions from the dark aesthetic (contrast, focus rings, reduced-motion fallbacks, pinch-zoom) must be designed in from Phase 1, not audited at the end; (3) the GitHub Pages base-path / SPA-refresh / `100dvh` / iOS preserve-3d traps will all bite if not addressed in the deploy skeleton on day one. None are unsolved problems; they all become technical debt the moment a phase ships without them.

## Key Findings

### Recommended Stack (LOCKED)

The user's proposed Vue 3 + Vite + TS is validated. Final pinned versions:

**Core:**
- **Vue 3.5.33** + `<script setup lang="ts">` — SFCs map cleanly onto the small component set (Gate, Room, StringRow, Polaroid, CandleLight, FlipCard, PoemView).
- **Vite 8.0.10** (Node 22) — `base` switches between `/lulu/` and `/` for custom domain.
- **TypeScript 6.0.3** with `moduleResolution: "bundler"` — types the manifest at build time.
- **GSAP 3.15.0** (now 100% free incl. all plugins as of 2025-04-30) — tree-shaken; **Flip plugin** drives the polaroid → reading-view transition.
- **vue-router 5.0.6** in HTML5 history mode (`createWebHistory(import.meta.env.BASE_URL)`), with `public/404.html` SPA fallback.
- **pinia 3.0.4** — single `ui` store for zoom, reduced-motion override, "spegni candela."

**Supporting:**
- **@vueuse/core 14.3.0** — `useRafFn`, `useEventListener`, `useMediaQuery`, `usePreferredReducedMotion`, `useStorage`. **Rule:** never raw `addEventListener` on `window`/`document` from a component.
- **vite-imagetools 10** + **sharp 0.34** — AVIF + WebP + JPEG, srcset (480/960/1920), LQIP base64 placeholders, EXIF stripping.
- **WebCrypto PBKDF2-SHA256 200k iter** (zero-dep, architecture's recommendation; preferred over @noble/hashes plain SHA-256 — see Reconciliation 2).
- **panzoom 9.4.4** — pinch + wheel + keyboard zoom on photo and poem text (over `medium-zoom`, which is image-click only).
- **UnoCSS 66** *(or vanilla CSS + `tokens.css` — taste call, both fine)*.

**Explicitly NOT used (reconciled out):**
- **Matter.js** — overkill for 13–16 elements, conflicts with the "intimate, not tech demo" register.
- **bcryptjs** / md5 / plain SHA-256 — wrong threat-model fit.
- **`gh-pages` npm package** — superseded by `actions/deploy-pages@v4`.
- **Hash router** — uglier URLs than `404.html` trick is worth.

### Reconciled Architectural Decisions

The four research files disagree on four points. Resolutions, biased toward "simplest thing that satisfies the aesthetic and survives mobile + tab-blur":

#### Reconciliation 1: Swinging strings — CSS keyframes (with optional spring impulse), NOT Matter.js

| Source | Position |
|--------|----------|
| STACK | Matter.js headless |
| FEATURES | Pure CSS `@keyframes`, "indistinguishable from physics at 13 cards" |
| ARCHITECTURE | Damped spring in single rAF |
| PITFALLS | Verlet with clamped `dt` + visibilitychange |

**Decision:** **CSS-only staggered `@keyframes` for idle sway** (per-polaroid `animation-duration` 4–7s, `animation-delay` randomized, amplitude 1–3°). This is the v1 default. **If** a "tug" on click or a pointer-proximity impulse is later judged necessary for the magic, layer a tiny damped spring driven by the single `useFrame` rAF (with `dt` clamp + `visibilitychange` reset per Pitfall 2). Matter.js is rejected: 50 KB+, the only project where its `Constraint`/`Composite` features pay off has >50 cards, and its presence pushes the register from "intimate" toward "tech demo."

**Why simplest wins:** at 13–16 cards, no real user can tell CSS sway from physics. The risk is energy-injection / NaN-explosion on tab-blur (Pitfall 2), which CSS `@keyframes` *cannot suffer from* — they pause cleanly with the tab. This is the single best cost/risk tradeoff in the project.

#### Reconciliation 2: Password gate — soft (user's choice) by default, AES-GCM upgrade documented as one-step path

| Source | Position |
|--------|----------|
| PROJECT.md | Soft gate (user's choice, theatrical) |
| STACK | @noble/hashes SHA-256, future Argon2 path |
| ARCHITECTURE | PBKDF2-SHA256 200k iter, sessionStorage flag |
| PITFALLS | Build-time AES-GCM (staticrypt-style) — anything less ships content in bundle |

**Decision:** **Honor the user's choice — soft gate v1.** Implement as **PBKDF2-SHA256 (200k iter, 16-byte salt) via WebCrypto** (architecture's recommendation; zero-dep; better than plain SHA-256 because brute-force is expensive). Unlock flag stored in `sessionStorage` only (per-tab; no `localStorage.isUnlocked` boolean, ever — Pitfall 4). 5-attempt throttle with exponential lockout. Documented in plain language in README and the gate itself: *this is a doormat, not a vault.*

**Upgrade path (must be documented from Phase 1, not retrofitted):** wrap the manifest + poems + photo bytes in a single AES-GCM-encrypted `payload.enc` blob using a key derived from the password via the same PBKDF2. If the user ever decides "this needs to be actually private" (or shares the URL with anyone outside the recipient circle), the upgrade is ~half a day of work *iff* the asset pipeline was designed with this hook in mind. Two design constraints from Phase 1:
1. **No `<img src="/photos/foo.jpg">` direct in HTML** — all photo URLs are looked up at runtime through a manifest-driven map (`import.meta.glob` for hashed URLs). This keeps option open to swap raw URLs for decrypted Blob URLs later.
2. **No "is unlocked" pre-rendered HTML.** The unlocked content is mounted client-side after gate success, never pre-rendered.

**The roadmap should not silently override the user's pick** — but it must surface the choice as a **Locked Open Decision** so the user re-confirms before ship.

#### Reconciliation 3: Candle reveal — CSS radial-gradient mask + `mix-blend-mode` (primary), Canvas (fallback)

| Source | Position |
|--------|----------|
| STACK | CSS radial-gradient mask first, canvas second |
| ARCHITECTURE | SVG `<mask>` |
| PITFALLS | RAF + transform + mix-blend-mode from day one |

**Decision:** **Single fixed full-viewport overlay div** with a baked-in `radial-gradient` and `mix-blend-mode: multiply` over a warm tint layer. Position driven by `transform: translate3d(var(--cx), var(--cy), 0)` updated *inside the single `useFrame` rAF callback* via `style.setProperty`. **No Vue reactivity in the hot path.** `will-change: transform` on enter, removed on leave. `contain: layout paint` on the layer.

**Why over SVG mask:** SVG `<mask>` has known Safari perf cliffs (Architecture's "what breaks first" item 3 acknowledges this). The CSS-mask path stays GPU-composited everywhere.

**iOS Safari fallback:** if real-device profiling shows compositing failures, swap the gradient mask for a **2D Canvas** drawing the dark layer with `globalCompositeOperation: 'destination-out'` radial gradient at pointer position. Same RAF subscription. Test on real iPhone in Phase 5 acceptance — do not rely on simulator.

**Reduced-motion variant (designed in parallel, per Pitfall 12):** flicker off; radius static and ~60–80% of viewport (so the room is mostly lit); pointer still moves the center but with no easing/lerp. Plus a "Mostra tutto / Spegni candela" toggle in the AccessibilityPanel that lights the whole room. Reduced-motion users must never face a dark screen they cannot navigate.

#### Reconciliation 4: Polaroid open — real route + GSAP Flip from polaroid's current position

| Source | Position |
|--------|----------|
| FEATURES | Hybrid FLIP — flip in place, then expand to reading panel |
| ARCHITECTURE | Real route `/p/:slug` with full-screen view |
| STACK | GSAP Flip plugin |

**Decision:** Both coexist. **Route is the source of truth** (`/p/:slug` with `<keep-alive>` over RoomView so room state is preserved). **GSAP Flip** animates the visual transition from the polaroid's current screen position into the centered reading panel, then performs the rotateY flip to show the poem. On close (`router.back()` from ESC, click-outside, close button, browser back, or `popstate`), Flip reverses to the polaroid's current room position. Focus trap (`useFocusTrap`) during open; focus restored to the originating polaroid on close (a `<button>` element, not a `<div>` — Pitfall 3). `inert` attribute on the room while dialog is open.

**Reduced-motion fallback:** skip rotateY; instant face swap with a 100 ms cross-fade; no Flip-driven scaling, just an instant overlay mount.

#### Reconciliation 5: Audio — NO. Carried forward as Out of Scope.

Per FEATURES recommendation. Silence is a feature, not an absence. Reading a poem is an inner-voice activity. Documented for honesty: if the recipient ever explicitly asks, a single optional candle-crackle toggle is the maximum, never autoplay.

### Locked Architectural Decisions

- **URL is the source of truth for view state.** `/` = RoomView (kept-alive); `/p/:slug` = PolaroidView (modal). No `currentPolaroidId` ref anywhere.
- **Build-time content pipeline.** `poems.txt` → Vite plugin → typed `virtual:poems` module. Manifest YAML → schema-validated typed module. Build fails on missing photos / orphan poem IDs / `alt` text < 10 chars (Pitfall 9).
- **Single rAF, many subscribers.** `useFrame` registry; CandleLight + (optionally) StringRow swing impulse + flicker subscribe. One loop, paused as a unit on `visibilitychange === 'hidden'`.
- **CSS-driven zoom (`--zoom` custom property), JS-driven motion.** Layout in `rem`/`em`/`ch` from day one — retrofitting after px layouts means rewriting CSS (FEATURES dependency note).
- **Reduced-motion as a flag, not a branch.** Single component tree; `motion: 'full' | 'reduced'` reactive flag gates animation richness. Designed in parallel with default behavior.
- **Pointer position is NOT a Vue ref.** Plain mutable `{ x, y }` updated by listener; read inside the rAF callback that owns the candle. Throttle in the producer, not the consumer.
- **VueUse for all global listeners.** `useEventListener`, `useRafFn`, `useResizeObserver` — no raw `addEventListener` on `window`/`document`/`body` (Pitfall 14).

### Table-Stakes Features (v1, P1) — carried from FEATURES.md

Cannot ship without these:

- Password gate (autofocus, error feedback, "ricorda" via localStorage hashed token, 5-attempt throttle, soft-gate disclaimer)
- `<html lang="it">` + Italian UI strings + Italian-quote typography («»), `hyphens: auto`
- Dark room with **warm** candle cursor (radial mask, `mix-blend-mode: multiply` for warmth, NOT white flashlight) + touch-light variant
- Subtle candle flicker (rAF noise on `--candle-radius`), reduced-motion-aware
- Warm vignette + faint noise periphery (prevents "loading screen" feel)
- Polaroid strings rendered from manifest with **CSS-only** idle sway
- Polaroid as `<button>` (not `<div>`) with visible amber `:focus-visible` ring that survives the dark
- Click/Enter → route navigation → GSAP Flip from polaroid → reading view
- Reading view: serif (Cormorant/EB Garamond/Lora), 18–20 px, line-height 1.6–1.7, max-width 32–38ch, **light parchment background** (NOT dark — contrast budget), `white-space: pre-wrap` for poem line-breaks, italic date
- Close stack: ESC + button + click-outside + browser back + `inert` on room + focus restore (all four ship together or it feels half-built)
- A−/A+ buttons reflowing layout (root font-size, `rem`/`ch` discipline)
- Pinch-zoom NOT blocked: viewport `<meta>` allows it, no `maximum-scale=1`
- `prefers-reduced-motion` full coverage (flicker off, swing off, flip → crossfade, arrival → instant) — designed in parallel, NOT bolted on
- Per-polaroid `alt` text in Italian from manifest (≥10 chars enforced at build)
- Skeleton placeholders + lazy-load (first 6 polaroids `loading="eager" fetchpriority="high"`, rest lazy; `decoding="async"`)
- Self-hosted serif font with `font-display: swap` + `size-adjust` to prevent CLS; **subset includes Latin Extended** for Italian accents (`àèéìòù`)
- WCAG AA contrast ≥ 4.5:1 in reading view; ≥ 4.5:1 in lit area of room for any meaningful text
- `100dvh` (NOT `100vh`) for room layout; `viewport-fit=cover`
- GitHub Pages deploy with `404.html` SPA fallback, `base` switching, `public/.nojekyll`, `public/CNAME` if custom domain

### v2+ Differentiators (defer until v1 proven)

- Arrival sequence (gate → fade-to-black → first candle bloom → polaroid fade-in along strings, once per session, sessionStorage flag)
- Swipe / arrow-key between poems with URL hash deep-links
- Polaroid "tug" pre-flip (200 ms transform before route push)
- Cursor warm trail (3–5 frame afterimages)
- Hidden easter polaroid (off the typical scan path; recipient discovers)
- Per-poem mood tint (manifest `mood: cool|warm|neutral` shifts `--candle-warm`)
- "Read" indicator (subtle dog-ear on visited polaroids, localStorage)

### Critical Pitfalls — top concerns by phase

1. **Password-gate bypass + content in bundle (Pitfall 4)** — Phase 1. Mitigation: PBKDF2 200k iter, sessionStorage only, no `localStorage.isUnlocked`, document threat model in README, design asset pipeline so AES-GCM upgrade is half-a-day work.
2. **GitHub Pages base path + SPA refresh 404 (Pitfall 7, 11)** — Phase 1. Mitigation: `base: '/lulu/'` (or `/` for custom domain) read from env, `import.meta.env.BASE_URL` everywhere, `public/404.html` SPA hack, real Pages preview in CI from day one with at least one image to catch base-path issue.
3. **Candle reveal not GPU-composited / Vue-reactive coords (Pitfall 1)** — Phase 5. Mitigation: single `useFrame`, `transform: translate3d`, `mix-blend-mode`, `will-change` on enter only, NOT reactive ref. Verify on real mobile + 4× CPU throttle.
4. **Reduced-motion makes app unusable (Pitfall 12)** — cross-cutting. Mitigation: per-feature reduced alternatives, NOT global `animation: none`. Larger default candle radius under reduced-motion. "Mostra tutto" override in AccessibilityPanel.
5. **Polaroid flip steals focus / is invisible to AT (Pitfall 3)** — Phase 3 + 6. Mitigation: polaroid is `<button>`, `<dialog>` or focus-trap for open view, save/restore `previouslyFocused`, `inert` on the room while open.
6. **Image weight blocks main thread (Pitfall 6)** — Phase 4. Mitigation: vite-imagetools AVIF/WebP/JPEG with srcset, LQIP base64 placeholders, ≤80 KB AVIF per photo at 960w, total < 1.5 MB.
7. **Italian accents missing in custom font + wrong hyphenation (Pitfall 10)** — Phase 3. Mitigation: `lang="it"`, `hyphens: auto`, font subset includes Latin Extended (`U+0000-024F,U+1E00-1EFF`), render test page with `àèéìòù ÀÈÉÌÒÙ «» — …` before locking the font.
8. **Memory leaks across SPA navigations (Pitfall 14)** — Phase 5 onward. Mitigation: VueUse for everything; 10× nav heap-diff smoke test.
9. **iOS Safari traps — preserve-3d, dvh, pinch-zoom-disabled, long-press image preview (Pitfall 8)** — Phase 5 + 6. Mitigation: real iPhone testing in CI smoke from Phase 1; pointer events not mouse events; `100dvh`/`100svh`; no `maximum-scale=1`; `-webkit-touch-callout: none` on polaroid images.
10. **Manifest drift — silent skips, broken images (Pitfall 9)** — Phase 2. Mitigation: build-time Zod validation; build fails on missing photo, missing poem ID, `alt` < 10 chars, orphan warnings.

## Implications for Roadmap

### Suggested Phase Structure

The architecture's 11-phase order is sound but compresses well into **7 shippable phases** for a personal project. Each phase deploys to GitHub Pages.

#### Phase 1: Foundation + Deploy + Soft Gate
**Rationale:** Three Phase-1 pitfalls (gate bypass, base path, SPA 404) are *architectural* — retrofitting any of them later means re-touching every file. Ship a deployed, gated, empty room.
**Delivers:**
- Vue 3.5 + Vite 8 + TS 6 scaffold with `tokens.css` + `rem` discipline
- Vue Router HTML5 with `BASE_URL`, `public/404.html` SPA fallback, `public/.nojekyll`
- GitHub Actions `actions/deploy-pages@v4` workflow; live Pages preview URL
- `useAuth` + PBKDF2-SHA256 200k iter via WebCrypto + sessionStorage flag + 5-attempt throttle
- PasswordGate component with focus trap, `aria-live` errors, "ricorda" checkbox
- Pinia `ui` store; `useReducedMotion`; `useZoom` skeleton; `useFrame` registry skeleton
- README documents the soft-gate threat model in plain language
**Avoids:** Pitfall 4, 7, 11. **Locks in:** asset-pipeline hooks for the future AES-GCM upgrade (no direct `<img src>`; all photo URLs go through a manifest-driven runtime map).

#### Phase 2: Content Pipeline + Manifest Validation
**Rationale:** Components in later phases must import typed `poems` and `manifest` modules; build them now so phase-3 code does not grow on a lie.
**Delivers:**
- `vite-plugin-poems` parses `poems.txt` → typed `virtual:poems`
- `content/manifest.yaml` schema (Zod) + Vite-plugin validator
- Build fails on missing photo, unknown poem ID, `alt` < 10 chars, manifest count ≠ poem count
- `npm run manifest:check` CLI for local pre-commit feedback
- Unit tests for `parsePoems()`, slugify, manifest validator
**Avoids:** Pitfall 9.

#### Phase 3: Static Room + Polaroid Layout (No Animation Yet)
**Rationale:** Get the structural a11y tree right before adding motion. A polaroid as `<button>` with proper `aria-label` is a different component from a polaroid as a `<div>` retrofitted later.
**Delivers:**
- RoomView (kept-alive), Room (background, string anchors via SVG/CSS)
- StringRow with hard-coded sag; Polaroid as `<button>` with `aria-label`, focus-visible amber ring, hover lift
- Manifest-driven layout (string + x% + rotation per polaroid)
- PolaroidView route at `/p/:slug` — modal-style overlay, focus trap, `inert` on room, ESC + click-outside + close button + popstate
- Reading view typography pass: serif font self-hosted with `latin-ext` subset, `font-display: swap` + `size-adjust`, `lang="it"`, `hyphens: auto`, light parchment background, italic date
- A−/A+ buttons (`useZoom` writes `--zoom` to `:root`)
- WCAG contrast verified in reading view
- Skip link "Salta al contenuto"
**Avoids:** Pitfall 3, 5 (in part), 10.

#### Phase 4: Asset Pipeline (Photos)
**Rationale:** Phase 5 (candle) needs to be perf-tested against realistic image weight. Doing pipeline before candle means polish happens on the right baseline.
**Delivers:**
- `vite-imagetools` produces AVIF + WebP + JPEG at 320/640/1024/1600 widths
- `<picture>` element via `?as=picture` import
- LQIP base64 placeholders inlined in manifest; crossfade on full-image decode
- `loading="lazy"` for off-screen, `loading="eager" fetchpriority="high"` for first 6 polaroids; `decoding="async"` on all
- EXIF stripped (`sharp({}).withMetadata({})`)
- Skeleton polaroids visible at frame 1
- Lighthouse: no "next-gen format" warnings; total photo payload < 1.5 MB
- `import.meta.glob` for filename → hashed URL map (keeps AES-GCM upgrade door open)
**Avoids:** Pitfall 6, 11.

#### Phase 5: Candle Reveal (The Signature)
**Rationale:** Highest novelty, highest perf risk. Build correctly first time per Pitfall 1 — retrofitting reactive→RAF is painful.
**Delivers:**
- `usePointer` (pointer events; mouse + touch + pen unified)
- CandleLight singleton: full-viewport fixed overlay, baked radial-gradient + warm tint via `mix-blend-mode: multiply` on top of the room, `transform: translate3d` updated in `useFrame`, NOT reactive
- `will-change: transform`, `contain: layout paint`
- Subtle flicker (smoothed-noise on `--candle-radius` ±6%, ~10–12 Hz perceived)
- Mobile: touch-light persists 500 ms after `touchend`
- iOS Safari real-device profile pass; Canvas fallback ready if needed
- **Reduced-motion variant designed in parallel:** flicker off, larger static radius (~60–80% viewport), no easing on pointer, "Spegni candela / Mostra tutto" toggle in AccessibilityPanel
- VueUse-only listeners; 10× nav heap-diff smoke test passes
- DevTools Perf: paint < 4 ms, 60 fps on mid-range mobile + 4× CPU throttle
**Avoids:** Pitfall 1, 8, 12, 14.

#### Phase 6: Idle Sway + Flip Animation
**Rationale:** Both are pure animation polish on top of the now-working room. Sway is CSS-only (zero pitfall surface). Flip is the cinematic moment.
**Delivers:**
- Per-polaroid CSS `@keyframes` sway (4–7 s duration, randomized delay, 1–3° amplitude)
- GSAP Flip transition: polaroid → reading panel, with rotateY for the front/back card flip
- Reduced-motion: instant face swap + 100 ms crossfade, no Flip scaling
- Interaction state machine: BROWSING vs POLAROID_OPEN; click-vs-drag disambiguation (>6 px or >250 ms = drag)
- All four close paths (ESC / button / click-outside / browser back) verified
**Avoids:** Pitfall 2 (by virtue of CSS sway), 13.

#### Phase 7: Hardening + A11y Audit + Ship
**Rationale:** Cross-cutting concerns and verification before declaring done.
**Delivers:**
- axe-playwright a11y pass (gate, room, polaroid view) — 0 violations
- VoiceOver + NVDA manual pass; keyboard-only pass
- 200% / 400% browser zoom reflow check
- Real iPhone test: pinch zoom, dvh stability on scroll, long-press disabled on polaroid images, preserve-3d renders correctly
- Tab-blur 60 s smoke test (no NaN, no flying polaroids — guaranteed by CSS sway, but verify)
- 10× navigation heap-diff (no leaked CandleLight)
- Lighthouse perf ≥ 90 on mobile
- Italian render-test page passes (all accents, «», dashes, ellipsis from same font); native speaker review
- `dist/` audit: no source maps, no EXIF, no plaintext poems if upgraded to AES-GCM
- README finalized with soft-gate disclaimer + AES-GCM upgrade recipe
- Playwright e2e: gate flow, deep-link refresh, flip, reduced-motion path, mobile touch candle

#### Optional v1.1 (after first owner+recipient round-trip)

- Arrival sequence choreography
- Swipe / arrow-key navigation + URL hash
- Polaroid tug pre-flip + cursor trail
- Hidden easter polaroid placement
- Per-poem mood tint (requires manifest schema extension — author cost)

### Phase Ordering Rationale

- **Phase 1 first because pitfalls 4 + 7 + 11 are architectural** — retrofit cost is far higher than upfront cost.
- **Pipeline before room before candle:** typed content modules exist → static a11y-correct components built on top → asset weight realistic before perf-critical candle is profiled.
- **Asset pipeline (Phase 4) before candle (Phase 5):** Pitfall 6's "decode blocks main thread" is exactly the noise floor the candle's 4 ms paint budget must beat. Profile against real image weight or you optimize the wrong thing.
- **Candle (Phase 5) before sway+flip (Phase 6):** the candle is the single highest-risk feature and the only one that can fail silently on a different device class. Get it on real Pages, real iPhone, real reduced-motion, before adding more rAF subscribers.
- **CSS sway (rejected Matter.js, rejected JS spring v1) keeps Phase 6 nearly pitfall-free.**
- **Hardening (Phase 7) is verification, not invention.** All a11y patterns ship in the phase that introduces the feature.

### Research Flags

Phases likely needing deeper research during planning (i.e. `/gsd-research-phase`):
- **Phase 5 (Candle reveal):** highest novelty + iOS Safari unknowns. Recommend a throwaway-branch prototype on a real iPhone *before* phase commits, especially to compare CSS-mask vs Canvas fallback performance.
- **Phase 1 (Soft gate + AES-GCM hook design):** the hook design that keeps the upgrade path cheap is subtle. Worth a focused planning session on the asset-resolution layer (`import.meta.glob` map vs explicit imports vs decrypted Blob URLs).

Phases with standard, well-documented patterns (skip deep research):
- **Phase 2 (Content pipeline):** Vite virtual modules + Zod is bog-standard.
- **Phase 3 (Static room + reading view):** SFCs + WAI-ARIA dialog pattern.
- **Phase 4 (Asset pipeline):** vite-imagetools is one config object.
- **Phase 6 (Sway + flip):** CSS animation + GSAP Flip have copy-pasteable docs.
- **Phase 7 (Hardening):** verification, not new patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Versions verified live against npm registry on 2026-05-02; GSAP-free-for-all verified via Webflow announcement; deploy pattern is the official one. |
| Features | **HIGH** for accessibility + table-stakes (WCAG-anchored); **MEDIUM** for taste-driven decisions (no audio, candle warmth, hidden easter polaroid placement). Defensible with cited reasoning. |
| Architecture | **HIGH** | All patterns drawn from current Vue 3.5 + Vite 8 idioms; `<keep-alive>` + modal route is a standard pattern. |
| Pitfalls | **HIGH** | All 14 pitfalls reference concrete browser/spec sources (MDN, WCAG 2.2, WebKit known issues, GitHub Pages community wisdom). |

**Overall confidence:** **HIGH.**

### Open Decisions to Resolve During Planning

These three must be confirmed before Phase 1 ships, not silently decided:

1. **Custom domain vs project page (`user.github.io/lulu/`).** Affects `base` value and `public/CNAME`. **User input required.** Default if unspecified: project page (`base: '/lulu/'`). If custom domain chosen later, one-line env switch.

2. **Soft gate (PBKDF2 only) vs build-time AES-GCM upgrade for v1.** User has chosen soft gate in PROJECT.md. **Re-confirm at Phase 1 kickoff** with this question explicit: *"If the gift URL is shared with anyone outside the recipient circle, would you want the poems and photos unreadable to them without the password?"* If yes → AES-GCM v1 (~half-day extra). If no → soft gate v1, AES-GCM stays as documented upgrade. Either way: design Phase 1 asset hooks identically.

3. **Font choice.** Recommended: Cormorant Garamond, EB Garamond, or Lora — self-hosted, Latin Extended subset. **Decision needed before Phase 3.** Selection criterion: pick by viewing a render-test page with `«Perché ho lasciato che il silenzio si vestisse di me?» — 22/7/2025`, all poems' accents, em-dashes, ellipsis. If the chosen font lacks any glyph the answer is "next font," not "fallback stack."

### Gaps to Address

- **Photo content not yet authored.** `./photos/` is empty per PROJECT.md; manifest schema and validation can be built (Phase 2) but cannot be exercised until photos exist. Phase 3 should ship with placeholder rectangles that match the final aspect ratio so layout work is not blocked.
- **Final poem count.** Manifest validation expects 1:1 photo↔poem; "13–16, expandable" means schema must support add-without-rebuild beyond v1 (already true since YAML manifest is content, not code).
- **Recipient device class unknown.** Perf budget (≤80 KB AVIF, total <1.5 MB, 60 fps on mid-range mobile) is conservative; if recipient is on iPhone 8 / Android low-end, Phase 5 must include device-class profiling and possibly the Canvas candle fallback.
- **Real-device iOS Safari mask perf.** The CSS-mask vs Canvas decision can only be made on a real device (Pitfall 8). Plan for ~2 hours of device profiling in Phase 5.

## Sources

### Primary (HIGH confidence)
- npm registry — live version verification (vue, vite, typescript, gsap, vue-router, pinia, @vueuse/core, vite-imagetools, sharp, unocss, @noble/hashes, panzoom)
- MDN Web Docs — `requestAnimationFrame`, `pointer-events`, `transform-style`, `prefers-reduced-motion`, `dvh/svh/lvh`, SubtleCrypto, `<dialog>`, `inert`, `mix-blend-mode`, mask-image
- Vue 3 + Vite official docs — `import.meta.env.BASE_URL`, `import.meta.glob`, `public/` vs `src/assets/`, `<keep-alive>`
- Vue Router docs — `createWebHistory(BASE_URL)` modal-route pattern
- VueUse docs — `useRafFn`, `useEventListener`, `useMediaQuery`, `usePreferredReducedMotion`
- WCAG 2.2 — 1.4.3, 1.4.4, 1.4.10, 2.1.1, 2.3.3, 2.5.5, 2.5.8, 4.1.2
- GitHub `actions/deploy-pages@v4` official docs
- rafgraph/spa-github-pages — canonical `404.html` SPA fallback
- Webflow blog (2025-04-30) + GSAP pricing — GSAP free for all, all plugins included
- Glenn Fiedler "Fix Your Timestep" — stable game-loop integration

### Secondary (MEDIUM confidence)
- WebKit known issues (Safari preserve-3d, viewport bottom-bar)
- robinmoisson/staticrypt — reference for static-site AES-GCM encryption pattern
- Codrops / Smashing Magazine — CSS mask + GSAP cursor-driven animation tutorials
- Inclusive Components (Heydon Pickering) — clickable card focus/semantics patterns
- Italian web typography community guidance — `lang`, `hyphens`, `pyftsubset` subset ranges

### Tertiary (LOW confidence)
- LogRocket animation library round-up (used only as corroboration)
- Aesthetic taste calls (candle warmth, hidden easter polaroid, "no audio") — defensible but not empirical

### Detailed research files
- `.planning/research/STACK.md` — full stack rationale + alternatives + GH Pages gotchas
- `.planning/research/FEATURES.md` — full feature landscape + anti-features + dependency graph
- `.planning/research/ARCHITECTURE.md` — full component tree + patterns + data flow
- `.planning/research/PITFALLS.md` — 14 critical pitfalls with mitigations and phase mapping

---
*Research completed: 2026-05-02*
*Ready for roadmap: yes*
