/**
 * Vite plugin that resolves the `virtual:poems` module (Phase 2, CONT-01;
 * extended in Phase 4 to attach photo `picture` + `lqip` assets — ASSET-01..04).
 *
 * Pipeline:
 *   - resolveId('virtual:poems')  → '\0virtual:poems'
 *   - load(...)                    → calls loadManifest() (Plan 02-01),
 *                                    builds LQIP base64 thumbnails via sharp,
 *                                    and emits a TypeScript module containing:
 *                                      * an `import.meta.glob` call that pulls
 *                                        every photo through vite-imagetools
 *                                        with `as=picture` (AVIF/WebP/JPEG +
 *                                        responsive srcset),
 *                                      * a `lqips` map of slug → data URL,
 *                                      * the `poems` array with `picture` +
 *                                        `lqip` fields attached,
 *                                      * helpers `getPoem/getNextPoem/getPrevPoem`.
 *   - configureServer              → hooks into server.watcher to add explicit
 *                                    watches on poems.txt, manifest.yaml, and
 *                                    src/assets/photos/ (so add/remove/rename
 *                                    triggers HMR even on files not yet
 *                                    referenced in the dep graph).
 *   - handleHotUpdate              → invalidates the virtual module + sends
 *                                    `full-reload` when any watched path changes.
 *
 * Errors during dev: returns a module that throws at runtime, so Vite shows the
 * error overlay instead of crashing the dev server. In build mode: rethrows so
 * the build aborts (D-06 — build-time validation gate).
 */
import path from 'node:path'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import type { Plugin, ViteDevServer } from 'vite'
import { loadManifest, ManifestValidationError } from './manifest-loader'
import type { Poem } from './poem-schema'

const VIRTUAL_ID = 'virtual:poems'
const RESOLVED_ID = '\0' + VIRTUAL_ID

export interface PoemsPluginOptions {
  /** Repository root. Defaults to `process.cwd()`. */
  rootDir?: string
}

export function poemsPlugin(opts: PoemsPluginOptions = {}): Plugin {
  const rootDir = opts.rootDir ?? process.cwd()
  const poemsTxt = path.join(rootDir, 'poems.txt')
  const manifestYaml = path.join(rootDir, 'content', 'manifest.yaml')
  const photosDir = path.join(rootDir, 'src', 'assets', 'photos')

  let server: ViteDevServer | undefined
  let isBuild = false

  return {
    name: 'lulu:poems',

    configResolved(config) {
      isBuild = config.command === 'build'
    },

    resolveId(id: string): string | undefined {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return undefined
    },

    async load(id: string): Promise<string | undefined> {
      if (id !== RESOLVED_ID) return undefined

      try {
        const { poems } = loadManifest({ rootDir })
        // addWatchFile registers FILE paths (not directories) into Vite's dep
        // graph so changes invalidate this module. Directories must NOT be
        // passed here — Vite's import-analysis would try to resolve them as
        // module imports and fail. The photos directory is watched via
        // server.watcher.add() in configureServer instead.
        this.addWatchFile(poemsTxt)
        this.addWatchFile(manifestYaml)

        // Phase 4 (ASSET-03): build LQIP map — slug → 16-px WebP base64 data URL.
        // Done synchronously in the plugin (per-photo cost ≈ 5–10 ms; 15 photos
        // total ≈ 100 ms on a warm cache). Sharp is already a transitive dep
        // through vite-imagetools.
        const lqipMap: Record<string, string> = {}
        for (const p of poems) {
          const filePath = path.join(photosDir, p.file)
          this.addWatchFile(filePath)
          const buf = readFileSync(filePath)
          const lqipBuf = await sharp(buf)
            .resize({ width: 16, fit: 'inside' })
            .webp({ quality: 20 })
            .toBuffer()
          lqipMap[p.slug] = `data:image/webp;base64,${lqipBuf.toString('base64')}`
        }

        return generateModuleSource(poems, lqipMap)
      } catch (err: unknown) {
        if (isBuild) {
          // Build mode — fail loudly so CI aborts before producing a broken bundle.
          throw err
        }
        // Dev mode — emit a module that throws at runtime so the error overlay
        // shows the validation message instead of crashing the dev server.
        const message =
          err instanceof ManifestValidationError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err)
        return generateErrorModuleSource(message)
      }
    },

    configureServer(s: ViteDevServer) {
      server = s
      // Watch the photos directory explicitly. addWatchFile() in load() covers
      // existing files in the dep graph, but adding/removing a file inside the
      // directory needs a directory-level watch.
      s.watcher.add(photosDir)
      s.watcher.add(poemsTxt)
      s.watcher.add(manifestYaml)
    },

    handleHotUpdate({ file }) {
      if (!server) return
      const isWatched =
        file === poemsTxt ||
        file === manifestYaml ||
        file.startsWith(photosDir + path.sep) ||
        file === photosDir
      if (!isWatched) return

      const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
      }
      // Full reload — consumers (HomeView, PolaroidView) hold poem references
      // at module init, not via reactive refs, so a full reload is the safest
      // way to surface the new content.
      server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}

/**
 * Generates the TS module source for a successfully-loaded manifest.
 *
 * The emitted module contains an `import.meta.glob` call that vite-imagetools
 * sees and processes — it produces one `<picture>` payload per JPEG in
 * `src/assets/photos/` with AVIF/WebP/JPEG outputs at 5 widths.
 *
 * Photos are looked up by basename (poem slug + ".jpg"); the lookup throws if
 * a manifest entry references a file not in the glob result, which mirrors the
 * Phase 2 "missing photo" failure mode.
 */
function generateModuleSource(poems: Poem[], lqipMap: Record<string, string>): string {
  const poemsJson = JSON.stringify(poems)
  const lqipsJson = JSON.stringify(lqipMap)
  return `// Generated by vite/plugin-poems.ts — do not edit.
// Phase 4: photos resolved via vite-imagetools as=picture.
const __pictures = import.meta.glob('@/assets/photos/*.jpg', {
  query: { w: '320;640;960;1440;1920', format: 'avif;webp;jpg', as: 'picture' },
  import: 'default',
  eager: true,
})
const __lqips = ${lqipsJson}

function __pickPicture(filename) {
  const key = Object.keys(__pictures).find((k) => k.endsWith('/' + filename))
  if (!key) {
    const available = Object.keys(__pictures).map((k) => k.split('/').pop()).join(', ')
    throw new Error('Phase 4: photo "' + filename + '" not found in src/assets/photos/. Available: ' + available)
  }
  return __pictures[key]
}

const __basePoems = ${poemsJson}
export const poems = __basePoems.map((p) => ({
  ...p,
  picture: __pickPicture(p.file),
  lqip: __lqips[p.slug],
}))
const bySlug = Object.fromEntries(poems.map((p) => [p.slug, p]))
export function getPoem(slug) {
  return bySlug[slug]
}
export function getNextPoem(slug) {
  const i = poems.findIndex((p) => p.slug === slug)
  if (i < 0) return undefined
  return poems[(i + 1) % poems.length]
}
export function getPrevPoem(slug) {
  const i = poems.findIndex((p) => p.slug === slug)
  if (i < 0) return undefined
  return poems[(i - 1 + poems.length) % poems.length]
}
`
}

/**
 * Dev-mode fallback: emits a module that throws when imported, so the Vite
 * error overlay surfaces the validation message instead of the dev server
 * crashing or serving stale content.
 */
function generateErrorModuleSource(message: string): string {
  const safe = JSON.stringify(message)
  return `// Generated by vite/plugin-poems.ts — manifest validation failed.
const __error = new Error(${safe})
__error.name = 'ManifestValidationError'
throw __error
export const poems = []
export function getPoem() { throw __error }
export function getNextPoem() { throw __error }
export function getPrevPoem() { throw __error }
`
}
