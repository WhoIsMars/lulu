// src/gate/crypto.ts
// Soft gate: PBKDF2-SHA256 verification against committed salt + hash.
// THIS IS NOT REAL AUTHENTICATION — see README "Privacy" / gate.config.ts header.

const KEY_LENGTH_BITS = 256 // 32 bytes — must match KEY_BYTES in scripts/gate-set.mjs

export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Constant-time byte comparison. WebCrypto has no timingSafeEqual; this is the canonical 10-line pattern.
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function pbkdf2(
  passwordNFC: string,
  salt: Uint8Array,
  iterations: number,
  bits: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passwordNFC),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    bits,
  )
  return new Uint8Array(derived)
}

export async function verifyPassword(
  rawInput: string,
  saltB64: string,
  hashB64: string,
  iterations: number,
): Promise<boolean> {
  // D-07: NFC normalize so passphrases like "memento mori" hash deterministically across keyboards/locales.
  const password = rawInput.normalize('NFC')
  try {
    const salt = b64ToBytes(saltB64)
    const expected = b64ToBytes(hashB64)
    const got = await pbkdf2(password, salt, iterations, KEY_LENGTH_BITS)
    return constantTimeEqual(got, expected)
  } catch {
    return false
  }
}
