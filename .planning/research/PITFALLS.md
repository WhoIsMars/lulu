# Pitfalls Research

**Domain:** Animation-heavy, accessibility-conscious static SPA (Vue 3 + Vite + TS) with client-side password gate, hosted on GitHub Pages
**Researched:** 2026-05-02
**Confidence:** HIGH (drawn from MDN, Vue/Vite docs, WebKit/Chromium known issues, WCAG 2.2, GitHub Pages SPA community wisdom; some MEDIUM where mitigations are project-specific judgment calls)

## Critical Pitfalls

### Pitfall 1: Candle-light mask repaints the entire viewport every mousemove

**What goes wrong:**
The "candle reveal" is implemented by mutating a `radial-gradient` on a full-viewport overlay (or a `clip-path` / SVG `<mask>`) inside a Vue reactive prop. Every mousemove (often 120–240 events/sec on modern trackpads / high-Hz displays) triggers a Vue re-render plus a full-viewport paint and composite. FPS collapses to 20–30, the candle stutters, fans spin, and laptops on battery throttle further.

**Why it happens:**
- Devs reach for reactivity (`ref({x,y})` updated in a `mousemove` handler) instead of writing to the DOM directly.
- They animate `background` / `clip-path` / `box-shadow` instead of GPU-friendly `transform` / `opacity`.
- They forget mousemove fires far faster than the display's refresh rate.
- Pointermove on touch fires at touch-sample rate (often 60–120 Hz) and is bypassed entirely if you only listen to `mousemove`.

**How to avoid:**
- Use **one `requestAnimationFrame` loop** that reads the latest pointer coords from a non-reactive ref (or a plain module-level variable) and writes a CSS custom property (`element.style.setProperty('--cx', x + 'px')`) on the mask element. Do **not** use Vue reactivity for the per-frame coordinate.
- Implement the mask with an absolutely-positioned **circular div using `transform: translate3d(var(--cx), var(--cy), 0)`** with `radial-gradient` baked into the div, plus `mix-blend-mode: lighten` or `screen` on a dark overlay. `transform` stays on the compositor; no paint.
- Promote the candle layer with `will-change: transform` (set on enter, removed on leave to avoid memory cost) and `contain: layout paint`.
- Listen to `pointermove` (covers mouse + touch + pen) with `{ passive: true }`. Coalesce via `getCoalescedEvents()` only if you need the trail, otherwise just keep "last position".
- Cancel the RAF loop in `onBeforeUnmount` and on `visibilitychange === 'hidden'`.

**Warning signs:**
- DevTools Performance panel shows "Paint" bars longer than 4 ms during mousemove.
- Layers panel shows the candle layer is **not** composited (no green border on hover-debug).
- Battery drops measurably while the home page is idle but mouse-over.
- iOS Safari shows visible tearing or input lag > 50 ms.

**Phase to address:**
Phase 2 — "Candle reveal MVP" (build it correctly the first time; retrofitting from reactive-driven to RAF-driven is painful because it touches the component's whole architecture).

---

### Pitfall 2: String physics drifts, NaN-explodes, or pegs the CPU after tab-blur

**What goes wrong:**
Hanging strings + polaroids are simulated with a Verlet / spring integrator. After the user switches tabs for 30 seconds, `requestAnimationFrame` is throttled to ~1 Hz (Chrome) or paused (Safari). On return, either (a) `dt` becomes huge and the integrator explodes (polaroids fly off-screen, NaN positions, strings invert), or (b) the simulator was using `setInterval` and continued running on a hidden tab eating CPU/battery, or (c) a long `dt` causes one frame of catastrophically large velocity.

**Why it happens:**
- Naive `dt = now - lastTime` with no clamp.
- Using `performance.now()` deltas without bounding.
- Mixing semi-implicit Euler with stiff springs (k high, damping low) → unconditionally unstable for `dt > critical`.
- Using `setInterval(step, 16)` instead of RAF — runs in background.

**How to avoid:**
- **Clamp `dt`**: `const dt = Math.min((now - last) / 1000, 1/30)` (cap at ~33 ms). Better: use a **fixed timestep** with accumulator (Glenn Fiedler's "Fix Your Timestep"), e.g. step at 1/120 s, accumulate real time, run N substeps per frame, max 4 substeps per frame to prevent spiral-of-death.
- Use **Verlet integration** (position-based) — naturally stable, no velocity to explode. Constraints (string length) solved by 2–4 relaxation iterations.
- On `document.visibilitychange`, if hidden: stop RAF loop; if visible: reset `lastTime = performance.now()` (so the first `dt` after return is small) and resume.
- NaN-guard: every frame, if `!Number.isFinite(p.x)` reset to anchor. Cheap insurance.
- Use RAF, never `setInterval`.

**Warning signs:**
- Polaroids rotate wildly or fling after tab switch.
- "Last frame" of dev tools shows a single 800 ms script task.
- Strings visibly stretch beyond their rest length over time (energy injection from unstable integration).
- Coverage report shows the physics worker still ticking with the tab in background.

**Phase to address:**
Phase 3 — "String/polaroid scene". Bake stability tests into Phase 3 acceptance: "tab away for 60s, return, no visual artifact."

---

### Pitfall 3: Polaroid flip steals focus, breaks the click target, or traps keyboard users

**What goes wrong:**
Click on a polaroid triggers a 3D `transform: rotateY(180deg)` flip. Several failures cascade:
- The back face has `pointer-events: auto` while the front is mid-rotation; clicks land on the wrong face.
- The flipped element uses `transform-style: preserve-3d` but Safari sometimes flattens, showing both faces ghosted.
- Keyboard users press Enter on the polaroid, the flip plays, but **focus is lost** (the inner content uses `outline: none` and is not focusable), so Tab navigation jumps to the start of the page.
- After flip, focus does **not** move into the open poem, so a screen reader announces nothing.
- Closing the poem returns focus to `<body>`, not back to the polaroid that opened it — keyboard users lose their place in the room.
- The polaroid itself isn't a `<button>` — it's a `<div>` with `@click`, so it's invisible to keyboard and AT.

**Why it happens:**
- Designers think of "click" as the only input.
- 3D flips look great in demos that never use Tab.
- Vue templates make it easy to forget `role`, `aria-*`, and focus management.

**How to avoid:**
- Polaroid is a `<button type="button">` (not a div). Style as polaroid; preserve focus ring or replace with a high-contrast `:focus-visible` style — never remove it.
- Use the **Dialog pattern** for the open poem: `<dialog>` element OR a focus-trap library (`focus-trap` npm) + `aria-modal="true"` + `role="dialog"` + `aria-labelledby` pointing to the poem title.
- On open: store `document.activeElement` as `previouslyFocused`. Move focus to the dialog (or close button). On close: `previouslyFocused?.focus()`.
- Use **`inert`** attribute on the rest of the page while the dialog is open (broadly supported in 2024+) — handles focus + AT virtual cursor in one stroke.
- During the flip animation, set `pointer-events: none` on the rotating element and only re-enable after `transitionend`.
- Test flip with `prefers-reduced-motion`: replace 3D rotation with a fast cross-fade (no rotateY at all), or skip animation entirely and snap.
- Verify in Safari with `transform-style: preserve-3d` plus `backface-visibility: hidden` on both faces.

**Warning signs:**
- Tabbing through home, no visible focus ring on polaroids.
- Opening a poem, then pressing Tab, jumps somewhere unexpected (URL bar, address bar, page top).
- VoiceOver / NVDA reads polaroids as "group" instead of "button, photo of …".
- Esc doesn't close the open poem.

**Phase to address:**
Phase 4 — "Polaroid open / flip + accessibility". Treat focus management as part of the feature's "done" definition, not as a Phase 7 audit afterthought.

---

### Pitfall 4: Password gate is trivially bypassed; protected content ships in the bundle

**What goes wrong:**
The "soft password" is implemented as `if (input === 'lulu') unlocked.value = true`. Five separate failure modes, each fatal to the privacy intent:
1. Password is plaintext in the JS bundle — `view-source` or DevTools "Sources" reveals it instantly.
2. Hash compared client-side, but the **photos and poems are still in the deployed bundle / public folder**. `curl https://site/photos/01.jpg` works without ever entering a password. `view-source` of `index.html` shows preloaded poem JSON.
3. `localStorage.setItem('isUnlocked', 'true')` — anyone can open DevTools → Application → Local Storage and add the key.
4. The hash is `md5('lulu')` or `sha256('lulu')` — rainbow-tabled in milliseconds, and the hash itself is in the bundle so you only need to brute force a tiny dictionary.
5. The router has a `/locked` and `/unlocked` route, both built statically — `/unlocked` URL works without going through the gate.

**Why it happens:**
- Static hosting has no real way to gate content; devs reach for client-side checks because that's all that's available.
- "Soft" privacy gets confused with security.

**How to avoid:**
Be honest about the threat model: this gate must **stop casual visitors who type the URL**, not stop a determined attacker. Then make the gate at least respect that:

- **Encrypt the manifest + poems + photo URLs at build time**, with the password (or a key derived from it via PBKDF2/Argon2 with ≥100k iterations and a unique salt). Use SubtleCrypto AES-GCM. The password itself is never in the bundle, only the ciphertext + salt + iteration count.
- The locked screen accepts the password, derives the key, decrypts the manifest. Wrong password → decryption fails (auth tag mismatch) → "password sbagliata."
- Tools like [`staticrypt`](https://github.com/robinmoisson/staticrypt) do this for whole pages, or roll your own with `crypto.subtle.deriveKey` + `crypto.subtle.decrypt`. For a Vue/Vite project, a small Vite plugin runs at build time: reads `poems.txt` + `manifest.json` + photo paths, encrypts to a single `payload.enc` blob, writes that to `dist/`. The runtime fetches `payload.enc` and decrypts in-memory only.
- Photos: either (a) base64-encode them inside the encrypted payload (works for ~16 small photos, total < 5–10 MB), or (b) name photo files with HMAC-derived random tokens (`photos/a8f3...d2.avif`) so the URL itself is unguessable, listed only in the encrypted manifest. Option (a) is stronger (photo bytes are encrypted), option (b) is faster.
- **Never** store a "is unlocked" boolean. Store the **derived key** in `sessionStorage` (clears on tab close) so a refresh doesn't require re-typing. Optionally `localStorage` if persistence matters, but understand that means anyone with the device gets in.
- No `/unlocked` route — only one route, gated by whether decryption succeeded. Use Vite to **not pre-render** any "unlocked" HTML.

**Warning signs:**
- "View Page Source" on the locked page shows poem text or photo filenames.
- `dist/photos/` contains the photos directly accessible.
- Network tab on the locked screen shows photos already loading.
- Password check is a `===` comparison against a string literal in the JS.
- Setting `localStorage.isUnlocked = 'true'` and refreshing logs you in.

**Phase to address:**
Phase 1 — "Password gate + encrypted payload pipeline". This must be designed first; retrofitting encryption after the asset pipeline exists is a major rework.

---

### Pitfall 5: Accessibility regressions — zoom breaks layout, contrast fails when "lit", motion harms vestibular users

**What goes wrong:**
Multiple WCAG failures masked by the artistic design:
- "Soffitta notturna" uses warm dim tones on dark wood. Even within the candle's lit area, body text contrast falls below 4.5:1 (often 3:1 — passes WCAG 2.1 AAA Large but fails AA Normal).
- Layout uses `vh`, `vw`, fixed `px` for poem text. Pinch-zoom or "Increase text size" (browser zoom 200%, text-spacing requirements) breaks: text overflows the polaroid, lines clip, scrollbars appear inside the poem.
- The room itself zooms when the user pinch-zooms — strings scale, polaroid hit targets misalign, candle mask becomes a tiny dot.
- `prefers-reduced-motion: reduce` is treated as "skip the entry animation" but the candle reveal is still motion-driven; some users with vestibular disorders cannot tolerate the moving mask either.
- Focus indicator is hidden because "it ruins the aesthetic."
- Touch targets (polaroids when small) are below the WCAG 2.5.5 minimum of 24×24 CSS px (or Apple's 44×44 pt recommendation).

**Why it happens:**
Aesthetic-first projects rarely test with: 200% browser zoom, Windows High Contrast, VoiceOver, axe DevTools, or a colorimeter on the rendered output.

**How to avoid:**
- **Contrast budget**: enforce text contrast ≥ 4.5:1 against the *darkest* background it might sit on (i.e., test poem text both in lit and unlit states; in unlit, the text shouldn't be readable — that's fine, but in lit it must pass).
- The poem **detail view** (when a polaroid is open) is **not** subject to the dark-room aesthetic. Open it on a parchment / cream background with full contrast. The dark room is for browsing, the open poem is for reading.
- Use `rem` everywhere, with `html { font-size: 100% }` so user font-size preferences scale everything. Layout uses CSS Grid + `clamp()` + `min()` — never fixed `vh` for poem container heights.
- Provide explicit A− / A+ buttons that change a `--font-scale` CSS variable applied to poem text, separate from browser zoom (so users can have either or both).
- For `prefers-reduced-motion`:
  - Candle reveal becomes a **soft static vignette** centered on the page or follows pointer with no smoothing/easing (snaps).
  - String swing → completely static, no Verlet sim runs.
  - Polaroid flip → cross-fade or instant swap.
  - Candle reveal radius can be increased so the room is 80% lit by default — preserves aesthetic but doesn't require pointer movement to see content.
  - Critically: app must still be **fully usable** with reduced motion. Provide a "Mostra tutto" toggle that bypasses the candle entirely.
- `:focus-visible { outline: 2px solid var(--candle-warm); outline-offset: 3px }` — visible, but design-coherent.
- Touch target ≥ 44×44 CSS px around each polaroid (use padding or `::before` extended hit area). Polaroids visually small can still have larger tap zones.
- Test matrix: 200% zoom, 400% zoom, Windows High Contrast (forced-colors), VoiceOver on macOS+iOS, NVDA on Windows, keyboard-only.

**Warning signs:**
- axe DevTools reports any "color-contrast" violation.
- At 200% browser zoom, polaroids overlap or text clips inside them.
- A user reports nausea / dizziness on first visit.
- Tabbing into the page produces no visible focus.

**Phase to address:**
Cross-cutting; address in Phase 1 (foundational decisions: rem/clamp, CSS var system) and verify in **every** subsequent phase. Dedicated audit phase late, but never as the *first* place a11y is considered.

---

### Pitfall 6: Image weight blocks the main thread; no AVIF, no responsive sizes, all decoded synchronously

**What goes wrong:**
~13–16 polaroid photos, each shot at iPhone 4032×3024, dropped into `/photos/` as JPEG at ~3–5 MB each. Total 50+ MB transferred. Worse, all `<img>` tags are eager-loaded so the browser decodes 16 large JPEGs synchronously on first paint, blocking the main thread for 800–1500 ms on mid-range mobile. The candle reveal is choppy until decoding finishes.

**Why it happens:**
- "It's only 16 photos, who cares."
- Original photos go directly into the repo with no build-time processing.
- `<img>` defaults to synchronous decode in some browsers when not given hints.

**How to avoid:**
- **Build-time image pipeline.** Use [`@unpic/vite`](https://unpic.pics/), [`vite-imagetools`](https://github.com/JonasKruckenberg/imagetools), or [`unplugin-imagemin`](https://github.com/funkyhippo/unplugin-imagemin). Generate per source image:
  - AVIF (primary, 80–90% smaller than JPEG at same perceived quality)
  - WebP (fallback for older Safari)
  - JPEG (final fallback)
  - 3 widths: 480w, 960w, 1920w
- Serve via `<picture>` with `<source type="image/avif" srcset="…480w, …960w, …1920w" sizes="…">`.
- `<img loading="lazy" decoding="async" fetchpriority="low">` for off-screen polaroids; the candle starting position is known so 1–2 nearest polaroids can be `loading="eager" fetchpriority="high"`.
- If photos are encrypted (Pitfall 4), preprocessing happens before encryption: resize → convert → encrypt → bundle.
- Provide a **blurhash** or tiny base64 placeholder (LQIP) so the polaroid silhouette appears instantly even before the photo decodes.
- Target: **each photo ≤ 80 KB AVIF** at 960w. Total payload < 1.5 MB for 16 photos.

**Warning signs:**
- Lighthouse "Properly size images" or "Serve images in next-gen formats" warnings.
- Long Tasks > 100 ms during page load attributable to "Image Decode".
- Network tab shows .jpg files > 500 KB.
- TTI > 3 s on a throttled Fast 3G profile.

**Phase to address:**
Phase 5 — "Asset pipeline + photo handling". Get this in before Phase 6 polish; otherwise polish work assumes the wrong perf baseline.

---

### Pitfall 7: GitHub Pages SPA — base path missing → white screen on subpath; refresh on `/poem/3` → 404

**What goes wrong:**
Two distinct issues that always strike GH Pages SPA deployments:

1. **Base path**: project deployed to `https://user.github.io/lulu/`. Vite's default `base: '/'` produces `<script src="/assets/index-xxx.js">` → resolves to `https://user.github.io/assets/index-xxx.js` → 404 → white screen. CSS missing, JS missing, only a blank page.
2. **SPA refresh / deep link**: user opens `https://user.github.io/lulu/poem/3`, GH Pages tries to serve `/poem/3/index.html`, doesn't exist, returns its 404 page. Vue Router never gets a chance.

**Why it happens:**
Vite + Vue Router defaults assume hosting at root; GH Pages project sites are at `/<repo>/`.

**How to avoid:**
- In `vite.config.ts`: `base: process.env.NODE_ENV === 'production' ? '/lulu/' : '/'` (or read from env so a custom domain build can switch to `/`).
- In Vue Router: `createWebHistory(import.meta.env.BASE_URL)`. Always use `BASE_URL`, not hardcoded `/`.
- All asset references in code must go through Vite's import system (`import url from './photo.jpg?url'`) or use `import.meta.env.BASE_URL` — never hardcoded `/photos/foo.jpg`.
- For SPA refresh: the canonical GH Pages trick is **`404.html` redirect hack** — add a `public/404.html` that contains a small script redirecting to `index.html` with the path encoded in the query string; `index.html` reads it and rewrites history. The [spa-github-pages](https://github.com/rafgraph/spa-github-pages) repo has a copy-pasteable version. Alternative: use **hash routing** (`createWebHashHistory`) — uglier URLs (`/#/poem/3`) but zero deployment headaches.
- For custom domain: add `public/CNAME` file containing the apex/subdomain. Without it, every Pages redeploy nukes the custom domain setting in the GH UI.
- Add a **deploy preview** (or push to a branch and check the Pages URL) before merging — never trust local `vite preview`.

**Warning signs:**
- Local `npm run dev` works, GH Pages shows a white screen.
- DevTools Network on Pages shows `/assets/…` returning 404 / HTML.
- Refreshing on any non-root route → "404 — File not found" with the GH Octocat.
- Custom domain reverts to `user.github.io` after every deploy.

**Phase to address:**
Phase 1 — "Project skeleton + deploy pipeline". CI must deploy a *real* GH Pages preview from day one and the candle-reveal MVP gets verified there, not just on localhost.

---

### Pitfall 8: Mobile breaks — hover-only effects, iOS bottom-bar viewport jump, pinch-zoom disabled

**What goes wrong:**
- Candle effect or polaroid hover state uses `:hover` only → on iOS Safari, tap once shows hover, second tap activates click — confusing two-tap UX. On Android Chrome, hover sticks until tap-elsewhere.
- Layout uses `100vh` for the room → on iOS Safari, `100vh` excludes the dynamic bottom bar at first, then the bar slides up on scroll → polaroids and strings jump 60–100 px vertically. Looks broken.
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` — disables pinch-zoom. Users with low vision **rely** on pinch-zoom. WCAG 1.4.4 violation.
- Touch coordinates from `MouseEvent.clientX/Y` work but `Touch.clientX/Y` is required for multi-touch; a TouchEvent never fires `mousemove` consistently.
- Long-press triggers iOS context menu / image preview on the polaroid photo, breaking the flip interaction.
- 3D `transform-style: preserve-3d` has rendering bugs on older iOS — sometimes both faces visible, or the back face mirrored.

**Why it happens:**
Devs build on desktop Chrome and "test mobile later." Mobile-specific UA quirks aren't in the test loop.

**How to avoid:**
- Use **`pointer` events** (`pointerdown`, `pointermove`, `pointerup`) — unifies mouse/touch/pen.
- Use **`@media (hover: hover) and (pointer: fine)`** to gate hover-only flourishes; on touch, the equivalent is the candle position itself (finger = candle).
- For viewport height use **`100dvh`** (dynamic viewport height, supported iOS 15.4+/Chrome 108+) with `100svh` as fallback for older. Never `100vh` for the room layout.
- Viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — note no `maximum-scale`, no `user-scalable=no`. Users keep pinch-zoom.
- Disable iOS image preview on polaroids: `img { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }` and / or wrap in a `<button>` so the long-press menu offers "open image" only via explicit interaction.
- `touch-action: none` on the candle/room container to prevent scroll/pinch hijack of the candle interaction — but **not** on the open-poem view (users need to scroll/pinch the poem). Carefully scope.
- Test in BrowserStack or a real iPhone for: notch handling, bottom-bar reflow, rotation, pinch-zoom, dark mode, low power mode (which throttles RAF).

**Warning signs:**
- On iPhone Safari, the strings shift down by ~80 px when scrolling starts.
- Tapping a polaroid shows iOS "Save Image" menu instead of opening it.
- Pinch-zoom does nothing.
- Tap on a polaroid sometimes registers as hover-then-need-tap-again.

**Phase to address:**
Phase 2 (candle) and Phase 4 (polaroid open) — but **CI must include real mobile smoke test** from Phase 1 onward.

---

### Pitfall 9: Polaroid manifest drift — photo in `/photos/` but missing in manifest → silent skip

**What goes wrong:**
Owner adds `photos/12.jpg`, forgets to add it to `manifest.json`, or vice versa: adds a manifest entry pointing to a photo that doesn't exist. Symptoms: silent skip (photo never appears), or a broken `<img>` icon on a polaroid, or worse — a polaroid with a poem on the back but no photo on the front, displayed as a black square.

Subtler version: the manifest references a poem index that doesn't exist in `poems.txt` (after a poem is renumbered or deleted). Front shows the right photo, back shows the wrong poem or empty string.

**Why it happens:**
Manual JSON editing has no schema enforcement; mismatched filenames are easy.

**How to avoid:**
- **Build-time validation**: a Vite plugin (or pre-build script) that:
  1. Parses `manifest.json` against a Zod (or JSON Schema) shape: `{ id: string, photo: string, poemId: string, alt: string }[]`.
  2. Checks every `manifest[i].photo` exists in `photos/`.
  3. Checks every `manifest[i].poemId` exists in `poems.txt` (parse poem IDs from the .txt format).
  4. Checks **no orphan photos** (photos in `/photos/` not referenced by any manifest entry) — warn, don't fail.
  5. Checks **no orphan poems** — warn.
  6. Checks `alt` text is non-empty and ≥ 10 chars (a11y).
  7. Fails the build with a clear message on any error.
- In CI, the build step runs and PR is blocked if validation fails.
- Provide a small CLI helper: `npm run manifest:check` for local pre-commit feedback.
- Include a unit test that loads the manifest and verifies count = poem count.

**Warning signs:**
- A polaroid shows a broken-image icon in production.
- Total polaroid count differs from poem count.
- Adding a photo + entry locally works, but CI fails on typo'd filename — that's the *good* outcome; problem is when CI doesn't catch it.

**Phase to address:**
Phase 5 — "Asset pipeline" (where the manifest schema and validation are introduced alongside image processing).

---

### Pitfall 10: Italian text rendering — accents missing in custom font, line-break / hyphenation wrong

**What goes wrong:**
Custom display font (handwritten / typewriter look) is loaded for poem body or polaroid captions. The font:
- Doesn't include `à è é ì ò ù` glyphs, fallback font kicks in for accented chars only → ugly mixed-style words like "*po*esi*a*".
- Doesn't have proper Italian punctuation (curly quotes «», em-dashes, ellipsis as single glyph).
- Uses `text-transform: uppercase` for headings which strips diacritics in some legacy fonts (`È` → `E`).
- Hyphenation: Italian needs `lang="it"` + `hyphens: auto` for browser to apply Italian hyphenation rules; without it, English rules apply (or none) and long words like "*intrappolato*" don't break sensibly inside the polaroid card → either overflow or awkward spacing in justified text.
- `text-rendering: optimizeSpeed` (sometimes set as a perf "tip") disables ligatures and proper kerning for accented chars.

**Why it happens:**
Devs check the font with English placeholder "Lorem ipsum" / "The quick brown fox" — neither has accented chars.

**How to avoid:**
- Set `<html lang="it">` (also helps screen readers pronounce correctly).
- `body { hyphens: auto; }` on poem text where word-wrap is allowed; `hyphens: manual` if you control line breaks intentionally with `&shy;`.
- Use `font-display: swap` and verify Cyrillic / Extended Latin subset is loaded if the chosen font requires it. For Google Fonts, append `&subset=latin,latin-ext`. For self-hosted, ensure the WOFF2 file includes accented glyphs (run `pyftsubset` with `--unicodes=U+0000-024F,U+1E00-1EFF`).
- **Render test**: a test page or Storybook story showing the full alphabet plus `àáèéìíòóùú ÀÉÈÌÒÙ «» " " ' ' — … ‒ –`. Visually verify all glyphs come from the same font.
- Use Italian quotation marks «» (or curly " ") via `quotes: "«\\A0" "\\A0»"` + `q` element, or hardcode in the poem text.
- Avoid `text-transform: uppercase` on poem body. If used in headings, choose a font with proper uppercase accent glyphs (test "PERCHÉ").
- If using `font-feature-settings`, enable `liga` (ligatures), `kern` (kerning).

**Warning signs:**
- A poem with the word "perché" displays the "é" in a different font.
- Long Italian words clip the polaroid card edge.
- Justified text has rivers / awkward gaps.
- Screen reader pronounces Italian poem with English phonemes.

**Phase to address:**
Phase 6 — "Visual polish / typography". Add a typography test page in Phase 5 with realistic Italian poetry samples.

---

### Pitfall 11: Vite asset paths work in dev, 404 in production

**What goes wrong:**
Several Vite-specific traps:
- Image referenced as `<img src="/photos/01.jpg">` works in dev (Vite serves from `public/`), but in production deploys to `/lulu/` (GH Pages base) → resolves to `/photos/…` instead of `/lulu/photos/…` → 404.
- CSS `background-image: url('/photos/bg.jpg')` — same problem.
- Dynamic import `import(\`./photos/\${id}.jpg\`)` — Vite cannot statically analyze, build-time transformer doesn't include the file, runtime tries to fetch a path that's not in `dist/`.
- Files in `public/` are copied as-is, *not* hashed → cache busting fails when you replace a photo.
- Files imported from `src/assets/` are hashed and bundled, but tree-shaking can incorrectly drop a non-imported asset if it's only referenced by string.

**Why it happens:**
Vite has two distinct asset systems (`public/` for "ship as-is" and `src/assets/` for "process") and devs mix them.

**How to avoid:**
- **Rule**: photos and runtime assets that are referenced via the manifest go in `src/assets/photos/` (or `photos/` at project root), and the manifest gets transformed at build time to refer to hashed URLs. Use `import.meta.glob('/photos/*.{jpg,avif,webp}', { eager: true, query: '?url', import: 'default' })` to make Vite aware of every photo.
- For dynamic photo lookup at runtime: build a `Record<filename, hashedUrl>` from the glob result, look up by filename from manifest.
- For any URL that does need to be in `public/`, always prefix with `import.meta.env.BASE_URL`.
- Add a **post-build smoke test**: run `vite preview` (which honors `base`), have a Playwright test that opens the home, verifies all `<img>` resolve (200 OK) and the candle effect runs without console errors.
- Inspect `dist/` after build — eyeball the `assets/` directory, ensure photos are there with hashed names if they should be.

**Warning signs:**
- Deploy works, photos are blank.
- Console errors `Failed to load resource: 404 /photos/01.jpg`.
- Dev tools network tab shows `/lulu/photos/01.jpg` while you wrote `/photos/01.jpg` (Vite rewrote in dev) — but in prod with a different base it fails.
- Cache shows old photo even after replacing the file.

**Phase to address:**
Phase 5 — "Asset pipeline" + Phase 1 deploy pipeline. The Phase 1 GH Pages preview must include at least one photo to catch the base-path issue early.

---

### Pitfall 12: `prefers-reduced-motion` makes the app unusable

**What goes wrong:**
Dev sees `prefers-reduced-motion: reduce` and adds a global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }`. Result: the candle reveal **doesn't move with the pointer** at all, the room stays mostly dark, polaroids are invisible. The flip animation is killed but no JS fallback shows the back face. App is broken for users with vestibular disorders.

**Why it happens:**
Treating reduced-motion as a one-line CSS toggle, not a UX design.

**How to avoid:**
- Detect via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, store as a reactive `useReducedMotion()` composable, listen to `change` events.
- For each motion-driven feature, define a **reduced** behavior, not "off":
  - **Candle**: still follows pointer, but no easing/lerp (snap to position); larger default radius (60–80% of viewport lit). OR — present a "Reveal all" toggle that lights the whole room statically.
  - **Strings**: fully static; no Verlet sim runs (also saves CPU for users who often run on reduced-resource devices).
  - **Polaroid flip**: instant face swap with a 100 ms cross-fade (cross-fades are generally vestibular-safe; 3D rotation isn't).
  - **Dialog open**: instant appear, no scale-in.
  - **Page transitions**: no slides, just swap.
- Provide an **in-app toggle** (Impostazioni → "Riduci animazioni") that overrides the OS preference both ways. WCAG 2.3.3 — let users opt in/out.
- Test by toggling System Settings → Accessibility → Display → Reduce Motion (macOS) and reloading.

**Warning signs:**
- With reduced-motion ON, the room is pitch black and you can't find polaroids.
- With reduced-motion ON, clicking a polaroid does nothing visible (flip CSS killed, no fallback).
- App relies on motion to convey state changes that aren't conveyed any other way.

**Phase to address:**
Phase 2 (candle) — establish the reduced-motion alternative simultaneously with the default behavior. Phase 4 (flip) — same. Don't punt to a "polish phase."

---

### Pitfall 13: Click-anywhere-to-douse-candle conflicts with click-on-polaroid-to-open

**What goes wrong:**
Designer wants: "click anywhere on the dark area to blow out the candle / flicker / change color." Developer adds `@click` on the room background. But the polaroids are children of the room; click on a polaroid **bubbles** to the room handler → candle flickers AND polaroid opens. Sometimes the polaroid open handler runs after the room handler swallows it (`stopPropagation` placed wrong) → polaroid never opens. Or worse, drag-to-pan the candle conflicts with click-to-open: a slow click registers as a tiny drag and the polaroid doesn't fire.

**Why it happens:**
Event bubbling + multiple interaction modes on overlapping elements without an explicit interaction model.

**How to avoid:**
- Define an **explicit interaction state machine**:
  - State BROWSING: pointermove updates candle. `pointerup` on background = ignored (no "blow out") or = secondary action you decide is non-conflicting.
  - State POLAROID_OPEN: candle frozen at last position (or hidden); pointer events on background close the polaroid.
- Use **`@click.self`** on the room handler so it only fires when the click target is literally the room, not a bubbled-up child.
- Distinguish click from drag: if `pointerdown` to `pointerup` distance > 6 px or duration > 250 ms → drag, ignore click. Otherwise → click. Use the [pointer-events tap detection](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) pattern.
- Polaroid `<button>` calls `event.stopPropagation()` in its click handler **after** running its own logic. Or better: don't add a "click background to do X" feature unless absolutely needed — keep the candle reveal driven by movement, not click.
- If "click to blow out / re-light" is part of the design: make it a long-press or double-click, not single click, to disambiguate.

**Warning signs:**
- Clicking a polaroid sometimes opens it, sometimes flickers the candle, depending on speed.
- Drag-canceling a click doesn't always work.
- Two effects fire on one click (candle + open).

**Phase to address:**
Phase 4 — "Polaroid interaction". Define the interaction state machine before coding handlers.

---

### Pitfall 14: Memory leaks — unbounded mousemove listeners, RAF loops not cancelled on route change

**What goes wrong:**
Vue Router navigates from home → poem detail → home. Each navigation:
- Mounts a new `CandleRoom` component which calls `window.addEventListener('pointermove', handler)` in `onMounted`.
- Starts a fresh RAF loop.
- On unmount, the `pointermove` handler is **not** removed (devs forget that `window` listeners must be manually removed; `onUnmounted` was forgotten or scoped wrong).
- Old RAF loop keeps running because `cancelAnimationFrame` was never called with the right id.

After 10 navigations: 10 mousemove handlers all running simultaneously, 10 RAF loops, each holding closures over old reactive refs. Heap grows, FPS drops, eventually the tab dies on mobile.

Same pattern with: `ResizeObserver` on the candle layer, `IntersectionObserver` on polaroids, `visibilitychange` listener, audio context (if any), Web Worker for physics.

**Why it happens:**
Vue's reactive system handles component-internal cleanup, but global listeners and RAF are devs' responsibility.

**How to avoid:**
- Use [`@vueuse/core`](https://vueuse.org/) — `useEventListener`, `useRafFn`, `useResizeObserver`, `useIntersectionObserver`. All auto-cleanup on unmount. **Make this the team rule**: never raw `addEventListener` to `window` / `document` / `body` from a component.
- For physics / RAF loops: `useRafFn(() => step(), { immediate: false })` — returns `pause` / `resume` / `isActive`. Auto-stops on unmount.
- If for some reason you can't use VueUse: `onBeforeUnmount(() => { window.removeEventListener('pointermove', handler); cancelAnimationFrame(rafId); })` with ids stored in module-level closures.
- Add a **leak detection** to the dev workflow: in DevTools Memory tab, take heap snapshot, navigate home → detail → home 10×, snapshot again. Diff should not show 10× retained `CandleRoom` instances.
- Vue DevTools shows the component tree — should be exactly one `CandleRoom` mounted at a time.

**Warning signs:**
- After SPA navigation back-and-forth, fan spins up.
- DevTools Performance shows multiple identical RAF callback frames per actual frame.
- Heap snapshot shows N retained component instances after N navigations.
- Touching the screen on mobile feels increasingly laggy as the session continues.

**Phase to address:**
Phase 2 (candle) — establish VueUse pattern from the first listener. Phase 7 — explicit leak audit.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Plaintext password compare client-side | 30 min vs. 1 day to wire SubtleCrypto | Photos/poems leak via view-source; "privacy gift" intent broken from day 1 | Never — use `staticrypt` if you don't want to roll your own |
| Photos in `public/` un-hashed, full-res | No build pipeline needed | 50 MB initial load, no AVIF, cache-bust requires rename | Until Phase 5; absolutely not at Phase 6 ship |
| Hardcoded `/lulu/` base path everywhere | Quick deploy works | Custom-domain switch breaks every URL; dev/prod divergence | Never — use `import.meta.env.BASE_URL` |
| `100vh` for room layout | Looks right on desktop | iOS bottom-bar jump; Android keyboard nudges | Never on a mobile-targeted site; use `100dvh` |
| `prefers-reduced-motion` global `animation: none !important` | One line, "covers a11y" | App becomes unusable for ~2% of visitors who needed accessibility most | Never — design reduced alternatives feature-by-feature |
| `addEventListener('pointermove', ...)` directly in component | Familiar API | Memory leak across routes | Until you add a second component with the same pattern; then refactor to VueUse |
| Manifest edited by hand, no schema | Fastest content workflow today | Silent failures when filenames mistyped, count drift | Until Phase 5 ships build-time validation |
| `v-if` to mount / unmount the candle layer | "Saves" perf when not visible | Triggers full re-init of physics; loses pointer state | Use `v-show` + `pointer-events: none` instead |
| Single huge `App.vue` with all state | Fast to prototype | Every re-render touches everything; impossible to optimize the 60fps path | Until first FPS regression is found; refactor before Phase 4 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Pages | Forgetting the `/<repo>/` base path → white screen | `vite.config.ts` reads `base` from env; CI sets it for prod build; verify with `vite preview --base /lulu/` |
| GitHub Pages SPA refresh | Refreshing on `/poem/3` returns Octocat 404 | `public/404.html` redirect hack OR hash router OR custom domain + Cloudflare Pages instead |
| GitHub Actions deploy | Deploying from `gh-pages` branch but Pages settings still on `main /docs` | Use the official `actions/deploy-pages@v4` workflow with `actions/upload-pages-artifact` — declarative, no branch fiddling |
| Custom domain | Adding domain in GH UI, next deploy wipes it | Commit `public/CNAME` with the domain string |
| `<picture>` + AVIF | Older Safari (< 16) breaks; the page shows nothing | Always include WebP and JPEG fallbacks in `<source>` order: AVIF → WebP → `<img>` JPEG |
| Vue Router + GH Pages | `createWebHistory()` with no base | `createWebHistory(import.meta.env.BASE_URL)` |
| SubtleCrypto | Using on `http://` (not `https://` or `localhost`) → API undefined | GH Pages is HTTPS by default; verify on custom domain too |
| Web Worker (if used for physics) | Creating with relative path that breaks under Vite's bundling | Use `new Worker(new URL('./physics.worker.ts', import.meta.url), { type: 'module' })` |
| `prefers-reduced-motion` matchMedia | Listener added but never removed → leak | Use `useMediaQuery` from VueUse |
| Italian font subsetting | Font CDN URL doesn't include `&subset=latin-ext` → missing accents | Self-host with `pyftsubset` and `--unicodes=U+0000-024F,U+1E00-1EFF` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reactive ref updated on every `pointermove` drives a CSS variable | Choppy candle, dropped frames, fan spin | RAF coalescing + direct `style.setProperty` outside reactivity | Immediately on any laptop on battery; immediately on mid-range mobile |
| Mousemove triggers Vue component re-render (template uses the coord) | Vue compiler warning unlikely; perf flame chart shows huge "Render" spans during mousemove | Compute the coord in a non-reactive ref, subscribe via RAF only at the DOM layer | First test on real mobile |
| Spring physics with high `dt` after tab switch | Polaroids fly off, NaN | Clamp `dt`; visibilitychange reset | Tab-switch (very common) |
| All photos eager-loaded at full resolution | 3+ s TTI, jank on first paint | Build pipeline: AVIF + responsive `srcset` + `loading="lazy"` for off-screen | Even at 16 photos, on Fast 3G mobile |
| `box-shadow: 0 0 200px ...` animated | High paint cost, red bars in DevTools | Use a translated radial-gradient layer with `transform` + `mix-blend-mode` instead | At any candle radius > 100 px |
| Large `mix-blend-mode` regions | Layer compositing flagged "non-composited" reasons | Confine blend mode to a small layer, not the entire `<body>` | Mid-range mobile, especially older iPhone SE |
| `filter: blur()` on large elements | Repaints on any descendant change | Use SVG `<feGaussianBlur>` cached as image, OR pre-blur as image asset | Anytime blurred area > 25% of viewport |
| Unbounded RAF loops surviving route change | Heap grows, perf degrades over session | VueUse `useRafFn` | After 5–10 navigations |
| ResizeObserver per polaroid (16 observers) | Layout thrash on resize | One observer at the room level, dispatch to children | At polaroid count > 30; defensive even at 16 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Password in JS bundle as plaintext | Anyone with view-source gets in instantly; defeats the entire gate | Encrypt content with PBKDF2-derived key; password never in bundle |
| Photos in `dist/photos/` directly fetchable without password | URL-guessing or leaked link bypasses gate entirely | Encrypt photos in payload OR use HMAC-randomized filenames in encrypted manifest |
| `localStorage.isUnlocked = true` | Devtools-trivial bypass | Don't store boolean state; store derived crypto key in `sessionStorage` (and only because of decryption need) |
| Weak hash (md5/sha256 of password, no PBKDF2) | Brute-forced in milliseconds | PBKDF2-SHA256 ≥ 100k iterations + unique salt; or Argon2 via WebCrypto polyfill |
| Pre-rendered "unlocked" route | The pre-rendered HTML leaks content to web crawlers | Don't pre-render anything past the gate; consider `<meta name="robots" content="noindex">` |
| No `Content-Security-Policy` | XSS via injected SVG / image metadata | Add CSP via `<meta>` (GH Pages can't set headers): `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';` |
| Photo EXIF leaks GPS / camera serial | Privacy leak about shoot location | Strip EXIF in image build pipeline (`sharp({ rotate: true }).withMetadata({})`) |
| Source map deployed to prod | Leaks readable JS, encryption logic | `build.sourcemap: false` in `vite.config.ts` for prod, or upload separately to error tracker only |
| Hardcoded shared password committed to repo (even private) | Repo visibility might change; commit history forever | Password is set at build time via `VITE_PUBLIC_BUILD_KEY` env in CI secret — but realize it ends up in the encrypted payload's salt only, not as plaintext |
| `target="_blank"` without `rel="noopener noreferrer"` | Tabnabbing | Always include `rel`; or use `<a target="_blank" rel="noopener">` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Candle radius too small | Users feel lost, "where are the polaroids?"; bounces | Default radius = 35–45% of viewport short edge; provide "Mostra tutto" toggle; subtle audio/visual hint on first load |
| No onboarding for the candle metaphor | Users open site, see darkness, think it's broken, leave in 5s | First-load hint: faint pulsing glow at viewport center with "Muovi il mouse / tocca per illuminare" (auto-fades after first pointermove) |
| Polaroid open transition longer than 400 ms | Feels sluggish on repeat browsing | 250–350 ms; `cubic-bezier(0.4, 0, 0.2, 1)` |
| No way to know which polaroids are already read | User re-opens same poem, loses track in 16-item set | Subtle dog-ear / fold corner on read polaroids, persisted in `localStorage` (per-user, not gated by password) |
| Closing poem returns user to top of room, scroll lost | Disorientation | Preserve room scroll/candle position when opening poem; restore on close |
| Esc key doesn't close open poem | Power-user frustration | Bind Esc; also a visible × close button in the corner |
| No focus return after close | Keyboard user lands on `<body>` | Save `previouslyFocused`; restore on close |
| Tap-and-drag on mobile is ambiguous (candle drag vs scroll) | Page scrolls when user wanted to move candle; or candle moves when user wanted to scroll | `touch-action: none` on the room only, with a clear "scrolling allowed" affordance at edges; or distinct gesture: tap = open, drag = candle |
| Italian text without proper diacritics or with wrong line breaks | Native speakers find it amateurish | `lang="it"`, `hyphens: auto`, full-character font subsets, test page with all accented characters |
| Open poem can't be zoomed independently of room | Visually impaired user must zoom-in then re-zoom for next | A−/A+ controls in the open-poem toolbar; persist preference in localStorage |
| Opens in light-mode on a system in dark-mode | Jarring for the user | The dark room IS the dark mode; ensure `color-scheme: dark` in CSS so form controls / scrollbars match; in the open poem (light parchment), explicitly set `color-scheme: light` for that section |
| Loading the room with no progress feedback | 1–2 s blank dark screen looks broken | Tiny flickering candle icon + Italian "*Sto accendendo la candela…*" with skeleton silhouettes for polaroids |

## "Looks Done But Isn't" Checklist

- [ ] **Password gate**: Often missing real content protection — verify by `curl`'ing photo URLs without password, by viewing `dist/index.html` source for poem text, by setting `localStorage.isUnlocked=true` and refreshing.
- [ ] **Candle reveal**: Often missing 60fps verification — verify with DevTools Performance recording on Fast 4G + 4× CPU throttle, must stay green.
- [ ] **String physics**: Often missing tab-blur stability — verify by switching tabs for 60s, returning, no NaN / no flying polaroids.
- [ ] **Polaroid flip**: Often missing keyboard support — verify with Tab to polaroid, Enter to open, Esc to close, focus returns.
- [ ] **Polaroid flip**: Often missing screen-reader announcement — verify with VoiceOver, "[poem title], dialog" should be announced; poem text should be read.
- [ ] **Reduced motion**: Often missing fallback content — verify by enabling `prefers-reduced-motion` and confirming app is fully usable; specifically the candle and the flip have non-motion equivalents.
- [ ] **Color contrast**: Often missing AA in lit-area — verify with a colorimeter / WCAG checker in the candle's center; poem detail view also independently verified.
- [ ] **Pinch-zoom**: Often missing — verify on iOS by trying two-finger pinch on the room and on the open poem; both must zoom.
- [ ] **GH Pages base path**: Often missing — verify by running `npm run build && vite preview --base /lulu/` and visiting `localhost:4173/lulu/`.
- [ ] **GH Pages SPA refresh**: Often missing — verify by deploying, navigating to `/poem/3`, hard-refreshing; should NOT see GH Octocat 404.
- [ ] **iOS dynamic viewport**: Often missing `100dvh` — verify on real iPhone by scrolling and observing whether layout jumps.
- [ ] **Manifest validation**: Often missing build-time check — verify by intentionally typo'ing a photo filename; build must fail.
- [ ] **AVIF fallback chain**: Often missing — verify by loading on Safari 15 (no AVIF) — should fall back to WebP/JPEG without broken images.
- [ ] **Italian accents in custom font**: Often missing — verify with a render test page containing `àèéìòù ÀÈÉÌÒÙ «» — …`.
- [ ] **EXIF stripping**: Often missing — verify by `exiftool dist/assets/photos/01.avif` (or equivalent); should show no GPS / serial.
- [ ] **Memory leaks**: Often missing — navigate home → detail → home 10× and check heap snapshot diff for retained components.
- [ ] **Source maps off in prod**: Often missing — verify `dist/` contains no `.map` files (or that they're separately uploaded only).
- [ ] **`alt` text on every photo**: Often missing or `alt="photo"` — verify all alts are meaningful Italian descriptions.
- [ ] **Custom domain CNAME persists**: Often missing — verify `public/CNAME` exists if a custom domain is used.
- [ ] **Skip link**: Often missing — keyboard users land on body, need to tab past nav; provide "Salta al contenuto" link.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Password gate trivially bypassed | HIGH (re-architect asset pipeline + encrypt content) | 1. Stop ship. 2. Add `staticrypt` or build-time AES-GCM encryption. 3. Move all photos/poems through encryption step. 4. Rotate password. 5. Re-deploy. |
| Candle reveal at 30 fps | MEDIUM | 1. Profile in DevTools Performance. 2. Replace reactive coord with RAF-driven CSS variable. 3. Move from `clip-path` / `box-shadow` to `transform`+`mix-blend-mode`. 4. Add `will-change` + `contain`. |
| Physics explodes after tab-blur | LOW | 1. Add `dt` clamp. 2. Add visibilitychange handler that resets `lastTime`. 3. Switch to Verlet if using Euler. |
| White screen on GH Pages | LOW | 1. Set `base` in `vite.config.ts`. 2. Use `import.meta.env.BASE_URL` everywhere. 3. Re-deploy. |
| SPA 404 on refresh | LOW | 1. Add `public/404.html` redirect script. 2. OR switch to hash router. |
| Manifest drift caught only in prod | MEDIUM | 1. Add Zod schema + Vite plugin validation. 2. Add CI check. 3. Audit existing manifest. |
| Memory leak from listeners | MEDIUM | 1. Audit all `addEventListener` / `requestAnimationFrame` calls. 2. Replace with VueUse equivalents. 3. Re-test 10× navigation heap. |
| Reduced-motion makes app unusable | LOW | 1. Replace global `animation: none` with feature-specific reduced alternatives. 2. Add in-app toggle. |
| Italian accents render in fallback font | MEDIUM | 1. Re-subset font with `latin-ext`. 2. Self-host. 3. Add render test page. 4. Re-deploy. |
| Image weight blocking main thread | MEDIUM | 1. Add `vite-imagetools`. 2. Re-export images as AVIF/WebP/JPEG with srcset. 3. Add `loading="lazy"` for off-screen polaroids. |
| Focus lost on flip | LOW | 1. Convert polaroid to `<button>`. 2. Use `<dialog>` or focus-trap. 3. Save/restore `previouslyFocused`. |
| Click conflict (room vs polaroid) | LOW | 1. Define interaction state machine. 2. Use `@click.self` on room. 3. Stop propagation on polaroid handler. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Password gate trivially bypassed | Phase 1 (skeleton) — asset encryption pipeline designed first | `curl` photo URL without password → 404 or encrypted blob; view-source shows no poem text |
| GH Pages base / SPA 404 | Phase 1 — CI deploys to a real Pages preview | Deploy preview URL works for `/`, `/poem/3` after refresh, all assets 200 |
| Vite asset paths break in prod | Phase 1 + Phase 5 | `vite preview --base /lulu/` matches deployed behavior; one photo loads on Phase 1 preview |
| Memory leaks from listeners | Phase 2 — adopt VueUse from first listener | 10× navigation heap diff < 1 retained `CandleRoom` instance |
| Candle paint/repaint cost | Phase 2 (candle MVP) | DevTools Performance: paint < 4 ms, FPS = 60 on mid-range mobile + throttle |
| Reduced-motion unusable | Phase 2 (candle) + Phase 4 (flip) | App fully usable with OS reduced-motion ON; in-app toggle exists |
| Mobile breakage (hover, dvh, pinch) | Phase 2 + Phase 4 — mobile in CI smoke from start | Real iPhone: layout doesn't jump on scroll; pinch zooms; tap opens polaroid |
| String physics drift / explode | Phase 3 (string scene) | Tab-blur 60s → return → no NaN, polaroids in valid positions |
| Click conflict candle vs polaroid | Phase 4 (interaction) | State-machine documented; Cypress / Playwright tests cover both gestures |
| Polaroid flip a11y (focus, keyboard) | Phase 4 | Tab/Enter/Esc all work; focus returns; VoiceOver announces dialog |
| Image weight / no AVIF | Phase 5 (asset pipeline) | Lighthouse: no "next-gen format" warnings; total photo payload < 1.5 MB |
| Manifest drift | Phase 5 | Build fails on intentional typo; CI gates merge |
| Italian text rendering | Phase 6 (typography polish) | Render test page passes; native speaker review |
| Contrast / a11y regressions | Cross-cutting Phase 1 → Phase 7 | axe DevTools 0 violations; manual SR + keyboard pass; colorimeter check in lit area |
| EXIF leak / source maps in prod | Phase 7 (ship hardening) | Final `dist/` audit |

## Sources

- MDN Web Docs — `requestAnimationFrame`, `pointer-events`, `transform-style`, `prefers-reduced-motion`, `dvh/svh/lvh`, SubtleCrypto, `<dialog>`, `inert`. (HIGH)
- Vue 3 official docs + Vite docs — `import.meta.env.BASE_URL`, `import.meta.glob`, `public/` vs `src/assets/` semantics, `vite.config.base`. (HIGH)
- Vue Router docs — `createWebHistory(BASE_URL)`. (HIGH)
- VueUse docs — `useRafFn`, `useEventListener`, `useMediaQuery`, `useIntersectionObserver`. (HIGH)
- WCAG 2.2 — 1.4.3 (Contrast), 1.4.4 (Resize Text), 1.4.10 (Reflow), 2.1.1 (Keyboard), 2.3.3 (Animation from Interactions), 2.5.5 (Target Size), 2.5.8 (Target Size Minimum), 4.1.2 (Name, Role, Value). (HIGH)
- WebKit known issues — `transform-style: preserve-3d` rendering on older iOS; viewport bottom-bar behavior. (MEDIUM)
- Glenn Fiedler — "Fix Your Timestep" (canonical reference for stable game-loop integration). (HIGH)
- `spa-github-pages` (rafgraph) — canonical 404.html SPA hack for GitHub Pages. (HIGH)
- `staticrypt` (robinmoisson) — reference implementation of static-site password encryption. (HIGH)
- `vite-imagetools`, `@unpic/vite` — build-time image transformation. (HIGH)
- Chromium / Firefox / Safari background tab throttling docs. (MEDIUM)
- Personal/community wisdom on Italian web typography (`lang`, `hyphens`, font subsetting). (MEDIUM)

---
*Pitfalls research for: animation-heavy accessible static SPA with client-side gate on GitHub Pages*
*Researched: 2026-05-02*
