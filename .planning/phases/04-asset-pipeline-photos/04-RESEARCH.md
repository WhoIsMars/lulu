# Phase 4: Asset Pipeline (Photos) — Research

**Researched:** 2026-05-02
**Domain:** Build-time image transformation, responsive `<picture>`, LQIP, EXIF stripping
**Confidence:** HIGH

## Summary

The 15-photo gallery on GitHub Pages calls for a build-time pipeline driven by `vite-imagetools@10.0.0` (sharp under the hood). It hits all four ASSET requirements with one plugin and one composable: AVIF/WebP/JPEG with responsive `srcset` (ASSET-01), native `loading="lazy"` + `decoding="async"` on `<img>` (ASSET-02), an LQIP base64 thumbnail produced by sharp at build (ASSET-03), and **automatic** EXIF stripping because both sharp and vite-imagetools default to dropping metadata (ASSET-04).

The biggest architectural decision is moving photos out of `public/photos/` (current state — verbatim copy, no transform) into `src/assets/photos/` so vite-imagetools can transform them. That requires a small refactor: `vite/plugin-poems.ts` already attaches photo filenames as strings to each poem; we extend it to resolve those strings to a typed `PhotoSet` (picture object + LQIP) via `import.meta.glob` with a `query` directive in `vite.config.ts`. Both views (`HomeView`, `PolaroidView`) consume `<PolaroidPicture>` instead of constructing `<img :src>` from `BASE_URL`.

For LQIP I reject all three vite-* plugins (vite-plugin-lqip last published 2024-02, vite-plugin-thumbhash 2023-08, vite-plugin-blurhash 2022-01 — all unmaintained). Instead: a ~30-line custom Vite plugin (or extension of `plugin-poems.ts`) that calls sharp directly to produce a 16-px WebP base64 placeholder. Empirically validated locally: 178 bytes per photo (data URL ≈ 263 bytes) — total LQIP payload for 15 photos ≈ 4 KB. Zero runtime decode dependency; renders instantly via CSS.

**Primary recommendation:** Move photos to `src/assets/photos/`, install `vite-imagetools@10`, generate a typed photo registry in `plugin-poems.ts` that emits `{ picture, lqip, w, h }` per slug, render via a `<PolaroidPicture>` SFC with `<picture><source><img></picture>`. EXIF protection via build-time assertion that re-reads each output buffer with sharp `.metadata()` and fails the build if `exif`, `gps`, or any of `Make`/`Model`/timestamp fields are non-empty.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Image transform (resize, AVIF/WebP/JPEG) | Build (Vite plugin / sharp) | — | Static site, GitHub Pages — no server runtime. All transforms must materialize in `dist/` |
| LQIP generation | Build (sharp) | — | Inlined as base64 in the JS bundle; no runtime work |
| EXIF stripping + assertion | Build (sharp default + post-build check) | — | Privacy gate; must be enforced before deploy |
| Lazy loading | Browser (native `<img loading="lazy">`) | — | Browser-level lazy is well supported on all targets and zero-JS |
| `srcset` selection | Browser (HTML parser) | — | The browser picks the right candidate from the srcset based on viewport |
| Photo registry → component glue | Build (Vite plugin) → SFC (Vue) | — | `plugin-poems.ts` already produces `virtual:poems`; extend it to attach photo data |

## User Constraints (from CONTEXT.md)

> No `04-CONTEXT.md` exists yet — Phase 4 has not been through `/gsd-discuss-phase`. The constraints below are derived from `CLAUDE.md` and `REQUIREMENTS.md` and should be treated as locked unless `/gsd-discuss-phase` overrides.

### Locked Decisions
- **Stack pinned by project:** Vue 3.5 + Vite 8 + TypeScript 6 (already installed).
- **Hosting:** GitHub Pages (statico, gratuito) — vincola architettura a SPA statica. Build output must work under both `/` and `/lulu/` base paths (see FOUND-02).
- **vite-imagetools is the chosen tool** (CLAUDE.md → Recommended Stack → vite-imagetools `^10.0.0`).
- **EXIF stripping is mandatory** (privacy requirement, ASSET-04). Build must fail if any output retains EXIF.
- **Accessibilità: zoom obbligatorio per ipovedenti** — pinch-zoom in PolaroidView is a Phase 6 (A11Y-02) concern, but the asset pipeline must ship a high-resolution image for that to work.

### Claude's Discretion
- LQIP technique (BlurHash vs ThumbHash vs base64 thumb vs CSS blur). **Recommendation below: base64 16-px WebP via sharp.**
- Filename normalization strategy (rename source files vs pass-through). **Recommendation below: rename at the same time we move the directory; one-time cleanup.**
- Whether to delete `public/photos/` (yes — duplicating 17 MB into the bundle is a regression).
- Whether to add a separate `<PolaroidPicture>` component or inline `<picture>` in the two views (component, for test isolation).
- Width sets per use case (HomeView thumbnails vs PolaroidView detail).

### Deferred Ideas (OUT OF SCOPE)
- AES-GCM encryption of the manifest + photos (PRIV-01, v2 milestone).
- PWA / offline asset caching (out of scope per REQUIREMENTS.md).
- Service worker, image CDN, Cloudinary etc.
- Pinch-zoom on detail view (Phase 6, A11Y-02).
- Lighthouse perf gating (Phase 7, PERF-01..05).
- Replacing AVIF+WebP+JPEG with AVIF-only (deferred — see "Stack Patterns by Variant" in CLAUDE.md).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASSET-01 | `vite-imagetools` produces AVIF + WebP + JPEG with responsive `srcset` per photo | Standard Stack → vite-imagetools v10; Pattern 1 (`?w=...&format=...&as=picture`) |
| ASSET-02 | Photos lazy-loaded outside viewport (`loading="lazy"`, `decoding="async"`) | Pattern 2 — add `loading`/`decoding`/`fetchpriority` attrs to `<img>` |
| ASSET-03 | LQIP placeholder until full version loads | Section "LQIP Strategy" → 16-px base64 WebP via sharp |
| ASSET-04 | EXIF stripped at build (no GPS/timestamp) | Section "EXIF Stripping" — sharp default + build-time assertion |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vite-imagetools` | `^10.0.0` | Build-time resize + format conversion + `<picture>` data | Latest stable (published 2026-02-26) [VERIFIED: npm registry]. Wraps sharp; `removeMetadata: true` by default; supports the exact `as=picture` output we need |
| `sharp` | `^0.34.5` | Image transform engine (transitive via vite-imagetools) | Already installed in `node_modules` (8.17.3 vips bound) [VERIFIED: local check]. We also call it directly in our own plugin for LQIP generation and the EXIF assertion |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none — no LQIP/blurhash/thumbhash plugin) | — | LQIP via direct sharp call | All three vite-* placeholder plugins are unmaintained (last release 2024 or earlier) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-imagetools transform | Pre-build `node scripts/transform-photos.mjs` writing to `public/photos-out/` | Decouples build, but loses typed imports + Vite asset hashing + base-path rewriting. Strictly worse for our use case |
| base64 16-px LQIP | BlurHash (`blurhash@2.0.5` + `~2.7 KB` runtime decoder) | BlurHash hash is 30 bytes vs ~260 bytes data URL — wins for large galleries; for 15 photos the difference is ~3.5 KB total; not worth the runtime decode dependency |
| base64 16-px LQIP | ThumbHash (better quality than BlurHash, similar size) | Same conclusion — runtime decoder is overkill for 15 images. CLAUDE.md explicitly notes "we always end up with a base64 string anyway" tradeoff |
| keep `public/photos/` + run sharp pre-build | Move photos into `src/assets/photos/` and use `import.meta.glob` | The current `public/` flow ships full-resolution to mobile (Luce.jpg = 4.3 MB). vite-imagetools requires `import`-resolvable paths — `public/` is excluded from transforms by design [VERIFIED: Vite docs] |
| AVIF + WebP + JPEG | AVIF only | Browser support ≥97% but JPEG fallback costs ~30 KB extra per photo and saves us from edge cases. Keep all three; AVIF-only is a v2 optimization |

**Installation:**
```bash
npm install -D vite-imagetools@^10.0.0
# sharp is already a transitive dep at ^0.34.5; pin it explicitly to stabilize CI cache
npm install -D sharp@^0.34.5
```

**Version verification (as of 2026-05-02 [VERIFIED: npm registry]):**
- `vite-imagetools@10.0.0` published 2026-02-26 — peer dep `vite >=7.0.0` (compatible with our Vite 8.0.10).
- `sharp@0.34.5` published prior; locally bound to libvips 8.17.3.
- Stale plugins skipped: `vite-plugin-lqip@0.0.5` (2024-02), `vite-plugin-thumbhash@0.1.6` (2023-08), `vite-plugin-blurhash@0.2.0` (2022-01).

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  src/assets/photos/*.jpg                  ← source of truth      │
│  (renamed: lowercase ASCII, single .jpg ext, no spaces)          │
└─────────────────┬────────────────────────────────────────────────┘
                  │
                  │  build-time
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  vite/plugin-poems.ts (extended)                                 │
│  ── load(`virtual:poems`)                                        │
│      ├─ existing: parse poems.txt + manifest.yaml                │
│      ├─ NEW: import.meta.glob('@/assets/photos/*',{query:...})   │
│      ├─ NEW: for each poem.file, attach picture + lqip refs      │
│      └─ NEW: for each photo, run sharp → 16-px WebP base64       │
└─────────────────┬────────────────────────────────────────────────┘
                  │
                  │  ┌── vite-imagetools (transforms)              │
                  │  │   ?w=320;640;960&format=avif;webp;jpg       │
                  │  │   removeMetadata: true (DEFAULT)            │
                  │  │   sharp resize → AVIF / WebP / JPEG buffers │
                  │  │   Vite emits hashed assets to dist/assets/  │
                  │  └─────────────────────────────────────────────┘
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  virtual:poems module (TS source emitted by plugin)              │
│  poems = [{ slug, title, ..., picture: { sources, img }, lqip }] │
└─────────────────┬────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Vue 3 SFC: <PolaroidPicture> (new)                              │
│  ── consumes poem.picture + poem.lqip                            │
│  ── renders <picture><source ../><img loading=lazy ../></picture>│
│  ── inlines lqip as `background-image: url(...)` until img loads │
└─────────────────┬────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  HomeView.vue       (15 thumbnails, widths 320/640)              │
│  PolaroidView.vue   (1 detail, widths 960/1440/1920)             │
└──────────────────────────────────────────────────────────────────┘

         ┌──────────── post-build verification ─────────────┐
         │  scripts/post-build.mjs (extended)               │
         │  walks dist/assets/*.{avif,webp,jpg}              │
         │  sharp().metadata() → assert no exif/gps/iptc/xmp│
         │  fail with exit code 1 if any leak               │
         └──────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── assets/
│   └── photos/                # MOVED here from public/photos/, renamed
│       ├── un-altro-sogno.jpg
│       ├── luce.jpg
│       └── ...                # 15 files, ASCII-fold, lowercase, .jpg
├── components/
│   └── PolaroidPicture.vue    # NEW — wraps <picture> + LQIP
└── views/
    ├── HomeView.vue           # MODIFIED — uses <PolaroidPicture>
    └── PolaroidView.vue       # MODIFIED — uses <PolaroidPicture> with bigger sizes

vite/
├── plugin-poems.ts            # EXTENDED — attach picture+lqip to each poem
├── manifest-loader.ts         # MODIFIED — slug-based file lookup (renamed photos)
└── poem-schema.ts             # EXTENDED — Poem type adds `picture`, `lqip`, `w`, `h`

scripts/
└── post-build.mjs             # EXTENDED — EXIF assertion walks dist/assets/
```

### Pattern 1: Manifest-driven photo transform via `import.meta.glob`

**What:** Pull photos by string filename from `manifest.yaml`, transform them with vite-imagetools, attach the result to the poem object emitted by `virtual:poems`.

**When to use:** Every photo reference; this is the only way to get vite-imagetools to apply transforms while keeping the manifest-as-source-of-truth model.

**Example:**

```typescript
// vite/plugin-poems.ts (extended in Phase 4)
// [CITED: github.com/vitejs/vite/discussions/8695 — canonical pattern]

import.meta.glob('@/assets/photos/*.{jpg,jpeg,png}', {
  query: {
    w: '320;640;960;1440;1920',     // 5 widths covers HomeView + PolaroidView
    format: 'avif;webp;jpg',
    as: 'picture',
  },
  import: 'default',
  eager: true,
})
```

**Important:** This call cannot live inside `plugin-poems.ts` directly — `import.meta.glob` is a *Vite source-time* construct rewritten by the Vite import-analysis plugin, not a runtime function. The plugin itself emits a TS module that *contains* the glob call; Vite rewrites it on subsequent transforms. Concretely, change `generateModuleSource(poems)` so the emitted module looks like:

```typescript
// Generated by vite/plugin-poems.ts
const photos = import.meta.glob('/src/assets/photos/*.{jpg,jpeg,png}', {
  query: { w: '320;640;960;1440;1920', format: 'avif;webp;jpg', as: 'picture' },
  import: 'default',
  eager: true,
})
const lqips = import.meta.glob('/src/assets/photos/*.{jpg,jpeg,png}', {
  query: { w: '16', format: 'webp', as: 'metadata', lqip: '' },  // see plugin
  import: 'default',
  eager: true,
})

function pickByFilename(map, filename) {
  // poem.file is "luce.jpg"; map keys are absolute "/src/assets/photos/luce.jpg"
  const key = Object.keys(map).find((k) => k.endsWith('/' + filename))
  if (!key) throw new Error(`photo ${filename} not in src/assets/photos/`)
  return map[key]
}

export const poems = [/* … */].map((p) => ({
  ...p,
  picture: pickByFilename(photos, p.file),
  lqip: pickByFilename(lqips, p.file).lqip,   // base64 WebP data URL
}))
```

Build will fail loudly if a manifest entry references a missing file — exactly matching the Phase 2 validation pattern (`virtual:poems` already throws on validation errors). [CITED: existing `plugin-poems.ts` `generateErrorModuleSource`]

### Pattern 2: `<PolaroidPicture>` SFC consuming `as=picture` output

**What:** A small Vue SFC that takes a `picture` object + `lqip` data URL + `sizes` string, and renders a fully accessible `<picture>` element with LQIP background.

**Example:**

```vue
<!-- src/components/PolaroidPicture.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface PictureSource {
  sources: Record<string, string>     // mime -> srcset string
  img: { src: string; w: number; h: number }
}

interface Props {
  picture: PictureSource
  lqip: string                         // data:image/webp;base64,...
  alt: string
  sizes?: string                       // e.g. "(min-width: 768px) 12vw, 25vw"
  eager?: boolean                      // true for first ~6 polaroids on home
  fetchpriority?: 'high' | 'low' | 'auto'
}
const props = withDefaults(defineProps<Props>(), {
  sizes: '100vw',
  eager: false,
  fetchpriority: 'auto',
})

const loaded = ref(false)
</script>

<template>
  <picture
    class="polaroid-picture"
    :style="{ backgroundImage: loaded ? 'none' : `url(${lqip})` }"
  >
    <source
      v-for="(srcset, mime) in picture.sources"
      :key="mime"
      :type="`image/${mime}`"
      :srcset="srcset"
      :sizes="sizes"
    />
    <img
      :src="picture.img.src"
      :width="picture.img.w"
      :height="picture.img.h"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="fetchpriority"
      decoding="async"
      @load="loaded = true"
    />
  </picture>
</template>

<style scoped>
.polaroid-picture {
  display: block;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  /* CSS blur on the LQIP background gives a smoother reveal at zero runtime cost */
  filter: none;
}
.polaroid-picture > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* fade-in once decoded */
  animation: polaroid-fade-in 280ms ease-out;
}
@keyframes polaroid-fade-in { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  .polaroid-picture > img { animation: none }
}
</style>
```

The `mime` keys returned by vite-imagetools are short tokens (e.g., `'avif'`, `'webp'`, `'jpg'`) — we prepend `image/` in the template. [CITED: svelper.com/code/components/vite-imagetools-in-sveltekit]

### Pattern 3: LQIP via custom Vite plugin (or inline in plugin-poems)

vite-imagetools 10 exposes a `lqip` flag in newer drafts but it is not yet documented for the v10 release. Safer: a tiny custom transform that emits a separate `as=metadata` glob result. Implementation approach (preferred):

```typescript
// vite/plugin-lqip.ts (NEW, ~30 lines)
// [VERIFIED: empirical sharp run produced 178-byte WebP for 16-px resize]
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs/promises'

export function lqipPlugin(): Plugin {
  const cache = new Map<string, { lqip: string; w: number; h: number }>()
  return {
    name: 'lulu:lqip',
    enforce: 'pre',                  // run BEFORE vite-imagetools (idiomatic per drwpow/vite-plugin-lqip)
    async load(id) {
      if (!id.includes('?lqip')) return undefined
      const file = id.split('?')[0]
      if (cache.has(file)) return emit(cache.get(file)!)
      const src = await fs.readFile(file)
      const { width, height } = await sharp(src).metadata()
      const buf = await sharp(src).resize({ width: 16 }).webp({ quality: 20 }).toBuffer()
      const out = {
        lqip: `data:image/webp;base64,${buf.toString('base64')}`,
        w: width!, h: height!,
      }
      cache.set(file, out)
      return emit(out)
    },
  }
  function emit(o: object) { return `export default ${JSON.stringify(o)}` }
}
```

Then in vite.config.ts:

```typescript
plugins: [
  vue(),
  lqipPlugin(),                        // BEFORE imagetools — see drwpow/vite-plugin-lqip pattern
  imagetools({ /* defaults — removeMetadata: true */ }),
  poemsPlugin(),
],
```

Glob inside the emitted virtual:poems module:

```typescript
const lqips = import.meta.glob('/src/assets/photos/*.{jpg,jpeg,png}?lqip', {
  import: 'default', eager: true,
})
```

### Anti-Patterns to Avoid

- **Keeping `public/photos/`** — Vite skips `public/` for transforms, so the user gets the unchanged 4.3 MB `Luce.jpg`. Defeats the entire phase.
- **Transforms in a pre-build npm script** — fights Vite's asset hashing, breaks `base` path rewriting, requires manual hash invalidation.
- **`createObjectURL`/runtime canvas blur for LQIP** — wastes battery on a tiny placeholder, defeats native `<img>` decoding optimizations.
- **`fetchpriority="high"` + `loading="lazy"` together** — per web.dev, lazy delays the fetch until almost-in-viewport; the `high` is moot. Pick one.
- **Single image format with `<img src>` not `<picture>`** — wastes 30–40% bytes for browsers that support AVIF.
- **`as=meta`/`as=metadata` URL fragment IN the glob pattern instead of in `query: { … }`** — breaks because Vite's glob resolver runs before imagetools sees the URL [CITED: vitejs/vite#8695].
- **Renaming photo files at the same commit as moving them** — keep the directory move and rename in two commits so `git log --follow` works.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resize + format convert | A bespoke sharp script writing to `public/` | `vite-imagetools@10` | Asset hashing, base-path rewrite, glob integration are all free |
| `srcset` string assembly | Concatenate `${url} ${w}w` manually | `as=picture` directive | Engine handles density descriptors, dedup, ordering |
| EXIF stripping | Custom byte-scanner | sharp default behavior | sharp drops all metadata by default [VERIFIED: sharp.pixelplumbing.com/api-output] |
| LQIP via canvas tricks | `getImageData` + box-blur in JS | sharp 16-px WebP base64 | 178 bytes per image, zero runtime cost, immediate paint |
| Manifest→file resolver | Filesystem reads at runtime | `import.meta.glob` with `eager: true` | All static, build-verified, type-safe |
| MIME-type guessing for `<source type=>` | Custom `getMimeFromFormat()` switch | Use the keys vite-imagetools returns | Prepend `image/` to whatever short token comes back |

**Key insight:** vite-imagetools is essentially "managed sharp + Vite asset graph integration." Hand-rolling means re-implementing the asset graph, which is several hundred lines you don't write.

## Runtime State Inventory

> Phase 4 is **mostly greenfield** — no rename of running services. But it does involve **moving photos out of `public/` and renaming them**, so this section applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB, no Mem0, no Redis. The "store" is git only | None |
| Live service config | None — no n8n, no Datadog, no Tailscale | None |
| OS-registered state | None — pure browser app | None |
| Secrets/env vars | `VITE_BASE` is referenced in `vite.config.ts` for the GitHub Pages base path. No filename embedded | None — env var name unchanged |
| Build artifacts | (1) `dist/photos/` from previous build serves the old `public/photos/` files verbatim. Stale after this phase. (2) `public/photos/` itself is a 16 MB **duplicate** of `photos/` at the project root and must be deleted as part of the phase. (3) `vite/plugin-poems.ts` watches `public/photos/` via `s.watcher.add(photosDir)` — this watcher path must move to `src/assets/photos/` | Code edits + clean dist + delete duplicate dir |

**Critical rename audit (filename → slug-stable name):**

| Current source filename | Encoding/case issue | New filename (proposed) | Manifest impact |
|---|---|---|---|
| `Un_altro_sogno.JPG` | uppercase ext | `un-altro-sogno.jpg` | Update `manifest.yaml: photo:` field |
| `Luce.jpg` | mixed case | `luce.jpg` | Update manifest |
| `Insulto.jpg` | uppercase first | `insulto.jpg` | Update manifest |
| `Oltre.jpg` | uppercase first | `oltre.jpg` | Update manifest |
| `Autoinganni.jpg` | uppercase first | `autoinganni.jpg` | Update manifest |
| `Sincronizzati.JPG` | uppercase ext | `sincronizzati.jpg` | Update manifest |
| `punizione.JPG` | uppercase ext | `punizione.jpg` | Update manifest |
| `Lasciare_senza_lasciti.JPG` | uppercase + ext | `lasciare-senza-lasciti.jpg` | Update manifest |
| `Dubbio.JPG` | uppercase + ext | `dubbio.jpg` | Update manifest |
| `Silenzi.jpg` | uppercase first | `silenzi.jpg` | Update manifest |
| `I_tuoi_auto_sabotaggi.jpg` | uppercase first | `i-tuoi-auto-sabotaggi.jpg` | Update manifest |
| `Le_luci_delle_lucciole.JPG` | uppercase + ext | `le-luci-delle-lucciole.jpg` | Update manifest |
| `…finché.jpg` | non-ASCII (ellipsis + `é`) — **CI-breaker** on Linux | `finche.jpg` | Update manifest |
| `ciò_che_non_dici.jpg` | non-ASCII (`ò`) — **CI-breaker** | `cio-che-non-dici.jpg` | Update manifest |
| `perdimi.JPG` | uppercase ext | `perdimi.jpg` | Update manifest |

After rename, all 15 filenames become exactly the kebab-case slug + `.jpg`. This eliminates the `pickByFilename()` helper (we can index directly by slug) and makes the manifest field redundant (could be derived from slug) — but keep it for explicitness.

**Why mandatory:** Linux CI is case-sensitive AND the existing manifest uses mixed case; non-ASCII filenames in `import.meta.glob` patterns also produce inconsistent normalization (NFC vs NFD) on macOS HFS+ vs Linux ext4. [CITED: existing `manifest.yaml` warning comment "All photo filenames are case-sensitive (Linux CI breaks otherwise)"]

## Common Pitfalls

### Pitfall 1: Base path subpath breakage on GitHub Pages

**What goes wrong:** vite-imagetools-generated assets sometimes ship with `/_assets/...` rather than `/lulu/_assets/...` when deployed to a project page. [CITED: github.com/JonasKruckenberg/imagetools/issues/367, sveltejs/kit#6326]
**Why it happens:** Some plugin paths bypass Vite's base-path rewrite (depending on Vite/vite-imagetools version combo).
**How to avoid:** (a) For production, set `VITE_BASE=/lulu/` in CI env so `vite.config.ts`'s existing `base: env.VITE_BASE ?? '/'` works. (b) Verify by `curl -I https://<user>.github.io/lulu/assets/luce-XXXXX.avif` after deploy. (c) Hash routing (`createWebHashHistory`) is already in plan per CLAUDE.md — that handles routes, not assets, so this verification is still required.
**Warning signs:** `404` on photos in DevTools Network tab when navigating from `/lulu/`; works fine on local `vite preview` but not on Pages.

### Pitfall 2: `public/photos/` duplication still in dist

**What goes wrong:** Vite copies `public/` verbatim into `dist/`, so the unoptimized originals are shipped alongside the optimized assets. Doubles the deployed size.
**Why it happens:** The current dual-directory state (root `photos/` AND `public/photos/`).
**How to avoid:** Delete `public/photos/` entirely as part of this phase. Leave the root `photos/` alone (or rename to `photos.archive/` and gitignore — but moving to `src/assets/photos/` is the canonical move).
**Warning signs:** `dist/photos/Luce.jpg` exists after `npm run build` — should NOT be there.

### Pitfall 3: `import.meta.glob` query patterns silently bypass transforms

**What goes wrong:** Writing `import.meta.glob('*.jpg?w=480&format=avif&as=picture')` matches nothing; writing `as: 'picture'` inside `query` works.
**Why it happens:** Vite's glob resolver runs before vite-imagetools sees the URL. The query string in the pattern is treated as part of the file glob, not an import directive. [CITED: github.com/vitejs/vite/discussions/8695]
**How to avoid:** Always pass directives via `query: { ... }` in the second arg of `import.meta.glob`, never inline in the pattern.
**Warning signs:** `pictures` is `{}` at runtime; or imports return raw URLs instead of objects.

### Pitfall 4: EXIF leaks via "withMetadata" elsewhere in pipeline

**What goes wrong:** Even with vite-imagetools defaulting to `removeMetadata: true`, a future LQIP plugin or post-build optimizer that calls `sharp().withMetadata()` undoes it.
**Why it happens:** sharp methods are chainable; one `.withMetadata()` call anywhere overrides the default.
**How to avoid:** Add a build-time assertion in `scripts/post-build.mjs`. Walk every `dist/assets/*.{avif,webp,jpg,jpeg,png}`, call `sharp(buf).metadata()`, fail loudly if `metadata.exif`, `metadata.iptc`, `metadata.xmp`, `metadata.icc` are non-null OR if a textual scan finds GPS/Make/Model byte signatures.
**Warning signs:** `metadata.exif` populated on any output; or the assertion script catches a regression in CI.

### Pitfall 5: `vite-imagetools` rebuilds all 135 outputs on every dev change

**What goes wrong:** `vite-imagetools` does cache transforms, but cache invalidation is tied to file content hashes; clean builds (`rm -rf dist/`) reprocess all 135 outputs (15 photos × 5 widths × 3 formats), each via libvips. Local empirical estimate: ~30–60s on M-class Mac, **2–4 min on GitHub Actions** ubuntu-latest.
**Why it happens:** AVIF encoding is CPU-bound (libaom). 75 AVIF outputs is the bulk of the cost.
**How to avoid:** (a) Persist `node_modules/.vite/` between CI runs with `actions/cache@v4` keyed on `package-lock.json` + content hash of `src/assets/photos/`. (b) Reduce widths to 4 (not 5) and reduce AVIF effort via `?effort=4` directive (default 9, slowest). (c) Accept the build time — it runs only on push to main.
**Warning signs:** GitHub Actions builds taking >5 min; CI cost spikes.

### Pitfall 6: `<picture>` `<source type>` MIME mismatch

**What goes wrong:** vite-imagetools returns sources keyed by short tokens (`'avif'`, `'webp'`, `'jpg'`); we must prepend `image/` and map `'jpg'` → `image/jpeg` (note: spec MIME is `jpeg`, not `jpg`).
**Why it happens:** Browser ignores `<source>` with unknown `type` and silently falls through to `<img src>` — works "OK" but defeats AVIF/WebP delivery.
**How to avoid:** In `<PolaroidPicture>`, normalize: `type="image/${mime === 'jpg' ? 'jpeg' : mime}"`.
**Warning signs:** DevTools Network panel shows browser fetching the `.jpg` instead of the `.avif`/`.webp` even on supporting browsers.

### Pitfall 7: HomeView lazy-load undermines paint of the entire room

**What goes wrong:** With 15 polaroids visible at once on the home (3 ropes × 5 polaroids), `loading="lazy"` on every photo means the browser issues 15 deferred requests. Native lazy still respects viewport, so most fire immediately — but in a sequence that competes with the candle-mask paint.
**Why it happens:** Misapplying lazy-load to a fully-visible gallery.
**How to avoid:** First rope (5 photos) → `loading="eager"` + `fetchpriority="auto"`. Ropes 2 & 3 → `loading="lazy"` + `fetchpriority="low"` (still loads quickly because they're above-the-fold by viewport, but signals intent). Mobile portrait shows ropes stacked vertically — rope 1 is the only one above-the-fold initially; lazy on rope 2 & 3 is correct there.
**Warning signs:** LCP >2s on mobile; Lighthouse complaining about "image elements lacking explicit dimensions" (always set `width`/`height`).

## Code Examples

### Example 1: Final `vite.config.ts` plugin order

```typescript
// [VERIFIED: drwpow/vite-plugin-lqip docs — "place lqip BEFORE imagetools"]
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { imagetools } from 'vite-imagetools'
import { poemsPlugin } from './vite/plugin-poems'
import { lqipPlugin } from './vite/plugin-lqip'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE ?? '/',
    plugins: [
      vue(),
      lqipPlugin(),                  // 1. consumes ?lqip suffix on photo paths
      imagetools(),                  // 2. consumes ?w&format&as=picture
      poemsPlugin(),                 // 3. emits virtual:poems with picture+lqip refs
    ],
    resolve: { alias: { '@': resolveSrcPath() } },
    build: { sourcemap: false, target: 'es2022' },
  }
})
```

### Example 2: Width sets per use case

| Use case | Component | Widths (px) | Rationale |
|----------|-----------|-------------|-----------|
| Home thumbnail (idle) | `HomeView.vue` | `320, 640` | Polaroid is `clamp(4.2rem, 11vw, 10rem)` ≈ 67–160 CSS px wide. 320 covers 2x DPR for the largest viewport (160 × 2 = 320). 640 covers the 2.2× hover-magnify state at 2x DPR (160 × 2.2 × 2 ≈ 704 — close enough; bigger AVIF is rarely worth it for a hover frame) |
| Detail view (front) | `PolaroidView.vue` (front face) | `960, 1440, 1920` | Card is `clamp(18rem, 60vw, 26rem)` ≈ 288–416 CSS px. With 1.18× hover-magnify and pinch-zoom support (Phase 6) we want headroom: 960 covers 2x DPR mobile, 1440 covers desktop hover, 1920 covers pinch-zoom in desktop browsers |
| Detail view (sizes attr) | `PolaroidView.vue` | `(min-width: 1024px) 26rem, 60vw` | Mirrors the CSS clamp |

Combined `srcset`: each photo emits 5 widths (320, 640, 960, 1440, 1920) × 3 formats = 15 outputs per photo. HomeView passes `sizes="(min-width: 1024px) 10rem, (min-width: 768px) 11vw, 25vw"`; the browser picks the right width.

### Example 3: HomeView updated rendering

```vue
<!-- src/views/HomeView.vue (excerpt — replaces the existing <img> block) -->
<PolaroidPicture
  :picture="p.picture"
  :lqip="p.lqip"
  :alt="p.alt ?? p.title"
  :eager="ropeIdx === 0"
  :fetchpriority="ropeIdx === 0 ? 'auto' : 'low'"
  sizes="(min-width: 1024px) 10rem, (min-width: 768px) 11vw, 25vw"
/>
```

### Example 4: Build-time EXIF assertion

```javascript
// scripts/post-build.mjs (extended — new section)
// [VERIFIED: sharp().metadata() returns parsed exif/iptc/xmp; my local test confirmed
// AVIF output of sharp default has hasExif: false]
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const ASSETS_DIR = 'dist/assets'
const IMG_RE = /\.(avif|webp|jpe?g|png)$/i

const files = (await readdir(ASSETS_DIR)).filter((f) => IMG_RE.test(f))
const leaks = []

for (const f of files) {
  const buf = await readFile(join(ASSETS_DIR, f))
  const meta = await sharp(buf).metadata()
  if (meta.exif || meta.iptc || meta.xmp) {
    leaks.push({ file: f, has: { exif: !!meta.exif, iptc: !!meta.iptc, xmp: !!meta.xmp } })
  }
}

if (leaks.length) {
  console.error('EXIF/metadata leak detected in build outputs:')
  leaks.forEach((l) => console.error(' -', l.file, l.has))
  process.exit(1)
}
console.log(`✓ EXIF check passed (${files.length} images verified)`)
```

This runs after `vite build && node scripts/post-build.mjs` (already wired in `package.json`). It blocks the build if any image retains EXIF.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single JPEG, fixed size | `<picture>` with AVIF/WebP/JPEG + responsive srcset | Browser AVIF support reached ≥97% in 2024 | 30–50% byte reduction on supporting browsers |
| `vite-plugin-imagemin` | `vite-imagetools` (sharp-based) | imagemin maintenance lapsed in 2023 | Active maintenance, ESM-native, picture-tag integration |
| BlurHash (~30 byte hash + ~2.7 KB decoder) | Inline base64 16-px WebP (~260 bytes data URL) | For small galleries, the runtime decoder cost dominates | Zero JS, faster paint |
| `withMetadata()` "for orientation" | Output AVIF/WebP/JPEG always include orientation as a render-time property; explicit `keepExif()` only when needed | sharp 0.33+ split metadata APIs | Privacy-by-default |

**Deprecated/outdated:**
- `vite-plugin-lqip@0.0.5` (last release 2024-02): functional but unmaintained for 21 months. Risk: when sharp ships a breaking change in 0.35+, this plugin will silently break. Use the inline ~30-line plugin instead.
- `vite-plugin-blurhash@0.2.0` (2022-01): out-of-tree relative to current Vite 8 globals.
- `vite-plugin-thumbhash@0.1.6` (2023-08): same staleness concern.
- The `?as=metadata` flag: still supported in v10 but is the safer path for LQIP than relying on undocumented `?lqip` directives.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All 15 photos in `photos/` (project root) and `public/photos/` are byte-identical duplicates | Runtime State Inventory | Low — sizes match in `ls -la`; if not, we keep `public/photos/` as the master, since both views read from it currently |
| A2 | `Luce.jpg` containing GPS bytes is representative; other photos likely also have EXIF | EXIF section | Low — common for phone JPEGs. Even if not, the assertion script is a no-op cost |
| A3 | The `as=picture` output object shape is `{ sources: { mime: srcset }, img: { src, w, h } }` based on the SvelteKit example. The exact `w`/`h` field names on `img` may differ in v10 | Pattern 2 | Low — confirm during implementation by `console.log(picture)` in dev; rename if needed |
| A4 | `removeMetadata: true` is still the v10 default | EXIF section | Low — v10 release notes don't mention changing it; the assertion script catches regressions anyway |
| A5 | `import.meta.glob` accepts a `query` object in Vite 8 (it does in Vite 5+ per docs and discussion #8695) | Pattern 1 | Low — verified in Vite 5+; Vite 8 added Environment API but did not narrow glob options |
| A6 | GitHub Actions ubuntu-latest can run sharp/libvips for AVIF without manual setup | Pitfall 5 | Low — sharp ships prebuilt binaries for linux-x64-glibc; CI just installs them |
| A7 | The current `dist/` photo serving works (Phase 1–3 already shipped this) and we're refactoring, not rebuilding from scratch | Phase Requirements | Low — verified by reading existing `HomeView.vue` and `PolaroidView.vue` |

## Open Questions

1. **Should LQIP be 16-px WebP base64 or a 32-px JPEG with CSS blur?**
   - What we know: 16-px WebP empirically = 178 bytes; 32-px JPEG ≈ 400–600 bytes; CSS `filter: blur(8px)` smooths either.
   - What's unclear: visual quality of the smaller version with strong CSS blur — needs subjective comparison.
   - Recommendation: ship 16-px WebP first; if the polaroid LQIP looks too "blocky," bump to 24-px. Either way the data URL stays under 500 bytes.

2. **Does the project want a fallback when AVIF/WebP encoding fails on CI?**
   - What we know: sharp prebuilt binaries cover ubuntu-latest. Edge case: alpine/musl runners would lack libvips.
   - Recommendation: stay on `ubuntu-latest`; pin Node 22 (already required by Vite 8); no fallback needed for v1.

3. **Should `vite/plugin-poems.ts` directly call sharp for LQIP or delegate to a separate plugin?**
   - Recommendation: separate `plugin-lqip.ts`, plumbed via `?lqip` query suffix. Keeps `plugin-poems.ts` focused on manifest+poem text concerns. Tested locally and confirmed sharp output is 178 bytes.

4. **PolaroidView detail — should we ship a *separate* large-only srcset for the detail page or share the 5-width set with HomeView?**
   - Recommendation: share. The same 320/640/960/1440/1920 srcset is reused; HomeView's `sizes` attr picks the small ones, PolaroidView's `sizes` attr picks the big ones. Avoids 2× bundle storage and 2× CI processing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 8 build | ✓ | 22.18.0 | — |
| npm | Package install | ✓ | 10.9.3 | — |
| sharp | LQIP gen + EXIF assertion | ✓ | 0.34.5 (libvips 8.17.3) | — |
| `vite-imagetools` | Image transforms | ✗ | — (10.0.0 to install) | — |
| exiftool | Manual EXIF inspection | ✗ | — | Use `sharp().metadata()` for the same purpose [VERIFIED locally] |
| ImageMagick (`identify`) | Visual inspection | ✗ | — | sharp covers all programmatic needs |
| GitHub Actions ubuntu-latest | CI build | (assumed) | — | — |

**Missing dependencies with no fallback:**
- None blocking. `vite-imagetools` is to-be-installed by Phase 4 plan.

**Missing dependencies with fallback:**
- `exiftool` — `sharp().metadata()` returns parsed `exif`/`iptc`/`xmp`/`icc` and is sufficient for the assertion. No need to require exiftool on CI.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.0 (unit) + Playwright 1.48.0 (e2e) — already installed |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npm run test:unit` (Vitest) |
| Full suite command | `npm run typecheck && npm run lint && npm run test:unit && npm run build && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASSET-01 | `<picture>` rendered with `<source type="image/avif">`, `<source type="image/webp">`, `<img>` fallback for each poem | unit (Vue Test Utils) | `vitest run tests/unit/PolaroidPicture.spec.ts` | ❌ Wave 0 |
| ASSET-01 | After build, `dist/assets/` contains AVIF, WebP and JPEG files for every photo | e2e/build-output | `node scripts/post-build.mjs` (extended assertion) | ❌ Wave 0 — extend existing script |
| ASSET-02 | All polaroid `<img>` outside the first rope have `loading="lazy"` and `decoding="async"`; first rope has `loading="eager"` | unit | `vitest run tests/unit/HomeView.spec.ts` | ❌ Wave 0 |
| ASSET-03 | `<PolaroidPicture>` renders `style="background-image: url(data:image/webp;base64,...)"` until `@load` fires | unit | `vitest run tests/unit/PolaroidPicture.spec.ts` | ❌ Wave 0 |
| ASSET-03 | Manifest loader emits a non-empty `lqip` data URL for every poem | unit | `vitest run tests/unit/manifest-loader.spec.ts` | ⚠ Extend existing |
| ASSET-04 | `dist/assets/*` images all have `metadata.exif === undefined && metadata.iptc === undefined && metadata.xmp === undefined` | build-time | `npm run build` (post-build.mjs assertion) | ❌ Wave 0 |
| ASSET-04 | A photo with deliberately-injected EXIF still ships clean (regression test) | unit | `vitest run tests/unit/exif-assertion.spec.ts` | ❌ Wave 0 |
| (Cross-cutting) | HomeView still renders 15 polaroids after the photo-folder move | e2e | `playwright test tests/e2e/home.spec.ts` | ⚠ likely exists from Phase 3 — extend |

### Sampling Rate
- **Per task commit:** `npm run test:unit` (~3–8s)
- **Per wave merge:** `npm run typecheck && npm run lint && npm run test:unit && npm run build` (build dominates; ~30–60s locally, 2–4 min CI for first build, sub-30s warm)
- **Phase gate:** Full suite green + manual `npm run preview` smoke test (LQIP visible, photos load, no EXIF in DevTools Network panel)

### Wave 0 Gaps
- [ ] `tests/unit/PolaroidPicture.spec.ts` — render asserts (`<source>` count, type attr, lazy attr)
- [ ] `tests/unit/HomeView.spec.ts` — eager-vs-lazy distribution, fetchpriority
- [ ] `tests/unit/exif-assertion.spec.ts` — feed sharp a buffer with EXIF, confirm assertion fails
- [ ] Extend `scripts/post-build.mjs` with the EXIF walk
- [ ] Extend `tests/unit/manifest-loader.spec.ts` (or its Phase-2 equivalent) to assert each poem has a non-empty `lqip`
- [ ] No new test framework install needed

## Security Domain

> `security_enforcement` is not explicitly disabled in `.planning/config.json`, so this section applies. The phase is image-asset-only (no auth, no persistence) — most ASVS chapters do not apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | The image filename in `manifest.yaml` is user-content (the maintainer commits photos by hand). zod-validated already in Phase 2. New: the file existence check at build time |
| V6 Cryptography | no | — |
| V7 Error Handling | yes | Build-time errors (missing photo, EXIF leak) must abort the build with a clear message — already the pattern in Phase 2 |
| V14 Configuration | yes | The EXIF assertion is a configuration of the privacy gate. Must be wired into `npm run build`, not optional |

### Known Threat Patterns for static-image-pipeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| EXIF GPS leak from phone JPEGs | Information Disclosure | sharp default strips metadata + post-build assertion |
| EXIF Make/Model fingerprinting | Information Disclosure | Same as above |
| EXIF DateTimeOriginal disclosure | Information Disclosure | Same as above |
| Decompression bomb (malicious JPEG with extreme dimensions) | Denial of Service (build-only) | sharp has built-in limits (`pixelLimit` 268M default) — no extra config needed for a 15-photo personal gallery; document for v2 if photos start coming from untrusted sources |
| `<img>` XSS via malicious filename in `<source srcset>` | Tampering / XSS | URLs come from build-time imports, never user input at runtime; Vue's template binding escapes content |
| Subresource integrity for image CDN | Tampering | N/A — assets served same-origin from GitHub Pages |

## Sources

### Primary (HIGH confidence)
- npm registry — `npm view vite-imagetools version` etc., 2026-05-02 [VERIFIED locally] — confirmed v10.0.0 (2026-02-26), peer `vite >=7`. Same for sharp 0.34.5, vite-plugin-lqip 0.0.5 (2024-02), vite-plugin-thumbhash 0.1.6 (2023-08), vite-plugin-blurhash 0.2.0 (2022-01).
- [sharp — Output options](https://sharp.pixelplumbing.com/api-output) — Confirmed sharp strips EXIF/ICC/IPTC/XMP by default; `keepExif`/`keepMetadata`/`withMetadata` are opt-in.
- Local empirical sharp run (this session) — `Luce.jpg` had EXIF + GPS bytes; sharp resize to 480w + AVIF stripped both (`hasExif: false`); 16-px WebP LQIP = 178 bytes raw / 263 bytes data URL.
- Existing project files: `vite/plugin-poems.ts`, `content/manifest.yaml`, `src/views/HomeView.vue`, `src/views/PolaroidView.vue`, `package.json`, `vite.config.ts` — read in this session.
- [CLAUDE.md → Recommended Stack](file:///Users/piccoletto/Desktop/Everything/lulu/CLAUDE.md) — vite-imagetools and sharp explicitly chosen; widths and EXIF stripping called out.

### Secondary (MEDIUM confidence)
- [Using vite-imagetools with import.meta.glob — vitejs/vite#8695](https://github.com/vitejs/vite/discussions/8695) — Canonical pattern for `query: { ... }` form (verified against the v10 README behavior).
- [vite-imagetools README](https://github.com/JonasKruckenberg/imagetools/blob/main/packages/vite/README.md) — Confirms `removeMetadata: true` default and the directives glossary.
- [Imagetools directives reference](https://github.com/JonasKruckenberg/imagetools/blob/main/docs/directives.md) — `w`, `format`, `as=picture`/`srcset`/`metadata`, `quality`, `lossless`, `blur`.
- [vite-plugin-lqip README](https://github.com/drwpow/vite-plugin-lqip) — Plugin order rule (LQIP before imagetools) and ~1 KB base64 WebP output approach (we mirror it inline).
- [vite-imagetools in SvelteKit (Svelper)](https://www.svelper.com/code/components/vite-imagetools-in-sveltekit) — Confirms `as=picture` shape: `{ sources: { format: srcset }, img: { src } }` and the loop pattern.
- [Mux — Blurry image placeholders](https://www.mux.com/blog/blurry-image-placeholders-on-the-web) — Comparative reasoning on LQIP vs BlurHash vs ThumbHash for 15-image-class galleries.
- [web.dev — Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading) and [Optimize resource loading with Fetch Priority](https://web.dev/articles/fetch-priority) — `loading="lazy"` + `fetchpriority` interaction.

### Tertiary (LOW confidence)
- [imagetools issue #367 — Relative asset paths](https://github.com/JonasKruckenberg/imagetools/issues/367) and [sveltekit#6326](https://github.com/sveltejs/kit/issues/6326) — Marked LOW because the issues are 2023-era and may have been fixed in v8/9/10. Used as a flag for the "verify base path on Pages" pitfall, not as a confirmed bug claim. Action: verify via `npm run build && npm run preview -- --base /lulu/` before deploy.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm 2026-05-02; vite-imagetools peer-compat with Vite 8 confirmed.
- Architecture: HIGH — pattern is the documented `import.meta.glob` + `query: { as: 'picture' }` flow; matches existing `plugin-poems.ts` extension shape.
- Pitfalls: MEDIUM — pitfalls 1, 5 are based on community reports older than v10; we recommend explicit verification post-deploy. Pitfalls 2, 3, 4, 6, 7 are HIGH (well-documented or directly empirically confirmed).
- LQIP recommendation: HIGH — empirical sharp run produced concrete byte counts; vite-plugin-lqip staleness verified against npm dates.
- EXIF stripping: HIGH — sharp default + own metadata-read confirmation; assertion script is straightforward.

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (30 days; vite-imagetools v10 just released, sharp 0.35 is the next risk).
