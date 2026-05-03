---
phase: 4
phase_name: Asset Pipeline (Photos)
plan_id: 04-asset-pipeline
status: ready
requirements: [ASSET-01, ASSET-02, ASSET-03, ASSET-04]
---

# Phase 4 — Asset Pipeline (Photos): PLAN

**Goal:** Le foto sono servite in formati moderni (AVIF/WebP/JPEG) con `srcset` responsive, lazy-load, LQIP placeholder, ed EXIF strippato a build con assertion di sicurezza.

**Source of truth:** `04-RESEARCH.md` in this directory.

## Tasks

### T1 — Install dependencies
- `npm install -D vite-imagetools@^10.0.0 sharp@^0.34.5`
- Verify `package.json` devDependencies updated.

### T2 — Move + normalize photo files
- `mkdir -p src/assets/photos/`
- For each entry in `content/manifest.yaml`, derive ASCII-fold slug filename `{slug}.jpg` (lowercase, single `.jpg` extension, no spaces, no diacritics).
- Move source from `photos/{original}` (root) into `src/assets/photos/{slug}.jpg`.
- Delete `public/photos/` directory entirely (was a 16 MB duplicate; obsolete after this phase).
- Delete original `photos/` directory after verifying all are moved.
- Update `content/manifest.yaml` `photo:` field to the new normalized slug filename.

### T3 — vite.config.ts: register imagetools
- Import `imagetools` from `vite-imagetools`.
- Add to `plugins` array. Plugin order: `vue() → imagetools() → poemsPlugin()`.
- Default directives via `defaultDirectives` callback: only apply when `as=picture` query is explicitly used (so other assets are untouched).

### T4 — Extend plugin-poems.ts: attach picture + lqip
- The emitted virtual module now imports each photo via `import.meta.glob('@/assets/photos/*.jpg', { query: { w: '320;640;960;1440;1920', format: 'avif;webp;jpg', as: 'picture' }, eager: true, import: 'default' })`.
- For each poem in the manifest, look up the matching photo by slug-derived filename and attach `picture` field.
- LQIP: at plugin load time, call sharp directly per-file: `sharp(path).resize({ width: 16, fit: 'inside' }).webp({ quality: 20 }).toBuffer()` → base64 data URL. Attach as `lqip` field.
- Update `Poem` TS type in `vite/poem-schema.ts`: add `picture: { sources: Record<string, string>; img: { src: string; w: number; h: number } }` and `lqip: string`.

### T5 — Create PolaroidPicture component
- File: `src/components/PolaroidPicture.vue`.
- Props: `picture` (Picture object), `lqip` (string), `alt` (string), `sizes` (string), `eager` (boolean, default false), `priority` (`'high' | 'low' | 'auto'`, default `'auto'`).
- Renders:
  ```html
  <picture>
    <source v-for="(srcset, mime) in picture.sources" :key="mime" :type="mime" :srcset="srcset" :sizes="sizes" />
    <img :src="picture.img.src" :width="picture.img.w" :height="picture.img.h"
         :alt="alt" :loading="eager ? 'eager' : 'lazy'" :fetchpriority="priority"
         decoding="async" :style="{ backgroundImage: `url(${lqip})`, backgroundSize: 'cover' }" />
  </picture>
  ```
- On `load`, fade out the LQIP background (CSS class toggle).

### T6 — Update HomeView.vue
- Replace `<img :src="\`${baseUrl}photos/${p.file}\`" ...>` inside `.home__photo` with `<PolaroidPicture :picture="p.picture" :lqip="p.lqip" :alt="p.alt ?? p.title" sizes="(max-width: 768px) 25vw, 11vw" :eager="ropeIdx === 0" :priority="ropeIdx === 0 ? 'auto' : 'low'" />`.
- Eager + auto-priority for first rope (above fold); rest lazy + low.

### T7 — Update PolaroidView.vue
- Replace `<img v-if="poem" :src="\`${baseUrl}photos/${poem.file}\`" ...>` inside `.pview__photo` with `<PolaroidPicture v-if="poem" :picture="poem.picture" :lqip="poem.lqip" :alt="poem.alt ?? poem.title" sizes="(max-width: 768px) 90vw, 26rem" eager priority="high" />`.

### T8 — EXIF assertion in post-build
- Extend `scripts/post-build.mjs` (or create `scripts/check-no-exif.mjs` and add to `npm run build` chain).
- Walk `dist/assets/*.{avif,webp,jpg,jpeg}`.
- For each, `await sharp(buf).metadata()` — assert `exif`, `iptc`, `xmp`, `icc` are undefined; assert `gps` not set.
- Process exit 1 with explicit message if any leak; otherwise print "EXIF clean: N files".

### T9 — Verify
- `npm run build` succeeds.
- `dist/assets/` contains AVIF/WebP/JPEG variants for each photo.
- EXIF check passes.
- `npm run preview` and visually confirm gallery + detail render with LQIP → full image transition.
- Total photo bundle size logged (target < 1.5 MB AVIF).

## Success Criteria

1. Every photo in the manifest is served as AVIF + WebP + JPEG with responsive `srcset`. ✓ via T3+T4+T5.
2. Off-fold photos lazy-load with `loading="lazy"`, eager+priority for above-fold. ✓ via T5+T6.
3. LQIP placeholder visible until full image decodes. ✓ via T4+T5.
4. Build fails if any output retains EXIF/GPS metadata. ✓ via T8.
5. `public/photos/` deleted; `src/assets/photos/` is the single source of truth with normalized filenames. ✓ via T2.

## Out of Scope
- AES-GCM encryption (v2).
- Service worker / PWA.
- Lighthouse perf budgets (Phase 7).
- Pinch-zoom on detail (Phase 6).

## Risk / Reversibility
- All changes confined to: `package.json`, `vite.config.ts`, `vite/plugin-poems.ts`, `vite/poem-schema.ts`, `scripts/post-build.mjs`, `src/assets/photos/`, `src/components/PolaroidPicture.vue`, `src/views/HomeView.vue`, `src/views/PolaroidView.vue`, `content/manifest.yaml`. Fully reversible via git.
- Photo move is destructive of original tree but git-tracked.
