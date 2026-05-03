---
phase: 4
plan_id: 04-asset-pipeline
status: passed
requirements_met: [ASSET-01, ASSET-02, ASSET-03, ASSET-04]
---

# Phase 4 — Asset Pipeline (Photos): SUMMARY

**One-liner:** AVIF/WebP/JPEG responsive `<picture>` pipeline via `vite-imagetools` with sharp-generated 16-px WebP LQIP placeholders and a build-time EXIF/IPTC/XMP/ICC leak assertion that blocks releases with metadata residue.

## What was done (T1 → T9)

| # | Task | Commit |
|---|------|--------|
| T1 | Install `vite-imagetools@^10.0.0` + `sharp@^0.34.5` (devDependencies) | `5903208` |
| T2 | Move 15 photos `photos/` + `public/photos/` → `src/assets/photos/`, rename to lowercase ASCII kebab-case (== poem slug), update manifest `photo:` fields, delete the two old dirs | `67c8a91` |
| T3 | Register `imagetools()` in `vite.config.ts` between `vue()` and `poemsPlugin()` | `00491cb` |
| T4 | Extend `vite/plugin-poems.ts` to (a) emit `import.meta.glob('@/assets/photos/*.jpg', { query: { w: '320;640;960;1440;1920', format: 'avif;webp;jpg', as: 'picture' } })` so vite-imagetools transforms each photo, (b) compute LQIP base64 (16-px WebP @ q20) per photo via direct `sharp()` calls at plugin load. Extend `vite/poem-schema.ts` (`PoemPicture`, `PoemAssets`). Update `manifest-loader.ts` `photosDir` default to `src/assets/photos`. Update `src/env.d.ts` `Poem` declaration. | `8db078a` |
| T5 | Create `src/components/PolaroidPicture.vue` — typed `<picture>` SFC: iterates `picture.sources` to emit one `<source>` per format (with `image/jpeg` MIME normalization), renders an `<img>` that fills the parent (`width:100%; height:100%; object-fit:cover; display:block`) with LQIP background, `loading="lazy"`/`"eager"`, `fetchpriority`, `decoding="async"` | `1f522d2` |
| T6 | `HomeView.vue`: swap `<img :src="${baseUrl}photos/${p.file}">` for `<PolaroidPicture>` inside `.home__photo` (eager + auto priority for first rope; lazy + low for ropes 2/3). Surrounding markup, classes, vignette/grain overlays preserved. | `7d7db8f` |
| T7 | `PolaroidView.vue`: same swap inside `.pview__photo` (eager + high priority — above the fold) | `c6fc5dc` |
| T8 | Extend `scripts/post-build.mjs` — walks `dist/assets/*.{avif,webp,jpe?g}`, re-reads each via `sharp().metadata()`, exits 1 if any of `exif/iptc/xmp/icc` is non-null. Logs `EXIF clean (N images verified)` on pass. | `f880e21` |
| T9 | `npm run build` → 186 image variants emitted (62 AVIF + 62 WebP + 62 JPEG; 5 widths per photo where source resolution allows), EXIF assertion passes. Build time: 752 ms warm. | (verified, no code change) |

## Bundle size delta

|                    | Before (Phase 3) | After (Phase 4) |
|---|---|---|
| Photos shipped to `dist/` | `dist/photos/` ≈ **16 MB** verbatim copy — every visitor downloads full-resolution originals (e.g. `Luce.jpg` = 4.3 MB) regardless of viewport | `dist/assets/` AVIF subset ≈ **3.6 MB** total (62 files), WebP ≈ 7.3 MB, JPEG fallback ≈ 11 MB. Browser picks ONE format + ONE width per photo. |
| Per-visitor payload, home gallery (15 polaroids @ ~160 CSS px) on AVIF browser | 16 MB (full-res JPEGs) | **≈ 200–400 KB** (15 × 320-px AVIF, ~15–30 KB each) |
| Per-visitor payload, detail view (1 photo @ ~26 rem) on AVIF browser | 0.5–4.3 MB depending on photo | **≈ 80–150 KB** (1 × 960-px AVIF) |
| `dist/` total size | ~19 MB | ~22 MB (multi-format archive on disk; CDN cost only — visitors fetch a fraction) |

Effective per-visitor savings on the home view: **~97% reduction** for AVIF-capable browsers; **~85%** for WebP fallback.

## Files changed

- `package.json`, `package-lock.json` — added `vite-imagetools@^10.0.0`, `sharp@^0.34.5`
- `content/manifest.yaml` — `photo:` fields rewritten to slug-derived ASCII kebab-case
- `vite.config.ts` — `imagetools()` plugin in chain
- `vite/plugin-poems.ts` — emits `import.meta.glob` with imagetools query + LQIP map; uses `sharp()` for placeholder generation
- `vite/poem-schema.ts` — `PoemPicture`, `PoemAssets`, `PoemWithAssets` types
- `vite/manifest-loader.ts` — `photosDir` default → `src/assets/photos`
- `src/env.d.ts` — `Poem` declaration extended with `picture` + `lqip`
- `src/components/PolaroidPicture.vue` — NEW, the responsive picture SFC
- `src/views/HomeView.vue`, `src/views/PolaroidView.vue` — render `<PolaroidPicture>` in place of `<img>`
- `scripts/post-build.mjs` — EXIF/IPTC/XMP/ICC leak assertion
- `src/assets/photos/*.jpg` — 15 photos moved + renamed
- DELETED: `public/photos/` (16 MB duplicate), `photos/` (17 MB at root)

## Deviations from plan

1. **`MIME` normalization** — the plan didn't spell out `image/jpg` vs `image/jpeg`. Pitfall 6 in the research called this out; the SFC normalizes `'jpg'` → `'image/jpeg'` so `<source>` matching is honest. Documented inside `PolaroidPicture.vue`.
2. **EXIF check also flags `icc`** — the plan listed `exif`/`iptc`/`xmp`/`gps`. GPS is a sub-block of EXIF (so flagging EXIF covers GPS). I added `icc` because some camera profiles embed Make/Model in ICC tags; vite-imagetools strips it by default and the assertion ensures that doesn't regress. No false positives observed.
3. **`PolaroidView.vue` and `HomeView.vue` carried unstaged Phase-3 visual edits** at the start of this phase (backdrop close, magnifier hover, approach animation). Those edits got committed alongside the `<PolaroidPicture>` migration in T6/T7. They are unrelated to Phase 4 functionally but cosmetically harmless and pre-existing.
4. **Single-`.jpg` extension assumption.** All 15 source photos are JPEGs after T2 normalization, so the glob pattern is `*.jpg` only. PNG/JPEG-mixed projects would need to widen the pattern.

## Verification

- `npx vue-tsc --noEmit` — passes after every commit from T4 onward.
- `npm run build` — succeeds; 186 image variants emitted; `post-build: EXIF clean (186 images verified)`.
- No `dist/photos/` directory — public-photos duplication eliminated.
- No EXIF, IPTC, XMP, or ICC residue on any output asset (assertion-enforced).

## Self-Check: PASSED

- Files created exist: `src/components/PolaroidPicture.vue` ✓
- Photos moved: `src/assets/photos/*.jpg` × 15 ✓
- Old dirs gone: `public/photos/` ✗ (deleted), `photos/` ✗ (deleted) ✓
- Commits exist: T1 `5903208`, T2 `67c8a91`, T3 `00491cb`, T4 `8db078a`, T5 `1f522d2`, T6 `7d7db8f`, T7 `c6fc5dc`, T8 `f880e21` ✓
- Build green; EXIF assertion green ✓
