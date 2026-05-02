<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { getPoem } from '@/data/poems'
import ZoomControls from '@/components/ZoomControls.vue'

const route = useRoute()
const router = useRouter()
const reducedMotion = useReducedMotion()

const slug = computed(() => String(route.params.slug ?? ''))
const poem = computed(() => getPoem(slug.value))

const flipped = ref(false)
const entered = ref(false)
const baseUrl = import.meta.env.BASE_URL

function close(): void {
  void router.push({ name: 'home' })
}

function flip(): void {
  flipped.value = !flipped.value
}

function onCardKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    flip()
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

function onBackdropClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) close()
}

const stanzas = computed(() =>
  (poem.value?.body ?? '').split(/\n\s*\n/).filter(Boolean),
)

onMounted(() => {
  window.addEventListener('keydown', onKey)
  void nextTick(() => {
    entered.value = true
  })
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main
    class="pview"
    :data-rm="reducedMotion ? 'true' : 'false'"
    :data-flipped="flipped ? 'true' : 'false'"
    :data-entered="entered ? 'true' : 'false'"
    :aria-label="poem ? `${poem.title}, ${poem.date}` : 'polaroid'"
    @click="onBackdropClick"
  >
    <div class="pview__atmosphere" aria-hidden="true">
      <div class="pview__bg"></div>
      <div class="pview__vignette"></div>
      <div class="pview__grain"></div>
    </div>

    <button
      class="pview__back"
      type="button"
      aria-label="torna alla stanza"
      @click="close"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path
          d="M 28 12 L 16 24 L 28 36 M 16 24 L 38 24"
          stroke="currentColor"
          stroke-width="2.4"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div class="pview__controls">
      <ZoomControls />
    </div>

    <div class="pview__stage" @click.stop>
      <!-- Card is a div with role=button so we can put DIVs inside (HTML
           buttons can only contain phrasing content; nesting block-level 3D
           transforms inside <button> breaks backface-visibility on iOS). -->
      <div
        class="pview__card"
        :class="{ 'pview__card--flipped': flipped }"
        role="button"
        tabindex="0"
        :aria-pressed="flipped"
        :aria-label="flipped ? 'mostra la foto' : 'gira la polaroid per leggere la poesia'"
        @click="flip"
        @keydown="onCardKey"
      >
        <!-- FRONT — la foto -->
        <div class="pview__face pview__face--front">
          <div class="pview__photo">
            <img
              v-if="poem"
              :src="`${baseUrl}photos/${poem.file}`"
              :alt="poem.alt ?? poem.title"
              decoding="async"
            />
            <span class="pview__shine" aria-hidden="true"></span>
          </div>
          <div class="pview__caption">
            <span class="pview__caption-title">{{ poem ? poem.title : '' }}</span>
            <span class="pview__caption-date">{{ poem ? poem.date : '' }}</span>
          </div>
          <div class="pview__peel" aria-hidden="true">
            <div class="pview__peel-corner"></div>
            <div class="pview__peel-hint">gira</div>
          </div>
        </div>

        <!-- BACK — la poesia -->
        <div class="pview__face pview__face--back">
          <article class="pview__poem">
            <header class="pview__poem-header">
              <h1 class="pview__poem-title">{{ poem ? poem.title : '' }}</h1>
              <p class="pview__poem-date">{{ poem ? poem.date : '' }}</p>
            </header>
            <div class="pview__poem-body">
              <p
                v-for="(stanza, i) in stanzas"
                :key="i"
                class="pview__poem-stanza"
                :style="{ '--stanza-i': i }"
              >
                <template
                  v-for="(line, j) in stanza.split('\n')"
                  :key="j"
                >
                  {{ line
                  }}<br v-if="j < stanza.split('\n').length - 1" />
                </template>
              </p>
            </div>
          </article>
          <div class="pview__peel pview__peel--back" aria-hidden="true">
            <div class="pview__peel-corner"></div>
            <div class="pview__peel-hint">foto</div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.pview {
  /* Single dimension for both faces — front photo + caption fits, back poem
     has overflow-y inside. Removing the per-face dimension morph stabilises
     the 3D layer on iOS Safari (was a contributor to the "see the front
     mirrored on flip" bug). */
  --card-w: clamp(18rem, 62vw, 28rem);
  --card-h: clamp(26rem, 78dvh, 42rem);
  --card-photo-h: calc(var(--card-w) * 0.95);
  --grain-opacity: 0.045;
  --vignette-strength: 0.85;
  --flip-duration: 1100ms;
  --flip-half: 550ms;
  --flip-ease: cubic-bezier(0.83, 0, 0.17, 1);
  --enter-duration: 850ms;
  --enter-ease: cubic-bezier(0.16, 1, 0.3, 1);
}

.pview {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--c-soot-900);
  color: var(--c-paper-100);
}

.pview__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.pview__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 30% 18% at 50% 105%,
      rgba(244, 208, 138, 0.08) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 80% 70% at 50% 35%,
      var(--c-soot-700) 0%,
      var(--c-soot-800) 55%,
      var(--c-soot-900) 100%
    );
}
.pview__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 70% 60% at 50% 50%,
    rgba(0, 0, 0, 0) 30%,
    rgba(0, 0, 0, calc(0.55 * var(--vignette-strength))) 75%,
    rgba(0, 0, 0, calc(0.85 * var(--vignette-strength))) 100%
  );
}
.pview__grain {
  position: absolute;
  inset: -10%;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 180px 180px;
  opacity: var(--grain-opacity);
  mix-blend-mode: overlay;
}

/* ── BACK ARROW ── */
.pview__back {
  position: fixed;
  z-index: 10;
  top: clamp(var(--sp-sm), 2.5vh, var(--sp-lg));
  left: clamp(var(--sp-sm), 2.5vw, var(--sp-lg));
  appearance: none;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(244, 208, 138, 0.28);
  border-radius: 50%;
  color: rgba(233, 223, 201, 0.88);
  cursor: pointer;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition:
    background 240ms ease-out,
    border-color 240ms ease-out,
    color 240ms ease-out,
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 320ms ease-out;
  box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.6);
}
@media (min-width: 768px) {
  .pview__back {
    width: 4rem;
    height: 4rem;
  }
}
.pview__back svg {
  width: 60%;
  height: 60%;
  display: block;
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
.pview__back:hover,
.pview__back:focus-visible {
  background: rgba(0, 0, 0, 0.7);
  border-color: var(--c-focus);
  color: var(--c-paper-100);
  transform: translateX(-3px) scale(1.05);
  box-shadow:
    0 10px 28px -4px rgba(0, 0, 0, 0.75),
    0 0 24px 4px rgba(244, 208, 138, 0.32);
}
.pview__back:hover svg,
.pview__back:focus-visible svg {
  transform: translateX(-4px);
  animation: pview-arrow-pulse 1.4s ease-in-out infinite;
}
@keyframes pview-arrow-pulse {
  0%, 100% { transform: translateX(-4px); }
  50% { transform: translateX(-7px); }
}
.pview__back:active {
  transform: translateX(-2px) scale(0.96);
}
.pview__back:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 4px;
}

.pview__controls {
  position: fixed;
  z-index: 10;
  top: clamp(var(--sp-sm), 2vh, var(--sp-md));
  right: clamp(var(--sp-sm), 2vw, var(--sp-md));
}

/* ── STAGE ── */
.pview__stage {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: clamp(4.5rem, 12vh, 7rem) var(--sp-md) clamp(2rem, 5vh, 3rem);
  perspective: 1800px;
}

/* ── CARD (div+role=button so 3D faces work on iOS) ── */
.pview__card {
  position: relative;
  width: var(--card-w);
  height: var(--card-h);
  max-height: calc(100dvh - 10rem);
  cursor: pointer;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition:
    transform var(--flip-duration) var(--flip-ease),
    filter 400ms ease-out;
  filter: drop-shadow(0 24px 48px rgba(0, 0, 0, 0.7));
  outline: none;
}

/* Enter animation */
.pview[data-entered='false'] .pview__card {
  opacity: 0;
  transform: rotateY(0deg) scale(0.4) translateY(28vh) rotate(-8deg);
}
.pview[data-entered='true'] .pview__card {
  opacity: 1;
  transform: rotateY(0deg) scale(1) translateY(0) rotate(0deg);
  transition:
    opacity var(--enter-duration) var(--enter-ease),
    transform var(--enter-duration) var(--enter-ease);
}
.pview[data-entered='true'] .pview__card.pview__card--flipped {
  transform: rotateY(180deg);
  transition: transform var(--flip-duration) var(--flip-ease);
}

@media (hover: hover) and (pointer: fine) {
  .pview__card:hover:not(.pview__card--flipped) {
    filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.85))
      drop-shadow(0 0 32px rgba(244, 208, 138, 0.18));
  }
  .pview__card:hover:not(.pview__card--flipped) .pview__photo img {
    filter: brightness(1.05) contrast(1.1);
    transform: scale(1.04);
  }
}

.pview__card:focus-visible .pview__face {
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.35),
    0 28px 56px -10px rgba(0, 0, 0, 0.9),
    0 6px 14px -2px rgba(0, 0, 0, 0.6),
    0 0 0 3px var(--c-focus);
}

/* ── FACES — divs with bulletproof 3D guards ──
 * iOS Safari has a long-standing bug where backface-visibility:hidden alone
 * isn't reliable when faces share the same Z plane. Three-layer guard:
 *   1. backface-visibility (the spec'd way)
 *   2. translateZ(1px) on the front to lift it above the back, removing
 *      z-fighting; back has translateZ(0) so it sits behind
 *   3. opacity-swap synchronized with the flip midpoint as a hard safety net
 *      (each face becomes opacity:0 when it's pointing AWAY from the viewer)
 */
.pview__face {
  position: absolute;
  inset: 0;
  display: block;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  will-change: transform, opacity;
  border-radius: 1px;
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.3),
    0 24px 50px -10px rgba(0, 0, 0, 0.85),
    0 6px 14px -2px rgba(0, 0, 0, 0.55);
  /* opacity transitions instantly at the flip midpoint */
  transition:
    box-shadow 320ms ease-out,
    opacity 0s linear var(--flip-half, 550ms);
}

/* FRONT — translateZ(1px) lifts above back to prevent z-fighting */
.pview__face--front {
  background: linear-gradient(to bottom, #f4ecd6 0%, var(--c-paper-100) 35%, #ddd0b0 100%);
  padding: 6% 6% 0 6%;
  transform: translateZ(1px);
  -webkit-transform: translateZ(1px);
  opacity: 1;
}
/* SAFETY NET — when card flipped, front becomes opacity 0 at flip midpoint
   so even if backface-visibility fails on iOS, you can't see the front. */
.pview__card--flipped .pview__face--front {
  opacity: 0;
}
.pview__face--front::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='17' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
  background-size: 200px 200px;
  opacity: 0.06;
  mix-blend-mode: multiply;
  pointer-events: none;
  border-radius: inherit;
}

.pview__photo {
  position: relative;
  display: block;
  width: 100%;
  height: var(--card-photo-h);
  background: var(--c-soot-800);
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(0, 0, 0, 0.5);
}
.pview__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: brightness(0.95) contrast(1.05);
  transition:
    filter 400ms ease-out,
    transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
}
.pview__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.16) 0%,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0) 70%,
    rgba(0, 0, 0, 0.12) 100%
  );
  pointer-events: none;
  mix-blend-mode: screen;
}

.pview__caption {
  position: relative;
  display: block;
  text-align: center;
  padding: 6% 4% 0;
  color: var(--c-ink-700);
}
.pview__caption-title {
  display: block;
  font:
    400 clamp(0.95rem, 1.4vw + 0.5rem, 1.5rem) / 1.2 'Cormorant Garamond',
    serif;
}
.pview__caption-date {
  display: block;
  margin-top: 0.25rem;
  font:
    400 clamp(0.75rem, 0.9vw + 0.4rem, 0.95rem) / 1.2 'Cormorant Garamond',
    serif;
  font-style: italic;
  opacity: 0.65;
}

/* ── PEEL HINT ── */
.pview__peel {
  position: absolute;
  top: 0;
  right: 0;
  width: 4.5rem;
  height: 4.5rem;
  pointer-events: none;
  z-index: 2;
}
.pview__peel-corner {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    225deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(58, 44, 28, 0.6) 35%,
    transparent 60%
  );
  clip-path: polygon(100% 0%, 100% 100%, 0% 0%);
  opacity: 0.35;
  transform: scale(0.7) rotate(0deg);
  transform-origin: 100% 0%;
  transition:
    opacity 320ms ease-out,
    transform 360ms cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(-2px 2px 4px rgba(0, 0, 0, 0.5));
}
.pview__peel-hint {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  font:
    400 1.4rem / 1 'Italianno',
    cursive;
  color: var(--c-paper-100);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  opacity: 0;
  transform: translate(0.4rem, -0.4rem) rotate(8deg);
  transition:
    opacity 320ms ease-out,
    transform 360ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (hover: hover) and (pointer: fine) {
  .pview__card:hover .pview__peel-corner {
    opacity: 1;
    transform: scale(1.1) rotate(-2deg);
  }
  .pview__card:hover .pview__peel-hint {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg);
  }
}
@media (pointer: coarse) {
  .pview__peel-corner {
    opacity: 0.7;
    transform: scale(1) rotate(0deg);
  }
  .pview__peel-hint {
    opacity: 0.85;
    transform: translate(0, 0) rotate(0deg);
  }
}

/* BACK — rotateY(180deg) so it faces the viewer when card itself rotates 180.
   translateZ(0) keeps it BEHIND the front, so when card is unflipped you
   can't see it. opacity 0 initially is the safety net for iOS. */
.pview__face--back {
  background: linear-gradient(to bottom, #f0e6d0 0%, var(--c-paper-100) 35%, #e3d6b8 100%);
  transform: rotateY(180deg) translateZ(1px);
  -webkit-transform: rotateY(180deg) translateZ(1px);
  padding: clamp(var(--sp-md), 3vw, var(--sp-2xl));
  display: flex;
  flex-direction: column;
  opacity: 0;
}
/* SAFETY NET — when flipped, back fades to opacity 1 at midpoint */
.pview__card--flipped .pview__face--back {
  opacity: 1;
}
.pview__face--back::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='lp'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='13' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23lp)'/></svg>");
  background-size: 220px 220px;
  opacity: 0.08;
  mix-blend-mode: multiply;
  pointer-events: none;
  border-radius: inherit;
}
.pview__peel--back {
  top: 0;
  left: 0;
  right: auto;
}
.pview__peel--back .pview__peel-corner {
  background: linear-gradient(
    -45deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(58, 44, 28, 0.6) 35%,
    transparent 60%
  );
  clip-path: polygon(0% 0%, 0% 100%, 100% 0%);
  transform-origin: 0% 0%;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
}
.pview__peel--back .pview__peel-hint {
  left: 0.55rem;
  right: auto;
  transform: translate(-0.4rem, -0.4rem) rotate(-8deg);
}

.pview__poem {
  position: relative;
  z-index: 1;
  color: var(--c-ink-900);
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.pview__poem-header {
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vh, 1rem);
  padding-bottom: var(--sp-sm);
  border-bottom: 1px solid rgba(58, 44, 28, 0.18);
  flex: 0 0 auto;
}
.pview__poem-title {
  margin: 0;
  font:
    500 clamp(1.2rem, 1.7vw + 0.7rem, 1.85rem) / 1.2 'Cormorant Garamond',
    serif;
  letter-spacing: 0.01em;
}
.pview__poem-date {
  margin: 0.25rem 0 0;
  font:
    400 clamp(0.75rem, 0.8vw + 0.4rem, 0.95rem) / 1.3 'Cormorant Garamond',
    serif;
  font-style: italic;
  color: var(--c-ink-700);
  opacity: 0.7;
}

.pview__poem-body {
  font:
    400 clamp(0.92rem, 0.9vw + 0.55rem, 1.18rem) / 1.65 'Cormorant Garamond',
    serif;
  letter-spacing: 0.005em;
  text-align: center;
  flex: 1 1 auto;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 var(--sp-xs);
}
.pview__poem-body::-webkit-scrollbar {
  display: none;
}
.pview__poem-stanza {
  margin: 0 0 var(--sp-md);
  opacity: 0;
}
.pview__card--flipped .pview__poem-stanza {
  animation: pview-stanza-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(550ms + var(--stanza-i, 0) * 110ms);
}
@keyframes pview-stanza-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.pview__poem-stanza:last-child {
  margin-bottom: 0;
}

/* reduced-motion — instant face swap, no 3D rotation */
@media (prefers-reduced-motion: reduce) {
  .pview__card {
    transition: none !important;
    transform: none !important;
  }
  .pview[data-entered='false'] .pview__card,
  .pview[data-entered='true'] .pview__card,
  .pview[data-entered='true'] .pview__card.pview__card--flipped {
    opacity: 1;
    transform: none !important;
  }
  .pview__face {
    transition: none !important;
  }
  .pview__face--back {
    transform: none !important;
    -webkit-transform: none !important;
  }
  /* show only the active face, not via rotation */
  .pview__card:not(.pview__card--flipped) .pview__face--back {
    opacity: 0 !important;
    visibility: hidden;
  }
  .pview__card--flipped .pview__face--front {
    opacity: 0 !important;
    visibility: hidden;
  }
  .pview__poem-stanza {
    opacity: 1 !important;
    animation: none !important;
    transform: none !important;
  }
  .pview__back svg {
    animation: none !important;
  }
}
</style>
