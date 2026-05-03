import { copyFileSync, writeFileSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import sharp from 'sharp'

const dist = resolve(process.cwd(), 'dist')

// 1. SPA fallback: identical copy of index.html.
//    GH Pages serves this for any unknown path; the SPA boots, router parses location, deep-link works.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

// 2. Disable Jekyll processing (otherwise GH Pages strips _-prefixed files).
writeFileSync(resolve(dist, '.nojekyll'), '')

console.log('post-build: 404.html + .nojekyll written to dist/')

// 3. Phase 4 (ASSET-04) — EXIF/IPTC/XMP/GPS leak assertion.
//    Walk dist/assets/*.{avif,webp,jpg,jpeg} and re-read each output via
//    sharp().metadata(). vite-imagetools defaults to removeMetadata: true,
//    but a future plugin or post-build optimizer that calls .withMetadata()
//    anywhere in the chain would silently undo that — this script blocks
//    the build if any leak makes it into the dist.
const ASSETS_DIR = join(dist, 'assets')
const IMG_RE = /\.(avif|webp|jpe?g)$/i

let images
try {
  const entries = await readdir(ASSETS_DIR)
  images = entries.filter((f) => IMG_RE.test(f))
} catch (err) {
  console.error('post-build: cannot read', ASSETS_DIR, '—', err.message)
  process.exit(1)
}

const leaks = []
for (const f of images) {
  const buf = await readFile(join(ASSETS_DIR, f))
  const meta = await sharp(buf).metadata()
  // sharp surfaces parsed EXIF/IPTC/XMP/ICC blobs as Buffer (or undefined).
  // GPS coords sit inside `meta.exif`; if exif itself is gone, GPS is gone.
  // We also flag ICC because it can carry Make/Model on some camera profiles.
  const has = {
    exif: meta.exif != null,
    iptc: meta.iptc != null,
    xmp: meta.xmp != null,
    icc: meta.icc != null,
  }
  if (has.exif || has.iptc || has.xmp || has.icc) {
    leaks.push({ file: f, has })
  }
}

if (leaks.length > 0) {
  console.error('\npost-build: EXIF/IPTC/XMP/ICC leak detected in dist/assets/:')
  for (const l of leaks) {
    console.error(' -', l.file, JSON.stringify(l.has))
  }
  console.error(
    '\nPhase 4 (ASSET-04) requires every shipped image to be metadata-clean. ' +
      'Verify no plugin in the build chain calls sharp.withMetadata() / keepExif().',
  )
  process.exit(1)
}

console.log(`post-build: EXIF clean (${images.length} images verified)`)

// 4. Phase 7 (PERF-01..05) — bundle budget assertion.
//    Two budgets enforced here:
//      a) Total JS gzip size < 200 KB (excludes images and font woff/woff2).
//      b) Total photo AVIF payload, summing the SMALLEST AVIF variant per
//         photo slug, < 1.5 MB. We use the smallest variant because that is
//         the size mobile devices actually pay for the LCP image.
//    Filename pattern (vite-imagetools): `<slug>-<hash>.avif`.
const JS_BUDGET_BYTES = 200 * 1024
const AVIF_BUDGET_BYTES = 1.5 * 1024 * 1024

const allFiles = await readdir(ASSETS_DIR)

// (a) JS gzip total
const jsFiles = allFiles.filter((f) => f.endsWith('.js'))
let jsGzipTotal = 0
for (const f of jsFiles) {
  const buf = await readFile(join(ASSETS_DIR, f))
  jsGzipTotal += gzipSync(buf).length
}

// (b) AVIF, smallest variant per slug
const avifFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.avif'))
const slugMin = new Map() // slug -> { file, size }
for (const f of avifFiles) {
  // Strip the trailing `-<hash>.avif`; whatever remains is the slug.
  // vite-imagetools emits `<basename>-<hash>.avif` with an 8-char Vite hash
  // ([A-Za-z0-9_-]{8}); the slug itself can contain `-`, so we anchor on
  // exactly 8 trailing hash chars (greedy match on the slug eats the rest).
  const m = f.match(/^(.+)-[A-Za-z0-9_-]{8}\.avif$/)
  if (!m) continue
  const slug = m[1]
  const { size } = await stat(join(ASSETS_DIR, f))
  const prev = slugMin.get(slug)
  if (!prev || size < prev.size) slugMin.set(slug, { file: f, size })
}
let avifMinTotal = 0
for (const v of slugMin.values()) avifMinTotal += v.size

const fmt = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(
  `post-build: JS gzip total ${fmt(jsGzipTotal)} / ${fmt(JS_BUDGET_BYTES)}` +
    ` (${jsFiles.length} chunks)`,
)
console.log(
  `post-build: AVIF smallest-per-photo total ${fmt(avifMinTotal)} / ${fmt(AVIF_BUDGET_BYTES)}` +
    ` (${slugMin.size} photos)`,
)

let budgetFail = false
if (jsGzipTotal > JS_BUDGET_BYTES) {
  console.error(
    `\npost-build: JS gzip budget exceeded — ${fmt(jsGzipTotal)} > ${fmt(JS_BUDGET_BYTES)}.`,
  )
  budgetFail = true
}
if (avifMinTotal > AVIF_BUDGET_BYTES) {
  console.error(
    `\npost-build: AVIF photo payload budget exceeded — ` +
      `${fmt(avifMinTotal)} > ${fmt(AVIF_BUDGET_BYTES)}.`,
  )
  budgetFail = true
}
if (budgetFail) {
  console.error(
    'Phase 7 (PERF-01..05) requires the shipped bundle to stay within budgets. ' +
      'Investigate dependency growth or photo encoder settings.',
  )
  process.exit(1)
}
