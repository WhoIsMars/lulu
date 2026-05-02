import { describe, it, expect } from 'vitest'
import { parsePoems, normTitle, deriveSlug } from '../../vite/poem-parser'

const TWO_BLOCK_RAW = `“Un altro sogno” - 22/7/2025 | 17:38

Sarà
solo un altro giorno,
solo un altro sogno.

—————

“Luce” - 28/7/2025 : 15:43

Ticchetta,
tamburella la pioggia.
`

describe('parsePoems', () => {
  it('splits a 2-block raw input on em-dash separator into 2 ParsedPoem', () => {
    const out = parsePoems(TWO_BLOCK_RAW)
    expect(out).toHaveLength(2)
  })

  it('extracts title and date from a smart-quoted header line', () => {
    const out = parsePoems(TWO_BLOCK_RAW)
    expect(out[0].title).toBe('Un altro sogno')
    expect(out[0].date).toBe('22/7/2025 | 17:38')
    expect(out[1].title).toBe('Luce')
    expect(out[1].date).toBe('28/7/2025 : 15:43')
  })

  it('preserves body line breaks and content', () => {
    const out = parsePoems(TWO_BLOCK_RAW)
    expect(out[0].body).toContain('Sarà')
    expect(out[0].body).toContain('solo un altro giorno,')
    expect(out[0].body.split('\n').length).toBeGreaterThanOrEqual(3)
  })

  it('returns empty array for input with no header', () => {
    expect(parsePoems('just some random prose without header')).toEqual([])
  })
})

describe('normTitle', () => {
  it('collapses whitespace, lowercases, strips quotes', () => {
    expect(normTitle('Un  altro sogno ')).toBe('un altro sogno')
  })

  it('strips smart quotes', () => {
    expect(normTitle('“Luce”')).toBe('luce')
  })
})

describe('deriveSlug', () => {
  it('derives kebab-case slug from a plain title', () => {
    expect(deriveSlug('Un altro sogno')).toBe('un-altro-sogno')
  })

  it('strips ellipsis and folds accents', () => {
    expect(deriveSlug('…finché')).toBe('finche')
  })

  it('handles accented lowercase title', () => {
    expect(deriveSlug('ciò che non dici')).toBe('cio-che-non-dici')
  })

  it('handles commas and multi-word titles', () => {
    expect(deriveSlug('Lasciare, senza lasciti')).toBe('lasciare-senza-lasciti')
  })

  it('replaces underscores with hyphens', () => {
    expect(deriveSlug('I_tuoi_auto_sabotaggi')).toBe('i-tuoi-auto-sabotaggi')
  })
})
