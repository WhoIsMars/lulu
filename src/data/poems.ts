/**
 * Phase 1 mock poem data store.
 * Phase 2 will replace this module with a typed virtual:poems module produced
 * by a custom Vite plugin reading poems.txt + content/manifest.yaml. For now
 * we read poems.txt at build time via Vite's ?raw import and parse it inline,
 * matching parsed entries to a hardcoded slug/photo manifest by exact title.
 */
import poemsRaw from '../../poems.txt?raw'

export interface Poem {
  slug: string
  title: string
  date: string
  file: string
  body: string
  rope: number
  rotation: number
  liftDelay: number
}

interface ManifestEntry {
  slug: string
  title: string
  file: string
  rope: number
  rotation: number
  liftDelay: number
}

/**
 * The hand-curated manifest. Phase 2 will read this from content/manifest.yaml
 * (CONT-02). Order is chronological by poem date — first in poems.txt is
 * top-left of the room, last is bottom-right.
 */
const manifest: ManifestEntry[] = [
  { slug: 'un-altro-sogno', title: 'Un altro sogno', file: 'Un_altro_sogno.JPG', rope: 0, rotation: -2.4, liftDelay: 0 },
  { slug: 'luce', title: 'Luce', file: 'Luce.jpg', rope: 0, rotation: 1.8, liftDelay: 80 },
  { slug: 'insulto', title: 'Insulto', file: 'Insulto.jpg', rope: 0, rotation: -1.2, liftDelay: 160 },
  { slug: 'oltre', title: 'Oltre', file: 'Oltre.jpg', rope: 0, rotation: 2.6, liftDelay: 240 },
  { slug: 'autoinganni', title: 'Autoinganni', file: 'Autoinganni.jpg', rope: 1, rotation: 1.4, liftDelay: 0 },
  { slug: 'sincronizzati', title: 'Sincronizzati', file: 'Sincronizzati.JPG', rope: 1, rotation: -2.8, liftDelay: 80 },
  { slug: 'punizione', title: 'Punizione', file: 'punizione.JPG', rope: 1, rotation: 0.8, liftDelay: 160 },
  { slug: 'lasciare-senza-lasciti', title: 'Lasciare, senza lasciti', file: 'Lasciare_senza_lasciti.JPG', rope: 1, rotation: -1.6, liftDelay: 240 },
  { slug: 'dubbio', title: 'Dubbio', file: 'Dubbio.JPG', rope: 2, rotation: 2.2, liftDelay: 0 },
  { slug: 'silenzi', title: 'Silenzi', file: 'Silenzi.jpg', rope: 2, rotation: -1.0, liftDelay: 80 },
  { slug: 'i-tuoi-auto-sabotaggi', title: 'I tuoi auto sabotaggi', file: 'I_tuoi_auto_sabotaggi.jpg', rope: 2, rotation: 1.6, liftDelay: 160 },
  { slug: 'le-luci-delle-lucciole', title: 'Le luci delle lucciole', file: 'Le_luci_delle_lucciole.JPG', rope: 2, rotation: -2.4, liftDelay: 240 },
  { slug: 'finche', title: '…finché', file: '…finché.jpg', rope: 3, rotation: 1.2, liftDelay: 0 },
  { slug: 'cio-che-non-dici', title: 'ciò che non dici', file: 'ciò_che_non_dici.jpg', rope: 3, rotation: -1.8, liftDelay: 80 },
  { slug: 'perdimi', title: 'perdimi', file: 'perdimi.JPG', rope: 3, rotation: 2.0, liftDelay: 160 },
]

interface ParsedPoem {
  title: string
  date: string
  body: string
}

/**
 * Parses poems.txt into structured entries. Block separators are runs of
 * em-dashes (with optional trailing hyphen) on their own line. Each block
 * begins with a header `"<title>" - <date>` line followed by the body.
 * Smart quotes (curly) and ASCII quotes both accepted.
 */
function parsePoems(raw: string): ParsedPoem[] {
  const blocks = raw.split(/^[—-]{2,}\s*$/gm).map((b) => b.trim()).filter(Boolean)
  const headerRe = /^[“"](.+?)[”"]\s*[-–—]\s*(.+?)$/m
  const out: ParsedPoem[] = []
  for (const block of blocks) {
    const m = block.match(headerRe)
    if (!m) continue
    const title = m[1].trim()
    const date = m[2].trim()
    const body = block.slice(m.index! + m[0].length).trim()
    if (!body) continue
    out.push({ title, date, body })
  }
  return out
}

/** Normalize title for fuzzy match (collapses unicode quirks + spacing). */
function normTitle(t: string): string {
  return t
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const parsed = parsePoems(poemsRaw)
const parsedByTitle = new Map<string, ParsedPoem>()
for (const p of parsed) parsedByTitle.set(normTitle(p.title), p)

export const poems: Poem[] = manifest.map((m) => {
  const match = parsedByTitle.get(normTitle(m.title))
  return {
    slug: m.slug,
    title: m.title,
    date: match?.date ?? '',
    file: m.file,
    body: match?.body ?? '',
    rope: m.rope,
    rotation: m.rotation,
    liftDelay: m.liftDelay,
  }
})

export const poemsBySlug: Record<string, Poem> = Object.fromEntries(
  poems.map((p) => [p.slug, p]),
)

export function getPoem(slug: string): Poem | undefined {
  return poemsBySlug[slug]
}

export function getNextPoem(slug: string): Poem | undefined {
  const idx = poems.findIndex((p) => p.slug === slug)
  if (idx < 0) return undefined
  return poems[(idx + 1) % poems.length]
}

export function getPrevPoem(slug: string): Poem | undefined {
  const idx = poems.findIndex((p) => p.slug === slug)
  if (idx < 0) return undefined
  return poems[(idx - 1 + poems.length) % poems.length]
}
