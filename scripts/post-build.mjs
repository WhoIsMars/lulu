import { copyFileSync, writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
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
