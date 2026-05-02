---
phase: 02-content-pipeline-manifest-validation
plan: 02
type: execute
wave: 2
depends_on: [02-01]
files_modified:
  - vite/plugin-poems.ts
  - vite.config.ts
  - src/data/poems.ts
  - src/env.d.ts
  - tests/unit/plugin-poems.spec.ts
autonomous: true
requirements: [CONT-01, CONT-04]
must_haves:
  truths:
    - "Importando da `virtual:poems` si ottiene `poems: Poem[]` + helpers `getPoem/getNextPoem/getPrevPoem` tipizzati a build-time"
    - "Modificare poems.txt o content/manifest.yaml in dev triggera HMR full-reload del modulo virtuale senza errori console"
    - "Aggiungere/rimuovere/rinominare un file in public/photos/ in dev triggera lo stesso HMR (addWatchFile sulla directory)"
    - "src/data/poems.ts diventa una facciata sottile (re-export da `virtual:poems`) — HomeView e PolaroidView non cambiano"
    - "vue-tsc --noEmit passa: il modulo virtuale è dichiarato in src/env.d.ts"
    - "Build di produzione (VITE_BASE=/lulu/ npm run build) completa senza warning sul modulo virtuale"
  artifacts:
    - path: "vite/plugin-poems.ts"
      provides: "poemsPlugin(): Plugin function risolve 'virtual:poems', emette modulo TS, gestisce HMR"
      exports: ["poemsPlugin"]
    - path: "vite.config.ts"
      provides: "Plugin registrato"
      contains: "poemsPlugin()"
    - path: "src/data/poems.ts"
      provides: "Facciata che re-exporta da virtual:poems"
      contains: "from 'virtual:poems'"
    - path: "src/env.d.ts"
      provides: "Dichiarazione modulo 'virtual:poems'"
      contains: "declare module 'virtual:poems'"
  key_links:
    - from: "vite.config.ts"
      to: "vite/plugin-poems.ts"
      via: "import { poemsPlugin } from './vite/plugin-poems'"
      pattern: "from ['\"]\\./vite/plugin-poems['\"]"
    - from: "vite/plugin-poems.ts"
      to: "vite/manifest-loader.ts"
      via: "import { loadManifest } from './manifest-loader'"
      pattern: "from ['\"]\\./manifest-loader['\"]"
    - from: "src/data/poems.ts"
      to: "virtual:poems"
      via: "export * from 'virtual:poems'"
      pattern: "from ['\"]virtual:poems['\"]"
---

<objective>
Costruire il Vite plugin custom che risolve `virtual:poems` (D-01), wireup HMR su poems.txt + manifest.yaml + photos/ (D-03), registrarlo in `vite.config.ts`, e ridurre `src/data/poems.ts` a una facciata sottile (D-11) così che HomeView/PolaroidView restino invariati.

Purpose: Sostituire il path runtime `?raw + parse inline` del mock Phase 1 con un modulo emesso a build-time, tipizzato e validato. Niente parsing al primo paint, niente errori runtime su contenuto malformato — il build fallisce prima.

Output: Un plugin Vite, una registrazione in config, una facciata di 3 righe, una declaration TS, e uno smoke test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-content-pipeline-manifest-validation/02-CONTEXT.md
@.planning/phases/02-content-pipeline-manifest-validation/02-01-SUMMARY.md
@vite.config.ts
@src/data/poems.ts
@src/env.d.ts

<interfaces>
<!-- Output di Plan 01 (già su disco prima dell'inizio di questo plan): -->

```typescript
// vite/manifest-loader.ts (from Plan 01)
export interface LoadedManifest {
  poems: Poem[]
  watchPaths: string[]   // [poems.txt, manifest.yaml, photosDir]
}
export function loadManifest(opts: LoadManifestOptions): LoadedManifest
export class ManifestValidationError extends Error { ... }

// vite/poem-schema.ts (from Plan 01)
export type Poem = {
  slug: string; title: string; date: string; file: string;
  body: string; alt: string; rope: number; rotation: number; liftDelay: number
}
```

Esistente (HomeView/PolaroidView consumers — DO NOT modify):

```typescript
// src/views/HomeView.vue / src/views/PolaroidView.vue
import { poems, getPoem, getNextPoem, getPrevPoem, type Poem } from '@/data/poems'
```

Plugin contract (target):

```typescript
// vite/plugin-poems.ts
import type { Plugin } from 'vite'
export function poemsPlugin(): Plugin

// At resolve time: id === 'virtual:poems' -> '\0virtual:poems'
// At load time:   loadManifest() -> emit:
//   `export const poems = [...] as const
//    export function getPoem(slug) {...}
//    export function getNextPoem(slug) {...}
//    export function getPrevPoem(slug) {...}
//    export type Poem = { slug: string; ... }`
// At configureServer: addWatchFile poems.txt + manifest.yaml + glob over photosDir
// At handleHotUpdate: if changed file is one of the watch paths -> reloadModule(virtual:poems)
```

Facciata target (`src/data/poems.ts` reduced to ~3 lines):

```typescript
// Phase 2 (CONT-01): facade re-exporting from virtual:poems built by vite/plugin-poems.ts.
// Original Phase 1 mock parsing logic moved to vite/poem-parser.ts.
export * from 'virtual:poems'
export type { Poem } from 'virtual:poems'
```

Declaration target (append to `src/env.d.ts`):

```typescript
declare module 'virtual:poems' {
  export interface Poem {
    slug: string
    title: string
    date: string
    file: string
    body: string
    alt: string
    rope: number
    rotation: number
    liftDelay: number
  }
  export const poems: readonly Poem[]
  export function getPoem(slug: string): Poem | undefined
  export function getNextPoem(slug: string): Poem | undefined
  export function getPrevPoem(slug: string): Poem | undefined
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement poemsPlugin with virtual module + HMR + watch</name>
  <read_first>
    - vite/manifest-loader.ts (Plan 01 output)
    - vite/poem-schema.ts (Plan 01 output)
    - vite.config.ts (current)
    - .planning/research/ARCHITECTURE.md §"Pattern 2: Build-time content pipeline" (lines 162-189)
  </read_first>
  <files>vite/plugin-poems.ts, tests/unit/plugin-poems.spec.ts</files>
  <behavior>
    plugin-poems.spec.ts:
    - resolveId('virtual:poems') returns '\0virtual:poems'
    - resolveId('something-else') returns undefined
    - load('\0virtual:poems') in a fixture project returns a string containing 'export const poems' and at least one slug from the manifest
    - load throws ManifestValidationError if the fixture manifest is invalid (e.g. missing photo)
    - generated module string contains 'getPoem', 'getNextPoem', 'getPrevPoem' function declarations
  </behavior>
  <action>
    Create `vite/plugin-poems.ts` exporting a `poemsPlugin(opts?: { rootDir?: string })` function returning a Vite `Plugin`. Implementation per D-01 / D-03:

    ```typescript
    import type { Plugin, ViteDevServer } from 'vite'
    import path from 'node:path'
    import { loadManifest } from './manifest-loader'

    const VIRTUAL_ID = 'virtual:poems'
    const RESOLVED_ID = '\0' + VIRTUAL_ID

    export function poemsPlugin(opts: { rootDir?: string } = {}): Plugin {
      const rootDir = opts.rootDir ?? process.cwd()
      let server: ViteDevServer | undefined
      let watchPaths: string[] = []

      return {
        name: 'lulu:poems',
        resolveId(id) {
          if (id === VIRTUAL_ID) return RESOLVED_ID
          return undefined
        },
        load(id) {
          if (id !== RESOLVED_ID) return undefined
          const { poems, watchPaths: wp } = loadManifest({ rootDir })
          watchPaths = wp
          // NB addWatchFile must be called from this hook for Vite to track the dep graph
          for (const p of wp) this.addWatchFile(p)
          return generateModuleSource(poems)
        },
        configureServer(s) {
          server = s
          // Watch the photos dir explicitly so add/remove/rename triggers HMR
          // (addWatchFile in load() covers files that exist; the dir watcher covers add/remove)
          // server.watcher.add() is safe to call multiple times.
          for (const p of watchPaths) s.watcher.add(p)
        },
        handleHotUpdate({ file, server }) {
          const isWatched =
            file === path.join(rootDir, 'poems.txt') ||
            file === path.join(rootDir, 'content', 'manifest.yaml') ||
            file.startsWith(path.join(rootDir, 'public', 'photos') + path.sep)
          if (!isWatched) return undefined
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
            return [mod]
          }
          return undefined
        },
      }
    }

    function generateModuleSource(poems: Poem[]): string {
      const json = JSON.stringify(poems)
      return `
export const poems = ${json}
const bySlug = Object.fromEntries(poems.map(p => [p.slug, p]))
export function getPoem(slug) { return bySlug[slug] }
export function getNextPoem(slug) {
  const i = poems.findIndex(p => p.slug === slug)
  if (i < 0) return undefined
  return poems[(i + 1) % poems.length]
}
export function getPrevPoem(slug) {
  const i = poems.findIndex(p => p.slug === slug)
  if (i < 0) return undefined
  return poems[(i - 1 + poems.length) % poems.length]
}
`.trim()
    }
    ```

    NOTE: do NOT freeze poems with `Object.freeze` — the `as const` is in the .d.ts declaration; runtime freezing breaks JSON.stringify roundtrip and consumers may mutate-by-accident detection. The DTS readonly typing is sufficient.

    Tests in `tests/unit/plugin-poems.spec.ts`: build a temp fixture (poems.txt + content/manifest.yaml + public/photos/) similar to Plan 01 task 2 tests. Construct the plugin with `poemsPlugin({ rootDir: tempDir })`, then call `plugin.resolveId.call(mockCtx, 'virtual:poems')` and `plugin.load.call(mockCtx, '\0virtual:poems')`. The mock context must implement `addWatchFile(path: string): void` (no-op spy). Assert per `<behavior>`.
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- --run tests/unit/plugin-poems.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export function poemsPlugin" vite/plugin-poems.ts` returns 1
    - `grep -c "virtual:poems" vite/plugin-poems.ts` >= 2
    - `grep -c "addWatchFile" vite/plugin-poems.ts` >= 1
    - `grep -c "handleHotUpdate" vite/plugin-poems.ts` >= 1
    - `grep -c "loadManifest" vite/plugin-poems.ts` >= 1
    - `grep -c "getNextPoem\|getPrevPoem" vite/plugin-poems.ts` >= 2
    - `npm run test:unit -- --run tests/unit/plugin-poems.spec.ts` exits 0
  </acceptance_criteria>
  <done>poemsPlugin esiste, risolve il modulo virtuale, ha hooks HMR, è testato.</done>
</task>

<task type="auto">
  <name>Task 2: Wire plugin in vite.config + reduce src/data/poems.ts to facade + declare types</name>
  <read_first>
    - vite.config.ts (current — 33 lines)
    - src/data/poems.ts (current — 128 lines, will become 3 lines)
    - src/env.d.ts (current — 21 lines)
    - HomeView.vue / PolaroidView.vue imports (verify they use `@/data/poems`)
  </read_first>
  <files>vite.config.ts, src/data/poems.ts, src/env.d.ts</files>
  <action>
    1. **Update `vite.config.ts`**: import `poemsPlugin` and add to plugins array. The new file should have these added lines (preserve existing content otherwise):
       ```typescript
       import { poemsPlugin } from './vite/plugin-poems'
       // ...
       plugins: [vue(), poemsPlugin()],
       ```

    2. **Replace `src/data/poems.ts`** entirely with the 3-line facade (D-11). The new content (preserve exactly):
       ```typescript
       /**
        * Phase 2 (CONT-01) facade. Real module is built by vite/plugin-poems.ts
        * from poems.txt + content/manifest.yaml. Consumers (HomeView, PolaroidView)
        * keep importing from `@/data/poems` — this re-export keeps that working.
        */
       export * from 'virtual:poems'
       export type { Poem } from 'virtual:poems'
       ```
       The old 128 lines (parsePoems, normTitle, hardcoded manifest array, Poem interface) are GONE — they live in `vite/poem-parser.ts` and `vite/poem-schema.ts` after Plan 01.

    3. **Append to `src/env.d.ts`** the `declare module 'virtual:poems'` block per `<interfaces>`. Do NOT remove existing `declare module '*.vue'` or `declare module '*?raw'` blocks.

    4. Verify HomeView.vue + PolaroidView.vue still type-check. Run `grep -rn "from '@/data/poems'" src/` — every hit must continue to resolve. If any consumer was using a Phase-1-mock-only export that no longer exists in the new typed module, **DO NOT silently remove the import** — flag it in the SUMMARY and stop. (Expected: only `poems`, `getPoem`, `getNextPoem`, `getPrevPoem`, `type Poem` are imported, all of which exist in the new module.)
  </action>
  <verify>
    <automated>npm run lint && npm run typecheck && npm run test:unit && VITE_BASE=/lulu/ npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "poemsPlugin()" vite.config.ts` returns 1
    - `grep -c "from './vite/plugin-poems'" vite.config.ts` returns 1
    - `wc -l src/data/poems.ts | awk '{print $1}'` <= 10 (facade is short)
    - `grep -c "from 'virtual:poems'" src/data/poems.ts` >= 1
    - `grep -c "parsePoems\|manifest\[\]\|normTitle" src/data/poems.ts` returns 0 (old code removed)
    - `grep -c "declare module 'virtual:poems'" src/env.d.ts` returns 1
    - `grep -c "export const poems" src/env.d.ts` returns 1
    - `npm run typecheck` exits 0
    - `VITE_BASE=/lulu/ npm run build` exits 0 and `dist/index.html` exists
    - `grep -c "from '@/data/poems'" src/views/HomeView.vue src/views/PolaroidView.vue` >= 2 (consumers still wired)
  </acceptance_criteria>
  <done>Plugin registrato, facciata corta, types dichiarati, build prod passa, consumer invariati.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| dev-server fs watcher → plugin | Files watched are author-controlled inside repo. Plugin trusts paths within `rootDir`. |
| virtual module → consumer code | Generated JS is the only contract. Validation happens upstream in manifest-loader (Plan 01); plugin assumes loader output is sane. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-05 | Tampering | virtual module source string | mitigate | The string is built via JSON.stringify(poems) — not template-concatenated. Poem fields cannot break out of the string literal. |
| T-02-06 | Information Disclosure | HMR error overlay | accept | Validation errors include filenames (already author-disclosed in repo). Acceptable. |
| T-02-07 | Denial of Service | watcher fanout | mitigate | Watch only 3 paths (poems.txt, manifest.yaml, photos dir). No recursive walks beyond what Vite already does. |
</threat_model>

<verification>
- `npm run lint && npm run typecheck && npm run test:unit && VITE_BASE=/lulu/ npm run build` chain esce 0.
- `npm run dev` (manuale, smoke check) avvia senza errori; touching `poems.txt` triggera reload (verifica manuale opzionale, NON bloccante per il completamento del plan dato che HMR è coperto da Plan 02 task 1 tests).
- `dist/index.html` + `dist/assets/*.js` esistono dopo build.
</verification>

<success_criteria>
- `import { poems } from '@/data/poems'` continua a funzionare in HomeView/PolaroidView.
- Build prod compila il modulo virtuale e non lascia parsing inline runtime.
- vue-tsc non si lamenta del modulo virtuale.
</success_criteria>

<output>
After completion, create `.planning/phases/02-content-pipeline-manifest-validation/02-02-SUMMARY.md`.
</output>
