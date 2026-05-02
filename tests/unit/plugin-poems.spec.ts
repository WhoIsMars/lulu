import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { poemsPlugin } from '../../vite/plugin-poems'
import { ManifestValidationError } from '../../vite/manifest-loader'

let tmp: string

const REAL_POEMS = `"Un altro sogno" - 22/7/2025 | 17:38

Sarà un altro giorno.

—————

"Luce" - 28/7/2025

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

function setupFixture(yaml: string, photos: Array<[string, string]>, poemsTxt = REAL_POEMS): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lulu-plugin-test-'))
  fs.mkdirSync(path.join(tmp, 'content'))
  fs.mkdirSync(path.join(tmp, 'public'))
  fs.mkdirSync(path.join(tmp, 'public', 'photos'))
  fs.writeFileSync(path.join(tmp, 'content', 'manifest.yaml'), yaml)
  fs.writeFileSync(path.join(tmp, 'poems.txt'), poemsTxt)
  for (const [name, body] of photos) {
    fs.writeFileSync(path.join(tmp, 'public', 'photos', name), body)
  }
  return tmp
}

interface MockCtx {
  addWatchFile: (p: string) => void
  watched: string[]
}

function makeCtx(): MockCtx {
  const watched: string[] = []
  return {
    watched,
    addWatchFile(p: string) {
      watched.push(p)
    },
  }
}

beforeEach(() => {
  tmp = ''
})

afterEach(() => {
  if (tmp && fs.existsSync(tmp)) {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

describe('poemsPlugin', () => {
  describe('resolveId', () => {
    it("resolves 'virtual:poems' to '\\0virtual:poems'", () => {
      const plugin = poemsPlugin({ rootDir: process.cwd() })
      const resolveId = plugin.resolveId as (this: unknown, id: string) => string | undefined
      expect(resolveId.call({}, 'virtual:poems')).toBe('\0virtual:poems')
    })

    it('returns undefined for other ids', () => {
      const plugin = poemsPlugin({ rootDir: process.cwd() })
      const resolveId = plugin.resolveId as (this: unknown, id: string) => string | undefined
      expect(resolveId.call({}, 'something-else')).toBeUndefined()
      expect(resolveId.call({}, 'vue')).toBeUndefined()
    })
  })

  describe('load', () => {
    it("returns undefined for non-virtual ids", () => {
      const plugin = poemsPlugin({ rootDir: process.cwd() })
      const ctx = makeCtx()
      const load = plugin.load as (this: unknown, id: string) => string | undefined
      expect(load.call(ctx, 'some-real-file.ts')).toBeUndefined()
    })

    it("emits a TS module string with poems array + helpers when manifest is valid", () => {
      const root = setupFixture(VALID_YAML, [
        ['Un_altro_sogno.JPG', 'x'],
        ['Luce.jpg', 'y'],
      ])
      const plugin = poemsPlugin({ rootDir: root })
      const ctx = makeCtx()
      const load = plugin.load as (this: MockCtx, id: string) => string
      const out = load.call(ctx, '\0virtual:poems')

      expect(out).toContain('export const poems')
      expect(out).toContain('un-altro-sogno')
      expect(out).toContain('luce')
      expect(out).toContain('getPoem')
      expect(out).toContain('getNextPoem')
      expect(out).toContain('getPrevPoem')
    })

    it("registers watch files via addWatchFile during load", () => {
      const root = setupFixture(VALID_YAML, [
        ['Un_altro_sogno.JPG', 'x'],
        ['Luce.jpg', 'y'],
      ])
      const plugin = poemsPlugin({ rootDir: root })
      const ctx = makeCtx()
      const load = plugin.load as (this: MockCtx, id: string) => string
      load.call(ctx, '\0virtual:poems')

      expect(ctx.watched).toContain(path.join(root, 'poems.txt'))
      expect(ctx.watched).toContain(path.join(root, 'content', 'manifest.yaml'))
      expect(ctx.watched).toContain(path.join(root, 'public', 'photos'))
    })

    it("throws ManifestValidationError when fixture manifest is invalid (missing photo)", () => {
      // YAML references Un_altro_sogno.JPG but disk only has Luce.jpg → orphan + missing
      const root = setupFixture(VALID_YAML, [['Luce.jpg', 'y']])
      const plugin = poemsPlugin({ rootDir: root })
      const ctx = makeCtx()
      const load = plugin.load as (this: MockCtx, id: string) => string
      expect(() => load.call(ctx, '\0virtual:poems')).toThrow(ManifestValidationError)
    })
  })

  describe('plugin shape', () => {
    it("has the expected name and HMR hooks", () => {
      const plugin = poemsPlugin({ rootDir: process.cwd() })
      expect(plugin.name).toBe('lulu:poems')
      expect(typeof plugin.resolveId).toBe('function')
      expect(typeof plugin.load).toBe('function')
      expect(typeof plugin.handleHotUpdate).toBe('function')
      expect(typeof plugin.configureServer).toBe('function')
    })
  })
})
