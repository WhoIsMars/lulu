import { describe, it, expect } from 'vitest'
import { ManifestEntrySchema, ManifestSchema, PoemSchema } from '../../vite/poem-schema'

const validEntry = {
  photo: 'Un_altro_sogno.JPG',
  poem: 'un-altro-sogno',
  alt: 'Foto associata alla poesia "Un altro sogno"',
  rope: 0,
  rotation: -2.4,
  liftDelay: 0,
}

describe('ManifestEntrySchema', () => {
  it('accepts a fully-valid entry', () => {
    expect(() => ManifestEntrySchema.parse(validEntry)).not.toThrow()
  })

  it('rejects alt with 7 chars (must be >= 8)', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, alt: 'sette c' })).toThrow()
  })

  it('rejects rope = 4 (max 3)', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, rope: 4 })).toThrow()
  })

  it('rejects rope = -1 (min 0)', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, rope: -1 })).toThrow()
  })

  it('rejects rotation = 5.1 and -5.1', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, rotation: 5.1 })).toThrow()
    expect(() => ManifestEntrySchema.parse({ ...validEntry, rotation: -5.1 })).toThrow()
  })

  it('rejects unknown extra keys (.strict)', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, foo: 'bar' })).toThrow()
  })

  it('rejects poem slug "NotKebab"', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, poem: 'NotKebab' })).toThrow()
  })

  it('rejects empty photo string', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, photo: '' })).toThrow()
  })

  it('rejects liftDelay > 1000', () => {
    expect(() => ManifestEntrySchema.parse({ ...validEntry, liftDelay: 1001 })).toThrow()
  })
})

describe('ManifestSchema', () => {
  it('accepts an array of valid entries', () => {
    expect(() => ManifestSchema.parse([validEntry, { ...validEntry, poem: 'luce', photo: 'Luce.jpg' }])).not.toThrow()
  })

  it('rejects empty array', () => {
    expect(() => ManifestSchema.parse([])).toThrow()
  })
})

describe('PoemSchema', () => {
  it('accepts a fully-valid poem', () => {
    const poem = {
      slug: 'un-altro-sogno',
      title: 'Un altro sogno',
      date: '22/7/2025',
      file: 'Un_altro_sogno.JPG',
      body: 'Sarà solo un altro giorno',
      alt: 'Foto associata alla poesia',
      rope: 0,
      rotation: -2.4,
      liftDelay: 0,
    }
    expect(() => PoemSchema.parse(poem)).not.toThrow()
  })
})
