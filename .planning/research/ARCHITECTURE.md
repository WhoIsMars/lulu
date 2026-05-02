# Architecture Research

**Domain:** Static SPA (Vue 3 + Vite + TS) — interactive poetry gallery on GitHub Pages
**Researched:** 2026-05-02
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (SPA)                            │
├─────────────────────────────────────────────────────────────┤
│  App.vue                                                     │
│   ├── <PasswordGate>   (overlay, mounts until unlocked)      │
│   └── <RouterView>                                           │
│        ├── /  → RoomView                                     │
│        │       ├── <CandleLight>  (fixed full-viewport)      │
│        │       ├── <Room>         (background, strings)      │
│        │       │    └── <StringRow> × N                      │
│        │       │         └── <Polaroid> × M                  │
│        │       └── <AccessibilityPanel> (zoom A−/A+, motion) │
│        └── /p/:slug → PolaroidView (modal route)             │
│                ├── <FlipCard>                                │
│                │    ├── front: <PhotoLarge>                  │
│                │    └── back:  <PoemView>                    │
│                └── <ZoomControls>                            │
├─────────────────────────────────────────────────────────────┤
│                  Composables / Stores (Pinia-lite)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ useAuth  │ │ useManif.│ │ usePtr   │ │ useA11y  │        │
│  │ (gate)   │ │ (data)   │ │ (candle) │ │ (zoom/RM)│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│              Build-time (Vite plugins) → static assets       │
│  poems.txt ──[poems-plugin]──▶ poems.json (typed)            │
│  manifest.yaml ──[validate]──▶ manifest.json                 │
│  photos/*.jpg ──[vite-imagetools]──▶ AVIF/WebP + srcset      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `App.vue` | Mount router, global a11y/zoom CSS vars, PasswordGate overlay | Thin shell |
| `PasswordGate` | Hash entered password, compare to embedded hash, set `unlocked` flag, focus trap | Composable + WebCrypto |
| `RoomView` | Compose candle layer + string rows; preserve scroll/state on return | `<keep-alive>` route |
| `CandleLight` | Single fixed SVG/Canvas mask layer; tracks pointer; owns the only RAF loop | Singleton, mounted in RoomView |
| `Room` | Static background (wood/wallpaper texture), string anchors | Pure CSS/SVG |
| `StringRow` | One taut string; runs spring physics for swing; broadcasts angle to children | Composition function `useStringPhysics()` |
| `Polaroid` | Image + caption, tilt/rotation from manifest, hover/focus affordances, click→navigate | Functional, links to `/p/:slug` |
| `PolaroidView` | Route component for full-view; opens FlipCard, traps focus, returns to room | Modal route (background-route pattern) |
| `FlipCard` | 3D flip animation (front photo / back poem); reduced-motion fallback = crossfade | CSS transform + `prefers-reduced-motion` |
| `PoemView` | Render parsed poem (title, date, body); respects current zoom level | Reads from manifest store |
| `ZoomControls` | A− / A+ buttons; updates CSS custom property `--zoom` | Composable `useZoom()` |
| `AccessibilityPanel` | Toggle reduced motion override, zoom buttons, "spegni candela" (full-light mode) | Composable + localStorage persist |

### Boundaries (strict)

- **CandleLight is the ONLY component that owns a RAF loop.** All animation that needs frame timing (string swing, candle flicker) subscribes to it via a `useFrame(cb)` composable. Single rAF, multiple subscribers.
- **Polaroid is presentational.** It receives data + assigned string angle; it does not know the manifest or the router. Click emits → parent navigates.
- **Manifest store is read-only at runtime.** Loaded once after gate unlock; no mutations.

## Recommended Project Structure

```
lulu/
├── photos/                          # source photos (gitignored from build, processed by imagetools)
├── poems.txt                        # source of truth for poems
├── content/
│   └── manifest.yaml                # photo↔poem mapping, hand-edited
├── public/
│   ├── 404.html                     # SPA fallback for GitHub Pages deep links
│   └── favicon.svg
├── src/
│   ├── main.ts                      # createApp + router + Pinia
│   ├── App.vue
│   ├── router/
│   │   └── index.ts                 # routes: /, /p/:slug; HTML5 history with base from BASE_URL
│   ├── views/
│   │   ├── RoomView.vue             # candle room, kept-alive
│   │   └── PolaroidView.vue         # /p/:slug, modal-style
│   ├── components/
│   │   ├── gate/PasswordGate.vue
│   │   ├── room/Room.vue
│   │   ├── room/StringRow.vue
│   │   ├── room/Polaroid.vue
│   │   ├── room/CandleLight.vue
│   │   ├── polaroid/FlipCard.vue
│   │   ├── polaroid/PoemView.vue
│   │   ├── polaroid/PhotoLarge.vue
│   │   └── a11y/{ZoomControls,AccessibilityPanel}.vue
│   ├── composables/
│   │   ├── useAuth.ts               # password gate, sessionStorage flag
│   │   ├── useManifest.ts           # singleton load of poems+manifest
│   │   ├── usePointer.ts            # mouse/touch unified pointer
│   │   ├── useFrame.ts              # global rAF subscription
│   │   ├── useStringPhysics.ts      # damped spring for one string
│   │   ├── useZoom.ts               # --zoom CSS var
│   │   ├── useReducedMotion.ts      # MQ + override
│   │   └── useFocusTrap.ts          # for gate + polaroid view
│   ├── stores/
│   │   └── ui.ts                    # Pinia store (zoom, reducedMotionOverride, candleOff)
│   ├── data/
│   │   ├── poems.generated.ts       # output of vite-plugin-poems
│   │   ├── manifest.generated.ts    # output of validation step
│   │   └── types.ts                 # Poem, PolaroidEntry, Manifest
│   ├── plugins/
│   │   └── vite-plugin-poems.ts     # parses poems.txt → typed module at build
│   ├── styles/
│   │   ├── tokens.css               # palette, --zoom, --candle-radius
│   │   ├── base.css
│   │   └── reduced-motion.css       # @media (prefers-reduced-motion)
│   └── utils/
│       ├── slug.ts                  # title→slug for /p/:slug
│       ├── crypto.ts                # PBKDF2 wrapper around WebCrypto
│       └── srcset.ts                # responsive image helper
├── tests/
│   ├── unit/poems-parser.spec.ts
│   ├── unit/crypto.spec.ts
│   └── e2e/{gate,flip,deep-link}.spec.ts
├── .github/workflows/deploy.yml
├── vite.config.ts
└── package.json
```

### Structure Rationale

- **`content/` separate from `src/`:** the manifest is content authored by the human, not code. Keeps editorial diff clean.
- **`data/*.generated.ts`:** Vite plugin emits typed modules. Components import them like normal modules → tree-shakeable, type-safe, no runtime fetch of poems.txt.
- **`composables/` vs `stores/`:** Pinia only for *shared mutable UI state* (zoom level, candle off, reduced-motion override). Everything else is composables. Avoids overcomplicating a small app.
- **`plugins/vite-plugin-poems.ts` colocated in src:** small enough to live in-repo; not a published package.

## Architectural Patterns

### Pattern 1: URL as source of truth for view state

**What:** The room/polaroid distinction lives in the route (`/` vs `/p/:slug`). No `currentPolaroidId` ref anywhere.
**When:** Always — gives free deep-linking, browser back/forward, shareable URLs (within the gate).
**Trade-offs:** Need a `<keep-alive>` on RoomView so reopening doesn't reset string positions. Worth it.

```typescript
// router/index.ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),  // /lulu/ on Pages
  routes: [
    { path: '/', name: 'room', component: RoomView, meta: { keepAlive: true } },
    { path: '/p/:slug', name: 'polaroid', component: PolaroidView, props: true },
  ],
})
```

```vue
<!-- App.vue -->
<router-view v-slot="{ Component }">
  <keep-alive include="RoomView"><component :is="Component" /></keep-alive>
</router-view>
```

### Pattern 2: Build-time content pipeline

**What:** `poems.txt` is parsed at build by a Vite plugin into a typed JS module. Manifest YAML is validated at build. No runtime parsing.
**When:** Content is authored, not user-generated, and changes only on commit.
**Trade-offs:** Plugin code to maintain (~80 LOC). In return: type safety, no parse cost on first paint, no runtime errors from a malformed poem.

```typescript
// src/plugins/vite-plugin-poems.ts (sketch)
export function poemsPlugin(): Plugin {
  const ID = 'virtual:poems'
  return {
    name: 'lulu-poems',
    resolveId(id) { if (id === ID) return '\0' + ID },
    async load(id) {
      if (id !== '\0' + ID) return
      const raw = await fs.readFile('poems.txt', 'utf8')
      const poems = parsePoems(raw)  // returns Poem[]
      return `export const poems = ${JSON.stringify(poems)} as const`
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('poems.txt')) {
        const mod = server.moduleGraph.getModuleById('\0' + 'virtual:poems')
        if (mod) server.reloadModule(mod)
      }
    },
  }
}
```

Poem shape parsed from blocks separated by `—————` (or `—————-` etc.):
```typescript
type Poem = {
  id: string         // slug from title + date
  title: string      // "Un altro sogno"
  date: string       // ISO: "2025-07-22"
  time?: string      // "17:38"
  body: string       // raw poem text, line breaks preserved
  bodyHtml: string   // <p>/<br> sanitized HTML for render
}
```

### Pattern 3: Single rAF, many subscribers

**What:** One global animation frame loop in `useFrame`. CandleLight, every StringRow, candle flicker all subscribe.
**When:** Whenever you have >2 components animating per frame in the same view.
**Trade-offs:** Slightly more wiring than each component using its own `requestAnimationFrame`. Massive win for jank avoidance and battery — animations stay synced and the loop can be paused as a unit when tab is hidden or when reduced-motion is on.

```typescript
// composables/useFrame.ts
const subs = new Set<(t: number, dt: number) => void>()
let raf = 0, last = 0
function tick(t: number) {
  const dt = last ? t - last : 16; last = t
  subs.forEach(fn => fn(t, dt))
  raf = requestAnimationFrame(tick)
}
export function useFrame(fn: (t: number, dt: number) => void) {
  onMounted(() => { subs.add(fn); if (!raf) raf = requestAnimationFrame(tick) })
  onUnmounted(() => { subs.delete(fn); if (!subs.size) { cancelAnimationFrame(raf); raf = 0; last = 0 } })
}
```

### Pattern 4: CSS-driven zoom, JS-driven motion

**What:** Zoom is a CSS custom property `--zoom` on `:root`; photos and poem text use `font-size: calc(1rem * var(--zoom))` and `transform: scale(var(--photo-zoom))`. Animation lives in JS for control.
**When:** Always for accessibility scaling — CSS zoom integrates with browser layout, doesn't fight RAF.
**Trade-offs:** Two scaling axes (text vs photo) need separate vars to avoid pinch-zooming text into oblivion.

### Pattern 5: Reduced-motion fork via flag, not branch

**What:** A reactive `motion: 'full' | 'reduced'` value gates animation richness. Components read it and conditionally apply CSS classes / skip subscriptions. No parallel component tree.
**When:** Always; it's the only sane way.
**Trade-offs:** Every animated component must check the flag. Discipline cost is small.

```typescript
// composables/useReducedMotion.ts
const mq = matchMedia('(prefers-reduced-motion: reduce)')
const override = useStorage<'auto'|'full'|'reduced'>('motion', 'auto')
export const motion = computed(() =>
  override.value === 'auto' ? (mq.matches ? 'reduced' : 'full') : override.value
)
```

In CandleLight: if `motion.value === 'reduced'`, skip flicker, use a static soft gradient with no subscription to `useFrame`. In StringRow: dampening factor → 1 (instant settle).

### Pattern 6: Modal route with background preservation

**What:** `/p/:slug` is a real route, but RoomView stays mounted via `<keep-alive>`. PolaroidView renders as a fixed-position overlay; ESC or backdrop click → `router.back()`.
**When:** When you want shareable modal URLs without losing parent state.
**Trade-offs:** Focus management is on you. Use `useFocusTrap` and restore focus to the originating polaroid on close.

## Data Flow

### Boot Flow

```
index.html → main.ts
    ↓
createApp + router + Pinia
    ↓
App.vue mounts → useAuth.checkSession()
    ↓
unlocked? ── no ──▶ <PasswordGate>  (sessionStorage empty)
    │                  ↓ submit
    │              hashPBKDF2(input, salt) === EMBEDDED_HASH
    │                  ↓ yes
    └── yes ──▶ <RouterView> mounts RoomView
                    ↓
              import { poems } from 'virtual:poems'
              import { manifest } from '@/data/manifest.generated'
              join → PolaroidEntry[] (memoized)
                    ↓
              StringRow × N renders Polaroid × M
```

### Interaction Flow: candle reveal

```
PointerEvent (mouse/touch) on document
    ↓
usePointer  (throttled to 1× per rAF, not per event)
    ↓
CandleLight reads pointer in its useFrame callback
    ↓
updates SVG mask center / Canvas radial gradient
    ↓
GPU composite — no Vue reactivity in the hot path
```

### Interaction Flow: open polaroid

```
click on <Polaroid id="lume-2025-08-16">
    ↓
router.push({ name: 'polaroid', params: { slug: 'lume-2025-08-16' } })
    ↓
RoomView keep-alive cached; PolaroidView mounts as overlay
    ↓
useFocusTrap activates; previous focus stored
    ↓
FlipCard front (photo) shown; click/tap → flip → back (poem)
    ↓
ESC / backdrop / close button → router.back()
    ↓
PolaroidView unmounts; focus restored to source <Polaroid>
```

### State Management

| State | Where | Reactivity | Persistence |
|-------|-------|------------|-------------|
| `unlocked` | `useAuth` | ref | sessionStorage (per tab) |
| Current view | Vue Router | route | URL |
| Manifest data | `useManifest` (frozen) | computed | none — bundled |
| Pointer position | `usePointer` | ref (raw, non-template) | none |
| Zoom level | Pinia `ui` store | ref | localStorage |
| Reduced-motion override | Pinia `ui` store | ref | localStorage |
| Candle off (full-light mode) | Pinia `ui` store | ref | sessionStorage |
| String physics | local in `<StringRow>` | non-reactive vars + DOM transform | none |

**Rule:** Anything that updates per frame (pointer, string angle) must NOT be a reactive Vue ref. Use plain mutable objects + direct DOM/SVG attribute writes inside the rAF callback. Vue reactivity is for view-state, not for animation state.

## Manifest Data Shape

```yaml
# content/manifest.yaml
strings:
  - id: top
    y: 18%        # vertical position in room
    sag: 24       # px sag at center
  - id: middle
    y: 48%
    sag: 32
  - id: bottom
    y: 78%
    sag: 28

polaroids:
  - poemId: un-altro-sogno-2025-07-22  # must match generated poem id
    photo: 01.jpg                       # in /photos
    alt: "Riflesso di luna sul fiume"   # required, italian
    string: top
    x: 12%                              # position along string
    rotation: -4                        # degrees, ±8 typical
    scale: 1.0                          # optional, default 1
  - poemId: luce-2025-07-28
    photo: 02.jpg
    alt: "Pozzanghera con luce di luna"
    string: top
    x: 38%
    rotation: 2
```

Validated at build → emits `manifest.generated.ts` with `as const`. Build fails if any `poemId` has no matching poem or any photo file is missing.

## Asset Pipeline

- **`vite-imagetools`** processes `photos/*.{jpg,png}` → emits AVIF + WebP + JPEG fallback at multiple widths (320, 640, 1024, 1600).
- **Polaroid thumbnails** (room view): 320w / 640w via `srcset`, `sizes="(max-width:768px) 30vw, 200px"`.
- **PhotoLarge** (polaroid view): 1024w / 1600w; `loading="lazy"` for off-screen.
- **Blur-up placeholders:** generate 16px LQIP at build, inline as base64 in manifest. CSS shows blurred LQIP until full image decode (`<img>` `onload` swap, or `decoding="async"` + opacity transition).
- **Texture/background assets** in `public/textures/` — long cache headers via Vite asset hashing.

```typescript
// usage
import polaroidImg from '@/photos/01.jpg?w=320;640;1024&format=avif;webp;jpg&as=picture'
// → { sources: [...], img: { src, w, h } }
```

## Password Handling

**Decision: PBKDF2-SHA256, 200k iterations, 16-byte salt, via WebCrypto.**

- **Why not plain SHA-256:** trivial to brute-force a 6–10 char password offline once the hash is shipped to the client.
- **Why not Argon2:** no native browser support; would need a 100KB+ wasm bundle. PBKDF2 with 200k iterations is "good enough" for soft-privacy.
- **Why not bcrypt:** same wasm cost, no advantage over PBKDF2 here.
- **Storage:** salt + hash + iterations stored in `src/auth/credentials.ts` (committed). Anyone with the repo can offline-attack — that's acceptable for a "soft gate" gift project. Document this clearly.
- **Unlock flag:** `sessionStorage` (per-tab, expires on tab close). NOT localStorage — a shared device shouldn't keep someone in. Optional: add an explicit "ricorda" checkbox that promotes to localStorage with a 30-day expiry timestamp.
- **No timing-safe comparison needed** since we're comparing hashes (not the password itself).

```typescript
// utils/crypto.ts
export async function derive(pw: string, saltHex: string, iters = 200_000) {
  const salt = hexToBytes(saltHex)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw),
    'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' }, key, 256)
  return bytesToHex(new Uint8Array(bits))
}
```

UI: show a spinner while deriving (200k iterations ≈ 100–300ms on modern hardware, noticeable on mobile).

## Animation Architecture

| Concern | Owner | Tech |
|---------|-------|------|
| Candle mask | `<CandleLight>` (singleton, fixed full-viewport) | SVG `<mask>` with radial gradient OR Canvas 2D. **SVG preferred** — no canvas resize headaches, integrates with backdrop-filter, scales with devicePixelRatio for free. |
| Candle flicker | same | small noise added to radius/opacity each frame |
| String swing | `<StringRow>` × N | damped spring `useStringPhysics` driven by useFrame; mouse proximity injects impulse |
| Polaroid wobble | inherited from parent string transform (CSS) + tiny per-polaroid offset | CSS variable `--swing-angle` updated from JS |
| Flip card | `<FlipCard>` | CSS `transform: rotateY()`, transition-driven, no rAF |
| Page transitions | `<RouterView>` Vue transition | CSS only |

**Reduced-motion overrides:**
- Candle flicker → off (static glow).
- String swing → dampening = 1 (resolves instantly to rest).
- Flip → 150ms crossfade instead of 600ms 3D flip.
- Page transition → none.

## Accessibility Tree

```html
<main aria-label="Soffitta delle poesie">
  <ul class="strings" role="list">
    <li role="listitem"> <!-- StringRow -->
      <ul class="polaroids" role="list">
        <li>
          <a href="/p/un-altro-sogno-2025-07-22"
             aria-label="Polaroid: Un altro sogno, 22 luglio 2025"
             aria-describedby="alt-1">
            <img src="..." alt="" role="presentation">
            <span id="alt-1" class="sr-only">Riflesso di luna sul fiume</span>
          </a>
        </li>
      </ul>
    </li>
  </ul>
</main>
```

- Polaroids are anchor links (real navigation) → keyboard accessible by default.
- `aria-label` on link = poem title + date (the meaningful identity); `aria-describedby` adds visual photo description.
- The image's `alt=""` because the link's accessible name already covers it; avoid redundancy.
- PolaroidView is `role="dialog" aria-modal="true" aria-labelledby="poem-title"`. Focus trap. Restore focus on close.
- "Spegni candela" toggle in AccessibilityPanel — disables the mask entirely (full-light mode) for users who find the dark room disorienting.
- Skip link at top: "Vai alle poesie" → focuses first polaroid.
- Live region for password gate errors (`aria-live="polite"`).

## Build & Deploy (GitHub Pages)

### `vite.config.ts`

```typescript
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'project' ? '/lulu/' : '/',
  plugins: [vue(), poemsPlugin(), imagetools()],
  build: { target: 'es2020', sourcemap: false },
})
```

- **Custom domain (CNAME):** base = `/`. Add `public/CNAME` containing the domain.
- **Project page (`user.github.io/lulu/`):** base = `/lulu/`. Router uses `import.meta.env.BASE_URL`.

### `public/404.html` (SPA fallback)

GitHub Pages serves `404.html` for any unknown path. Use the rafgraph "spa-github-pages" trick: the 404 page rewrites the URL into a query string and `index.html` reconstructs it before the router boots. Required so `/p/un-altro-sogno-2025-07-22` works as a deep link or refresh.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck && npm run test:unit
      - run: npm run build
        env: { GITHUB_PAGES: project }
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deploy.outputs.page_url }} }
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

### GitHub Pages quirks (addressed)

| Quirk | Mitigation |
|-------|-----------|
| No server rewrites → SPA deep links 404 | `public/404.html` with redirect-to-hash trick |
| Project pages live under `/<repo>/` | `base` in vite.config + `createWebHistory(BASE_URL)` |
| No HTTP headers control | Don't rely on CSP/COOP via headers; use `<meta>` if needed |
| No env vars at runtime | Bake password hash, salt, base path at build time |
| Custom domain swaps base to `/` | Detect via env, omit `/lulu/` prefix |
| `Jekyll` processes `_*` files by default | `public/.nojekyll` to disable |
| Cache: index.html may stick | Vite hashes assets; set `<meta http-equiv="Cache-Control" content="no-cache">` on index |
| Image case-sensitivity (Linux runner) | Normalize photo filenames lowercase in manifest validation |

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | `parsePoems()`, `slugify()`, PBKDF2 wrapper, manifest validator |
| Component | Vitest + @vue/test-utils | PasswordGate (correct/wrong pw), Polaroid renders alt, ZoomControls updates `--zoom` |
| E2E | Playwright | Gate flow, deep-link `/p/:slug` works, flip animation completes, focus trap, reduced-motion path, mobile touch candle |
| Visual | Playwright screenshots (optional, milestone 2+) | Room layout at 3 viewports, polaroid view, dark/light variants |
| A11y | axe-playwright | Gate, room, polaroid view |

Critical e2e: **deep link refresh** (`/p/luce-2025-07-28` reloaded) — exercises 404.html SPA fallback. This is the single most likely thing to break post-deploy.

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| 0–30 polaroids | No virtualization. Lazy-load images. ~3MB total over wire with AVIF. Fine. |
| 30–80 polaroids | Lazy-load by string row (IntersectionObserver), keep all DOM nodes. |
| 80+ polaroids | Out of scope (PROJECT.md). If ever needed: virtualize string rows, reduce LQIP size, code-split PolaroidView. |

### What breaks first

1. **Frame budget on low-end mobile** with too many `useFrame` subscribers. Mitigation: cap StringRow updates to physics-active strings only (sleep when angle ≈ 0 and no impulse).
2. **First paint with un-decoded photos.** Mitigation: LQIP base64 in manifest, `decoding="async"`, prioritize first-row images via `fetchpriority="high"`.
3. **Candle SVG mask on Safari.** Known to be slower than Chrome; test early. Fallback to `radial-gradient` background-image driven by CSS vars (no SVG mask) if needed.

## Anti-Patterns

### Anti-Pattern 1: Per-component `requestAnimationFrame`
**What people do:** Each StringRow / CandleLight / flicker effect calls its own `requestAnimationFrame`.
**Why it's wrong:** N independent loops, unsynced frame work, harder to pause as a unit, mobile battery drain.
**Do this instead:** One `useFrame` registry; components subscribe.

### Anti-Pattern 2: Pointer position as a Vue ref
**What people do:** `const x = ref(0); window.onpointermove = e => x.value = e.clientX`.
**Why it's wrong:** Triggers Vue's reactivity on every mouse event (60–500/sec). Schedules tons of microtasks.
**Do this instead:** Plain mutable `{ x, y }` updated by listener; read inside the rAF callback that owns the candle. Throttle in the producer, not consumer.

### Anti-Pattern 3: Storing the unlocked flag as a boolean in localStorage
**What people do:** `localStorage.unlocked = 'true'`.
**Why it's wrong:** Trivial to flip in DevTools (still soft, but defeats even the social barrier); persists forever across users on a shared device.
**Do this instead:** `sessionStorage` with a value derived from the password hash (proves the user actually had it). On boot, re-validate.

### Anti-Pattern 4: Fetching `poems.txt` at runtime
**What people do:** `fetch('/poems.txt').then(r => r.text()).then(parse)`.
**Why it's wrong:** Adds RTT on first paint, parse errors become runtime errors, no type safety, harder to cache (it's content not a static asset).
**Do this instead:** Vite plugin emits a typed module imported normally. HMR works for poem edits.

### Anti-Pattern 5: Two component trees for reduced motion
**What people do:** `<RoomView v-if="!reduced">` / `<RoomViewStatic v-else>`.
**Why it's wrong:** Doubles maintenance, drifts.
**Do this instead:** Single tree with a `motion` flag; CSS classes and subscription gates do the forking.

### Anti-Pattern 6: Hash-mode router to dodge 404
**What people do:** `createWebHashHistory()` so URLs like `/#/p/slug` work without 404.html.
**Why it's wrong:** Ugly URLs, breaks Open Graph previews, search bots ignore hash. The 404.html trick is small and well-known.
**Do this instead:** HTML5 history + `public/404.html` SPA fallback.

### Anti-Pattern 7: Storing the password (not just the hash) "for convenience"
**What people do:** Skip hashing; ship `if (input === 'lulu') unlock()`.
**Why it's wrong:** Anyone reading bundled JS gets the password verbatim. Hashing isn't real security here either, but it's the difference between a "soft gate" and "no gate".
**Do this instead:** PBKDF2 + salt as described.

## Phased Build Order

The architecture suggests this build order (informs roadmap phases):

1. **Foundation** — Vite + Vue + TS scaffold; router + base URL; `public/404.html` + `.nojekyll`; GitHub Actions deploy. Smoke-test: empty app deployed to Pages with deep-link refresh working.
2. **Content pipeline** — `parsePoems()` unit-tested; `vite-plugin-poems`; manifest YAML schema + validator; `data/types.ts`. Deliverable: typed `poems` and `manifest` modules importable.
3. **Password gate** — `utils/crypto.ts` (PBKDF2); `PasswordGate` component; sessionStorage flag; focus trap. Deliverable: gate guards the app.
4. **Static room** — Room background; StringRow with hard-coded sag; Polaroid component (no swing); manifest-driven layout; PolaroidView modal route with FlipCard (no flip animation yet, just toggle). Deliverable: navigable gallery.
5. **Asset pipeline** — `vite-imagetools`; AVIF/WebP/srcset; LQIP placeholders; lazy loading. Deliverable: optimized images.
6. **Candle reveal** — `usePointer`, `useFrame`, `CandleLight` SVG mask; mobile touch. Deliverable: dark room with light following pointer.
7. **String physics** — `useStringPhysics` damped spring; impulse from pointer proximity; per-polaroid wobble. Deliverable: alive room.
8. **Flip animation** — 3D rotateY transition; back-side poem render with typography pass.
9. **Accessibility polish** — `useZoom` + ZoomControls; AccessibilityPanel; `useReducedMotion` forks; "spegni candela" mode; ARIA review; axe pass.
10. **E2E + visual tests** — Playwright suite covering gate, deep link, flip, reduced-motion, mobile.
11. **Performance pass** — Lighthouse on Pages; Safari mask test; mobile FPS profiling; image budget audit.

Each phase is independently shippable to Pages. Phases 1–3 unblock everything else; phases 6–7 carry the most novel risk and should be prototyped early on a throwaway branch if schedule pressure rises.

## Integration Points

### External Services

| Service | Pattern | Notes |
|---------|---------|-------|
| GitHub Pages | Static deploy via Actions | `actions/deploy-pages@v4`; no runtime API |
| (none other) | — | No analytics, no fonts CDN if we self-host, no API |

If self-hosted fonts are not used, prefer `font-display: swap` and preload key weights to avoid FOUT on poem typography.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Build plugin ↔ app | Generated TS modules | One-way at build; HMR re-emits |
| useFrame ↔ animated components | Subscription callback | Components must clean up on unmount |
| Router ↔ keep-alive RoomView | `<keep-alive>` | RoomView keeps DOM + reactive state across `/p/:slug` visits |
| Pinia ui store ↔ CSS | CSS custom properties via watcher | `--zoom`, `--motion-scale` written to `:root` |
| usePointer ↔ CandleLight | Plain object, read in rAF | Not reactive — perf-critical |

## Sources

- Vue 3 + Vite official docs (router base URL, keep-alive)
- `vite-imagetools` README
- rafgraph/spa-github-pages (404.html SPA fallback)
- GitHub Actions `deploy-pages` v4 docs
- MDN: WebCrypto `deriveBits`, PBKDF2; `prefers-reduced-motion`; `<dialog>` patterns
- WAI-ARIA Authoring Practices: dialog (modal) pattern, focus management

---
*Architecture research for: static SPA poetry gallery on GitHub Pages*
*Researched: 2026-05-02*
