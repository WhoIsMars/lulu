import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { imagetools } from 'vite-imagetools'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { poemsPlugin } from './vite/plugin-poems'

// Resolve the @/-alias target. Prefer `import.meta.url` (vite's idiom) when it
// is a file URL; fall back to `process.cwd()/src` when the config is loaded by
// a tool that exposes a non-file `import.meta.url` (e.g. vitest under its
// transform pipeline). Both branches end with `/src`.
function resolveSrcPath(): string {
  try {
    const url = new URL('./src', import.meta.url)
    if (url.protocol === 'file:') return fileURLToPath(url)
  } catch {
    // fall through
  }
  return resolve(process.cwd(), 'src')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE ?? '/',
    plugins: [
      vue(),
      // imagetools — only transforms imports that explicitly opt in via
      // `as=picture` (or any of the known directives). Other asset imports
      // pass through untouched. removeMetadata defaults to true (Phase 4
      // ASSET-04 — confirmed by the post-build EXIF assertion).
      imagetools({
        defaultDirectives: (url) => {
          // Only act when the consumer explicitly requested a picture or
          // metadata transform. Leaves <link>/<img>-as-URL imports alone.
          if (url.searchParams.has('as')) return new URLSearchParams()
          return new URLSearchParams()
        },
      }),
      poemsPlugin(),
    ],
    resolve: {
      alias: { '@': resolveSrcPath() },
    },
    build: {
      sourcemap: false,
      target: 'es2022',
    },
  }
})
