# Phase 7 — Deferred Items

## Pre-existing test data drift (out of scope)

- `tests/e2e/gate.spec.ts` "session persistence" test fills password `"lulu-dev-placeholder"`.
  The committed `src/gate.config.ts` has a hash for a different (real) password.
  Resulting failure surfaces only AFTER the Phase 7 aria-label disambiguation fix
  routed the test past the previously-blocking strict-mode label collision.
  Fix path (owner action): either rotate the dev gate to `lulu-dev-placeholder`
  on a CI-only build env, or update the test to read the password from
  `process.env.LULU_GATE_TEST_PASSWORD` and skip when unset.
