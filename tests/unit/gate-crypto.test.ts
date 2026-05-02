import { describe, it, expect } from 'vitest'

// Wave 0 stub. Plan 03 implements src/gate/crypto.ts with verifyPassword(input, saltB64, hashB64, iterations).
// This stub asserts that an obviously-wrong input never accidentally passes, by importing the future module
// once it exists. While Plan 03 is pending, the test is skipped to keep CI green.

describe('gate crypto (stub)', () => {
  it.skip('verifyPassword returns false for an obviously wrong input', async () => {
    // Indirect import string so Vite's static analyzer does not try to resolve the module
    // at load time — Plan 03 will create src/gate/crypto.ts and this test will be un-skipped.
    const modulePath = '@/gate/crypto'
    const { verifyPassword } = (await import(/* @vite-ignore */ modulePath)) as {
      verifyPassword: (input: string, salt: string, hash: string, iterations: number) => Promise<boolean>
    }
    // Salt + hash are placeholders; Plan 03 wires real values via gate.config.ts.
    const ok = await verifyPassword('definitely-wrong', 'AAAA', 'AAAA', 200_000)
    expect(ok).toBe(false)
  })

  it('placeholder always-true sanity check', () => {
    expect(1 + 1).toBe(2)
  })
})
