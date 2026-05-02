---
phase: 01-foundation-deploy-soft-gate
plan: 04
type: execute
wave: 3
depends_on: [02, 03]
files_modified:
  - .github/workflows/deploy.yml
autonomous: false
requirements: [FOUND-03, DEPLOY-01]
must_haves:
  truths:
    - "Push to `main` triggers `.github/workflows/deploy.yml`"
    - "Workflow runs lint, typecheck, build (with VITE_BASE=/lulu/), post-build, and Pages upload + deploy"
    - "Lint failure blocks deploy (no `continue-on-error`)"
    - "Typecheck failure blocks deploy"
    - "Build failure blocks deploy"
    - "Deploy uses actions/configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5 (RESEARCH.md verified 2026-05-02)"
    - "Workflow concurrency group `pages` prevents overlapping deploys"
    - "Permissions are minimal: contents: read, pages: write, id-token: write"
  artifacts:
    - path: .github/workflows/deploy.yml
      provides: "Single CI workflow: lint → typecheck → build → post-build → upload artifact → deploy"
      contains: "actions/deploy-pages@v5"
  key_links:
    - from: .github/workflows/deploy.yml
      to: "VITE_BASE=/lulu/"
      via: "env on the Build step"
      pattern: "VITE_BASE"
    - from: .github/workflows/deploy.yml
      to: scripts/post-build.mjs
      via: "explicit `node scripts/post-build.mjs` step after Build"
      pattern: "scripts/post-build.mjs"
---

<objective>
Author the GitHub Actions workflow that deploys the Vite SPA to GitHub Pages on every push to `main`, gated by lint + typecheck + build. Workflow is the verbatim canonical pattern from RESEARCH.md Pattern 3 with VITE_BASE wired and the post-build SPA-fallback step explicit.

Purpose: Closes FOUND-03 + DEPLOY-01 + Pitfall 14 ("CI deploy must hard-fail on lint/typecheck/build error — no `continue-on-error`").
Output: A working `.github/workflows/deploy.yml`. Manual checkpoint after the first successful run on real GitHub Pages confirms DEPLOY-01.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md
@.planning/phases/01-foundation-deploy-soft-gate/01-VALIDATION.md
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Author .github/workflows/deploy.yml (canonical Pages workflow)</name>
  <files>.github/workflows/deploy.yml</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 3, lines 351-416 — workflow YAML verbatim)
    - .planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md (D-04 — only push:main trigger; D-16 — actions/deploy-pages, not gh-pages npm; D-17 — post-build for SPA fallback)
    - .planning/research/PITFALLS.md (Pitfall 14 — "deploy workflow MUST exit non-zero on lint/typecheck/build failure")
  </read_first>
  <action>
Create `.github/workflows/deploy.yml` verbatim from RESEARCH.md Pattern 3. Two jobs: `build` (lint + typecheck + build + post-build + upload artifact) and `deploy` (deploys the artifact in the github-pages environment).

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

# Required for actions/deploy-pages
permissions:
  contents: read
  pages: write
  id-token: write

# Only one in-flight deploy at a time; queued runs are cancelled in-progress=false so
# completing builds do not abort each other (D-04 — only push:main, no preview deploys).
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type-check
        run: npm run typecheck

      - name: Build
        env:
          VITE_BASE: /lulu/
        run: npm run build

      - name: Post-build (SPA fallback + .nojekyll)
        run: node scripts/post-build.mjs

      - uses: actions/configure-pages@v6

      - uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Critical rules enforced:
- **No `continue-on-error: true` anywhere** (Pitfall 14). Each `run:` step exits non-zero on failure → job fails → deploy job never runs.
- **`VITE_BASE=/lulu/`** explicit on the Build step (D-02; custom-domain switch is a one-line change to `/`).
- **Versions match RESEARCH.md verified 2026-05-02**: checkout@v5, setup-node@v5, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5. Do NOT use older v4/v5 mismatched combinations from generic templates.
- **Post-build is its own explicit step** even though `package.json` build script also chains it — this is "belt + suspenders" (RESEARCH.md note after Pattern 8). Both running is idempotent.
- **`needs: build`** — deploy depends on build success.

**Note on the package.json build chain**: Plan 01 set `"build": "vue-tsc --noEmit && vite build && node scripts/post-build.mjs"`. The workflow runs `npm run build` which already includes post-build, AND then runs `node scripts/post-build.mjs` again as a separate step. Idempotent. If the explicit post-build step is ever removed, the package.json chain still emits the artifacts.

**One-time manual setup (document in Plan 05's README, not enforceable by Claude):**
- Repo Settings → Pages → Source = "GitHub Actions". Without this, the workflow runs but no Pages site is provisioned.
- Verify the account/org Pages-on-private-repos capability per Pitfall D / D-03.
  </action>
  <verify>
    <automated>test -f .github/workflows/deploy.yml && grep -q "actions/deploy-pages@v5" .github/workflows/deploy.yml && grep -q "actions/upload-pages-artifact@v5" .github/workflows/deploy.yml && grep -q "actions/configure-pages@v6" .github/workflows/deploy.yml && grep -q "VITE_BASE: /lulu/" .github/workflows/deploy.yml && grep -q "scripts/post-build.mjs" .github/workflows/deploy.yml && grep -q "node-version: '22'" .github/workflows/deploy.yml && ! grep -q "continue-on-error" .github/workflows/deploy.yml</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `.github/workflows/deploy.yml`.
    - `grep -c "continue-on-error" .github/workflows/deploy.yml` = 0 (Pitfall 14).
    - `grep -c "actions/deploy-pages@v5" .github/workflows/deploy.yml` = 1.
    - `grep -c "actions/upload-pages-artifact@v5" .github/workflows/deploy.yml` = 1.
    - `grep -c "actions/configure-pages@v6" .github/workflows/deploy.yml` = 1.
    - `grep -c "VITE_BASE: /lulu/" .github/workflows/deploy.yml` = 1.
    - `grep -c "scripts/post-build.mjs" .github/workflows/deploy.yml` ≥ 1.
    - `grep -c "branches: \[main\]" .github/workflows/deploy.yml` = 1 (D-04: only main triggers).
    - `grep -c "concurrency:" .github/workflows/deploy.yml` = 1.
    - YAML is valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"` exits 0 (skip if Python not available; the GitHub Actions parser is the canonical validator).
  </acceptance_criteria>
  <done>Workflow file authored verbatim per RESEARCH.md, all five action versions match the 2026-05-02 verified set, base path wired, no soft-failure escapes.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual deploy verification on live GitHub Pages</name>
  <what-built>The workflow `.github/workflows/deploy.yml` is committed. On push to `main`, it builds and deploys the SPA to `https://<username>.github.io/lulu/`.</what-built>
  <how-to-verify>
    1. **Pre-flight (one-time, outside Claude's reach):**
       - Confirm the GitHub repo `lulu` exists and the working tree has been pushed.
       - Repo Settings → Pages → "Build and deployment" → Source = "GitHub Actions".
       - Capability check (Pitfall D / CONTEXT.md D-03): if the repo is private, confirm the account is GitHub Pro/Team/Enterprise. If Free → either upgrade or make the repo public (deliberate decision; the soft gate's salt+hash were already going to be in the source either way).
    2. **Trigger deploy:** push the current branch to `main`. (If working on a feature branch, fast-forward `main` to it and push.)
    3. **Watch:** GitHub → Actions tab → the "Deploy to GitHub Pages" workflow run.
       - Verify each step turns green: checkout, setup-node, npm ci, lint, typecheck, build, post-build, configure-pages, upload-pages-artifact, deploy-pages.
       - Confirm there are NO yellow "skipped" steps in the build job and NO red failures.
    4. **Open the deployed URL:** `https://<your-github-username>.github.io/lulu/` (replace with your actual username).
       - Page MUST render the gate (soffitta dark background + candela + paper-strip input + "Entra" button). If you see a white screen, the base path is wrong (Pitfall 7).
       - Open DevTools Network tab; reload. All asset URLs (JS, CSS, fonts) MUST resolve under `/lulu/` (200 OK), not from `/` (would be 404).
    5. **SPA fallback verification (FOUND-04):** in the URL bar, change to `https://<username>.github.io/lulu/p/anything-test` and hit Enter (hard navigation). The site MUST render — either the gate (if not yet unlocked) or the placeholder PolaroidView ("—"). If you see GitHub's Octocat 404 page, the post-build step did not write `dist/404.html` or `.nojekyll`.
    6. **Gate end-to-end (GATE-01..04):** type the dev-placeholder password (`lulu-dev-placeholder`) → click Entra → verify ~800ms delay → page transitions to `/lulu/` showing the empty stanza. Open DevTools Application → sessionStorage → confirm `lulu:gate = true`. Reload — still unlocked. Close tab + reopen — back to gate.
    7. **CI gate honesty (FOUND-05):** intentionally introduce a lint error on a feature branch (e.g. add an unused `let x: any = 1` in `src/main.ts`), open a PR. The deploy workflow will not run on the PR (only on push:main per D-04), so to verify FOUND-05's "CI fails on lint error" specifically: instead, push the lint-error commit DIRECTLY to a temporary branch and merge to main (only do this if you're comfortable with the rollback). The workflow on `main` MUST go red on the Lint step. Then revert the merge.
       - **Alternative**: skip step 7 here and rely on Plan 03's local `npm run lint` enforcement; verify FOUND-05 in the Phase 7 hardening pass via a deliberately-broken PR.
  </how-to-verify>
  <resume-signal>Type "approved" once: (a) the live URL serves the gate without white screen, (b) `/lulu/p/anything` deep-link refreshes successfully without GH 404, (c) gate unlock works with the dev placeholder password and sessionStorage flag is set, and (d) the workflow is visibly green in the Actions tab. If any step fails, describe the failure (step number + observed behavior + DevTools console output if any) for triage.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GitHub Actions runner → Pages CDN | Build artifacts uploaded via OIDC token (id-token: write); attacker with workflow write would replace site content |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Tampering | workflow file | accept | Repo write access = full control by design (single-developer project, D-03). |
| T-04-02 | Elevation of Privilege | excessive workflow permissions | mitigate | Minimum 3 perms: contents:read, pages:write, id-token:write (per RESEARCH.md, official GitHub recommendation). No `permissions: write-all`. |
| T-04-03 | Denial of Service | concurrent deploys | mitigate | `concurrency: group: pages, cancel-in-progress: false` queues sequential. |
| T-04-04 | Tampering | broken code shipped to Pages | mitigate | lint + typecheck + build hard-gate; no `continue-on-error` (Pitfall 14). |
</threat_model>

<verification>
Workflow YAML is valid, contains the exact action versions, VITE_BASE wired, no soft-failure escapes. After the manual checkpoint: live URL works, deep-link refresh works, gate verifies, CI is gating bad commits.
</verification>

<success_criteria>
- Workflow file committed and runs green on `main`.
- Live Pages URL serves the gate; assets resolve under `/lulu/`.
- SPA fallback verified on the real Pages URL (Pitfall 11 closed).
- DEPLOY-01 satisfied (visible green run); FOUND-04 satisfied (deep-link works on real Pages, not just local preview).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-deploy-soft-gate/01-04-SUMMARY.md` documenting: the live URL, the action versions used, the timestamp of the first green run, any account-capability friction encountered (D-03), and the dev-placeholder password the owner used to verify (so Plan 05 README knows what to instruct).
</output>
