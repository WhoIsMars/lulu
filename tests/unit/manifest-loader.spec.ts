import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadManifest, ManifestValidationError } from '../../vite/manifest-loader'

let tmp: string

const REAL_POEMS = `“Un altro sogno” - 22/7/2025 | 17:38

Sarà un altro giorno.

—————

“Luce” - 28/7/2025

Luce di luna.
`

const VALID_YAML = `\
- photo: Un_altro_sogno.JPG
  poem: un-altro-sogno
  alt: "Foto della poesia Un altro sogno"
  rope: 0
  rotation: -2.4
  liftDelay: 0
- photo: Luce.jpg
  poem: luce
  alt: "Foto della poesia Luce di luna"
  rope: 0
  rotation: 1.8
  liftDelay: 80
`

function setup(yaml: string, photos: Array<[string, string]>, poemsTxt = REAL_POEMS): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lulu-test-'))
  fs.mkdirSync(path.join(tmp, 'content'))
  fs.mkdirSync(path.join(tmp, 'photos'))
  fs.writeFileSync(path.join(tmp, 'content', 'manifest.yaml'), yaml)
  fs.writeFileSync(path.join(tmp, 'poems.txt'), poemsTxt)
  for (const [name, body] of photos) {
    fs.writeFileSync(path.join(tmp, 'photos', name), body)
  }
  return tmp
}

beforeEach(() => {
  tmp = ''
})

afterEach(() => {
  if (tmp && fs.existsSync(tmp)) {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

describe('loadManifest', () => {
  it('returns Poem[] in manifest order when everything is in sync', () => {
    const root = setup(VALID_YAML, [
      ['Un_altro_sogno.JPG', 'x'],
      ['Luce.jpg', 'x'],
    ])
    const result = loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    expect(result.poems).toHaveLength(2)
    expect(result.poems[0].slug).toBe('un-altro-sogno')
    expect(result.poems[0].title).toBe('Un altro sogno')
    expect(result.poems[0].file).toBe('Un_altro_sogno.JPG')
    expect(result.poems[0].body).toContain('Sarà un altro giorno')
    expect(result.poems[1].slug).toBe('luce')
    expect(result.watchPaths.length).toBeGreaterThanOrEqual(3)
  })

  it('throws ManifestValidationError when manifest references missing photo file', () => {
    const root = setup(VALID_YAML, [
      ['Un_altro_sogno.JPG', 'x'],
      // Luce.jpg missing
    ])
    let err: unknown
    try {
      loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ManifestValidationError)
    expect((err as Error).message).toMatch(/non esiste in photos\//)
  })

  it('throws when photosDir contains an orphan file not in manifest', () => {
    const root = setup(VALID_YAML, [
      ['Un_altro_sogno.JPG', 'x'],
      ['Luce.jpg', 'x'],
      ['Orphan.jpg', 'x'],
    ])
    let err: unknown
    try {
      loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ManifestValidationError)
    expect((err as Error).message).toMatch(/orfan/i)
  })

  it('throws when manifest poem slug has no matching poem in poems.txt', () => {
    const yaml = `\
- photo: Un_altro_sogno.JPG
  poem: ghost-slug
  alt: "Foto associata a ghost"
  rope: 0
  rotation: 0
  liftDelay: 0
`
    const root = setup(yaml, [['Un_altro_sogno.JPG', 'x']])
    let err: unknown
    try {
      loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ManifestValidationError)
    expect((err as Error).message).toMatch(/non corrisponde a nessuna poesia/)
  })

  it('throws when alt is too short', () => {
    const yaml = `\
- photo: Un_altro_sogno.JPG
  poem: un-altro-sogno
  alt: "corto"
  rope: 0
  rotation: 0
  liftDelay: 0
- photo: Luce.jpg
  poem: luce
  alt: "Foto della poesia Luce di luna"
  rope: 0
  rotation: 0
  liftDelay: 0
`
    const root = setup(yaml, [
      ['Un_altro_sogno.JPG', 'x'],
      ['Luce.jpg', 'x'],
    ])
    let err: unknown
    try {
      loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ManifestValidationError)
    expect((err as Error).message).toMatch(/alt/i)
  })

  it('throws case-sensitive error when YAML references foo.JPG but disk has foo.jpg', () => {
    // YAML says Un_altro_sogno.JPG, disk has un_altro_sogno.jpg
    const root = setup(VALID_YAML, [
      ['un_altro_sogno.jpg', 'x'],
      ['Luce.jpg', 'x'],
    ])
    let err: unknown
    try {
      loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ManifestValidationError)
    expect((err as Error).message).toMatch(/case-sensitive|maiuscole/i)
  })

  it('throws ManifestValidationError when YAML has invalid slug (NotKebab)', () => {
    const yaml = `\
- photo: Un_altro_sogno.JPG
  poem: NotKebab
  alt: "Foto associata alla poesia"
  rope: 0
  rotation: 0
  liftDelay: 0
`
    const root = setup(yaml, [['Un_altro_sogno.JPG', 'x']])
    let err: unknown
    try {
      loadManifest({ rootDir: root, photosDir: path.join(root, 'photos') })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(ManifestValidationError)
  })
})
