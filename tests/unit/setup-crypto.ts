import { webcrypto } from 'node:crypto'

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  // Node 22 ships webcrypto; expose as global for jsdom.
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}
