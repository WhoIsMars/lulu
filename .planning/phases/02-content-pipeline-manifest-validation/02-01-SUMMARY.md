---
phase: 02-content-pipeline-manifest-validation
plan: 01
subsystem: content-pipeline
tags: [content, parser, schema, zod, yaml, validation]
requires:
  - poems.txt (root)
  - public/photos/ (15 files)
provides:
  - vite/poem-schema.ts (ManifestEntrySchema, ManifestSchema, PoemSchema)
  - vite/poem-parser.ts (parsePoems, normTitle, deriveSlug)
  - vite/manifest-loader.ts (loadManifest, ManifestValidationError)
  - content/manifest.yaml (15 entries)
affects:
  - tsconfig.node.json (added vite/**/*.ts to include)
  - vitest.config.ts (added *.spec.ts glob)
tech-stack:
  added:
    - yaml@^2.8.4
    - zod@^3.25.76
  patterns:
    - "Pure Node modules (no Vite/?raw imports) so Plan 02-02 plugin and Plan 02-03 CLI can both reuse them"
    - "Zod .strict() to reject unknown YAML keys"
    - "Error accumulation: collect all manifest issues before throwing a single ManifestValidationError"
key-files:
  created:
    - vite/poem-schema.ts
    - vite/poem-parser.ts
    - vite/manifest-loader.ts
    - content/manifest.yaml
    - tests/unit/poem-parser.spec.ts
    - tests/unit/poem-schema.spec.ts
    - tests/unit/manifest-loader.spec.ts
  modified:
    - package.json (added yaml + zod deps)
    - package-lock.json
    - tsconfig.node.json (include vite/**/*.ts)
    - vitest.config.ts (glob *.spec.ts)
decisions:
  - "Permissive parsePoems regex (4 header variants from poems.txt) instead of verbatim Phase 1 regex — see Deviations"
  - "alt placeholder text follows 'Foto associata alla poesia <title>, <month> <year>' template; owner can refine later"
  - "manifest-loader does NOT load photo bytes — build-time directory listing only (D-12)"
metrics:
  duration_minutes: ~22
  tasks_completed: 2
  files_created: 7
  files_modified: 4
  tests_added: 30
  completed_date: 2026-05-02
---

# Phase 02 Plan 01: Schema + Parser + Validator + Manifest YAML — Summary

Estratte le primitive content-pipeline (parser puro, schema Zod, loader manifest) in moduli `vite/` riutilizzabili da Vite plugin (Plan 02-02) e CLI (Plan 02-03), con `content/manifest.yaml` popolato dai 15 entries del mock + nuovo campo `alt`. Tutto coperto da 30 test Vitest.

## Tasks

### Task 1 — Install deps + Zod schema + pure parser
**Commit:** `7367459` `feat(02-01): add Zod schema and pure poem parser`

- `npm install --save yaml@^2.6.0 zod@^3.23.8` — verifica `js-yaml` assente (D-13).
- `vite/poem-schema.ts`: `ManifestEntrySchema` (`.strict()`), `ManifestSchema`, `PoemSchema`. Validazioni: `alt >= 8`, `rope ∈ [0,3]` int, `rotation ∈ [-5,5]`, `liftDelay ∈ [0,1000]` int, `poem` slug `/^[a-z0-9-]+$/`.
- `vite/poem-parser.ts`: `parsePoems`, `normTitle` (estratti da `src/data/poems.ts`), nuova `deriveSlug` per D-05 (NFKD-fold + ASCII strip → kebab-case).
- 23 test in `poem-parser.spec.ts` (parser + slug derivation) e `poem-schema.spec.ts` (12 casi inclusi 9 negativi).
- `vitest.config.ts` esteso a `*.spec.ts` (preservato glob `*.test.ts` esistente).
- `tsconfig.node.json` esteso a `vite/**/*.ts` per coprire i nuovi sorgenti.

### Task 2 — manifest.yaml + manifest-loader
**Commit:** `44760ae` `feat(02-01): manifest.yaml + manifest-loader with strict italian errors`

- `content/manifest.yaml`: 15 entries chronological dal mock, photo case-exact, slug derivati, `alt` ≥ 8 char per ognuno (template italiano).
- `vite/manifest-loader.ts`: `loadManifest({rootDir})` — legge YAML, valida con Zod, parsa `poems.txt`, lista `public/photos/`, accumula errori (no fail-fast), throws `ManifestValidationError` italiano multi-line con path + diff concreto. Restituisce `{ poems: Poem[], watchPaths: string[] }`.
- Casi di errore coperti dai test (7 tutti happy/sad path):
  - foto referenziata ma assente (`non esiste in photos/`)
  - foto orfana sul disco (`orfana`)
  - slug non risolto in `poems.txt` (`non corrisponde a nessuna poesia`)
  - `alt` troppo corto
  - mismatch case-sensitive (Linux/CI) con messaggio dedicato
  - YAML con slug invalido (`NotKebab`)
- Integration spot-check: `loadManifest({rootDir: process.cwd()})` carica i 15 poesie reali, tutte con body non-empty.

## Verification

- `npm run lint` — exit 0
- `npm run typecheck` — exit 0
- `npm run test:unit` — 41/41 pass (30 nuovi + 11 preesistenti)
- `VITE_BASE=/lulu/ npm run build` — exit 0, dist generato, `dist/assets/poems-*.js` presente

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] parsePoems regex troppo restrittiva per 4 poesie reali**

- **Found during:** integration spot-check Task 2 (real `poems.txt` + manifest)
- **Issue:** Il piano richiedeva di copiare `parsePoems` *verbatim* da `src/data/poems.ts:65-79`. La regex originale `/^[“"](.+?)[”"]\s*[-–—]\s*(.+?)$/m` fallisce su 4 dei 15 header presenti in `poems.txt`:
  - `Sincronizzati - 24/9 : 1:29` (nessuna virgoletta)
  - `"Lasciare, senza lasciti" 1/11/2025 | 3:31` (nessun trattino tra titolo e data)
  - `"ciò che non dici" | 14/4/2026 - 00:42` (separatore `|`)
  - `"perdimi" | 16/4/2025 - 20:18` (separatore `|`)
  Nel mock di Phase 1 questo difetto era invisibile perché `match?.body ?? ''` produceva silentemente body vuoti per quelle 4 poesie. Con la pipeline strict di Plan 02-01 il loader si rifiuta correttamente di costruire `Poem[]` con body vuoti, quindi senza fix il manifest reale non può mai validare.
- **Fix:** Aggiunti due regex header alternativi:
  - `quotedHeaderRe`: virgolette opzionali con separatore `-|–|—|\||(spazio)` flessibile
  - `unquotedHeaderRe`: titolo senza virgolette, separatore ` - ` come delimitatore
- **Files modified:** `vite/poem-parser.ts`
- **Commit:** `44760ae` (incluso in Task 2 commit)
- **Verifica:** integration spot-check produce ora 15/15 poesie con body non vuoto; tutti i test parser-spec restano verdi.

### Auto-added critical functionality

Nessuna oltre quanto pianificato. Il piano prescriveva già accumulazione errori, messaggi italiani e check case-sensitive.

## Acceptance Criteria

| Criterio | Risultato |
|---|---|
| `vite/poem-schema.ts` con `.strict()` + `min(8` + `min(-5).max(5)` | OK |
| `vite/poem-parser.ts` esporta parsePoems, normTitle, deriveSlug | OK |
| `vite/manifest-loader.ts` con `import { parse } from 'yaml'`, ManifestValidationError, case-sensitive, orfana | OK |
| `content/manifest.yaml` con 15 entries + 15 alt | OK |
| `js-yaml` assente da package.json | OK (count 0) |
| `npm run test:unit` exit 0 | OK (41/41) |
| `npm run typecheck` exit 0 | OK |
| `npm run lint` exit 0 | OK |
| `VITE_BASE=/lulu/ npm run build` exit 0 | OK |

## Known Stubs

Nessuno. I testi `alt` sono placeholder generici ma validi (≥ 8 char) destinati a raffinazione futura da parte del proprietario; non bloccano la pipeline.

## Self-Check: PASSED

File creati verificati:
- `vite/poem-schema.ts` FOUND
- `vite/poem-parser.ts` FOUND
- `vite/manifest-loader.ts` FOUND
- `content/manifest.yaml` FOUND (15 entries, 15 alt)
- `tests/unit/poem-parser.spec.ts` FOUND
- `tests/unit/poem-schema.spec.ts` FOUND
- `tests/unit/manifest-loader.spec.ts` FOUND

Commit verificati:
- `7367459` FOUND (Task 1)
- `44760ae` FOUND (Task 2)
