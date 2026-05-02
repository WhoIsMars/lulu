#!/usr/bin/env tsx
/**
 * Phase 2 (CONT-03): standalone manifest validator.
 *
 * Runs the same checks as the Vite plugin without a full build. Imported by
 * `npm run manifest:check` and used as the CI gate before `npm run build`.
 *
 * Reuses `loadManifest` from `vite/manifest-loader.ts` so validation logic stays
 * in a single place.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadManifest, ManifestValidationError } from '../vite/manifest-loader'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

const isTTY: boolean = Boolean(process.stdout.isTTY)
const color = (col: string, s: string): string => (isTTY ? `${col}${s}${RESET}` : s)

function main(): void {
  // scripts/manifest-check.ts → repo root is two levels up.
  const here = fileURLToPath(import.meta.url)
  const rootDir = path.resolve(path.dirname(here), '..')

  try {
    const { poems } = loadManifest({ rootDir })
    console.log(color(GREEN, `✓ Manifest valido — ${poems.length} poesie verificate, tutto allineato.`))
    process.exit(0)
  } catch (error: unknown) {
    if (error instanceof ManifestValidationError) {
      console.error(color(RED, '✗ Manifest invalido:'))
      for (const issue of error.issues) {
        console.error('  ' + color(RED, '•') + ' ' + issue)
      }
      console.error(
        color(DIM, `\nVedi content/manifest.yaml e poems.txt. ${error.issues.length} errori da risolvere.`),
      )
      process.exit(1)
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(color(RED, '✗ Errore inatteso durante la validazione del manifest:'))
    console.error(message)
    process.exit(2)
  }
}

main()
