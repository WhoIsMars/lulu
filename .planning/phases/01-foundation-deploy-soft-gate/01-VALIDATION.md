---
phase: 1
slug: foundation-deploy-soft-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (unit) + Playwright 1.4x (e2e) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (Wave 0 installs) |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:unit && npm run test:e2e && npm run lint && npm run typecheck && npm run build` |
| **Estimated runtime** | ~45 seconds local; ~2 min in CI including build |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit && npm run lint && npm run typecheck` (~10s)
- **After every plan wave:** Run full suite incl. e2e
- **Before `/gsd-verify-work`:** Full suite must be green; manual deploy preview verified
- **Max feedback latency:** 60 seconds for unit/lint/typecheck loop

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File |
|-----|----------|-----------|-------------------|------|
| FOUND-01 | `npm run dev`/`build`/`preview` exist and run | static | `node -e "console.log(require('./package.json').scripts)" \| grep -E 'dev\|build\|preview'` | `package.json` |
| FOUND-02 | `base` driven by env, default `/lulu/` | unit | `vitest tests/unit/vite-config.test.ts` | `vite.config.ts` |
| FOUND-03 | Workflow file exists with deploy-pages action | grep | `grep -q 'actions/deploy-pages' .github/workflows/deploy.yml` | `.github/workflows/deploy.yml` |
| FOUND-04 | `dist/404.html` and `dist/.nojekyll` after build | grep+e2e | `test -f dist/404.html && test -f dist/.nojekyll` + Playwright deep-link refresh | `scripts/post-build.mjs` |
| FOUND-05 | Lint, typecheck, format scripts present and pass | static | `npm run lint && npm run typecheck` | `package.json`, `eslint.config.js` |
| GATE-01 | Single password field + Entra button | e2e | `playwright tests/e2e/gate.spec.ts -g "rest state"` | `src/views/GateView.vue` |
| GATE-02 | PBKDF2 200k iter via WebCrypto | unit | `vitest tests/unit/gate-crypto.test.ts` | `src/gate/crypto.ts` |
| GATE-03 | Error via aria-live, focus stays | e2e | `playwright tests/e2e/gate.spec.ts -g "wrong password"` | `src/views/GateView.vue` |
| GATE-04 | sessionStorage `lulu:gate` flag set on unlock | e2e | `playwright tests/e2e/gate.spec.ts -g "session persistence"` | `src/stores/gate.ts` |
| GATE-05 | README documents soft-gate disclaimer + AES-GCM upgrade path | grep | `grep -q "soft privacy" README.md && grep -q "AES-GCM" README.md` | `README.md` |
| DEPLOY-01 | Push main triggers deploy workflow | manual+CI | First push → tab Actions verde | GitHub UI |
| DEPLOY-02 | README documents custom domain + BASE_URL config | grep | `grep -q "VITE_BASE" README.md && grep -q "CNAME" README.md` | `README.md` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install Vitest 2.x as devDependency, add `npm run test:unit` script
- [ ] Install Playwright 1.4x as devDependency, run `npx playwright install chromium`, add `npm run test:e2e`
- [ ] Create `vitest.config.ts` with jsdom env
- [ ] Create `playwright.config.ts` targeting `npm run preview` baseURL `http://localhost:4173/lulu/`
- [ ] Create `tests/unit/.gitkeep` and `tests/e2e/.gitkeep`
- [ ] Add `tests/unit/gate-crypto.test.ts` stub asserting `verifyPassword('wrong', salt, hash) === false`
- [ ] Add `tests/e2e/gate.spec.ts` stub with placeholder "deep-link refresh" test (skipped until task implements GateView)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First Pages deploy lands on real URL | DEPLOY-01 | Requires real GitHub repo + first push, can't simulate locally | After repo creation: push to `main`, watch Actions, open `https://<user>.github.io/lulu/` and verify gate loads, base path correct, no white screen |
| Deep-link refresh on deployed URL | FOUND-04 | Local preview can't fully reproduce GH Pages 404 behavior | After deploy: navigate to `https://<user>.github.io/lulu/p/test`, hit refresh, verify gate (or stub) appears — NOT GitHub 404 |
| CI fails on lint error | FOUND-05 | One-time check that workflow blocks bad code | Intentionally introduce lint error in a feature branch + open PR → CI must fail |
| Private-repo Pages plan check | D-03 (CONTEXT) | Account capability outside the codebase | Verify GitHub account has Pro/Team/Enterprise; if not, decide explicitly to make repo public |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies declared
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 installs Vitest + Playwright + creates test stubs
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for inner loop
- [ ] `nyquist_compliant: true` set in frontmatter after planner consumes this and adds task IDs

**Approval:** pending
