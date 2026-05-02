import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { verifyPassword } from '@/gate/crypto'

// Helper: derive salt + hash via Node pbkdf2Sync to match what gate-set.mjs writes,
// then assert verifyPassword (which uses WebCrypto in jsdom / browser) returns identical results.
async function nodeDerive(password: string): Promise<{ saltB64: string; hashB64: string }> {
  const { pbkdf2Sync, randomBytes } = await import('node:crypto')
  const salt = randomBytes(16)
  const hash = pbkdf2Sync(
    Buffer.from(password.normalize('NFC'), 'utf8'),
    salt,
    200_000,
    32,
    'sha256',
  )
  return { saltB64: salt.toString('base64'), hashB64: hash.toString('base64') }
}

describe('verifyPassword (Node ↔ WebCrypto byte parity, Pitfall C)', () => {
  it('returns true for the matching password', async () => {
    const { saltB64, hashB64 } = await nodeDerive('memento mori')
    expect(await verifyPassword('memento mori', saltB64, hashB64, 200_000)).toBe(true)
  })

  it('returns false for a different password', async () => {
    const { saltB64, hashB64 } = await nodeDerive('memento mori')
    expect(await verifyPassword('wrong', saltB64, hashB64, 200_000)).toBe(false)
  })

  it('is case-sensitive', async () => {
    const { saltB64, hashB64 } = await nodeDerive('memento mori')
    expect(await verifyPassword('Memento Mori', saltB64, hashB64, 200_000)).toBe(false)
  })

  it('NFC-normalizes input so different Unicode forms of the same passphrase verify', async () => {
    // "café" precomposed (U+00E9) vs decomposed (e + U+0301)
    const precomposed = 'café'
    const decomposed = 'café'
    const { saltB64, hashB64 } = await nodeDerive(precomposed)
    expect(await verifyPassword(decomposed, saltB64, hashB64, 200_000)).toBe(true)
  })

  it('returns false when a single hash byte is tampered (constant-time compare path)', async () => {
    const { saltB64, hashB64 } = await nodeDerive('memento mori')
    const bytes = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0))
    bytes[0] ^= 0x01
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    const tampered = btoa(bin)
    expect(await verifyPassword('memento mori', saltB64, tampered, 200_000)).toBe(false)
  })
})

describe('scripts/gate-set.mjs CLI', () => {
  it('writes a valid gate.config.ts with 16B salt and 32B hash and ITERATIONS=200000', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gateset-'))
    // The script writes to <cwd>/src/gate.config.ts. Use a tmp cwd with a src/ dir.
    const srcDir = join(tmp, 'src')
    mkdirSync(srcDir, { recursive: true })
    const scriptPath = resolve(process.cwd(), 'scripts/gate-set.mjs')
    execFileSync(process.execPath, [scriptPath, 'test-passphrase-123'], {
      cwd: tmp,
      stdio: 'pipe',
    })
    const written = readFileSync(join(srcDir, 'gate.config.ts'), 'utf8')
    expect(written).toMatch(/export const ITERATIONS = 200_?000/)
    expect(written).toMatch(/soft privacy only, not real auth — see README/)
    const saltMatch = written.match(/SALT_B64 = "([^"]+)"/)
    const hashMatch = written.match(/HASH_B64 = "([^"]+)"/)
    expect(saltMatch).not.toBeNull()
    expect(hashMatch).not.toBeNull()
    // 16 bytes base64 = 24 chars (incl. padding); 32 bytes = 44 chars.
    expect(saltMatch![1].length).toBe(24)
    expect(hashMatch![1].length).toBe(44)
  })
})
