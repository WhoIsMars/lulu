---
phase: 01-foundation-deploy-soft-gate
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - tsconfig.app.json
  - tsconfig.node.json
  - eslint.config.js
  - .prettierrc.json
  - .gitignore
  - index.html
  - src/main.ts
  - src/App.vue
  - src/env.d.ts
  - src/styles/tokens.css
  - src/views/HomeView.vue
  - src/views/PolaroidView.vue
  - vitest.config.ts
  - playwright.config.ts
  - tests/unit/.gitkeep
  - tests/e2e/.gitkeep
  - tests/unit/gate-crypto.test.ts
  - tests/e2e/gate.spec.ts
autonomous: true
requirements: [FOUND-01, FOUND-05]
must_haves:
  truths:
    - "`npm run dev` boots a Vite dev server with Vue + TS"
    - "`npm run build` produces a `dist/` with hashed assets"
    - "`npm run lint` runs ESLint v9 flat config and exits 0 on a clean tree"
    - "`npm run typecheck` runs vue-tsc --noEmit and exits 0"
    - "`npm run test:unit` runs Vitest and exits 0 with the seeded stub"
    - "Vitest + Playwright are installed as devDeps so subsequent plans can write tests"
  artifacts:
    - path: package.json
      provides: "Scripts: dev, build, preview, lint, format, typecheck, test:unit, test:e2e, gate:set"
      contains: "\"dev\":"
    - path: eslint.config.js
      provides: "ESLint v9 flat config: vue + ts + prettier"
      contains: "typescriptEslint.config"
    - path: src/main.ts
      provides: "App bootstrap: createApp + Pinia + Router + tokens.css + Cormorant font"
      contains: "createApp"
    - path: src/styles/tokens.css
      provides: "All --c-*, --sp-*, --fs-*, --motion-*, --shadow-*, --radius-* tokens from UI-SPEC"
      contains: "--c-soot-800"
    - path: vitest.config.ts
      provides: "Vitest jsdom env"
      contains: "jsdom"
    - path: playwright.config.ts
      provides: "Playwright config targeting `npm run preview` baseURL http://localhost:4173/lulu/"
      contains: "4173"
  key_links:
    - from: src/main.ts
      to: src/styles/tokens.css
      via: "import './styles/tokens.css'"
      pattern: "import.*tokens\\.css"
---

<objective>
Scaffold the Vue 3.5 + Vite 8 + TS 6 project with Pinia, vue-router skeleton placeholders, ESLint v9 flat config + Prettier + vue-tsc, all npm scripts, design tokens CSS, base index.html, and Vitest + Playwright dev-deps + test stubs.

Purpose: Establishes Wave 0 (test infrastructure) and the project skeleton on which Plans 02 (vite base + SPA fallback), 03 (gate), 04 (deploy), and 05 (docs) layer.
Output: Buildable skeleton that lints, type-checks, and runs Vitest stubs. No gate logic, no deploy workflow, no README — those come in subsequent plans.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-foundation-deploy-soft-gate/01-CONTEXT.md
@.planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md
@.planning/phases/01-foundation-deploy-soft-gate/01-UI-SPEC.md
@.planning/phases/01-foundation-deploy-soft-gate/01-VALIDATION.md
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: package.json + TS configs + npm scripts + dev-dep installs</name>
  <files>package.json, tsconfig.json, tsconfig.app.json, tsconfig.node.json, .gitignore</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Standard Stack section, lines 110-175 — exact versions)
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 8, lines 660-675 — npm scripts block)
    - .planning/phases/01-foundation-deploy-soft-gate/01-VALIDATION.md (Wave 0 Requirements)
  </read_first>
  <action>
Create `package.json` with these exact dependencies (versions per RESEARCH.md Standard Stack, verified 2026-05-02):

```json
{
  "name": "lulu",
  "private": true,
  "type": "module",
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build && node scripts/post-build.mjs",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "vue-tsc --noEmit",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "gate:set": "node scripts/gate-set.mjs"
  },
  "dependencies": {
    "vue": "3.5.33",
    "vue-router": "5.0.6",
    "pinia": "3.0.4",
    "@vueuse/core": "14.3.0",
    "@fontsource/cormorant-garamond": "5.2.11"
  },
  "devDependencies": {
    "vite": "8.0.10",
    "@vitejs/plugin-vue": "6.0.6",
    "typescript": "6.0.3",
    "vue-tsc": "3.2.7",
    "@types/node": "25.6.0",
    "eslint": "10.3.0",
    "eslint-plugin-vue": "10.9.0",
    "typescript-eslint": "8.59.1",
    "eslint-config-prettier": "10.1.8",
    "prettier": "3.8.3",
    "globals": "16.0.0",
    "vitest": "3.0.0",
    "@vue/test-utils": "2.4.6",
    "jsdom": "25.0.0",
    "@playwright/test": "1.48.0"
  }
}
```

Create `tsconfig.json` with project references:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "paths": { "@/*": ["./src/*"] },
    "baseUrl": "."
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "tests/unit/**/*.ts"],
  "exclude": ["src/**/__tests__/*"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "scripts/**/*.mjs", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `.gitignore`:

```
node_modules/
dist/
.DS_Store
*.log
.vscode/
.idea/
playwright-report/
test-results/
coverage/
```

Then run `npm install` to install all deps. Then run `npx playwright install chromium` (Wave 0 requirement).
  </action>
  <verify>
    <automated>test -f package.json && test -f tsconfig.json && test -f tsconfig.app.json && test -f tsconfig.node.json && test -d node_modules && node -e "const p=require('./package.json'); ['dev','build','preview','lint','format','typecheck','test:unit','test:e2e','gate:set'].forEach(s=>{if(!p.scripts[s]) throw new Error('missing script: '+s)})"</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` exists; running `node -e "const p=require('./package.json'); process.exit(['dev','build','preview','lint','format','typecheck','test:unit','test:e2e','gate:set'].every(s=>p.scripts[s])?0:1)"` exits 0.
    - `node_modules/vite/package.json` exists with version `8.0.10`.
    - `node_modules/vue/package.json` exists with version `3.5.33`.
    - `node_modules/@playwright/test/package.json` exists.
    - `node_modules/vitest/package.json` exists.
    - `tsconfig.app.json` contains the literal string `"moduleResolution": "bundler"`.
  </acceptance_criteria>
  <done>Scripts wired, dependencies installed at exact versions from RESEARCH.md, TS configs use bundler resolution, Playwright chromium browser installed.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: ESLint flat config + Prettier + tokens.css + index.html + entry SFCs</name>
  <files>eslint.config.js, .prettierrc.json, index.html, src/main.ts, src/App.vue, src/env.d.ts, src/styles/tokens.css, src/views/HomeView.vue, src/views/PolaroidView.vue</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Pattern 8, lines 609-660 — ESLint flat config verbatim)
    - .planning/phases/01-foundation-deploy-soft-gate/01-UI-SPEC.md (Color, Spacing, Typography, Radius/Shadow/Blur, Motion sections — every token to declare)
    - .planning/phases/01-foundation-deploy-soft-gate/01-RESEARCH.md (Code Examples skeletons table — main.ts / App.vue / HomeView.vue / PolaroidView.vue / index.html)
  </read_first>
  <action>
Create `eslint.config.js` verbatim from RESEARCH.md Pattern 8 (lines 611-645):

```javascript
import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import typescriptEslint from 'typescript-eslint'

export default typescriptEslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/gate.config.ts', 'playwright-report/**', 'test-results/**'] },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue,mjs,js}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        parser: typescriptEslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {},
  },
  eslintConfigPrettier,
)
```

Pitfall E mitigation: typescript-eslint parser is nested inside parserOptions.parser. Do NOT install `@eslint/js` separately — it ships as a devDep transitively via `typescript-eslint`. If `npm run lint` fails with "cannot find @eslint/js", add `"@eslint/js": "10.3.0"` to devDependencies in Task 1's package.json and re-install.

Create `.prettierrc.json` verbatim:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

Create `index.html` (per RESEARCH.md skeleton table + UI-SPEC Copywriting):

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Lulu</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Note: NO `maximum-scale` (Pitfall 8 — must allow pinch-zoom).

Create `src/env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
```

Create `src/main.ts`:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/tokens.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/latin-ext-400.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

NOTE: `./router` will be created in Plan 03. For this task, create a TEMPORARY `src/router/index.ts` that exports a minimal router so the app builds (Plan 03 will overwrite it):

```typescript
// src/router/index.ts — TEMPORARY skeleton; replaced by Plan 03 with the gate-aware router.
import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('@/views/HomeView.vue') },
    { path: '/p/:slug', component: () => import('@/views/PolaroidView.vue') },
  ],
})
```

Add `src/router/index.ts` to `files_modified` mentally (it lives in scope of Plan 03's overwrite — implicit handoff).

Create `src/App.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

const reducedMotion = computed(() => usePreferredReducedMotion().value === 'reduce')
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="crossfade" mode="out-in" :duration="400" :css="!reducedMotion">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.crossfade-enter-active,
.crossfade-leave-active {
  transition: opacity var(--motion-duration-slow) var(--motion-ease-soft);
}
.crossfade-enter-from,
.crossfade-leave-to {
  opacity: 0;
}
.crossfade-leave-active {
  pointer-events: none;
}
</style>
```

Create `src/views/HomeView.vue`:

```vue
<template>
  <main aria-label="stanza" class="home"></main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-soot-800);
}
</style>
```

Create `src/views/PolaroidView.vue` (placeholder for SPA-fallback validation):

```vue
<template>
  <main aria-label="polaroid" class="polaroid">—</main>
</template>

<style scoped>
.polaroid {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: var(--c-soot-800);
  color: var(--c-paper-100);
  font-family: 'Cormorant Garamond', serif;
}
</style>
```

Create `src/styles/tokens.css` declaring EVERY token from UI-SPEC §Color, §Spacing Scale, §Typography, §Radius/Shadow/Blur, §Motion. Verbatim values:

```css
:root {
  /* Color — soffitta notturna palette (UI-SPEC §Color) */
  --c-soot-900: #0e0b08;
  --c-soot-800: #15110d;
  --c-soot-700: #1f1a14;
  --c-wood-600: #2a2118;
  --c-paper-100: #e9dfc9;
  --c-paper-200: #d6c8a8;
  --c-ink-900: #1a140c;
  --c-ink-700: #3a2c1c;
  --c-amber-500: #e8b057;
  --c-amber-300: #f4d08a;
  --c-focus: #f2d9a4;
  --c-error: #a85a3a;

  /* Spacing scale (UI-SPEC §Spacing Scale) */
  --sp-xs: 0.25rem;
  --sp-sm: 0.5rem;
  --sp-md: 1rem;
  --sp-lg: 1.5rem;
  --sp-xl: 2rem;
  --sp-2xl: 3rem;
  --sp-3xl: 4rem;

  /* Typography (UI-SPEC §Typography) */
  --fs-body: clamp(16px, 1rem + 0.2vw, 18px);
  --fs-label: clamp(13px, 0.825rem + 0.1vw, 14px);

  /* Radius (UI-SPEC §Radius) */
  --radius-none: 0;
  --radius-sm: 2px;
  --radius-md: 6px;

  /* Shadow (UI-SPEC §Shadow) */
  --shadow-paper: 0 1px 0 rgba(214, 200, 168, 0.15), 0 8px 20px -8px rgba(0, 0, 0, 0.6),
    0 2px 4px -1px rgba(0, 0, 0, 0.4);
  --shadow-candle-cold: 0 6px 18px -6px rgba(0, 0, 0, 0.7);
  --shadow-candle-warm: 0 0 60px 8px rgba(244, 208, 138, 0.35), 0 6px 18px -6px rgba(0, 0, 0, 0.7);

  /* Blur */
  --blur-soft: blur(0.5px);

  /* Motion (UI-SPEC §Motion Tokens) */
  --motion-duration-instant: 0ms;
  --motion-duration-fast: 150ms;
  --motion-duration-base: 280ms;
  --motion-duration-slow: 400ms;
  --motion-duration-deliberate: 800ms;
  --motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-soft: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-shake-amplitude: 4px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0ms;
    --motion-duration-base: 0ms;
    --motion-duration-slow: 0ms;
    /* --motion-duration-deliberate kept at 800ms — accessibility-orthogonal (UI-SPEC §Motion Tokens) */
    --motion-ease-out: linear;
    --motion-ease-soft: linear;
    --motion-shake-amplitude: 0;
  }
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  background: var(--c-soot-800);
  color: var(--c-paper-100);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  hyphens: auto;
}

html {
  color-scheme: dark;
}
```
  </action>
  <verify>
    <automated>test -f eslint.config.js && test -f .prettierrc.json && test -f index.html && test -f src/main.ts && test -f src/App.vue && test -f src/styles/tokens.css && test -f src/views/HomeView.vue && test -f src/views/PolaroidView.vue && test -f src/router/index.ts && grep -q -- '--c-soot-800' src/styles/tokens.css && grep -q -- '--motion-duration-deliberate' src/styles/tokens.css && grep -q 'lang="it"' index.html && ! grep -q 'maximum-scale' index.html && grep -q 'noindex' index.html && npm run lint && npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `eslint.config.js` contains `typescriptEslint.config` and `eslintConfigPrettier` is the LAST argument.
    - `index.html` contains `lang="it"`, `noindex`, `viewport-fit=cover`; does NOT contain `maximum-scale`.
    - `src/styles/tokens.css` contains all tokens: grep finds `--c-soot-800`, `--c-paper-100`, `--c-focus`, `--c-error`, `--sp-md`, `--fs-body`, `--shadow-paper`, `--motion-duration-deliberate`, `--motion-duration-slow`.
    - `src/styles/tokens.css` reduced-motion block does NOT override `--motion-duration-deliberate` (grep `-A 8 'prefers-reduced-motion' src/styles/tokens.css | grep -v '^#' | grep -c 'deliberate'` returns 0).
    - `npm run lint` exits 0.
    - `npm run typecheck` exits 0.
  </acceptance_criteria>
  <done>Lint + typecheck pass on a minimal app. tokens.css carries the entire UI-SPEC token system. App.vue wires the crossfade transition disabled under reduced-motion. HomeView is the empty void; PolaroidView is the deep-link placeholder.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Vitest + Playwright configs + Wave 0 test stubs</name>
  <files>vitest.config.ts, playwright.config.ts, tests/unit/.gitkeep, tests/e2e/.gitkeep, tests/unit/gate-crypto.test.ts, tests/e2e/gate.spec.ts</files>
  <read_first>
    - .planning/phases/01-foundation-deploy-soft-gate/01-VALIDATION.md (Wave 0 Requirements + Per-Task Verification Map)
  </read_first>
  <action>
Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/unit/**/*.test.ts'],
  },
})
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/lulu/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'VITE_BASE=/lulu/ npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/lulu/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

Create empty `tests/unit/.gitkeep` and `tests/e2e/.gitkeep`.

Create `tests/unit/gate-crypto.test.ts` (stub — the real verifyPassword arrives in Plan 03):

```typescript
import { describe, it, expect } from 'vitest'

// Wave 0 stub. Plan 03 implements src/gate/crypto.ts with verifyPassword(input, saltB64, hashB64, iterations).
// This stub asserts that an obviously-wrong input never accidentally passes, by importing the future module
// once it exists. While Plan 03 is pending, the test is skipped to keep CI green.

describe('gate crypto (stub)', () => {
  it.skip('verifyPassword returns false for an obviously wrong input', async () => {
    const { verifyPassword } = await import('@/gate/crypto')
    // Salt + hash are placeholders; Plan 03 wires real values via gate.config.ts.
    const ok = await verifyPassword('definitely-wrong', 'AAAA', 'AAAA', 200_000)
    expect(ok).toBe(false)
  })

  it('placeholder always-true sanity check', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Create `tests/e2e/gate.spec.ts` (skipped stubs covering the contract Plan 03 will satisfy):

```typescript
import { test, expect } from '@playwright/test'

test.describe('gate (Wave 0 stubs)', () => {
  test.skip('rest state: shows password input and Entra button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entra' })).toBeVisible()
  })

  test.skip('wrong password: aria-live shows "password non corretta", focus stays', async ({ page }) => {
    await page.goto('/')
    const input = page.getByLabel('password')
    await input.fill('definitely-wrong')
    await page.getByRole('button', { name: 'Entra' }).click()
    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText('password non corretta')
    await expect(input).toBeFocused()
  })

  test.skip('session persistence: sessionStorage flag set on unlock', async ({ page }) => {
    // Plan 03 wires this with a real password from gate.config.ts (set via gate:set).
  })

  test.skip('deep-link refresh: /p/test renders without GitHub 404', async ({ page }) => {
    await page.goto('/p/test')
    await expect(page.locator('main')).toBeVisible()
  })
})
```
  </action>
  <verify>
    <automated>test -f vitest.config.ts && test -f playwright.config.ts && test -f tests/unit/gate-crypto.test.ts && test -f tests/e2e/gate.spec.ts && grep -q "jsdom" vitest.config.ts && grep -q "4173/lulu/" playwright.config.ts && npm run test:unit</automated>
  </verify>
  <acceptance_criteria>
    - `vitest.config.ts` declares `environment: 'jsdom'`.
    - `playwright.config.ts` baseURL is exactly `http://localhost:4173/lulu/`.
    - `npm run test:unit` exits 0; the placeholder sanity test passes; the skipped tests are reported as skipped (count > 0).
    - `grep -c 'test.skip\|it.skip' tests/unit/gate-crypto.test.ts tests/e2e/gate.spec.ts | grep -v ':0' | wc -l` reports both files have at least one skipped test (Plan 03 will un-skip them).
  </acceptance_criteria>
  <done>Wave 0 complete: Vitest + Playwright installed, configured, and seeded with skipped contract stubs. Plans 02 and 03 can now write/un-skip tests against real implementations.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| local dev → committed source | Developer machine writes code that ends up in repo; npm scripts execute locally |
| npm registry → install | Untrusted package code resolved by `npm ci` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | dev-deps | mitigate | Pin exact versions in package.json (no `^` for crypto-adjacent deps); rely on package-lock.json checked into repo by subsequent commit |
| T-01-02 | Information Disclosure | source maps | mitigate | `vite.config.ts` (Plan 02) sets `build.sourcemap: false` per RESEARCH.md Pattern 1 |
| T-01-03 | Information Disclosure | indexable preview link | mitigate | `<meta name="robots" content="noindex, nofollow">` in index.html |
</threat_model>

<verification>
After all three tasks: `npm run lint && npm run typecheck && npm run test:unit` exits 0. `node_modules/` populated. tokens.css carries every UI-SPEC token. index.html sets `lang="it"`, viewport without `maximum-scale`, robots noindex.
</verification>

<success_criteria>
- Project boots: `npm run dev` serves a working dev server (manual sanity).
- Lint, typecheck, and unit tests all green from a fresh clone after `npm ci && npx playwright install chromium`.
- Wave 0 test stubs in place — Plans 02 and 03 can un-skip them as they implement.
- All UI-SPEC design tokens declared once in `src/styles/tokens.css`.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-deploy-soft-gate/01-01-SUMMARY.md` documenting the scaffold layout, exact dependency versions installed, Wave 0 stubs created (and which Plan un-skips each), and any deviation from RESEARCH.md (e.g., if `@eslint/js` had to be added explicitly).
</output>
