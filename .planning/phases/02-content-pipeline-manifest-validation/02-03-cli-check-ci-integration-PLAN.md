---
phase: 02-content-pipeline-manifest-validation
plan: 03
type: execute
wave: 2
depends_on: [02-01]
files_modified:
  - scripts/manifest-check.mjs
  - package.json
  - .github/workflows/deploy.yml
  - tests/unit/manifest-check-cli.spec.ts
autonomous: true
requirements: [CONT-03]
must_haves:
  truths:
    - "Esiste lo script `npm run manifest:check` che invoca scripts/manifest-check.mjs"
    - "Lo script esce 0 con un manifest valido e stampa una riga di conferma in italiano"
    - "Lo script esce 1 con un manifest invalido e stampa un report colorato di tutti gli errori"
    - "Il workflow CI .github/workflows/deploy.yml esegue `npm run manifest:check` PRIMA dello step Build"
    - "Il fallimento di manifest:check in CI blocca il deploy (job build fallisce)"
  artifacts:
    - path: "scripts/manifest-check.mjs"
      provides: "CLI Node ESM standalone, importa loadManifest, exit codes corretti"
      contains: "process.exit"
    - path: "package.json"
      provides: "Script npm 'manifest:check'"
      contains: "manifest:check"
    - path: ".github/workflows/deploy.yml"
      provides: "Step CI 'Manifest check' prima di Build"
      contains: "manifest:check"
  key_links:
    - from: "scripts/manifest-check.mjs"
      to: "vite/manifest-loader.ts"
      via: "import { loadManifest, ManifestValidationError } from '../vite/manifest-loader.ts'"
      pattern: "from '\\.\\./vite/manifest-loader"
    - from: ".github/workflows/deploy.yml"
      to: "package.json::manifest:check"
      via: "npm run manifest:check step before Build step"
      pattern: "npm run manifest:check"
---

<objective>
Esporre la stessa validazione del Vite plugin come comando standalone Node (D-09): `npm run manifest:check` deve girare in <1s, importare `loadManifest` direttamente, e produrre un report italiano colorato in caso di errori. Inserirlo come gate CI prima del Build (D-10) così che un manifest rotto faccia fallire il workflow prima ancora di provare a buildare.

Purpose: CONT-03 richiede che gli stessi errori siano disponibili senza un build completo — feedback rapido per il proprietario quando aggiunge una foto / poesia.

Output: 1 script CLI, 1 npm script, 1 step CI nuovo, 1 test smoke.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-content-pipeline-manifest-validation/02-CONTEXT.md
@.planning/phases/02-content-pipeline-manifest-validation/02-01-SUMMARY.md
@.github/workflows/deploy.yml
@scripts/gate-set.mjs
@package.json

<interfaces>
<!-- Plan 01 outputs (in place by the time this plan runs): -->

```typescript
// vite/manifest-loader.ts
export function loadManifest(opts: { rootDir: string; ... }): LoadedManifest
export class ManifestValidationError extends Error {
  readonly issues: string[]
}
```

<!-- Existing CLI pattern to mirror (scripts/gate-set.mjs uses Node ESM, argv, fs, exit codes). -->
<!-- Existing CI structure (.github/workflows/deploy.yml): Lint -> Type-check -> Unit tests -> Build -> Post-build. -->
<!-- New step "Manifest check" goes between Unit tests and Build. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement scripts/manifest-check.mjs CLI + npm script</name>
  <read_first>
    - scripts/gate-set.mjs (existing CLI pattern — argv, exit codes, file I/O)
    - vite/manifest-loader.ts (Plan 01)
    - package.json (current scripts block)
  </read_first>
  <files>scripts/manifest-check.mjs, package.json, tests/unit/manifest-check-cli.spec.ts</files>
  <action>
    1. **Create `scripts/manifest-check.mjs`** as a Node ESM script. Since `vite/manifest-loader.ts` is TypeScript and the script is `.mjs`, use one of:
       - **Preferred**: import via `tsx` runtime — add `tsx` to devDependencies and run the script with `tsx scripts/manifest-check.ts` (rename to `.ts`). This avoids hand-compiling.
       - **Alternative**: keep `.mjs`, but `import` cannot resolve `.ts`. So convert to: rename to `scripts/manifest-check.ts` and add `tsx@^4.19.0` to devDependencies. Update the npm script accordingly.

       **DECISION (claude's discretion within D-14 patterns)**: rename to `scripts/manifest-check.ts`, install `tsx` as devDependency, npm script invokes `tsx`.

       Run: `npm install --save-dev tsx@^4.19.0`

       Then create `scripts/manifest-check.ts`:
       ```typescript
       #!/usr/bin/env tsx
       /**
        * Phase 2 (CONT-03): standalone manifest validator. Runs the same checks
        * as the Vite plugin without a full build. Imported by `npm run manifest:check`
        * and as the CI gate before `npm run build`.
        */
       import { loadManifest, ManifestValidationError } from '../vite/manifest-loader'
       import { fileURLToPath } from 'node:url'
       import path from 'node:path'

       const RED = '\x1b[31m'
       const GREEN = '\x1b[32m'
       const DIM = '\x1b[2m'
       const RESET = '\x1b[0m'
       const isTTY = Boolean(process.stdout.isTTY)
       const c = (col: string, s: string) => (isTTY ? `${col}${s}${RESET}` : s)

       function main(): void {
         const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..')
         try {
           const { poems } = loadManifest({ rootDir })
           console.log(c(GREEN, `✓ Manifest valido: ${poems.length} poesie verificate.`))
           process.exit(0)
         } catch (error: unknown) {
           if (error instanceof ManifestValidationError) {
             console.error(c(RED, '✗ Manifest invalido:'))
             for (const issue of error.issues) {
               console.error('  ' + c(RED, '•') + ' ' + issue)
             }
             console.error(c(DIM, `\nVedi content/manifest.yaml e poems.txt. ${error.issues.length} errori.`))
             process.exit(1)
           }
           console.error(c(RED, '✗ Errore inatteso durante la validazione del manifest:'))
           console.error(error)
           process.exit(2)
         }
       }

       main()
       ```

    2. **Update `package.json`**: add to `"scripts"`:
       ```json
       "manifest:check": "tsx scripts/manifest-check.ts"
       ```
       And to `"devDependencies"` (npm install added it; verify version is `^4.19.0`).

    3. **Create `tests/unit/manifest-check-cli.spec.ts`** as a smoke test that uses `child_process.execSync` to invoke `npm run manifest:check` against the real repo. Should exit 0 because the real repo is valid after Plan 01. Optionally a second case that runs the script against a temp fixture dir with a broken manifest by setting an env var or temporarily symlinking — KEEP IT SIMPLE: only assert the success-path exit-0 + stdout contains "✓ Manifest valido". (The detailed error-path coverage already lives in Plan 01's manifest-loader.spec.ts; this test is a CLI smoke only.)

       ```typescript
       import { describe, it, expect } from 'vitest'
       import { execSync } from 'node:child_process'

       describe('manifest:check CLI', () => {
         it('exits 0 with success message on the real repo manifest', () => {
           const out = execSync('npm run manifest:check --silent', { encoding: 'utf8' })
           expect(out).toContain('Manifest valido')
         })
       })
       ```
  </action>
  <verify>
    <automated>npm run manifest:check && npm run test:unit -- --run tests/unit/manifest-check-cli.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `test -f scripts/manifest-check.ts` returns 0 (or `.mjs` if you went the alt route — but preferred is `.ts`)
    - `grep -c "loadManifest" scripts/manifest-check.ts` returns 1
    - `grep -c "ManifestValidationError" scripts/manifest-check.ts` >= 1
    - `grep -c "process.exit(0)" scripts/manifest-check.ts` >= 1
    - `grep -c "process.exit(1)" scripts/manifest-check.ts` >= 1
    - `grep -c "Manifest valido" scripts/manifest-check.ts` >= 1
    - `grep -c "manifest:check" package.json` >= 1
    - `grep -c "tsx" package.json` >= 1
    - `npm run manifest:check` exits 0 and stdout contains "Manifest valido"
    - `npm run test:unit -- --run tests/unit/manifest-check-cli.spec.ts` exits 0
  </acceptance_criteria>
  <done>CLI funziona end-to-end sul repo reale, smoke test verde.</done>
</task>

<task type="auto">
  <name>Task 2: Insert manifest:check step in CI workflow before Build</name>
  <read_first>
    - .github/workflows/deploy.yml (current — verify step order: Lint, Type-check, Unit tests, Build, Post-build)
  </read_first>
  <files>.github/workflows/deploy.yml</files>
  <action>
    Edit `.github/workflows/deploy.yml`. After the `- name: Unit tests` step and BEFORE the `- name: Build` step, insert exactly:

    ```yaml
      - name: Manifest check
        run: npm run manifest:check
    ```

    Do NOT touch any other step. Preserve indentation (6 spaces under `steps:`). Verify after edit:
    - The `Manifest check` step appears between `Unit tests` and `Build`.
    - The job name remains `build`.
    - The `deploy` job remains unchanged.
  </action>
  <verify>
    <automated>grep -B1 -A1 "Manifest check" .github/workflows/deploy.yml | grep -c "npm run manifest:check"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "name: Manifest check" .github/workflows/deploy.yml` returns 1
    - `grep -c "npm run manifest:check" .github/workflows/deploy.yml` returns 1
    - `awk '/name: Unit tests/{u=NR} /name: Manifest check/{m=NR} /name: Build$/{b=NR} END{exit !(u<m && m<b)}' .github/workflows/deploy.yml` exits 0 (step order: Unit tests < Manifest check < Build)
    - `grep -c "name: Build$" .github/workflows/deploy.yml` returns 1 (Build step still present, single match)
    - `grep -c "actions/deploy-pages@v5" .github/workflows/deploy.yml` >= 1 (deploy job intact)
    - `npm run lint && npm run typecheck && npm run test:unit && npm run manifest:check && VITE_BASE=/lulu/ npm run build` exits 0 (full local CI mirror)
  </acceptance_criteria>
  <done>CI workflow include `npm run manifest:check` come gate prima del build; full local CI mirror passa.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| developer shell → CLI | Author runs `npm run manifest:check`. No untrusted input. |
| CI runner → CLI | GitHub Actions runs the same command. Repo content is the input — same trust model as the rest of the build. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-08 | Tampering | CI workflow ordering | mitigate | Step order asserted in acceptance_criteria via awk; if a future PR moves Build before Manifest check, the test fails. |
| T-02-09 | Information Disclosure | CLI stderr in CI logs | accept | Error messages enumerate filenames already in the public repo. No secrets surfaced. |
| T-02-10 | Denial of Service | CI runtime | accept | manifest:check reads ~3 small files, completes in <1s. Negligible. |
</threat_model>

<verification>
- `npm run manifest:check` esce 0 sul repo reale.
- `npm run test:unit` (full suite, incluso CLI smoke) esce 0.
- `grep "Manifest check" .github/workflows/deploy.yml` matcha.
- Step order in deploy.yml: Lint → Type-check → Unit tests → Manifest check → Build → Post-build → upload-pages-artifact.
</verification>

<success_criteria>
- Comando `npm run manifest:check` standalone funziona, è veloce, ha exit codes corretti.
- CI fallisce se il manifest si rompe (gate prima del build).
- Test smoke CLI verde.
</success_criteria>

<output>
After completion, create `.planning/phases/02-content-pipeline-manifest-validation/02-03-SUMMARY.md`.
</output>
