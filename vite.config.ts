import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

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
    plugins: [vue()],
    resolve: {
      alias: { '@': resolveSrcPath() },
    },
    build: {
      sourcemap: false,
      target: 'es2022',
    },
  }
})
