import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')

// 1. SPA fallback: identical copy of index.html.
//    GH Pages serves this for any unknown path; the SPA boots, router parses location, deep-link works.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))

// 2. Disable Jekyll processing (otherwise GH Pages strips _-prefixed files).
writeFileSync(resolve(dist, '.nojekyll'), '')

console.log('post-build: 404.html + .nojekyll written to dist/')
