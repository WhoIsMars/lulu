# Feature Research

**Domain:** Interactive personal poetry & photo microsite (intimate, password-gated, dark-room aesthetic)
**Researched:** 2026-05-02
**Confidence:** HIGH for accessibility/web-standard features; MEDIUM for niche aesthetic decisions (candle cursor, swing physics) where evidence is taste-driven not empirical.

---

## Niche Framing

This is **not** a portfolio, not a gallery CMS, not a Pudding-scale interactive feature. It is a **single-room digital diorama**: ~13–16 polaroids, one password, one visitor at a time, no analytics theater. Every "feature" must answer the question: *does this make the room feel more alive, or does it just make the codebase heavier?* The bar for adding anything is therefore high; the bar for polishing what is in is even higher. Generic SPA advice (PWA, offline mode, share buttons) is mostly irrelevant — this is a one-shot emotional experience, not a tool.

Three reference axes calibrate the right-sized scope:
- **Bruno Simon-style sites** — magical but heavy; we want the *feel* of "I am somewhere", not the 30MB of assets.
- **It's Nice That portfolios** — beautifully restrained, typography-led. Closer to our register.
- **Pudding/NYT interactives** — narrative scroll, deeply produced. We borrow the *intimacy* and *deliberate pacing*, not the engineering scale.

---

## Feature Landscape

### Table Stakes (Users Expect These — Missing = Broken/Cheap/Inaccessible)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Password input auto-focused on load** | Otherwise visitor must hunt for the field. First impression: friction, not magic. | LOW | `autofocus` + JS focus call (autofocus alone unreliable on iOS). |
| **Password gate: clear error feedback (wrong password)** | Silent failure feels broken. Must distinguish "wrong" from "loading" from "network error". | LOW | Inline aria-live="polite" message, gentle shake animation respecting reduced-motion. Avoid red alarm colors — break tone. |
| **Password "remember me" via localStorage** | Visitor returning second time should not retype. | LOW | Store hashed token (not password). Default-on for personal site; offer "forget" link. |
| **Client-side brute-force throttle** | Even soft gate must not allow infinite retries via console scripting. | LOW | After 5 wrong attempts: 30s lockout, then exponential. Pure UX speed-bump (real attacker bypasses easily — that is fine for soft gate, document it). |
| **Mobile: touch-light follows finger** | Without it, mobile users see a flat dark square. Promised in PROJECT.md. | MEDIUM | `touchmove` events; light persists ~500ms after touchend so user can lift finger to read. |
| **Polaroid hover/focus lift** | Without affordance, users do not know polaroids are clickable. | LOW | `transform: translateY(-4px) rotate(...)` + shadow. Focus ring must be visible **even in the dark room** (ring around polaroid frame, not behind candle). |
| **Polaroid keyboard accessibility (Tab + Enter)** | Mouse-only is exclusionary. Each polaroid must be a button or link. | LOW | `<button>` with `aria-label="Polaroid: <poem-title> — apri per leggere"`. |
| **Visible focus indicator that survives the dark theme** | Default browser ring on dark bg often invisible. | LOW | Custom ring: warm amber glow (matches candle), 2px outline + 2px offset. |
| **Open polaroid: clear close affordance + ESC key + browser back** | Trapping users in modal feels broken. | MEDIUM | Close button (aria-label), ESC, click-outside, **and** browser back button (push history state on open, listen for popstate). |
| **Flip animation (front photo → back poem)** | This is the core promised metaphor. Without it the site is a photo gallery with captions. | MEDIUM | CSS 3D `transform: rotateY(180deg)` with `backface-visibility: hidden`. ~600–800ms ease-out. |
| **Poem typography that is genuinely readable** | The poems are the payload. Bad typography = the whole site is decorative trash. | LOW | Serif (Cormorant Garamond, EB Garamond, or similar). 18–20px base. Line-height 1.6–1.7. Max-width 32–38ch. |
| **Pinch-zoom on mobile not blocked** | Most "designer" sites set `user-scalable=no`. **Accessibility violation** and forbidden by PROJECT.md. | LOW | Viewport meta must allow user-scalable=yes, maximum-scale ≥ 5. |
| **A−/A+ buttons that actually reflow text** | If buttons just scale CSS pixels and break layout, they are theater. | LOW | Adjust root font-size; layout uses `rem`/`em` throughout, max-width in `ch`. |
| **`prefers-reduced-motion` honored** | Required for vestibular accessibility. Reduces flicker, swing, flip → fade. | LOW | Single `@media (prefers-reduced-motion: reduce)` block disables: candle flicker, polaroid swing, flip animation (replace with crossfade). |
| **Loading state during photo load** | Without it, dark room looks empty and visitor thinks gate failed. | LOW | Skeleton polaroids (paper rectangle silhouette) appear immediately; photo fades in when loaded. |
| **Color contrast in the lit area meets WCAG AA** | Dark room aesthetic is no excuse for unreadable text. | LOW | Poem text must hit 4.5:1 against its background panel (open view), not against the dark room. |
| **Italian language attribute on `<html lang="it">`** | Screen readers pronounce poems with Italian phonemes. Crucial since content is Italian. | LOW | One attribute. Easy to forget. |
| **Polaroid alt text per image** | Each photo must have meaningful description (not "polaroid 3"). | LOW | Manifest entry: `{ photo, poem, alt: "<descrizione>" }`. Owner authors. |
| **Screen-reader narration of poem in semantic HTML** | Use `<article>` + `<h2>` for title + paragraph structure. Not divs. | LOW | Allows VoiceOver to announce structure and let user navigate stanzas. |
| **No layout shift after fonts load** | Web font swap that shifts a poem mid-read is jarring. | LOW | `font-display: swap` with size-adjust descriptors, OR self-host and preload. |
| **Mobile orientation: works in portrait and landscape** | Locking is a known accessibility violation; landscape is required for some users with mounted devices. | LOW | Layout reflows; "string" line direction may rotate but should not break. |
| **Return-to-room preserves scroll/state** | Visitor who opens polaroid #7, closes, should still see polaroid #7 in view, lit, focused. | MEDIUM | Restore focus to triggering polaroid on close (standard a11y pattern); preserve room scroll position. |

### Differentiators (What Makes It Actually Magical)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Candle cursor with warm temperature + soft falloff** | The single visual signature of the site. Generic "spotlight reveal" feels like a Webflow demo; warm tone (amber 2700K-ish), inner core + outer halo with longer falloff = feels like fire, not flashlight. | MEDIUM | CSS `radial-gradient` mask with two stops (bright core ~80px, warm falloff to ~280px). Tint via `mix-blend-mode: multiply` over a warm overlay. |
| **Subtle candle flicker (secondary animation on the radius)** | Static circle = flashlight. Flickering radius (±5–8% over ~120ms with Perlin-ish noise, not random) = candle. Tiny detail, large emotional difference. | LOW-MEDIUM | `requestAnimationFrame` updating a CSS custom property `--candle-radius`. Noise via simple sine sums, not heavy math. **Disabled** under reduced-motion. |
| **Warm vignette + blueish dark periphery** | Pure black periphery feels like "loading screen". Slight desaturated blue (~#0a0c14) with grain texture feels like a *room at night*. The contrast with the warm candle does the emotional work. | LOW | Static SVG/PNG noise overlay at low opacity. Free. |
| **Polaroid swing physics (passive idle motion)** | Strings should breathe. Polaroids gently sway as if from air currents — different phases per polaroid, very small amplitude (1–3°). Stops when one is focused/hovered. | MEDIUM | CSS-only with staggered `@keyframes` and per-element `animation-delay`/`animation-duration` is **sufficient** and 60fps. Skip JS physics libs (overkill for 13 elements). |
| **Polaroid string "tug" on click** | When clicked, the polaroid briefly tilts toward the viewer (slight scale-up + de-rotate) before transitioning to open view. Sells the "I'm picking it off the line" metaphor. | LOW | 200ms transform pre-flip. |
| **Flip on the polaroid in-place, then expand to full view** | Two-stage: flip in the room → poem visible briefly → smooth expand to reading mode. More cinematic than instant modal. | MEDIUM-HIGH | FLIP-technique animation (First/Last/Invert/Play). Worth it; this is the showcase moment. **Single-stage fallback** under reduced-motion. |
| **Reading mode: paper texture + handwritten-feel margin notes (date)** | The date on each poem (e.g. "22/7/2025 | 17:38") rendered in a different weight/italic, off-axis, gives the back-of-polaroid feel. Almost no cost, large authenticity gain. | LOW | Just CSS. |
| **Swipe / arrow-key between polaroids while in open view** | Lets visitor drift through poems like flipping through a stack. Major UX upgrade once they are "inside". | MEDIUM | Track current index in URL hash (`#poem/3`); left/right arrows + touch swipe (hammerjs or simple touchstart/move/end). Updates browser history for deep-linkable poems. |
| **Arrival sequence: gate → brief darkness → first candle bloom → polaroids fade in along the strings** | The transition from gate to room is where wonder is created. ~2 second choreographed entrance, skippable, runs only once per session. | MEDIUM | `sessionStorage` flag. Keyframed sequence. Skip if reduced-motion (instant fade). |
| **Hidden "lit" easter polaroid** | One polaroid (the most personal) is positioned slightly out of the typical scan path, requiring the visitor to physically move the candle to a corner to find it. Rewards exploration; the recipient inevitably finds it and the "oh!" moment is the gift. | LOW | Just a layout choice + maybe a tiny `aria-label="ne manca una?"` Easter hint *only* visible to screen readers (because they can not see the room anyway, so it is a fair compensation). |
| **Per-poem mood tint** | Each poem subtly shifts the candle's warmth (cooler for "Silenzi", warmer for "Sincronizzati"). Microscopic but felt. | MEDIUM | Manifest field `mood: "cool"|"warm"|"neutral"`; alters CSS custom property on open view. |
| **Cursor leaves a faint warm trail (3–5 frames)** | The candle has been here. Reinforces the room as a physical space. | LOW | Position history → low-opacity afterimages. |
| **Deep-linkable poems (URL hash)** | Lets the recipient bookmark / send a single poem to themselves. | LOW | `#poem/<slug>` and on-load handler. |

### Anti-Features (Traps to Avoid in a Small Intimate Site)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Background music / ambient audio** | "Mood enhancement" — the obvious next move after dark room + candles. | Autoplay is blocked, "Click to play" button shatters intimacy on entry, headphones-off visitors get *nothing*, license risk on any sourced track, cognitive overload while reading poems. Audio competes with the reader's inner voice — and the entire point of a poem is the inner voice. | **Recommend NO.** If absolutely desired, single tiny "candle crackle" loop, default-off, toggle in corner, never autoplay. Document as deliberate restraint. |
| **Scroll-driven narrative ("scrollytelling")** | Pudding/NYT pattern. | Forces a single sequence on a non-linear emotional artifact. Poems are not a story arc. The *room* is the structure. | Free exploration in the room is the whole point. |
| **"Share to Twitter / WhatsApp" buttons** | Standard SPA boilerplate. | Site is private. Sharing breaks the gift's intimacy. The recipient may share — manually, by URL — and that is enough. | None. Omit entirely. |
| **Real authentication / accounts / per-user state** | "Make it secure". | Requires backend, contradicts GitHub Pages constraint, contradicts soft-gift framing. | Documented soft gate with one shared password. |
| **Comments / guestbook / "leave a poem"** | Engagement features by reflex. | Recipient is the audience, not a user. Comments invite outsiders; spam without backend. | None. |
| **Analytics (GA, Plausible, even self-hosted)** | "I want to know if she opened it." | Surveilling the gift recipient is creepy. Cookie banner adds friction. | If owner truly needs it: a single anonymous "first opened at" timestamp written to localStorage and surfaced *only* if the owner opens with `?owner=1`. Better: trust. |
| **Service worker / PWA / install prompt** | "Modern best practice". | Cache invalidation pain on a site that updates rarely; "Install Lulu?" prompt destroys mood. | None. Plain static. |
| **Loading spinner during initial preload of all images** | "Show progress". | Spinner says "loading", room says "atmosphere". Choose atmosphere. | Skeleton polaroids visible from frame 1, photos fade in as ready. The room is never "loading". |
| **Click-to-zoom into photo (separate from poem flip)** | "Photos are nice, let users see them big." | Adds a third interaction state on top of room+open. Visitor confused: is click "open" or "zoom"? | Open view shows photo at full clarity; pinch-zoom and A+ already cover further inspection. One click = one outcome. |
| **3D scene in WebGL / Three.js** | Bruno Simon envy. | 10× the bundle, mobile heat/battery, accessibility nightmare, breaks "intimate" register (becomes "tech demo"). | CSS 3D + masks deliver 90% of the feel at 5% of the cost. |
| **Heavy physics library for swing (Matter.js, etc.)** | "Real" swinging. | 50KB+, CPU on every frame for an effect users will not consciously notice. | Staggered CSS `@keyframes` per polaroid. Indistinguishable. |
| **Skip-link / "enter without animation" on every visit** | A11y reflex. | Arrival runs once per session by design; persistent skip is unneeded; reduced-motion handles the real case. | One-time arrival; respect reduced-motion; that is the contract. |
| **Internationalization scaffolding (i18n libs)** | "What if you add English later?" | Site is in Italian, content is Italian, Italianness is part of the register. Premature abstraction. | Italian only. Documented in PROJECT.md. |
| **Right-click disable / DRM / "protect the poems"** | "She is special, do not let people copy them." | Trivially defeated, accessibility-hostile (breaks "select to read aloud"), insulting to the recipient. | Trust. Soft gate is the only protection layer. Allow text selection. |
| **Service-side image optimization pipeline** | Imagemin, Sharp, etc. | 13–16 photos. Manual `cwebp` / `mozjpeg` once is fine. | Pre-process locally, commit optimized assets. |

---

## Feature Dependencies

```
[Password Gate]
    └──gates──> [Arrival Sequence]
                    └──reveals──> [Dark Room with Candle]
                                       ├──contains──> [Polaroid Strings]
                                       │                  ├──CSS swing──> [Idle Sway]
                                       │                  └──click──> [Polaroid "Tug"]
                                       │                                  └──triggers──> [Flip Animation]
                                       │                                                     └──expands to──> [Open / Reading View]
                                       │                                                                          ├──contains──> [Poem Typography]
                                       │                                                                          ├──navigation──> [Swipe / Arrow Keys]
                                       │                                                                          ├──navigation──> [URL Hash Deep-Link]
                                       │                                                                          └──exit via──> [ESC / Back / Close Button]
                                       └──cursor──> [Candle Light Mask]
                                                       ├──enhanced by──> [Flicker]
                                                       ├──enhanced by──> [Cursor Trail]
                                                       └──enhanced by──> [Per-Poem Mood Tint]

[A−/A+ Controls] ──enhances──> [Poem Typography], [Photo in Open View]
[Pinch Zoom (browser native)] ──enhances──> [Photo in Open View]
[prefers-reduced-motion] ──disables──> [Flicker], [Idle Sway], [Flip Animation core], [Arrival Sequence], [Cursor Trail]
[Focus Management] ──required by──> [Polaroid Keyboard Access], [Open View], [Modal Close Restore]

[Background Music] ──CONFLICTS──> [Intimate Reading Tone]
[Click-to-Zoom Photo] ──CONFLICTS──> [Polaroid Click → Open] (input ambiguity)
[Real Authentication] ──CONFLICTS──> [GitHub Pages Static Hosting Constraint]
```

### Dependency Notes

- **Open View requires Modal Infrastructure (focus trap, scroll lock, history state):** all four — focus restore, ESC, click-outside, popstate — must ship together or behavior feels half-built.
- **Swipe-Between-Polaroids requires URL Hash routing:** because it changes the "current poem" identity, deep-link must also change. Doing one without the other creates a broken back button.
- **Flip Animation requires backface-hidden + 3D context on a parent:** needs `transform-style: preserve-3d` set early; retrofitting later means restructuring the polaroid component.
- **Candle Cursor Mask requires a single full-viewport overlay element with `pointer-events: none`:** must coexist with polaroid clickability. Architectural decision belongs in foundation phase.
- **A−/A+ Controls require `rem`/`em`/`ch` discipline everywhere from day one:** retrofitting after px-based layouts means rewriting all CSS.
- **Reduced-Motion variant must be designed in parallel, not bolted on:** every animation needs a `@media (prefers-reduced-motion: reduce)` counterpart; if added late, the fallback experience will be broken or jarring.
- **Per-Poem Mood Tint depends on extended Manifest schema:** decide manifest shape early (`{ photo, poem, alt, mood?, position? }`); changing the schema after content is authored is painful.

---

## MVP Definition

### Launch With (v1) — The Core Promise

Everything required for the gift to *work* and *feel intentional*. Cut anything else.

- [ ] **Password gate** (single input, autofocus, error message, remember-me, 5-attempt throttle)
- [ ] **Italian-language UI strings + `<html lang="it">`**
- [ ] **Dark room with candle cursor** (warm radial gradient mask, soft falloff) + **touch variant**
- [ ] **Candle flicker** (subtle, reduced-motion-aware) — small cost, defines the aesthetic
- [ ] **Warm vignette + faint noise periphery** — prevents pure-black "loading screen" feel
- [ ] **Polaroid strings rendered from manifest** with **CSS-only idle sway**
- [ ] **Hover/focus lift + visible amber focus ring**
- [ ] **Click/Enter on polaroid → flip animation → open reading view**
- [ ] **Open view:** photo + poem with serif typography, max-width 36ch, line-height 1.65, paper-like background
- [ ] **Close: ESC + button + click-outside + browser back, with focus restore**
- [ ] **A−/A+ buttons** affecting both photo and poem text, reflowing layout
- [ ] **Pinch-zoom not blocked** (correct viewport meta)
- [ ] **`prefers-reduced-motion` variant**: no flicker, no swing, flip → crossfade, instant arrival
- [ ] **Per-polaroid alt text from manifest**
- [ ] **Skeleton placeholders + lazy-load** for photos beyond first viewport
- [ ] **Self-hosted serif web font, preloaded, `font-display: swap`** with size-adjust to prevent reflow
- [ ] **WCAG AA contrast in open view**

### Add After Validation (v1.x) — When First Owner+Recipient Round-Trip Confirms Core Works

- [ ] **Arrival sequence choreography** — high impact, but only after core is rock-solid; risk of breaking the entry path
- [ ] **Swipe / arrow-key between poems** + **URL hash deep links** — depends on stable open-view
- [ ] **Polaroid "tug" pre-flip animation** — polish layer
- [ ] **Cursor trail (warm afterimages)** — polish layer
- [ ] **Hidden easter polaroid placement** — only after layout is final
- [ ] **Per-poem mood tint** — requires manifest schema extension and re-authoring

### Future Consideration (v2+) — Probably Never, Documented for Honesty

- [ ] **Optional ambient audio toggle** — only if the recipient explicitly says "I wish there was music"; otherwise leave alone
- [ ] **A second "candle" / second visitor presence indicator** — fun but invites a backend
- [ ] **Print-friendly poem stylesheet** — interesting analog gesture, but tiny audience
- [ ] **Procedurally generated polaroid border/tape variations** — diminishing returns

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Password gate (full UX) | HIGH | LOW | **P1** |
| Candle cursor (mask + warm tint) | HIGH | MEDIUM | **P1** |
| Touch-light on mobile | HIGH | MEDIUM | **P1** |
| Polaroid display + idle sway (CSS) | HIGH | MEDIUM | **P1** |
| Flip to open view | HIGH | MEDIUM-HIGH | **P1** |
| Poem typography & reading view | HIGH | LOW | **P1** |
| Modal close stack (ESC/back/click-out/focus) | HIGH | MEDIUM | **P1** |
| A−/A+ + pinch-zoom not blocked | HIGH | LOW | **P1** |
| `prefers-reduced-motion` full coverage | HIGH | MEDIUM | **P1** |
| Skeleton + lazy-load images | MEDIUM | LOW | **P1** |
| Candle flicker | MEDIUM | LOW | **P1** |
| Vignette + noise periphery | MEDIUM | LOW | **P1** |
| Manifest-driven alt text | HIGH | LOW | **P1** |
| Arrival sequence | HIGH | MEDIUM | **P2** |
| Swipe / arrow-key navigation | MEDIUM | MEDIUM | **P2** |
| URL hash deep-links | MEDIUM | LOW | **P2** |
| Polaroid "tug" pre-flip | LOW | LOW | **P2** |
| Cursor trail | LOW | LOW | **P2** |
| Per-poem mood tint | LOW | MEDIUM | **P3** |
| Hidden easter polaroid | MEDIUM (for 1 person) | LOW | **P3** |
| Ambient audio | NEGATIVE | MEDIUM | **DO NOT BUILD** |
| Analytics | NEGATIVE | LOW | **DO NOT BUILD** |
| Share buttons | NEGATIVE | LOW | **DO NOT BUILD** |
| 3D / WebGL scene | LOW vs cost | HIGH | **DO NOT BUILD** |
| Physics library for swing | NONE vs CSS | MEDIUM | **DO NOT BUILD** |

---

## Specific Coverage of Asked Sub-Areas

### Password Gate UX
- **Single input** centered, type=password, `autocomplete="current-password"`, `enterkeyhint="go"`.
- **Autofocus on mount** (JS, not just HTML attribute — iOS quirk).
- **Error feedback**: inline `aria-live="polite"` text, gentle 200ms shake on input (skipped under reduced-motion). Tone: poetic, not technical ("non è la parola giusta", not "Error 401").
- **"Remember me"**: default-on for personal site; localStorage stores a hashed token derived from password (not the password). One-click "dimentica" link to clear.
- **Forgot-password message**: static line "se non la ricordi, chiedimela." — humanizes the gate.
- **Brute-force throttle**: 5 attempts → 30s lockout → exponential. Counter in localStorage so a refresh does not reset. Document explicitly: this is a *speed bump*, not security.
- **Hash**: SHA-256 of password + per-site salt embedded in code. Acknowledged-soft.

### Dark-Room Candle-Light Cursor
- **Mechanism**: full-viewport fixed overlay, `pointer-events: none`, `mask-image: radial-gradient(circle at var(--mx) var(--my), transparent 0, transparent 80px, black 280px)`. Background of overlay is dark. Underneath is the lit room.
- **Color temperature**: warm overlay layer (~`hsl(30 60% 50% / 0.15)`) blended with `mix-blend-mode: multiply` over the photos so revealed areas look candle-warm, not white-flashlight.
- **Falloff**: 80px hard core, gradient out to 280px (≈ 200px transition zone). Tweak in implementation.
- **Secondary flicker**: rAF loop adjusting `--candle-radius` ±6% on a smoothed-noise curve at ~10–12Hz perceived. Cheap.
- **Performance budget**: this overlay must stay GPU-composited (`will-change: mask-position` or `transform`). Total cursor cost should be well under 1ms/frame on mid-tier mobile. **No JS layout reads in the rAF loop.**
- **Reduced-motion**: flicker off, radius static.

### Polaroid Display
- **String physics vs CSS-only**: **CSS-only**. 13–16 elements with `@keyframes` sway (different durations 4–7s, different delays, amplitude 1–3°). Indistinguishable from physics for this scale; no JS, no layout thrash.
- **Hover lift**: `translateY(-6px) scale(1.03) rotate(...)` + stronger shadow + the candle revealing it more brightly does the rest.
- **Click affordance**: cursor changes to a slightly-larger candle "glow" on polaroid hover (CSS `cursor` cannot do this; signal via the lift + shadow instead).
- **Focus ring (keyboard)**: 2px amber outline + 2px offset, plus a subtle outer glow. Survives the dark.
- **Loading states**: skeleton (paper rectangle, no photo) appears at frame 1; photo crossfades in over 400ms when loaded. **Never** show a spinner inside the room.

### Polaroid Flip / Open View
- **Full-screen modal vs in-place**: **hybrid (FLIP technique)**. The polaroid flips in place (room visible), then animates/scales to a centered reading panel. Most cinematic; preserves spatial continuity.
- **Flip timing**: ~700ms ease-out for the rotateY; 400ms for the expand. Total under 1.2s.
- **Back-button behavior**: `history.pushState` on open, `popstate` listener closes. Browser back works as expected.
- **Swipe between polaroids**: while open, left/right swipe (touch) and ←/→ keys move to next/prev poem. Updates URL hash. Preloads neighbor.
- **Reduced-motion**: skip flip; crossfade photo→poem in place, then crossfade to expanded panel.

### Poem Reading View
- **Typography**: serif (Cormorant Garamond / EB Garamond / Lora). Italic for the date. Title in slightly larger weight.
- **Line-height**: 1.6–1.7 (poems need air).
- **Max-width**: 32–38ch — poems are line-broken by the author; do not let them re-wrap aggressively.
- **Background**: warm off-white / cream paper texture (low-res repeating SVG noise).
- **Copy/select**: **enabled**. Do not block selection. The recipient may want to copy a line.
- **Share-disabled**: no share UI. URL deep-link is the only "share" — manual, deliberate.
- **Whitespace preservation**: render poem with `white-space: pre-wrap` (preserves the author's deliberate line breaks from `poems.txt`).

### Zoom & Accessibility
- **Pinch**: native, viewport allows it.
- **A−/A+**: adjusts root font-size from ~14px → 24px in 5 steps. Layout in `rem`/`em`/`ch` reflows correctly.
- **Reflow on text zoom**: WCAG 1.4.10 — at 200% zoom, no horizontal scroll, no clipping. Tested via browser zoom + the A+ control.
- **Color contrast**: lit polaroid edges + open view text both ≥ 4.5:1. Dark periphery is decorative; no critical text lives there.
- **Screen-reader narration**: each polaroid is a `<button>` with `aria-label="<poem-title>, <date> — apri per leggere"`. Open view uses `<article role="dialog" aria-modal="true" aria-labelledby="poem-title">`. Poem rendered with semantic `<h2>`, `<time>`, `<p>` (or `<pre>` to preserve linebreaks while still being read by SRs — test).
- **Keyboard tab order**: gate → enter → polaroids in visual reading order (top-left → bottom-right by position). Tab skips decorative overlays.
- **Reduced-motion variant**: documented above; covers flicker, swing, flip, arrival, trail.

### Mobile Experience
- **Touch-light**: `touchmove` updates `--mx`/`--my` exactly like mouse; light persists 500ms after `touchend` so user can lift finger to read.
- **Pinch-zoom**: native, not blocked.
- **Orientation**: layout reflows; strings re-flow on resize. No locks.
- **Touch targets**: polaroids ≥ 44×44 CSS px even in dense layouts.
- **Gesture conflicts**: swipe-between-poems must not conflict with pinch-zoom — only handle horizontal swipe when scale = 1.

### Loading & Performance
- **Skeleton polaroids**: rendered at frame 1, before any image fetch.
- **Image strategy**: first 6 polaroids `loading="eager"` + `fetchpriority="high"`, rest `loading="lazy"`. `decoding="async"` on all.
- **Low-quality placeholder**: blurhash or 20-pixel base64 thumbnail in manifest, blurred and crossfaded out when full image loads. Cheap, classy.
- **Format**: WebP with JPEG fallback (or AVIF if owner's tooling supports). `<picture>` element.
- **Fonts**: self-host, preload, `font-display: swap` with size-adjust to prevent CLS.
- **Total budget**: initial transfer < 600KB (HTML/CSS/JS/font); photos stream in. App should be interactive within 1.5s on mid-tier mobile on 4G.

### Audio (Deliberate Recommendation)
**Recommend: NO.** Reasons:
1. Autoplay is browser-blocked; required gesture-to-start fragments the entry magic.
2. Headphones-off visitors get nothing → audio cannot be central to the experience anyway.
3. Reading poems is an inner-voice activity; ambient music actively interferes with that voice.
4. License management for any sourced track adds operational overhead disproportionate to gain.
5. The "dark room" trope already implies silence; silence is a feature, not an absence.

If the owner insists later: a single short candle-crackle loop, default-off, persistent toggle in a corner, never autoplay, fade in/out 1s. Not v1.

### Easter Eggs / Hidden Poem / Arrival Sequence
- **Arrival sequence (P2)**: gate-success → fade-to-black (300ms) → first candle bloom at center (600ms) → polaroids fade in along strings with stagger (800ms total). Once per session. Skipped under reduced-motion.
- **Hidden polaroid (P3)**: place the most personal poem slightly outside the typical scan path (e.g. lower-right corner, partly shadowed) so the recipient must actively explore with the candle to find it. The "discovery" is the gift.
- **Konami-style easter egg**: not recommended — breaks register. The hidden polaroid *is* the easter egg.

---

## Competitor / Reference Feature Analysis

| Feature | It's Nice That portfolios | Bruno Simon | Pudding/NYT interactive | **Lulu's Approach** |
|---------|---------------------------|-------------|-------------------------|---------------------|
| Entry experience | Direct, no gate | Direct, scene loads | Scrolly intro | Password gate → arrival sequence (gift framing) |
| Cursor | Standard or subtle custom | 3D world physics | Standard | Warm candle mask + flicker (signature element) |
| Content reveal | Grid scroll | Free 3D exploration | Linear scroll | Free exploration in dark room with candle |
| Item interaction | Click → page nav | Click → object reaction | Scroll-triggered | Click → flip → reading view |
| Typography focus | High (editorial) | Low (atmospheric) | High (long-form) | High (poems are payload) |
| Audio | None | Minimal | Often present, muted-by-default | None (deliberate) |
| Tech stack | Mostly CMS/static | Three.js | React + custom | Vue 3 + Vite + plain CSS/Web APIs |
| Asset weight | 1–3MB | 10–30MB | 5–10MB | Target < 3MB total |
| Accessibility | Good | Poor (3D) | Mixed | Strong (zoom, reduced-motion, keyboard, SR) |
| Mood register | Refined, professional | Playful, technical | Editorial, serious | Intimate, melancholic, personal |

---

## Sources

- [Spotlight Reveal with Cursor Hover Animation (Webflow)](https://webflow.com/made-in-webflow/website/spotlight-reveal-effect-with-hover) — radial-gradient mask reveal pattern
- [Create a Spotlight effect with CSS and JavaScript or GSAP (DEV)](https://dev.to/vanaf1979/create-a-spotlight-effect-with-css-and-javascript-or-gsap-3mp) — implementation reference
- [Dynamic CSS Masks with Custom Properties and GSAP (Codrops)](https://tympanus.net/codrops/2021/05/04/dynamic-css-masks-with-custom-properties-and-gsap/) — performance pattern for cursor-driven masks
- [Revealing Images With CSS Mask Animations (Smashing Magazine)](https://www.smashingmagazine.com/2023/09/revealing-images-css-mask-animations/) — mask browser support and prefixes
- [Flip Cards — Code: Accessible](https://codeaccessible.com/codepatterns/flip-cards/) — keyboard + ARIA patterns for flip cards
- [Flip Card Keyboard Focus for Accessibility (Themeco)](https://theme.co/forum/t/flip-card-keyboard-focus-for-accessibility/87503) — focus management on flip
- [Inclusive Components: Cards (Heydon Pickering)](https://inclusive-components.design/cards/) — clickable card patterns, focus, semantics
- [Accessible Front-End Components (Smashing Magazine)](https://www.smashingmagazine.com/2021/03/complete-guide-accessible-front-end-components/) — modal, focus trap, dialog patterns
- [WCAG 2.1 SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html) — text-zoom reflow requirement
- PROJECT.md (this repo) — scope, constraints, and tone authority
- poems.txt (this repo) — content register confirming intimate/melancholic tone

---

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Accessibility table-stakes | HIGH | WCAG / WAI-ARIA are well-established; flip-card and modal patterns are documented |
| Candle cursor implementation | HIGH | Multiple authoritative tutorials confirm radial-gradient mask + CSS custom property pattern; we add the warm-flicker layer |
| Polaroid swing CSS-only viability | HIGH | 13–16 elements is trivially within CSS animation budget |
| Audio recommendation (NO) | MEDIUM | Taste-driven; defensible with autoplay-policy + reading-cognition reasoning |
| Hidden-easter-polaroid placement | MEDIUM | Speculative UX; depends on final layout |
| Per-poem mood tint impact | LOW | Untestable without recipient feedback; tagged P3 accordingly |
| Anti-feature list (no audio/analytics/share) | HIGH | Strongly aligned with documented PROJECT.md scope and "out of scope" entries |

---

*Feature research for: Interactive personal poetry & photo microsite (Lulu)*
*Researched: 2026-05-02*
