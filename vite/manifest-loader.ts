/**
 * Build-time manifest loader (Phase 2, CONT-02/CONT-03).
 *
 * Reads:
 *   - <rootDir>/poems.txt
 *   - <rootDir>/content/manifest.yaml
 *   - <rootDir>/src/assets/photos/   (override via opts.photosDir; Phase 4 moved
 *     photos here so vite-imagetools can transform them)
 *
 * Validates:
 *   - YAML shape via Zod (`ManifestSchema`)
 *   - Every photo file on disk has a manifest entry (no orphans)
 *   - Every manifest entry references an existing photo file (case-sensitive)
 *   - Every manifest poem slug resolves to a parsed poem (via deriveSlug)
 *
 * Errors are accumulated and thrown as a single `ManifestValidationError` with
 * an italian, multi-line message. Pure Node module — safe to import from a
 * Vite plugin (Plan 02-02) or a CLI (Plan 02-03).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { ManifestSchema, type Manifest, type Poem } from './poem-schema'
import { parsePoems, deriveSlug, type ParsedPoem } from './poem-parser'

export class ManifestValidationError extends Error {
  public readonly issues: string[]
  constructor(issues: string[]) {
    super('Manifest invalido:\n' + issues.map((i) => '  - ' + i).join('\n'))
    this.issues = issues
    this.name = 'ManifestValidationError'
  }
}

export interface LoadManifestOptions {
  /** Repo root. */
  rootDir: string
  /** Default: `<rootDir>/poems.txt`. */
  poemsTxtPath?: string
  /** Default: `<rootDir>/content/manifest.yaml`. */
  manifestYamlPath?: string
  /** Default: `<rootDir>/src/assets/photos`. */
  photosDir?: string
}

export interface LoadedManifest {
  poems: Poem[]
  watchPaths: string[]
}

const NON_IMAGE_NAMES = new Set(['.DS_Store', 'Thumbs.db'])

function isPhotoFile(name: string): boolean {
  if (NON_IMAGE_NAMES.has(name)) return false
  if (name.startsWith('.')) return false
  return true
}

export function loadManifest(opts: LoadManifestOptions): LoadedManifest {
  const { rootDir } = opts
  const poemsTxtPath = opts.poemsTxtPath ?? join(rootDir, 'poems.txt')
  const manifestYamlPath = opts.manifestYamlPath ?? join(rootDir, 'content', 'manifest.yaml')
  const photosDir = opts.photosDir ?? join(rootDir, 'src', 'assets', 'photos')

  const issues: string[] = []

  // 1. Read + parse YAML
  let rawYaml: unknown
  try {
    const yamlText = readFileSync(manifestYamlPath, 'utf8')
    rawYaml = parseYaml(yamlText)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ManifestValidationError([`impossibile leggere ${manifestYamlPath}: ${msg}`])
  }

  // 2. Zod validate
  const parsed = ManifestSchema.safeParse(rawYaml)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const where = issue.path.length ? `entry #${issue.path[0]}` : 'manifest'
      const field = issue.path.slice(1).join('.') || ''
      const fieldPart = field ? ` (campo "${field}")` : ''
      issues.push(`${where}${fieldPart}: ${issue.message}`)
    }
    // Schema-level failures are fatal — disk/poem validation can't proceed safely.
    throw new ManifestValidationError(issues)
  }
  const manifest: Manifest = parsed.data

  // 3. Read poems.txt + build slug → ParsedPoem map
  let poemsRaw: string
  try {
    poemsRaw = readFileSync(poemsTxtPath, 'utf8')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ManifestValidationError([`impossibile leggere ${poemsTxtPath}: ${msg}`])
  }
  const parsedPoems = parsePoems(poemsRaw)
  const poemBySlug = new Map<string, ParsedPoem>()
  for (const p of parsedPoems) {
    poemBySlug.set(deriveSlug(p.title), p)
  }

  // 4. Read photosDir
  let diskFiles: string[]
  try {
    diskFiles = readdirSync(photosDir)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ManifestValidationError([`impossibile leggere photosDir ${photosDir}: ${msg}`])
  }
  const diskSet = new Set<string>(diskFiles.filter(isPhotoFile))
  const diskLowerToActual = new Map<string, string>()
  for (const f of diskSet) {
    diskLowerToActual.set(f.toLowerCase(), f)
  }

  // 5. Per-entry validation — accumulate ALL errors before throwing
  const referencedPhotos = new Set<string>()
  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i]
    const at = `entry #${i + 1} (foto '${entry.photo}', poem '${entry.poem}')`

    // 5a. Photo file existence — case-sensitive
    if (!diskSet.has(entry.photo)) {
      const lower = entry.photo.toLowerCase()
      const actual = diskLowerToActual.get(lower)
      if (actual) {
        issues.push(
          `${at}: il manifest referenzia '${entry.photo}' ma sul disco è '${actual}' — i path sono case-sensitive su Linux/CI (maiuscole/minuscole devono coincidere esattamente).`,
        )
      } else {
        const presenti = [...diskSet].sort().join(', ')
        issues.push(
          `${at}: la foto '${entry.photo}' non esiste in photos/. Foto presenti: ${presenti}`,
        )
      }
    } else {
      referencedPhotos.add(entry.photo)
    }

    // 5b. Slug resolution
    if (!poemBySlug.has(entry.poem)) {
      const slugs = [...poemBySlug.keys()].sort().join(', ')
      issues.push(
        `${at}: lo slug '${entry.poem}' non corrisponde a nessuna poesia in ${poemsTxtPath}. Slug disponibili: ${slugs}`,
      )
    }
  }

  // 6. Orphan files on disk
  for (const f of diskSet) {
    if (!referencedPhotos.has(f)) {
      issues.push(
        `foto orfana: '${f}' presente in photos/ ma nessuna entry del manifest la referenzia.`,
      )
    }
  }

  if (issues.length > 0) {
    throw new ManifestValidationError(issues)
  }

  // 7. Build final Poem[] — guaranteed safe at this point
  const poems: Poem[] = manifest.map((entry) => {
    const parsedPoem = poemBySlug.get(entry.poem)!
    return {
      slug: entry.poem,
      title: parsedPoem.title,
      date: parsedPoem.date,
      file: entry.photo,
      body: parsedPoem.body,
      alt: entry.alt,
      rope: entry.rope,
      rotation: entry.rotation,
      liftDelay: entry.liftDelay,
    }
  })

  return {
    poems,
    watchPaths: [poemsTxtPath, manifestYamlPath, photosDir],
  }
}
