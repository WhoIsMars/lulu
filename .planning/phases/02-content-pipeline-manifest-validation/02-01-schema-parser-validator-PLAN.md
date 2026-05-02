---
phase: 02-content-pipeline-manifest-validation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - vite/poem-parser.ts
  - vite/poem-schema.ts
  - vite/manifest-loader.ts
  - content/manifest.yaml
  - tests/unit/poem-parser.spec.ts
  - tests/unit/poem-schema.spec.ts
  - tests/unit/manifest-loader.spec.ts
  - vitest.config.ts
autonomous: true
requirements: [CONT-02, CONT-03]
must_haves:
  truths:
    - "Esiste uno schema Zod che valida un manifest YAML con i campi photo, poem, alt, rope, rotation, liftDelay e rifiuta input malformati"
    - "Il parser di poems.txt è una funzione pura testabile che produce ParsedPoem[] con title/date/body"
    - "Il loader del manifest, dato content/manifest.yaml + poems.txt + lista foto, restituisce un payload tipizzato Poem[] o solleva un errore italiano chiaro"
    - "content/manifest.yaml contiene 15 entries migrate dal mock src/data/poems.ts con campo alt aggiunto (>= 8 char)"
    - "I test unit Vitest coprono parser (>=3 casi), schema (>=4 casi inclusi failure), loader (>=4 casi inclusi orfani / case-sensitivity / alt troppo corto / slug invalido)"
  artifacts:
    - path: "vite/poem-schema.ts"
      provides: "Zod schemas: ManifestEntrySchema, ManifestSchema, PoemSchema; tipi inferiti"
      exports: ["ManifestEntrySchema", "ManifestSchema", "PoemSchema", "ManifestEntry", "Manifest", "Poem"]
    - path: "vite/poem-parser.ts"
      provides: "parsePoems(raw): ParsedPoem[] e normTitle(t): string come funzioni pure"
      exports: ["parsePoems", "normTitle", "deriveSlug", "ParsedPoem"]
    - path: "vite/manifest-loader.ts"
      provides: "loadManifest({rootDir}): { poems: Poem[], errors: never } o throws ManifestValidationError"
      exports: ["loadManifest", "ManifestValidationError"]
    - path: "content/manifest.yaml"
      provides: "15 entries chronological order"
      contains: "photo: Un_altro_sogno.JPG"
  key_links:
    - from: "vite/manifest-loader.ts"
      to: "vite/poem-parser.ts"
      via: "import { parsePoems, normTitle, deriveSlug } from './poem-parser'"
      pattern: "from ['\"]\\./poem-parser['\"]"
    - from: "vite/manifest-loader.ts"
      to: "vite/poem-schema.ts"
      via: "import { ManifestSchema } from './poem-schema'"
      pattern: "from ['\"]\\./poem-schema['\"]"
    - from: "vite/poem-schema.ts"
      to: "zod"
      via: "import { z } from 'zod'"
      pattern: "from ['\"]zod['\"]"
---

<objective>
Estrarre la logica di parsing/validazione del contenuto dal mock di Phase 1 in moduli puri, riutilizzabili sia dal Vite plugin (Plan 02) sia dal CLI di check (Plan 03). Aggiungere Zod come validatore strict, popolare `content/manifest.yaml` con i 15 entries esistenti + nuovo campo `alt`, e coprire tutto con test Vitest.

Purpose: Phase 2 sostituisce il mock `src/data/poems.ts` con una pipeline content build-time. Plan 01 produce le primitive (parser puro + schema Zod + loader) senza ancora collegarle a Vite o al CLI — quei due lavori di plumbing sono Plan 02 e Plan 03 e dipendono da quello che produciamo qui.

Output: Quattro file sorgente in `vite/` + `content/manifest.yaml` + test unit. `npm run test:unit` deve passare.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-content-pipeline-manifest-validation/02-CONTEXT.md
@.planning/notes/photos-naming-and-order.md
@src/data/poems.ts
@package.json

<interfaces>
<!-- Riferimento per la logica esistente da estrarre. -->
<!-- src/data/poems.ts (Phase 1 mock) — DO NOT modify in this plan, it stays a re-export until Plan 02. -->

Logica esistente (da estrarre tale-quale in `vite/poem-parser.ts`):

```typescript
// from src/data/poems.ts
function parsePoems(raw: string): ParsedPoem[] {
  const blocks = raw.split(/^[—-]{2,}\s*$/gm).map((b) => b.trim()).filter(Boolean)
  const headerRe = /^[“"](.+?)[”"]\s*[-–—]\s*(.+?)$/m
  // ...
}

function normTitle(t: string): string {
  return t.normalize('NFKC').toLowerCase().replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim()
}
```

Aggiungere una nuova funzione `deriveSlug` (D-05) NON presente nel mock:

```typescript
// NEW: maps poem title -> slug via NFKD-fold + ASCII strip
export function deriveSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip combining accents
    .toLowerCase()
    .replace(/[…”"'«»“]/g, '')           // strip stray punctuation
    .replace(/[_\s]+/g, '-')             // spaces+underscore -> hyphen
    .replace(/[^a-z0-9-]/g, '')         // strip everything non-alnum/-
    .replace(/-+/g, '-')                 // collapse repeated hyphens
    .replace(/^-|-$/g, '')               // trim leading/trailing hyphens
}
// "Un altro sogno"  -> "un-altro-sogno"
// "…finché"         -> "finche"
// "ciò che non dici"-> "cio-che-non-dici"
// "Lasciare, senza lasciti" -> "lasciare-senza-lasciti"
```

Schema target Zod (`vite/poem-schema.ts`):

```typescript
import { z } from 'zod'

export const ManifestEntrySchema = z.object({
  photo: z.string().min(1),
  poem: z.string().regex(/^[a-z0-9-]+$/, 'slug deve essere kebab-case ascii'),
  alt: z.string().min(8, 'alt deve avere almeno 8 caratteri (a11y)'),
  rope: z.number().int().min(0).max(3),
  rotation: z.number().min(-5).max(5),
  liftDelay: z.number().int().min(0).max(1000),
}).strict()
export const ManifestSchema = z.array(ManifestEntrySchema).min(1)
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>
export type Manifest = z.infer<typeof ManifestSchema>

export const PoemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.string(),
  file: z.string(),
  body: z.string().min(1),
  alt: z.string().min(8),
  rope: z.number().int().min(0).max(3),
  rotation: z.number().min(-5).max(5),
  liftDelay: z.number().int().min(0).max(1000),
})
export type Poem = z.infer<typeof PoemSchema>
```

Loader contract (`vite/manifest-loader.ts`):

```typescript
export class ManifestValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super('Manifest invalido:\n' + issues.map((i) => '  - ' + i).join('\n'))
    this.name = 'ManifestValidationError'
  }
}

export interface LoadManifestOptions {
  rootDir: string                 // repo root
  poemsTxtPath?: string           // default: <rootDir>/poems.txt
  manifestYamlPath?: string       // default: <rootDir>/content/manifest.yaml
  photosDir?: string              // default: <rootDir>/public/photos
}

export interface LoadedManifest {
  poems: Poem[]                   // ordered as in manifest.yaml
  watchPaths: string[]            // [poems.txt, manifest.yaml, photosDir]
}

export function loadManifest(opts: LoadManifestOptions): LoadedManifest
// Throws ManifestValidationError with italian, multi-line message on any failure.
```

Migrazione dati: i 15 entries vivono già in `src/data/poems.ts:35-51`. Riga per riga, mappare:

| TS field   | YAML field | Trasformazione                                |
|------------|------------|------------------------------------------------|
| slug       | poem       | identico                                       |
| title      | (drop)     | non più nel manifest — derivato dal poem in poems.txt |
| file       | photo      | identico (preservare case esatto del filename) |
| rope       | rope       | identico                                       |
| rotation   | rotation   | identico                                       |
| liftDelay  | liftDelay  | identico                                       |
| (NEW)      | alt        | descrizione italiana >= 8 char (vedi sotto)    |

Testi `alt` da aggiungere (placeholder generici-ma-validi che il proprietario raffinerà; >= 8 char ciascuno):

| poem slug                | alt                                                                  |
|--------------------------|----------------------------------------------------------------------|
| un-altro-sogno           | "Foto associata alla poesia 'Un altro sogno', luglio 2025"           |
| luce                     | "Foto associata alla poesia 'Luce', luglio 2025"                     |
| insulto                  | "Foto associata alla poesia 'Insulto', luglio 2025"                  |
| oltre                    | "Foto associata alla poesia 'Oltre', luglio 2025"                    |
| autoinganni              | "Foto associata alla poesia 'Autoinganni', luglio 2025"              |
| sincronizzati            | "Foto associata alla poesia 'Sincronizzati', luglio 2025"            |
| punizione                | "Foto associata alla poesia 'Punizione', luglio 2025"                |
| lasciare-senza-lasciti   | "Foto associata alla poesia 'Lasciare, senza lasciti', luglio 2025"  |
| dubbio                   | "Foto associata alla poesia 'Dubbio', agosto 2025"                   |
| silenzi                  | "Foto associata alla poesia 'Silenzi', agosto 2025"                  |
| i-tuoi-auto-sabotaggi    | "Foto associata alla poesia 'I tuoi auto sabotaggi', agosto 2025"    |
| le-luci-delle-lucciole   | "Foto associata alla poesia 'Le luci delle lucciole', agosto 2025"   |
| finche                   | "Foto associata alla poesia '…finché', agosto 2025"                  |
| cio-che-non-dici         | "Foto associata alla poesia 'ciò che non dici', agosto 2025"         |
| perdimi                  | "Foto associata alla poesia 'perdimi', agosto 2025"                  |
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install deps + write Zod schema and pure parser</name>
  <read_first>
    - package.json (lines 1-43) — verify yaml/zod NOT present
    - src/data/poems.ts (lines 53-90) — extract parsePoems + normTitle verbatim
    - .planning/phases/02-content-pipeline-manifest-validation/02-CONTEXT.md (D-04, D-05, D-13, D-14)
  </read_first>
  <files>package.json, vite/poem-schema.ts, vite/poem-parser.ts, tests/unit/poem-parser.spec.ts, tests/unit/poem-schema.spec.ts, vitest.config.ts</files>
  <behavior>
    poem-parser.spec.ts:
    - parsePoems splits a 2-block raw input on `—————` separator into 2 ParsedPoem
    - parsePoems extracts title from `"Un altro sogno" - 22/7/2025 | 17:38` header
    - parsePoems preserves body line breaks
    - normTitle('Un  altro sogno ') === 'un altro sogno'
    - deriveSlug('Un altro sogno') === 'un-altro-sogno'
    - deriveSlug('…finché') === 'finche'
    - deriveSlug('ciò che non dici') === 'cio-che-non-dici'
    - deriveSlug('Lasciare, senza lasciti') === 'lasciare-senza-lasciti'

    poem-schema.spec.ts:
    - ManifestEntrySchema accepts a fully-valid entry
    - rejects alt with 7 chars (must >= 8)
    - rejects rope = 4 (max 3) and rope = -1 (min 0)
    - rejects rotation = 5.1 (max 5) and rotation = -5.1
    - rejects unknown extra keys (.strict)
    - rejects poem slug 'NotKebab' (must match /^[a-z0-9-]+$/)
  </behavior>
  <action>
    1. Install runtime deps. Run **exactly**:
       `npm install --save yaml@^2.6.0 zod@^3.23.8`
       Verify `package.json` `"dependencies"` block now contains both. Do NOT remove existing entries. Do NOT use `js-yaml` (D-13). Do NOT use `valibot` (D-14).

    2. Create `vitest.config.ts` if it does not already exist (project currently has no vitest config — `npm run test:unit` runs vitest with defaults). Use:
       ```ts
       import { defineConfig } from 'vitest/config'
       export default defineConfig({
         test: {
           include: ['tests/unit/**/*.spec.ts'],
           environment: 'node',
         },
       })
       ```
       If a `vitest.config.ts` already exists, **read it first**, merge the `test.include` glob to also cover `tests/unit/**/*.spec.ts` (preserve any existing globs), and leave other settings alone.

    3. Create `vite/poem-schema.ts` exactly per the `<interfaces>` block above. Schemas must use `.strict()` on the entry object to reject unknown keys. Export both schemas and the inferred types.

    4. Create `vite/poem-parser.ts` with three pure exports:
       - `parsePoems(raw: string): ParsedPoem[]` — copy from `src/data/poems.ts:65-79` verbatim (block split + header regex + body extraction). Export `ParsedPoem` type with `title: string; date: string; body: string`.
       - `normTitle(t: string): string` — copy from `src/data/poems.ts:82-89` verbatim.
       - `deriveSlug(title: string): string` — NEW per D-05, implementation per `<interfaces>`.
       The file must NOT import `?raw` or any Vite-only feature; it is pure Node-runnable for the CLI in Plan 03.

    5. Create `tests/unit/poem-parser.spec.ts` covering all behaviors listed in `<behavior>`. Use `import { describe, it, expect } from 'vitest'`. Use a small inline raw string with two test poems separated by `—————` for parsePoems tests; do NOT read the real `poems.txt`.

    6. Create `tests/unit/poem-schema.spec.ts` covering all behaviors listed in `<behavior>`. Use `expect(() => Schema.parse(bad)).toThrow()` for negative cases.
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- --run tests/unit/poem-parser.spec.ts tests/unit/poem-schema.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `node -e "console.log(Object.keys(require('./package.json').dependencies))" | grep -c '\(yaml\|zod\)'` returns 2
    - `grep -c "import { z } from 'zod'" vite/poem-schema.ts` returns 1
    - `grep -c "\.strict()" vite/poem-schema.ts` >= 1
    - `grep -c "min(8" vite/poem-schema.ts` >= 1
    - `grep -c "min(-5).max(5)" vite/poem-schema.ts` >= 1
    - `grep -c "export function parsePoems" vite/poem-parser.ts` returns 1
    - `grep -c "export function normTitle" vite/poem-parser.ts` returns 1
    - `grep -c "export function deriveSlug" vite/poem-parser.ts` returns 1
    - `grep -cv '^#' vite/poem-parser.ts | head -1` (sanity: file is non-empty)
    - `npm run test:unit -- --run tests/unit/poem-parser.spec.ts` exits 0
    - `npm run test:unit -- --run tests/unit/poem-schema.spec.ts` exits 0
    - `grep -c "js-yaml" package.json` returns 0 (D-13 enforced)
  </acceptance_criteria>
  <done>Schema Zod e parser puro esistono, sono testati, e non dipendono da Vite. yaml + zod installati. js-yaml NON installato.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write manifest.yaml + manifest-loader with strict italian errors</name>
  <read_first>
    - vite/poem-schema.ts (just written in Task 1)
    - vite/poem-parser.ts (just written in Task 1)
    - src/data/poems.ts (lines 35-51) — source of the 15 entries to migrate
    - .planning/notes/photos-naming-and-order.md (case-sensitivity rule)
    - .planning/phases/02-content-pipeline-manifest-validation/02-CONTEXT.md (D-06)
    - public/photos/ directory listing (15 files, mixed .jpg/.JPG case)
  </read_first>
  <files>content/manifest.yaml, vite/manifest-loader.ts, tests/unit/manifest-loader.spec.ts</files>
  <behavior>
    manifest-loader.spec.ts:
    - loadManifest with valid fixture (poems.txt + manifest.yaml + photosDir all in sync) returns 15 Poem entries in chronological order matching the YAML
    - throws ManifestValidationError when manifest references a photo file not in photosDir, message contains "non esiste in photos/"
    - throws ManifestValidationError when photosDir contains a file not in manifest, message contains "orfana"
    - throws ManifestValidationError when manifest poem slug has no matching poem in poems.txt, message contains "non corrisponde a nessuna poesia"
    - throws ManifestValidationError when alt is too short, message mentions "alt"
    - throws ManifestValidationError when manifest YAML references 'foo.JPG' but disk has 'foo.jpg' (case mismatch — Linux CI breaks), message contains "case-sensitive" o "maiuscole"
  </behavior>
  <action>
    1. Create `content/manifest.yaml` with **exactly 15 entries** preserving the order, slugs, photo filenames (case-exact!), rope, rotation, liftDelay from `src/data/poems.ts:35-51`. Add the `alt` field per the table in `<interfaces>`. Do NOT include `title` or `slug` in YAML (slug becomes the `poem` field; title is derived from poems.txt at load). Format:
       ```yaml
       # content/manifest.yaml
       # Phase 2 (CONT-02): photo↔poem mapping. Validated at build by vite/manifest-loader.ts.
       # Order = chronological (first = top-left of room, last = bottom-right). See .planning/notes/photos-naming-and-order.md
       - photo: Un_altro_sogno.JPG
         poem: un-altro-sogno
         alt: "Foto associata alla poesia 'Un altro sogno', luglio 2025"
         rope: 0
         rotation: -2.4
         liftDelay: 0
       - photo: Luce.jpg
         poem: luce
         alt: "Foto associata alla poesia 'Luce', luglio 2025"
         rope: 0
         rotation: 1.8
         liftDelay: 80
       # ... (continue for ALL 15 entries — copy from src/data/poems.ts:35-51 in same order)
       ```
       Verify after writing: `wc -l content/manifest.yaml` shows >= 90 lines (6 lines × 15 entries + comments).

    2. Create `vite/manifest-loader.ts` per the contract in `<interfaces>`. Implementation:
       - Read `manifest.yaml` with `parse` from the `yaml` package (D-13).
       - Validate parsed YAML with `ManifestSchema` from `./poem-schema`. On Zod failure, collect issues into italian messages: `e.g. "entry #3 (foto Dubbio.JPG): alt deve avere almeno 8 caratteri"`.
       - Read `poems.txt` raw, parse with `parsePoems`. Build a `Map<string, ParsedPoem>` keyed by `deriveSlug(title)`. For each manifest entry, look up `entry.poem` in the map.
       - Read `photosDir` with `fs.readdirSync`. Build a `Set<string>` of filenames (case-exact).
       - For each manifest entry verify: (a) `entry.photo` exists in the photosDir set with **exact case** — if it differs only in case, throw a specific case-sensitive error: `"manifest referenzia 'X.JPG' ma sul disco è 'X.jpg' — i path sono case-sensitive su Linux/CI"`. (b) `entry.poem` resolves to a parsed poem.
       - For each file in photosDir, verify a manifest entry exists referencing it (no orfani). Filter out non-image files (skip `.DS_Store`, `Thumbs.db`, dotfiles).
       - Aggregate ALL errors before throwing — never throw on first issue. Wrap them in a single `ManifestValidationError`.
       - On success, build `Poem[]` by joining manifest entries with parsed poems: `{ slug: entry.poem, title: parsed.title, date: parsed.date, file: entry.photo, body: parsed.body, alt: entry.alt, rope, rotation, liftDelay }`.
       - Return `{ poems, watchPaths: [poemsTxtPath, manifestYamlPath, photosDir] }`.

    3. Create `tests/unit/manifest-loader.spec.ts`. Use Vitest fixtures: write small temp fixture trees inside the test using `fs.mkdtempSync(os.tmpdir() + '/lulu-test-')`. Each test sets up a small directory with `poems.txt`, `content/manifest.yaml`, `photos/`, calls `loadManifest({rootDir: tempDir})`, and asserts. Cleanup with `fs.rmSync(tempDir, {recursive: true, force: true})` in `afterEach`. Cover all behaviors listed in `<behavior>`.
  </action>
  <verify>
    <automated>npm run lint && npm run typecheck && npm run test:unit -- --run tests/unit/manifest-loader.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "^- photo:" content/manifest.yaml` returns 15
    - `grep -c "alt:" content/manifest.yaml` returns 15
    - `grep -c "Un_altro_sogno.JPG" content/manifest.yaml` returns 1
    - `grep -c "perdimi" content/manifest.yaml` >= 1
    - `grep -c "import { parse }" vite/manifest-loader.ts` >= 1
    - `grep -c "from 'yaml'" vite/manifest-loader.ts` returns 1
    - `grep -c "ManifestValidationError" vite/manifest-loader.ts` >= 2
    - `grep -c "case-sensitive\|maiuscole" vite/manifest-loader.ts` >= 1
    - `grep -c "orfana\|orfan" vite/manifest-loader.ts` >= 1
    - `npm run test:unit -- --run tests/unit/manifest-loader.spec.ts` exits 0
    - `npm run typecheck` exits 0
  </acceptance_criteria>
  <done>content/manifest.yaml ha 15 entries; manifest-loader.ts valida + accumula errori italiani; tutti i test passano.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| filesystem → build | poems.txt + manifest.yaml + photos/ are author-controlled, not user input. Trust boundary is the local repo. |
| YAML parser → schema | `yaml.parse` produces arbitrary JS — Zod is the validation gate before any field is consumed. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | manifest.yaml content | accept | Author-controlled, committed in git; YAML parsed but every field re-validated by Zod (.strict() rejects extra keys). |
| T-02-02 | Information Disclosure | error messages | mitigate | Loader error messages enumerate filenames present in repo — acceptable since these are authored content, not secrets. No env vars or paths outside repo are echoed. |
| T-02-03 | Denial of Service | YAML parser | accept | `yaml@2.x` has documented safe defaults (no anchors-of-death by default). Manifest is tiny (~15 entries). |
| T-02-04 | Elevation | filesystem read scope | mitigate | Loader reads only paths inside `rootDir`. No path concatenation from user input (no user input in this phase). Use `path.join` exclusively, never string concat. |
</threat_model>

<verification>
- Tutti i test unit passano (`npm run test:unit`).
- `npm run typecheck` esce 0.
- `npm run lint` esce 0.
- `content/manifest.yaml` ha 15 entries con tutti i campi richiesti.
- Nessun import di `js-yaml` ovunque (D-13).
</verification>

<success_criteria>
- 3 file in `vite/` esistono ed esportano i simboli previsti.
- 1 file in `content/manifest.yaml` con 15 entries valide secondo lo schema Zod.
- Test Vitest (>= 3 file, >= 13 casi totali) passano tutti.
- Plan 02 (Vite plugin) e Plan 03 (CLI check) possono importare da `vite/manifest-loader.ts` senza modifiche.
</success_criteria>

<output>
After completion, create `.planning/phases/02-content-pipeline-manifest-validation/02-01-SUMMARY.md`.
</output>
