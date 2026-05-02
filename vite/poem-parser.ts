/**
 * Pure parser for poems.txt + slug derivation. No Node/Vite imports.
 *
 * Extracted verbatim from src/data/poems.ts (Phase 1 mock) per D-07.
 * Adds deriveSlug per D-05 (NFKD-fold + ASCII strip → kebab-case).
 *
 * Used by:
 *   - vite/manifest-loader.ts
 *   - vite/plugin-poems.ts (Plan 02-02)
 *   - scripts/manifest-check.mjs (Plan 02-03)
 */

export interface ParsedPoem {
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
export function parsePoems(raw: string): ParsedPoem[] {
  const blocks = raw
    .split(/^[—-]{2,}\s*$/gm)
    .map((b) => b.trim())
    .filter(Boolean)
  // Header forms observed in poems.txt:
  //   "Title" - 22/7/2025 | 17:38       (curly+dash)
  //   "Title" 1/11/2025 | 3:31          (curly, no dash)
  //   "Title" | 14/4/2026 - 00:42       (curly + pipe)
  //   Title - 24/9 : 1:29               (no quotes)
  // Quoted form: optional opening/closing smart or ASCII quote, separator may be -, –, —, |, or whitespace.
  // Unquoted form: title is the first segment until ` - ` (with spaces), date is the rest.
  const quotedHeaderRe = /^[“"](.+?)[”"]\s*[-–—|]?\s*(\S.+?)$/m
  const unquotedHeaderRe = /^([A-Za-zÀ-ÿ][^\n"“”]*?)\s+[-–—]\s+(\S.+?)$/m
  const out: ParsedPoem[] = []
  for (const block of blocks) {
    let m = block.match(quotedHeaderRe)
    if (!m) m = block.match(unquotedHeaderRe)
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
export function normTitle(t: string): string {
  return t
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Maps a poem title to a kebab-case ASCII slug.
 *
 *   "Un altro sogno"          → "un-altro-sogno"
 *   "…finché"                 → "finche"
 *   "ciò che non dici"        → "cio-che-non-dici"
 *   "Lasciare, senza lasciti" → "lasciare-senza-lasciti"
 */
export function deriveSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase()
    .replace(/[…”"'«»“]/g, '') // strip stray punctuation
    .replace(/[_\s]+/g, '-') // spaces+underscore → hyphen
    .replace(/[^a-z0-9-]/g, '') // strip non-alnum/-
    .replace(/-+/g, '-') // collapse repeated hyphens
    .replace(/^-|-$/g, '') // trim leading/trailing hyphens
}
