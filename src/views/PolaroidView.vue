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

/** Click anywhere in main = close, unless the event was stopped by the card,
 *  back button, or zoom controls (each calls .stop() on their own handlers). */
function onBackdropClick(): void {
  close()
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
    <!-- atmosphere: pitch black, single warm radial from below-center,
         subtle filmic grain over everything -->
    <div class="pview__atmosphere" aria-hidden="true">
      <div class="pview__warm"></div>
      <div class="pview__vignette"></div>
      <div class="pview__grain"></div>
    </div>

    <!-- vintage brass back button -->
    <button
      class="pview__back"
      type="button"
      aria-label="torna alla stanza"
      @click.stop="close"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path
          d="M 28 12 L 16 24 L 28 36 M 16 24 L 38 24"
          stroke="currentColor"
          stroke-width="2.2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div class="pview__controls" @click.stop>
      <ZoomControls />
    </div>

    <!-- stage with perspective; card-inner does the 3D rotation.
         Stage itself does NOT stop click — only the card does. So clicking
         the empty area around the card bubbles up to <main> and closes. -->
    <div class="pview__stage">
      <div
        class="pview__card"
        role="button"
        tabindex="0"
        :aria-pressed="flipped"
        :aria-label="flipped ? 'mostra la foto' : 'gira la polaroid per leggere la poesia'"
        @click.stop="flip"
        @keydown="onCardKey"
      >
        <div class="pview__inner" :class="{ 'pview__inner--flipped': flipped }">
          <!-- FRONT — la foto -->
          <div class="pview__face pview__face--front">
            <div class="pview__photo">
              <img
                v-if="poem"
                :src="`${baseUrl}photos/${poem.file}`"
                :alt="poem.alt ?? poem.title"
                decoding="async"
              />
              <div class="pview__photo-grain" aria-hidden="true"></div>
              <div class="pview__photo-vignette" aria-hidden="true"></div>
            </div>
            <div class="pview__caption">
              <span class="pview__caption-title">{{ poem ? poem.title : '' }}</span>
              <span class="pview__caption-date">{{ poem ? poem.date : '' }}</span>
            </div>
            <!-- subtle book-spine shadow on right edge: hint for flip -->
            <div class="pview__spine" aria-hidden="true"></div>
          </div>

          <!-- BACK — la poesia su carta scritta a mano -->
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
                  :class="{ 'pview__poem-stanza--first': i === 0 }"
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
            <!-- mirrored book-spine on left for symmetry -->
            <div class="pview__spine pview__spine--back" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.pview {
  --card-w: clamp(18rem, 60vw, 26rem);
  --card-h: clamp(26rem, 80dvh, 40rem);
  --card-photo-h: calc(var(--card-w) * 0.96);
  --grain-opacity: 0.06;
  --vignette-strength: 0.92;
  --warm-strength: 0;
  --flip-duration: 1000ms;
  --flip-ease: cubic-bezier(0.7, 0, 0.3, 1);
  --enter-duration: 900ms;
  --enter-ease: cubic-bezier(0.18, 1, 0.32, 1);
}
.pview[data-flipped='true'] {
  --warm-strength: 1;
}

.pview {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #050402;
  color: var(--c-paper-100);
}

/* ── atmosphere ── */
.pview__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
/* warm wash that intensifies when card is flipped (suggests candle approached) */
.pview__warm {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 55%,
    rgba(232, 176, 87, calc(0.18 * var(--warm-strength))) 0%,
    rgba(168, 90, 58, calc(0.08 * var(--warm-strength))) 35%,
    transparent 70%
  );
  transition: background 800ms cubic-bezier(0.4, 0, 0.2, 1);
}
.pview__vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 60% 50% at 50% 50%,
      rgba(0, 0, 0, 0) 28%,
      rgba(0, 0, 0, calc(0.6 * var(--vignette-strength))) 70%,
      rgba(0, 0, 0, calc(0.95 * var(--vignette-strength))) 100%
    ),
    linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.55) 100%);
}
.pview__grain {
  position: absolute;
  inset: -10%;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0 0.74  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 220px 220px;
  opacity: var(--grain-opacity);
  mix-blend-mode: overlay;
}

/* ── back button: small square brass badge with engraved arrow ── */
.pview__back {
  position: fixed;
  z-index: 10;
  top: clamp(0.75rem, 2.5vh, 1.5rem);
  left: clamp(0.75rem, 2.5vw, 1.5rem);
  appearance: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  width: 3rem;
  height: 3rem;
  background: linear-gradient(
    160deg,
    #6b5635 0%,
    #4a3a22 40%,
    #2c2110 70%,
    #1a140c 100%
  );
  border-radius: 3px;
  color: rgba(232, 220, 192, 0.78);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 1px 0 rgba(232, 200, 130, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.7),
    inset 1px 0 0 rgba(232, 200, 130, 0.18),
    inset -1px 0 0 rgba(0, 0, 0, 0.5),
    0 4px 10px -2px rgba(0, 0, 0, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.5);
  transition:
    background 320ms ease-out,
    color 320ms ease-out,
    transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 280ms ease-out;
}
@media (min-width: 768px) {
  .pview__back {
    width: 3.4rem;
    height: 3.4rem;
  }
}
.pview__back svg {
  width: 60%;
  height: 60%;
  display: block;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.6));
  transition: transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
.pview__back::before {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 2px;
  border: 0.5px solid rgba(232, 200, 130, 0.18);
  pointer-events: none;
}
.pview__back:hover,
.pview__back:focus-visible {
  background: linear-gradient(
    160deg,
    #826a44 0%,
    #5c4830 40%,
    #382a16 70%,
    #1f1810 100%
  );
  color: rgba(248, 232, 198, 0.95);
  transform: translateX(-2px);
  box-shadow:
    inset 0 1px 0 rgba(248, 220, 160, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.7),
    inset 1px 0 0 rgba(248, 220, 160, 0.25),
    inset -1px 0 0 rgba(0, 0, 0, 0.5),
    0 8px 18px -4px rgba(0, 0, 0, 0.8),
    0 0 18px 2px rgba(232, 176, 87, 0.22);
}
.pview__back:hover svg {
  transform: translateX(-3px);
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

/* ── stage: perspective applied here; card aligned higher in viewport ── */
.pview__stage {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(4rem, 9vh, 5.5rem) var(--sp-md) clamp(1rem, 3vh, 2rem);
  perspective: 1800px;
  -webkit-perspective: 1800px;
}

/* outer card: holds dimensions + handles enter animation; NOT 3D itself */
.pview__card {
  position: relative;
  width: var(--card-w);
  height: var(--card-h);
  max-height: calc(100dvh - 8rem);
  cursor: pointer;
  outline: none;
  filter: drop-shadow(0 28px 56px rgba(0, 0, 0, 0.75))
    drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
}

/* ENTER — polaroid "approaches": starts tiny + blurred from far away,
   grows toward viewer with a gentle wobble, settles slightly oversized then
   relaxes to 1× (overshoot bounce). Cinematic, not mechanical. */
.pview[data-entered='false'] .pview__card {
  opacity: 0;
  transform: scale(0.18) rotate(-4deg);
  filter: blur(8px) drop-shadow(0 28px 56px rgba(0, 0, 0, 0.75));
}
.pview[data-entered='true'] .pview__card {
  opacity: 1;
  transform: scale(1) rotate(0deg);
  filter: blur(0) drop-shadow(0 28px 56px rgba(0, 0, 0, 0.75))
    drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
  animation: pview-approach 1100ms cubic-bezier(0.22, 1, 0.36, 1) 1;
}
@keyframes pview-approach {
  0% {
    opacity: 0;
    transform: scale(0.18) rotate(-4deg);
    filter: blur(8px);
  }
  40% {
    opacity: 0.85;
    transform: scale(0.7) rotate(-1.5deg);
    filter: blur(2px);
  }
  72% {
    opacity: 1;
    transform: scale(1.06) rotate(0.6deg);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    filter: blur(0);
  }
}

@media (hover: hover) and (pointer: fine) {
  .pview__card:hover {
    filter: drop-shadow(0 32px 64px rgba(0, 0, 0, 0.85))
      drop-shadow(0 0 36px rgba(244, 208, 138, 0.16));
  }
}

.pview__card:focus-visible .pview__inner {
  box-shadow: 0 0 0 3px var(--c-focus);
}

/* inner element handles 3D flip */
.pview__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition: transform var(--flip-duration) var(--flip-ease);
}
.pview__inner--flipped {
  transform: rotateY(180deg) translateZ(0);
}
/* slight tilt + lift on flip — feels like card is lifted toward viewer */
.pview[data-rm='false'] .pview__inner--flipped {
  transform: rotateY(180deg) rotateX(-2deg) translateZ(8px);
}

/* ── faces: standard 3D-flip pattern, trust backface-visibility ── */
.pview__face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 1px;
  overflow: hidden;
}

/* FRONT — polaroid with cream-tinted frame, photo with film treatment */
.pview__face--front {
  background: linear-gradient(170deg, #f7efd8 0%, #ede2c4 50%, #d8c8a4 100%);
  padding: 5% 5% 0 5%;
  box-shadow:
    inset 0 1px 0 rgba(255, 250, 225, 0.6),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}
.pview__face--front::before {
  /* paper grain on the frame */
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='17' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.05  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.07;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.pview__photo {
  position: relative;
  width: 100%;
  height: var(--card-photo-h);
  background: #0e0a05;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.55),
    inset 0 2px 6px rgba(0, 0, 0, 0.55),
    inset 0 -2px 4px rgba(0, 0, 0, 0.35);
}
.pview__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: brightness(0.92) contrast(1.06) saturate(0.92);
  transition: filter 600ms ease-out, transform 1000ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (hover: hover) and (pointer: fine) {
  .pview__card:hover:not(:has(.pview__inner--flipped)) .pview__photo img,
  .pview__card:hover .pview__photo img {
    filter: brightness(1) contrast(1.1) saturate(1);
    transform: scale(1.025);
  }
}
.pview__photo-grain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='fg'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='3' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23fg)'/></svg>");
  background-size: 160px 160px;
  opacity: 0.13;
  mix-blend-mode: overlay;
  pointer-events: none;
}
.pview__photo-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 75% at 50% 50%,
    transparent 50%,
    rgba(0, 0, 0, 0.18) 80%,
    rgba(0, 0, 0, 0.45) 100%
  );
  pointer-events: none;
  mix-blend-mode: multiply;
}

.pview__caption {
  position: relative;
  text-align: center;
  padding: 7% 4% 0;
  color: var(--c-ink-700);
}
.pview__caption-title {
  display: block;
  font:
    400 clamp(1rem, 1.4vw + 0.55rem, 1.5rem) / 1.2 'Italianno',
    'Cormorant Garamond',
    cursive;
  letter-spacing: 0.005em;
  color: rgba(58, 44, 28, 0.85);
}
.pview__caption-date {
  display: block;
  margin-top: 0.15rem;
  font:
    400 clamp(0.7rem, 0.9vw + 0.35rem, 0.95rem) / 1.2 'Cormorant Garamond',
    serif;
  font-style: italic;
  opacity: 0.55;
  letter-spacing: 0.04em;
}

/* book-spine shadow on right edge: hints "this can flip" */
.pview__spine {
  position: absolute;
  top: 4%;
  bottom: 4%;
  right: 0;
  width: 0.5rem;
  background: linear-gradient(
    to right,
    transparent,
    rgba(0, 0, 0, 0.18) 40%,
    rgba(0, 0, 0, 0.32) 100%
  );
  pointer-events: none;
}
.pview__spine--back {
  right: auto;
  left: 0;
  background: linear-gradient(
    to left,
    transparent,
    rgba(0, 0, 0, 0.18) 40%,
    rgba(0, 0, 0, 0.32) 100%
  );
}

/* BACK — handwritten poem on aged paper, compact for readability */
.pview__face--back {
  background: linear-gradient(168deg, #f4e9cd 0%, #ebdfbf 45%, #d8c8a4 100%);
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
  padding: clamp(0.9rem, 3vw, 1.6rem) clamp(1rem, 3.2vw, 1.7rem);
  display: flex;
  flex-direction: column;
}
.pview__face--back::before {
  /* heavy paper grain */
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='lp'><feTurbulence type='fractalNoise' baseFrequency='1.0' numOctaves='3' seed='13' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23lp)'/></svg>");
  background-size: 220px 220px;
  opacity: 0.09;
  mix-blend-mode: multiply;
  pointer-events: none;
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
  margin-bottom: clamp(0.4rem, 1.5vh, 0.7rem);
  padding-bottom: 0.35rem;
  position: relative;
  flex: 0 0 auto;
}
/* hand-drawn underline below the title (SVG-like via gradient) */
.pview__poem-header::after {
  content: '';
  position: absolute;
  left: 25%;
  right: 25%;
  bottom: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(58, 44, 28, 0.4) 20%,
    rgba(58, 44, 28, 0.55) 50%,
    rgba(58, 44, 28, 0.4) 80%,
    transparent
  );
}
.pview__poem-title {
  margin: 0;
  font:
    400 clamp(1.35rem, 2vw + 0.7rem, 2.1rem) / 1.05 'Italianno',
    cursive;
  letter-spacing: 0.005em;
  color: rgba(26, 20, 12, 0.92);
}
.pview__poem-date {
  margin: 0.05rem 0 0;
  font:
    400 clamp(0.65rem, 0.6vw + 0.4rem, 0.85rem) / 1.3 'Cormorant Garamond',
    serif;
  font-style: italic;
  color: rgba(58, 44, 28, 0.55);
  letter-spacing: 0.04em;
}

.pview__poem-body {
  font:
    400 clamp(0.82rem, 0.75vw + 0.5rem, 1.05rem) / 1.55 'Cormorant Garamond',
    serif;
  letter-spacing: 0.005em;
  text-align: center;
  flex: 1 1 auto;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0.3rem 0 0.4rem;
  color: rgba(26, 20, 12, 0.92);
  /* HOVER MAGNIFIER on text for accessibility */
  transition: transform 320ms cubic-bezier(0.18, 1, 0.32, 1);
  transform-origin: center top;
}
@media (hover: hover) and (pointer: fine) {
  .pview__poem-body:hover {
    transform: scale(1.12);
  }
}
.pview__poem-body::-webkit-scrollbar {
  display: none;
}
.pview__poem-stanza {
  margin: 0 0 0.55rem;
  opacity: 0;
}
.pview__poem-stanza:last-child {
  margin-bottom: 0;
}
/* Inline larger first letter on first stanza (no float — works with center
   alignment and keeps "S" attached to "arà" reading as one word) */
.pview__poem-stanza--first::first-letter {
  font:
    400 1.55em / 1 'Italianno',
    cursive;
  color: rgba(26, 20, 12, 0.95);
  vertical-align: -0.08em;
  margin-right: 0.02em;
}
.pview__inner--flipped .pview__poem-stanza {
  animation: pview-stanza-in 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(550ms + var(--stanza-i, 0) * 130ms);
}
@keyframes pview-stanza-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── reduced-motion ── */
@media (prefers-reduced-motion: reduce) {
  .pview__inner {
    transition: none !important;
  }
  .pview[data-entered='false'] .pview__card,
  .pview[data-entered='true'] .pview__card {
    opacity: 1;
    transform: none !important;
    transition: none !important;
  }
  .pview__poem-stanza {
    opacity: 1 !important;
    animation: none !important;
    transform: none !important;
  }
  .pview__warm {
    transition: none !important;
  }
}
</style>
