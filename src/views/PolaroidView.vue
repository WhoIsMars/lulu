<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { getPoem, getNextPoem, getPrevPoem } from '@/data/poems'

const route = useRoute()
const router = useRouter()
const reducedMotion = useReducedMotion()

const slug = computed(() => String(route.params.slug ?? ''))
const poem = computed(() => getPoem(slug.value))

const flipped = ref(false)
const baseUrl = import.meta.env.BASE_URL

watch(slug, () => {
  flipped.value = false
})

function close(): void {
  void router.push({ name: 'home' })
}

function flip(): void {
  flipped.value = !flipped.value
}

function goNext(): void {
  const next = getNextPoem(slug.value)
  if (next) void router.replace({ name: 'polaroid', params: { slug: next.slug } })
}

function goPrev(): void {
  const prev = getPrevPoem(slug.value)
  if (prev) void router.replace({ name: 'polaroid', params: { slug: prev.slug } })
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    close()
  } else if (e.key === 'ArrowRight') {
    goNext()
  } else if (e.key === 'ArrowLeft') {
    goPrev()
  } else if (e.key === ' ' || e.key === 'Enter') {
    // only if focus is the flip button — already handled natively
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main
    class="pview"
    :data-rm="reducedMotion ? 'true' : 'false'"
    :aria-label="poem ? `${poem.title}, ${poem.date}` : 'polaroid'"
  >
    <div class="pview__atmosphere" aria-hidden="true">
      <div class="pview__bg"></div>
      <div class="pview__vignette"></div>
      <div class="pview__grain"></div>
    </div>

    <button
      class="pview__close"
      type="button"
      aria-label="torna alla stanza"
      @click="close"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M 7 12 L 17 12 M 12 7 L 7 12 L 12 17"
          stroke="currentColor"
          stroke-width="1.4"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="pview__close-label">indietro</span>
    </button>

    <button
      class="pview__nav pview__nav--prev"
      type="button"
      aria-label="poesia precedente"
      @click="goPrev"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M 15 6 L 9 12 L 15 18"
          stroke="currentColor"
          stroke-width="1.4"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      class="pview__nav pview__nav--next"
      type="button"
      aria-label="poesia successiva"
      @click="goNext"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M 9 6 L 15 12 L 9 18"
          stroke="currentColor"
          stroke-width="1.4"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div class="pview__stage">
      <div
        class="pview__card"
        :class="{ 'pview__card--flipped': flipped }"
        :data-rm="reducedMotion ? 'true' : 'false'"
      >
        <!-- FRONT — la foto della polaroid -->
        <div class="pview__face pview__face--front">
          <div class="pview__photo">
            <img
              v-if="poem"
              :src="`${baseUrl}photos/${poem.file}`"
              :alt="poem.title"
              decoding="async"
            />
            <span class="pview__shine" aria-hidden="true"></span>
          </div>
          <div class="pview__caption">
            <span class="pview__caption-title">{{ poem ? poem.title : '' }}</span>
            <span class="pview__caption-date">{{ poem ? poem.date : '' }}</span>
          </div>
        </div>

        <!-- BACK — la poesia scritta -->
        <div class="pview__face pview__face--back">
          <article class="pview__poem">
            <header class="pview__poem-header">
              <h1 class="pview__poem-title">{{ poem ? poem.title : '' }}</h1>
              <p class="pview__poem-date">{{ poem ? poem.date : '' }}</p>
            </header>
            <div class="pview__poem-body">
              <p
                v-for="(stanza, i) in (poem?.body ?? '').split(/\n\s*\n/).filter(Boolean)"
                :key="i"
                class="pview__poem-stanza"
              >
                <span
                  v-for="(line, j) in stanza.split('\n')"
                  :key="j"
                  class="pview__poem-line"
                >
                  {{ line }}<br />
                </span>
              </p>
            </div>
          </article>
        </div>
      </div>

      <button
        class="pview__flip-btn"
        type="button"
        :aria-pressed="flipped"
        @click="flip"
      >
        <span class="pview__flip-word">{{ flipped ? 'foto' : 'gira' }}</span>
      </button>
    </div>
  </main>
</template>

<style scoped>
.pview {
  --card-w: clamp(280px, 60vw, 460px);
  --card-h: calc(var(--card-w) * 1.22);
  --card-photo-h: calc(var(--card-w) * 0.92);
  --back-w: clamp(320px, 64vw, 520px);
  --back-h: clamp(440px, 72vh, 720px);
  --grain-opacity: 0.045;
  --vignette-strength: 0.85;
}

.pview {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--c-soot-900);
  color: var(--c-paper-100);
  overflow: hidden;
}

/* atmosphere */
.pview__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.pview__bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
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
    ellipse 70% 60% at 50% 45%,
    rgba(0, 0, 0, 0) 35%,
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

/* close button (top-left) + nav (sides) */
.pview__close,
.pview__nav {
  position: fixed;
  z-index: 5;
  appearance: none;
  background: transparent;
  border: 0;
  color: rgba(233, 223, 201, 0.65);
  cursor: pointer;
  padding: var(--sp-sm) var(--sp-md);
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-sm);
  font: 400 var(--fs-label) / 1 'Cormorant Garamond', serif;
  font-style: italic;
  letter-spacing: 0.04em;
  transition: color 180ms ease-out;
}
.pview__close svg,
.pview__nav svg {
  width: 22px;
  height: 22px;
  display: block;
}
.pview__close {
  top: clamp(var(--sp-md), 3vh, var(--sp-xl));
  left: clamp(var(--sp-md), 3vw, var(--sp-xl));
}
.pview__nav--prev {
  left: clamp(var(--sp-sm), 2vw, var(--sp-xl));
  top: 50%;
  transform: translateY(-50%);
}
.pview__nav--next {
  right: clamp(var(--sp-sm), 2vw, var(--sp-xl));
  top: 50%;
  transform: translateY(-50%);
}
.pview__close:hover,
.pview__nav:hover,
.pview__close:focus-visible,
.pview__nav:focus-visible {
  color: var(--c-paper-100);
}
.pview__close:focus-visible,
.pview__nav:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 4px;
}
.pview__close-label {
  display: inline;
}
@media (max-width: 540px) {
  .pview__close-label { display: none; }
}

/* stage holds the card + flip button */
.pview__stage {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-xl);
  padding: clamp(60px, 10vh, 100px) var(--sp-md);
  perspective: 1400px;
}

/* the flippable card */
.pview__card {
  position: relative;
  width: var(--card-w);
  height: var(--card-h);
  transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition: transform 700ms cubic-bezier(0.65, 0, 0.35, 1), width 400ms, height 400ms;
}
.pview__card--flipped {
  width: var(--back-w);
  height: var(--back-h);
  transform: rotateY(180deg);
}

.pview__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 1px;
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.3),
    0 24px 50px -10px rgba(0, 0, 0, 0.85),
    0 6px 14px -2px rgba(0, 0, 0, 0.55);
}

/* FRONT face — polaroid */
.pview__face--front {
  background: linear-gradient(to bottom, #f4ecd6 0%, var(--c-paper-100) 35%, #ddd0b0 100%);
  padding: 6% 6% 0 6%;
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
}

.pview__photo {
  position: relative;
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
  text-align: center;
  padding: 6% 4% 0;
  color: var(--c-ink-700);
}
.pview__caption-title {
  display: block;
  font: 400 clamp(14px, 1.4vw + 8px, 22px) / 1.2 'Cormorant Garamond', serif;
}
.pview__caption-date {
  display: block;
  margin-top: 4px;
  font: 400 clamp(11px, 0.9vw + 6px, 14px) / 1.2 'Cormorant Garamond', serif;
  font-style: italic;
  opacity: 0.65;
}

/* BACK face — letter / poem */
.pview__face--back {
  background: linear-gradient(to bottom, #f0e6d0 0%, var(--c-paper-100) 35%, #e3d6b8 100%);
  transform: rotateY(180deg);
  padding: clamp(var(--sp-xl), 5vw, var(--sp-3xl));
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(58, 44, 28, 0.3) transparent;
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
}

.pview__poem {
  position: relative;
  z-index: 1;
  color: var(--c-ink-900);
}
.pview__poem-header {
  text-align: center;
  margin-bottom: var(--sp-xl);
  padding-bottom: var(--sp-md);
  border-bottom: 1px solid rgba(58, 44, 28, 0.18);
}
.pview__poem-title {
  margin: 0;
  font: 500 clamp(20px, 2vw + 12px, 30px) / 1.2 'Cormorant Garamond', serif;
  letter-spacing: 0.01em;
}
.pview__poem-date {
  margin: var(--sp-xs) 0 0;
  font: 400 clamp(12px, 0.9vw + 6px, 15px) / 1.3 'Cormorant Garamond', serif;
  font-style: italic;
  color: var(--c-ink-700);
  opacity: 0.7;
}

.pview__poem-body {
  font: 400 clamp(15px, 1vw + 10px, 19px) / 1.7 'Cormorant Garamond', serif;
  letter-spacing: 0.005em;
  text-align: center;
}
.pview__poem-stanza {
  margin: 0 0 var(--sp-md);
}
.pview__poem-stanza:last-child {
  margin-bottom: 0;
}

/* flip button */
.pview__flip-btn {
  appearance: none;
  background: transparent;
  border: 0;
  color: rgba(233, 223, 201, 0.7);
  cursor: pointer;
  padding: var(--sp-sm) var(--sp-xl);
  min-height: 44px;
  font: 400 clamp(16px, 1vw + 10px, 22px) / 1 'Italianno', cursive;
  letter-spacing: 0.02em;
  transition: color 180ms ease-out;
  position: relative;
}
.pview__flip-btn::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 50%;
  height: 1px;
  background: currentColor;
  transform: translateX(-50%) scaleX(0.6);
  opacity: 0.5;
  transition: transform 200ms, opacity 200ms;
}
.pview__flip-btn:hover,
.pview__flip-btn:focus-visible {
  color: var(--c-paper-100);
}
.pview__flip-btn:hover::after,
.pview__flip-btn:focus-visible::after {
  transform: translateX(-50%) scaleX(1);
  opacity: 1;
}
.pview__flip-btn:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 6px;
  border-radius: 2px;
}

/* reduced-motion: kill the 3D flip, swap faces instantly */
@media (prefers-reduced-motion: reduce) {
  .pview__card {
    transition: none !important;
    transform: none !important;
  }
  .pview__face--back {
    transform: none;
    display: none;
  }
  .pview__card--flipped .pview__face--front {
    display: none;
  }
  .pview__card--flipped .pview__face--back {
    display: block;
  }
}
</style>
