# Phase 2: Content Pipeline + Manifest Validation - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Source:** Direct capture (no discuss-phase loop — phase is pure infra, decisions already obvious from project context and Phase 1 overshoot)

<domain>
## Phase Boundary

Sostituire il mock `src/data/poems.ts` (creato in Phase 1 overshoot) con la vera content pipeline: un Vite plugin produce un modulo `virtual:poems` tipizzato a build-time leggendo `poems.txt` + `content/manifest.yaml`, validato con Zod, con HMR su modifica e con un comando standalone `npm run manifest:check` che dà gli stessi errori senza un build completo. Niente UI in questa fase — solo plumbing.

</domain>

<decisions>
## Implementation Decisions

### Architettura della content pipeline
- **D-01:** Vite plugin custom in `vite/plugin-poems.ts`, esportato e registrato in `vite.config.ts`. Risolve il modulo virtuale `virtual:poems` con il payload tipizzato (array `Poem[]` + helpers `getPoem(slug)`, `getNextPoem`, `getPrevPoem`).
- **D-02:** Manifest in `content/manifest.yaml` (NON `manifest.json` — YAML è più leggibile per editing manuale, supporta commenti). Schema Zod in `vite/poem-schema.ts` (riutilizzabile dal CLI di check).
- **D-03:** Il plugin osserva (`addWatchFile`) sia `poems.txt` sia `content/manifest.yaml` sia la cartella `photos/`. Modifiche → HMR full-reload del modulo virtuale (non richiede patch ai consumer).

### Schema del manifest
- **D-04:** Schema:
  ```yaml
  # content/manifest.yaml
  - photo: Un_altro_sogno.JPG
    poem: un-altro-sogno          # deve matchare lo slug derivato dal titolo
    alt: "Erba del giardino di casa, bagnata, al crepuscolo"  # min 8 char
    rope: 0                        # 0..3
    rotation: -2.4                 # ±5
    liftDelay: 0                   # 0..1000 ms
  - photo: Luce.jpg
    ...
  ```
- **D-05:** Slug derivato dal titolo poesia via normalize: NFKD-fold accenti, lowercase, replace spazi/underscore con `-`, strip caratteri non-alfanumerici eccetto `-`. Esempio: `"Un altro sogno"` → `un-altro-sogno`, `"…finché"` → `finche`, `"ciò che non dici"` → `cio-che-non-dici`.
- **D-06:** Validazione build-time: ogni foto in `photos/` deve avere una entry in manifest (no foto orfane), ogni entry deve referenziare una foto esistente (case-sensitive su Linux CI), ogni `poem` slug deve corrispondere a una poesia parsata, `alt` minimo 8 caratteri (a11y), `rope` ∈ [0,3], `rotation` ∈ [-5, 5]. Errori → exception con messaggio italiano chiaro che indica file + linea quando possibile.

### Parsing di `poems.txt`
- **D-07:** Riusa la logica già scritta in `src/data/poems.ts` (`parsePoems` + `normTitle`). Estrai in `vite/poem-parser.ts` come funzione pura testabile. Aggiungi unit test Vitest.
- **D-08:** Formato delle date nelle poesie è eterogeneo (`22/7/2025 | 17:38`, `28/7/2025 : 15:43`, `16/8/2025`). Parser estrae stringa raw, NON fa Date parsing. La sort cronologica è gestita dall'ordine in `manifest.yaml` (la fonte autoritativa per Phase 3+ rendering).

### CLI di check
- **D-09:** Script `scripts/manifest-check.mjs` (analogo a `gate-set.mjs`). Importa schema + parser, esegue tutte le validazioni, exit 0 se OK, exit 1 con report colorato in caso di errori. Aggiungi a `package.json` come `npm run manifest:check`.
- **D-10:** Stesso script invocato in CI come gate prima del build (`npm run manifest:check && npm run build`). Aggiorna `.github/workflows/deploy.yml`.

### Migrazione del codice esistente
- **D-11:** `src/data/poems.ts` (Phase 1 mock) viene sostituito con un re-export da `virtual:poems`: il file diventa `import { poems } from 'virtual:poems'; export * from 'virtual:poems'` (~3 righe). HomeView e PolaroidView non cambiano. Il manifest YAML viene popolato copiando i 15 entries hardcoded oggi nel mock.
- **D-12:** Le foto in `public/photos/` restano per ora — Phase 4 (asset pipeline) le sposterà in `photos/` come source-of-truth e le pipelinerà via vite-imagetools.

### Claude's Discretion
- **D-13:** Libreria YAML: `yaml` (npm package, ~30KB, supporto ottimo) — preferito a `js-yaml` (più vecchio, less typed).
- **D-14:** Libreria validazione: `zod` (già standard nel progetto se diventerà richiesta in Phase 4+; ~50KB minified). Alternative: `valibot` (più leggero, ~3KB) — ok ma rompe il pattern stabilito in research/STACK.md.
- **D-15:** Versioning del modulo virtuale: nessun `version` field; il modulo riflette sempre lo stato corrente di `poems.txt` + manifest.

</decisions>

<canonical_refs>
## Canonical References

### Project-level
- `.planning/PROJECT.md` — core value, no backend
- `.planning/REQUIREMENTS.md` — Phase 2 reqs CONT-01..04
- `.planning/ROADMAP.md` §"Phase 2" — goal e 4 success criteria
- `.planning/notes/photos-naming-and-order.md` — regola ordine cronologico, naming, mismatch case-sensitivity Linux
- `.planning/research/ARCHITECTURE.md` §"Build-time content pipeline" — pattern proposto già nel research

### Phase 1 outputs (riusabili)
- `src/data/poems.ts` — parser + manifest mock da migrare
- `poems.txt` — fonte autoritativa testo poesie
- `public/photos/*` — 15 foto attualmente, da spostare in Phase 4

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/data/poems.ts`: `parsePoems`, `normTitle`, schema `Poem`, schema `ManifestEntry`, helper `getPoem`/`getNextPoem`/`getPrevPoem`. Estrarre logiche pure in `vite/poem-parser.ts` e `vite/poem-schema.ts`. Mantenere stesse signature/types per minimizzare diff sui consumer.
- `scripts/gate-set.mjs`: pattern CLI Node ESM, argv parsing, file I/O, exit codes — copia struttura per `manifest-check.mjs`.
- `scripts/post-build.mjs`: pattern di script che gira dopo Vite build.

### Established Patterns
- `vite.config.ts`: `defineConfig`, env-driven base, plugins array.
- `src/router/index.ts`, `src/views/*.vue`: import alias `@/` per `src/`.
- Conventional commits: `feat(02-NN)`, `docs(02-NN)`, `test(02-NN)`.

### Integration Points
- HomeView.vue + PolaroidView.vue importano da `@/data/poems`. Dopo Phase 2, `@/data/poems` diventa un facciata sottile su `virtual:poems` — i consumer non cambiano.
- CI workflow `.github/workflows/deploy.yml` ottiene un nuovo step `npm run manifest:check` prima del build.

</code_context>

<specifics>
## Specific Ideas

- I 15 entries del manifest YAML iniziale sono già scritti come array TS in `src/data/poems.ts`. Migrare in YAML preservando ordine e tutte le proprietà (slug derivato → poem, file → photo, rope/rotation/liftDelay → omonimi). Aggiungere `alt` (testo accessibile) per ognuno: minimo 8 caratteri descrittivi della foto.
- Esempio errore atteso (italiano): `"Manifest invalido: la foto 'Foo.jpg' referenziata in content/manifest.yaml non esiste in photos/. Foto presenti: Autoinganni.jpg, Dubbio.JPG, ..."`.

</specifics>

<deferred>
## Deferred Ideas

- **Image pipeline (AVIF/WebP/srcset/LQIP/EXIF strip):** Phase 4 (ASSET-01..04). Phase 2 lascia le foto raw così come sono in `public/photos/` (o sposta a `photos/` source-of-truth se Phase 4 lo richiede).
- **Encryption AES-GCM del payload:** v2 / PRIV-01.
- **Pinch zoom sulle foto:** Phase 6 (FLIP/A11Y).
- **Idle sway delle polaroid + flip animato:** Phase 6 (SWAY-01..03, FLIP-02..07).

</deferred>

---

*Phase: 2-Content Pipeline + Manifest Validation*
*Context gathered: 2026-05-02*
