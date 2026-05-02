import { useGateStore } from '@/stores/gate'
import { verifyPassword } from '@/gate/crypto'
import { HASH_B64, SALT_B64, ITERATIONS } from '@/gate.config'

const MIN_RESPONSE_MS = 800 // D-13: floor (not additive). PBKDF2 200k can take 200–500ms;
// the floor masks that variance and discourages brute-force timing.
// Reduced-motion-orthogonal — kept under prefers-reduced-motion (UI-SPEC §Motion).

export function useGate(): { verify: (rawInput: string) => Promise<boolean> } {
  const store = useGateStore()

  async function verify(rawInput: string): Promise<boolean> {
    const start = performance.now()
    const ok = await verifyPassword(rawInput, SALT_B64, HASH_B64, ITERATIONS)
    const elapsed = performance.now() - start
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed))
    }
    if (ok) store.unlock()
    return ok
  }

  return { verify }
}
