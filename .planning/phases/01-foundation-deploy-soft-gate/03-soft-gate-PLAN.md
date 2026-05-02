---
phase: 01-foundation-deploy-soft-gate
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified:
  - scripts/gate-set.mjs
  - src/gate/crypto.ts
  - src/gate.config.ts
  - src/stores/gate.ts
  - src/composables/useGate.ts
  - src/composables/useReducedMotion.ts
  - src/router/index.ts
  - src/views/GateView.vue
  - tests/unit/gate-crypto.test.ts
  - tests/e2e/gate.spec.ts
  - package.json
autonomous: true
requirements: [GATE-01, GATE-02, GATE-03, GATE-04]
must_haves:
  truths:
    - "`npm run gate:set \"<password>\"` writes a fresh salt + hash to src/gate.config.ts"
    - "Visiting `/` while locked redirects to `/gate`"
    - "GateView shows a single password input (aria-label \"password\") and a button labeled \"Entra\""
    - "Submitting the correct password unlocks the site for the duration of the tab"
    - "Submitting a wrong password shows `password non corretta` via aria-live=\"polite\", focus stays on input, input value is auto-selected"
    - "Total visible response from submit to result is ≥ 800ms (D-13 floor)"
    - "sessionStorage key `lulu:gate` is `true` after unlock; refreshing keeps the user unlocked; closing the tab re-locks"
    - "Node `gate-set.mjs` and runtime WebCrypto produce bit-identical PBKDF2 outputs"
  artifacts:
    - path: scripts/gate-set.mjs
      provides: "CLI: writes src/gate.config.ts with random 16B salt + 32B PBKDF2-SHA256 hash @ 200k iterations"
      contains: "pbkdf2Sync"
    - path: src/gate/crypto.ts
      provides: "verifyPassword(input, saltB64, hashB64, iterations): Promise<boolean> using WebCrypto + constant-time compare"
      exports: ["verifyPassword"]
    - path: src/stores/gate.ts
      provides: "Pinia store backed by sessionStorage namespace 'lulu:gate'"
      contains: "lulu:gate"
    - path: src/composables/useGate.ts
      provides: "useGate().verify() — calls crypto.verifyPassword + enforces 800ms floor + unlocks store"
      contains: "MIN_RESPONSE_MS"
    - path: src/router/index.ts
      provides: "createWebHistory(import.meta.env.BASE_URL) + beforeEach guard redirecting locked → /gate"
      contains: "beforeEach"
    - path: src/views/GateView.vue
      provides: "Soffitta gate UI per UI-SPEC: candela SVG + paper strip input + Entra button + aria-live region"
      contains: "aria-live"
  key_links:
    - from: src/views/GateView.vue
      to: src/composables/useGate.ts
      via: "import { useGate }"
      pattern: "useGate"
    - from: src/composables/useGate.ts
      to: src/gate/crypto.ts
      via: "import { verifyPassword }"
      pattern: "verifyPassword"
    - from: src/router/index.ts
      to: src/stores/gate.ts
      via: "router.beforeEach reads useGateStore().unlocked"
      pattern: "useGateStore"
    - from: scripts/gate-set.mjs
      to: src/gate.config.ts
      via: "writeFileSync emits SALT_B64 + HASH_B64 + ITERATIONS"
      pattern: "SALT_B64"
---

<objective>
Implement the soft password gate end-to-end: the CLI that derives + writes the salt/hash placeholder file, the WebCrypto verifier with constant-time compare, the Pinia store + sessionStorage flag, the router guard, and the `GateView.vue` SFC matching the UI-SPEC contract (soffitta + candela spenta + paper-strip input + Entra + aria-live + reduced-motion-aware crossfade). Validate via unit tests for crypto and Playwright e2e for the gate behaviors.

Purpose: Realize Pitfall 4 (gate honesty) the soft way — the only "real" privacy guarantee is PBKDF2-SHA256 200k iterations against committed salt+hash; everything else is a careful UX wrapper.
Output: Working gate; sessionStorage-backed unlock; Italian microcopy; Playwright tests passing against the live gate.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md
@.planning/phases/01-foundation-deploy-soft-gate/01-UI-SPEC.md
@.planning/phases/01-foundation-deploy-soft-gate/01-VALIDATION.md
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: gate-set CLI + crypto verifier + gate.config.ts placeholder + crypto unit tests</name>
  <files>scripts/gate-set.mjs, src/gate/crypto.ts, src/gate.config.ts, tests/unit/gate-crypto.test.ts, package.json</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 5, lines 439-520 — useGate / WebCrypto verbatim)
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 7, lines 541-607 — gate-set.mjs verbatim)
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pitfall C, lines 818-832 — Node/WebCrypto byte parity)
    - .planning/research/PITFALLS.md (Pitfall 4 — gate honesty)
  </read_first>
  <behavior>
    - Test 1 (Node-only, but works in jsdom via Node `crypto.subtle`): verifyPassword('memento mori', salt, hash, 200000) === true when salt/hash were derived from 'memento mori' via Node pbkdf2Sync.
    - Test 2: verifyPassword('wrong', salt, hash, 200000) === false.
    - Test 3: verifyPassword('Memento Mori', salt, hash, 200000) === false (case-sensitive).
    - Test 4: NFC normalization — verifyPassword for the same passphrase entered with different Unicode normalizations both succeed (e.g., a precomposed `é` and a decomposed `é`).
    - Test 5: returns false when hash bytes are tampered (single byte flipped) — proves constant-time compare path.
    - Test 6: pure unit — gate-set.mjs run as `node scripts/gate-set.mjs "test-pass"` writes `src/gate.config.ts` exporting valid base64 SALT_B64 (length 24, decodes to 16 bytes) and HASH_B64 (length 44, decodes to 32 bytes) and `ITERATIONS = 200_000`. Use child_process.execFileSync from the test.
  </behavior>
  <action>
**Step 1 — `src/gate/crypto.ts`** (per RESEARCH.md Pattern 5, factored to take inputs as arguments so it's testable without gate.config.ts):

```typescript
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

async function pbkdf2(passwordNFC: string, salt: Uint8Array, iterations: number, bits: number): Promise<Uint8Array> {
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
```

**Step 2 — `scripts/gate-set.mjs`** verbatim from RESEARCH.md Pattern 7 (lines 543-590), unchanged. Reproduce exactly — including the threat-model header it writes into gate.config.ts (Pitfall 4 honesty + GATE-05 prep):

```javascript
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ITERATIONS = 200_000
const SALT_BYTES = 16
const KEY_BYTES = 32

const raw = process.argv[2]
if (!raw || typeof raw !== 'string') {
  console.error('Usage: npm run gate:set "<password|passphrase>"')
  process.exit(1)
}

const password = raw.normalize('NFC')
if (password.length < 6) {
  console.warn(`[warn] passphrase is ${password.length} chars — short. Continuing.`)
}

const salt = randomBytes(SALT_BYTES)
const hash = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, ITERATIONS, KEY_BYTES, 'sha256')

const SALT_B64 = salt.toString('base64')
const HASH_B64 = hash.toString('base64')

const out = `// AUTO-GENERATED by scripts/gate-set.mjs — do not edit by hand.
// Regenerate with: npm run gate:set "<password>"
//
// THREAT MODEL: this is a "soft" gate — soft privacy only, not real auth — see README.
// The salt + hash are committed in the source bundle. A determined attacker with the
// bundle CAN brute-force the password offline (PBKDF2 200k iterations slows them, but
// the contents — once revealed — are still in plain bytes in the same bundle).
// For real privacy, use the AES-GCM upgrade path documented in PRIV-01 (v2 roadmap).

export const SALT_B64 = ${JSON.stringify(SALT_B64)}
export const HASH_B64 = ${JSON.stringify(HASH_B64)}
export const ITERATIONS = ${ITERATIONS}
`

const outPath = resolve(process.cwd(), 'src/gate.config.ts')
writeFileSync(outPath, out)
console.log(`gate.config.ts written (salt: ${SALT_BYTES}B, hash: ${KEY_BYTES}B base64, iterations: ${ITERATIONS}).`)
```

CRITICAL — Pitfall 4 (CONTEXT.md decisions D-05 + D-08): the literal phrase `soft privacy only, not real auth — see README` MUST appear in the threat-model header (Pitfall 4 mitigation). Verify after generation.

**Step 3 — generate the placeholder gate.config.ts**: run `npm run gate:set "lulu-dev-placeholder"` once and commit the result. The dev placeholder password is `lulu-dev-placeholder`; the real owner will run `npm run gate:set "<real password>"` themselves and commit (Plan 05 documents this).

**Step 4 — un-skip & rewrite `tests/unit/gate-crypto.test.ts`**:

```typescript
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { verifyPassword } from '@/gate/crypto'

// Helper: derive salt + hash via Node pbkdf2Sync to match what gate-set.mjs writes,
// then assert verifyPassword (which uses WebCrypto in jsdom / browser) returns identical results.
async function nodeDerive(password: string): Promise<{ saltB64: string; hashB64: string }> {
  const { pbkdf2Sync, randomBytes } = await import('node:crypto')
  const salt = randomBytes(16)
  const hash = pbkdf2Sync(Buffer.from(password.normalize('NFC'), 'utf8'), salt, 200_000, 32, 'sha256')
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
    require('node:fs').mkdirSync(srcDir, { recursive: true })
    const scriptPath = resolve(process.cwd(), 'scripts/gate-set.mjs')
    execFileSync(process.execPath, [scriptPath, 'test-passphrase-123'], { cwd: tmp, stdio: 'pipe' })
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
```

If jsdom doesn't expose `crypto.subtle`, add to `vitest.config.ts` test config: `setupFiles: ['./tests/unit/setup-crypto.ts']` and create `tests/unit/setup-crypto.ts`:

```typescript
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  // Node 22 ships webcrypto; expose as global for jsdom.
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
```

Add `setupFiles: ['./tests/unit/setup-crypto.ts']` to the existing vitest.config.ts (insert into the `test` object).
  </action>
  <verify>
    <automated>test -f scripts/gate-set.mjs && test -f src/gate/crypto.ts && test -f src/gate.config.ts && grep -q "soft privacy only, not real auth" src/gate.config.ts && grep -q "SALT_B64" src/gate.config.ts && grep -q "HASH_B64" src/gate.config.ts && grep -q "ITERATIONS" src/gate.config.ts && grep -q "verifyPassword" src/gate/crypto.ts && grep -q "constantTimeEqual" src/gate/crypto.ts && npm run test:unit -- --run tests/unit/gate-crypto.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/gate/crypto.ts` exports `verifyPassword`, `b64ToBytes`, `constantTimeEqual`.
    - `scripts/gate-set.mjs` runnable: `node scripts/gate-set.mjs "x"` regenerates `src/gate.config.ts`.
    - `src/gate.config.ts` exists with 3 exports (`SALT_B64`, `HASH_B64`, `ITERATIONS = 200_000`) and the threat-model header (Pitfall 4 honesty: `grep -v '^#' src/gate.config.ts | grep -c "soft privacy only, not real auth"` ≥ 1).
    - `npx vitest run tests/unit/gate-crypto.test.ts` exits 0 with all 6 tests passing (Node↔WebCrypto byte parity verified, NFC verified, tamper-detection verified, CLI generation verified).
    - `tests/unit/setup-crypto.ts` exists and is referenced from vitest.config.ts (only if jsdom needs the polyfill).
  </acceptance_criteria>
  <done>The crypto core is testable, byte-parity-verified between Node and WebCrypto, and the gate.config.ts placeholder is committed with the dev password baked in. The CLI is wired and tested.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Pinia store + useGate composable + router guard + reducedMotion composable</name>
  <files>src/stores/gate.ts, src/composables/useGate.ts, src/composables/useReducedMotion.ts, src/router/index.ts</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 2 router; Pattern 5 useGate; Pattern 6 store; Pattern 10 reducedMotion)
    - .planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md (D-09 — sessionStorage namespace `lulu:gate`; D-13 — 800ms floor)
  </read_first>
  <action>
**`src/stores/gate.ts`** verbatim from RESEARCH.md Pattern 6:

```typescript
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

const NAMESPACE = 'lulu:gate' // D-09

export const useGateStore = defineStore('gate', () => {
  const unlocked = useStorage(NAMESPACE, false, sessionStorage)

  function unlock() {
    unlocked.value = true
  }
  function lock() {
    unlocked.value = false
  }

  return { unlocked, unlock, lock }
})
```

**`src/composables/useGate.ts`** — wraps the testable `verifyPassword` with the store unlock + 800ms floor (D-13):

```typescript
import { useGateStore } from '@/stores/gate'
import { verifyPassword } from '@/gate/crypto'
import { HASH_B64, SALT_B64, ITERATIONS } from '@/gate.config'

const MIN_RESPONSE_MS = 800 // D-13: floor (not additive). PBKDF2 200k can take 200–500ms;
                            // the floor masks that variance and discourages brute-force timing.
                            // Reduced-motion-orthogonal — kept under prefers-reduced-motion (UI-SPEC §Motion).

export function useGate() {
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
```

**`src/composables/useReducedMotion.ts`** verbatim from RESEARCH.md Pattern 10:

```typescript
import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

export function useReducedMotion() {
  const pref = usePreferredReducedMotion()
  return computed(() => pref.value === 'reduce')
}
```

**`src/router/index.ts`** — overwrites the temporary skeleton from Plan 01 with the real gate-aware router (RESEARCH.md Pattern 2):

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { useGateStore } from '@/stores/gate'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/gate', name: 'gate', component: () => import('@/views/GateView.vue') },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/p/:slug', name: 'polaroid', component: () => import('@/views/PolaroidView.vue') },
  ],
})

router.beforeEach((to) => {
  const gate = useGateStore()
  if (to.name === 'gate') return true
  if (!gate.unlocked) return { name: 'gate', replace: true }
  return true
})

export default router
```

Pitfall 4 reinforcement: the guard reads from the Pinia store which is hydrated from sessionStorage by `useStorage`. There is no `/unlocked` route, no boolean flag in localStorage. Closing the tab clears the flag.
  </action>
  <verify>
    <automated>test -f src/stores/gate.ts && test -f src/composables/useGate.ts && test -f src/composables/useReducedMotion.ts && test -f src/router/index.ts && grep -q "lulu:gate" src/stores/gate.ts && grep -q "MIN_RESPONSE_MS = 800" src/composables/useGate.ts && grep -q "createWebHistory(import.meta.env.BASE_URL)" src/router/index.ts && grep -q "beforeEach" src/router/index.ts && npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "lulu:gate" src/stores/gate.ts` ≥ 1.
    - `grep -c "useStorage" src/stores/gate.ts` ≥ 1 (Pinia store backed by VueUse useStorage on sessionStorage).
    - `grep -c "MIN_RESPONSE_MS = 800" src/composables/useGate.ts` = 1 (D-13 floor encoded as a constant).
    - `grep -c "createWebHistory(import.meta.env.BASE_URL)" src/router/index.ts` = 1 (Pitfall 7 mitigation).
    - `grep -c "beforeEach" src/router/index.ts` ≥ 1.
    - `npm run typecheck` exits 0.
  </acceptance_criteria>
  <done>State, composables, and router guard wired. Locked users redirect to /gate; unlock flag survives a refresh but not a tab close.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: GateView.vue (UI-SPEC contract) + un-skip & flesh out e2e gate tests</name>
  <files>src/views/GateView.vue, tests/e2e/gate.spec.ts</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-UI-SPEC.md (entire "Gate Screen" section: Layout, Candela, Campo password, Bottone Entra, States 1-5, Micro-interactions, Copywriting, Accessibility)
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 9 — submit-flow skeleton)
  </read_first>
  <action>
Create `src/views/GateView.vue`. The component must satisfy ALL of UI-SPEC § Gate Screen and Pattern 9. Inline the candela SVG (~1.2KB, no flame, wax body in `--c-paper-200`, wick in `--c-soot-900`).

```vue
<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGate } from '@/composables/useGate'
import { useReducedMotion } from '@/composables/useReducedMotion'

const router = useRouter()
const { verify } = useGate()
const reducedMotion = useReducedMotion()
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

const value = ref('')
const submitting = ref(false)
const errored = ref(false)

onMounted(() => inputEl.value?.focus())

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  errored.value = false

  const ok = await verify(value.value)

  submitting.value = false
  if (ok) {
    router.replace({ name: 'home' })
  } else {
    errored.value = true
    inputEl.value?.select()
  }
}

function onInput() {
  if (errored.value) errored.value = false
}
</script>

<template>
  <main class="gate" :data-reduced-motion="reducedMotion ? 'true' : 'false'">
    <div class="gate__center">
      <!-- candela spenta — UI-SPEC §Candela. Inline SVG, no flame, no glow. Wick tip pulses during submit (default motion only). -->
      <svg
        class="gate__candle"
        :class="{ 'gate__candle--thinking': submitting && !reducedMotion }"
        viewBox="0 0 64 96"
        width="72"
        height="108"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="wax" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--c-paper-100)" />
            <stop offset="100%" stop-color="var(--c-paper-200)" />
          </linearGradient>
        </defs>
        <!-- wax body -->
        <rect x="22" y="24" width="20" height="64" rx="2" fill="url(#wax)" />
        <!-- wick -->
        <rect class="gate__wick" x="31" y="14" width="2" height="12" fill="var(--c-soot-900)" />
      </svg>

      <form class="gate__form" @submit.prevent="onSubmit" novalidate>
        <div class="gate__strip" :class="{ 'gate__strip--shake': errored && !reducedMotion }">
          <input
            ref="inputEl"
            v-model="value"
            class="gate__input"
            type="password"
            name="password"
            autocomplete="current-password"
            spellcheck="false"
            autocapitalize="off"
            autocorrect="off"
            aria-label="password"
            placeholder="password"
            :aria-disabled="submitting || undefined"
            @input="onInput"
          />
        </div>
        <button
          class="gate__submit"
          type="submit"
          :aria-disabled="submitting || undefined"
        >
          Entra
        </button>
      </form>

      <p role="status" aria-live="polite" class="gate__live">
        <span v-if="submitting">verifica in corso</span>
        <span v-else-if="errored" class="gate__error">password non corretta</span>
      </p>
    </div>
  </main>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  min-height: 100dvh; /* Pitfall 8 — iOS bottom-bar safe */
  display: grid;
  place-items: center;
  background:
    radial-gradient(
      ellipse 70% 50% at 50% 35%,
      var(--c-soot-700) 0%,
      var(--c-soot-800) 55%,
      var(--c-soot-900) 100%
    );
  padding: var(--sp-2xl) var(--sp-md);
}

@media (min-width: 1025px) {
  .gate {
    padding: var(--sp-3xl);
  }
}

.gate__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(420px, 100% - var(--sp-xl) * 2);
  gap: var(--sp-lg);
}

.gate__candle {
  width: clamp(56px, 5vw + 40px, 88px);
  height: auto;
  filter: drop-shadow(var(--shadow-candle-cold));
}

.gate__candle--thinking .gate__wick {
  animation: gate-wick-pulse 1.5s ease-in-out infinite;
}

@keyframes gate-wick-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.gate__form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-xl);
  width: 100%;
}

.gate__strip {
  width: clamp(220px, 60vw, 340px);
  min-height: 44px;
  padding: var(--sp-sm) var(--sp-md);
  background: var(--c-paper-100);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-paper),
    inset 0 1px 0 rgba(0, 0, 0, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
}

.gate__strip:focus-within {
  outline: 2px solid var(--c-focus);
  outline-offset: 4px;
}

.gate__strip--shake {
  animation: gate-shake var(--motion-duration-base) var(--motion-ease-out);
}

@keyframes gate-shake {
  0%   { transform: translateX(0); }
  25%  { transform: translateX(calc(-1 * var(--motion-shake-amplitude))); }
  50%  { transform: translateX(var(--motion-shake-amplitude)); }
  75%  { transform: translateX(calc(-0.5 * var(--motion-shake-amplitude))); }
  100% { transform: translateX(0); }
}

.gate__input {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--c-ink-700);
  outline: 0;
  color: var(--c-ink-900);
  caret-color: var(--c-ink-700);
  font: 400 var(--fs-body) / 1.5 'Cormorant Garamond', serif;
  padding: var(--sp-xs) 0;
  transition: border-bottom-color var(--motion-duration-fast) var(--motion-ease-soft),
              border-bottom-width var(--motion-duration-fast) var(--motion-ease-soft);
}

.gate__input:focus {
  border-bottom: 2px solid var(--c-ink-900);
}

.gate__input::placeholder {
  color: rgba(58, 44, 28, 0.5);
}

.gate__submit {
  width: clamp(220px, 60vw, 340px);
  min-height: 44px;
  padding: var(--sp-sm) var(--sp-md);
  background: var(--c-paper-200);
  color: var(--c-ink-700);
  border: 1px solid rgba(58, 44, 28, 0.25);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-paper);
  font: 400 var(--fs-label) / 1.4 system-ui, sans-serif;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background var(--motion-duration-fast) var(--motion-ease-soft);
}

@media (hover: hover) and (pointer: fine) {
  .gate__submit:hover {
    background: var(--c-paper-100);
  }
}

.gate__submit:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 3px;
}

.gate__submit[aria-disabled='true'] {
  cursor: progress;
  opacity: 0.6;
}

.gate__live {
  min-height: 1.5em; /* reserves vertical space so layout never shifts when message appears */
  margin: 0;
  font: 400 var(--fs-label) / 1.4 system-ui, sans-serif;
  text-align: center;
}

.gate__error {
  color: var(--c-error);
  font-style: italic;
}
</style>
```

Then **un-skip and flesh out the three remaining tests in `tests/e2e/gate.spec.ts`**. The Playwright webServer launches `npm run preview` after `VITE_BASE=/lulu/ npm run build`. The dev placeholder password is `lulu-dev-placeholder` (from Task 1's gate.config.ts placeholder).

Replace the three skipped blocks with:

```typescript
  test('rest state: shows password input and Entra button on /gate', async ({ page }) => {
    await page.goto('/gate')
    await expect(page.getByLabel('password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entra' })).toBeVisible()
    // Locked redirect: visiting / sends to /gate as well
    await page.goto('/')
    await expect(page).toHaveURL(/\/gate$/)
  })

  test('wrong password: aria-live shows "password non corretta", focus stays, input auto-selects', async ({ page }) => {
    await page.goto('/gate')
    const input = page.getByLabel('password')
    await input.fill('definitely-not-the-password')
    const start = Date.now()
    await page.getByRole('button', { name: 'Entra' }).click()
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText('password non corretta')
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(750) // D-13 floor (allow 50ms wiggle for click→submit lag)
    await expect(input).toBeFocused()
  })

  test('session persistence: correct password sets sessionStorage lulu:gate=true; refresh stays unlocked', async ({ page }) => {
    await page.goto('/gate')
    await page.getByLabel('password').fill('lulu-dev-placeholder')
    await page.getByRole('button', { name: 'Entra' }).click()
    // After unlock, router redirects to home; aria-label="stanza" landmark is present.
    await expect(page.locator('main[aria-label="stanza"]')).toBeVisible({ timeout: 5000 })
    const flag = await page.evaluate(() => sessionStorage.getItem('lulu:gate'))
    expect(flag).toBe('true')
    // Refresh — still unlocked, no redirect to /gate.
    await page.reload()
    await expect(page.locator('main[aria-label="stanza"]')).toBeVisible()
    await expect(page).not.toHaveURL(/\/gate$/)
  })
```

(The 4th test — deep-link refresh — was un-skipped by Plan 02 already.)

Pitfall 4 reinforcement: there's no `/unlocked` route, no localStorage write, no plaintext password in source — only the salt + hash in gate.config.ts.
  </action>
  <verify>
    <automated>test -f src/views/GateView.vue && grep -q "aria-live" src/views/GateView.vue && grep -q "aria-label=\"password\"" src/views/GateView.vue && grep -q "Entra" src/views/GateView.vue && grep -q "password non corretta" src/views/GateView.vue && grep -q "verifica in corso" src/views/GateView.vue && grep -q "stanza" src/views/HomeView.vue && ! grep -q "test.skip\|test\\.skip" tests/e2e/gate.spec.ts && npm run typecheck && npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - `src/views/GateView.vue`: contains `aria-live`, `aria-label="password"`, button text `Entra`, error literal `password non corretta`, submit-pending literal `verifica in corso`, inline `<svg>` candela, `100dvh` (Pitfall 8).
    - GateView CSS uses tokens (`--c-paper-100`, `--c-focus`, `--motion-duration-fast`, `--motion-shake-amplitude`).
    - `tests/e2e/gate.spec.ts`: zero skipped tests (`grep -c "test.skip" tests/e2e/gate.spec.ts` = 0).
    - `npm run lint` and `npm run typecheck` exit 0.
    - When run manually: `VITE_BASE=/lulu/ npm run build && npm run preview -- --port 4173 &` then `npm run test:e2e` — all 4 tests pass (deferred to checker; verify steps above are static).
  </acceptance_criteria>
  <done>GateView matches UI-SPEC contract; e2e tests cover rest, wrong-password (with 800ms floor), unlock + sessionStorage persistence, and SPA fallback for deep links. Soft gate is end-to-end functional.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user → gate input | Untrusted password string crosses into PBKDF2 + sessionStorage |
| browser → committed source | Anyone can read salt + hash from JS bundle (Pitfall 4 — accepted, documented) |
| committed source → CI | gate.config.ts is part of repo; passwords NEVER in env vars or secrets (D-06) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Spoofing | gate verify | mitigate | PBKDF2-SHA256 200k iterations + 16B random salt + constant-time compare (`constantTimeEqual` in src/gate/crypto.ts) |
| T-03-02 | Tampering | sessionStorage flag | accept | Per D-09: sessionStorage is DevTools-mutable, but the threat model is "soft privacy", not real auth — documented in README (Plan 05) and in gate.config.ts header. Brute-forcing the flag bypasses verification but the contents stay in the bundle either way. |
| T-03-03 | Repudiation | login attempts | accept | No logging by design (private site, no analytics, no backend). |
| T-03-04 | Information Disclosure | salt+hash in bundle | accept | Soft gate by design (D-05, GATE-05). README documents this and the AES-GCM upgrade path (PRIV-01). |
| T-03-05 | Information Disclosure | timing oracle on hash compare | mitigate | Constant-time compare (`constantTimeEqual` XOR-OR loop) prevents byte-by-byte brute-force via timing. Verified by tamper-byte unit test. |
| T-03-06 | Denial of Service | brute-force submission | mitigate | PBKDF2 200k iterations (~5 attempts/sec on commodity GPU per RESEARCH.md). Plus 800ms floor (D-13) caps online attempt rate to ~1.25 Hz. Lock-out after N attempts NOT implemented (D — deferred, marginal value on soft gate). |
| T-03-07 | Elevation of Privilege | direct route access | mitigate | router.beforeEach guards every non-/gate route; no pre-rendered "unlocked" content; locked users get redirected to /gate before any view mounts. |
| T-03-08 | Information Disclosure | password in repo | mitigate | D-06 enforced by design: `npm run gate:set "<plaintext>"` runs locally, only salt+hash committed. Plaintext NEVER touches CI/git/env files. |
</threat_model>

<verification>
After all three tasks: `npm run lint && npm run typecheck && npm run test:unit` exits 0. `VITE_BASE=/lulu/ npm run build && npm run preview` serves a working gate at http://localhost:4173/lulu/. All four Playwright tests pass. sessionStorage flag toggles correctly. `gate:set` regenerates the placeholder file deterministically.
</verification>

<success_criteria>
- All 12 GATE-01..04 + crypto behaviors observable manually and via the e2e suite.
- Pitfall 4 honesty enforced: gate.config.ts header carries the soft-privacy disclaimer; no plaintext password anywhere; no localStorage; no /unlocked route.
- Reduced-motion path verified by inspection (animations gated by `:disabled` / `data-reduced-motion`).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-deploy-soft-gate/01-03-SUMMARY.md` documenting: the dev placeholder password used (`lulu-dev-placeholder`) and the instruction the owner needs (run `npm run gate:set "<real>"` locally before first deploy); the PBKDF2 parameter triple (16B salt / 32B hash / 200k iter); the sessionStorage namespace; and how reduced-motion is honored.
</output>
