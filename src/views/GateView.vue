<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGate } from '@/composables/useGate'
import { useReducedMotion } from '@/composables/useReducedMotion'
import ZoomControls from '@/components/ZoomControls.vue'

const router = useRouter()
const { verify } = useGate()
const reducedMotion = useReducedMotion()
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const envelopeEl = useTemplateRef<HTMLButtonElement>('envelopeEl')

const state = ref<'closed' | 'opened'>('closed')
const value = ref('')
const submitting = ref(false)
const errored = ref(false)

onMounted(() => envelopeEl.value?.focus())

async function openLetter(): Promise<void> {
  if (state.value !== 'closed') return
  state.value = 'opened'
  const delay = reducedMotion.value ? 0 : 720
  await new Promise((r) => setTimeout(r, delay))
  inputEl.value?.focus()
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  errored.value = false

  const ok = await verify(value.value)

  submitting.value = false
  if (ok) {
    await router.replace({ name: 'home' })
  } else {
    errored.value = true
    inputEl.value?.select()
  }
}

function onInput(): void {
  if (errored.value) errored.value = false
}
</script>

<template>
  <main
    class="gate"
    :data-state="state"
    :data-rm="reducedMotion ? 'true' : 'false'"
  >
    <!-- top-right: zoom controls (accessibility) -->
    <div class="gate__controls">
      <ZoomControls />
    </div>

    <!-- atmospheric layers, decorative only -->
    <div class="gate__atmosphere" aria-hidden="true">
      <div class="gate__wall"></div>
      <div class="gate__desk"></div>
      <div class="gate__moonbeam"></div>
      <div class="gate__vignette"></div>
      <div class="gate__grain"></div>
    </div>

    <!-- candela sul desktop, posizionata in alto-sinistra -->
    <svg
      class="gate__candle"
      :class="{ 'gate__candle--thinking': submitting && !reducedMotion }"
      viewBox="0 0 96 168"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="wax-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f1e6cf" />
          <stop offset="35%" stop-color="var(--c-paper-100)" />
          <stop offset="100%" stop-color="var(--c-paper-200)" />
        </linearGradient>
        <linearGradient id="wax-side" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(0,0,0,0.20)" />
          <stop offset="40%" stop-color="rgba(0,0,0,0)" />
          <stop offset="70%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.24)" />
        </linearGradient>
        <linearGradient id="brass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#6a553a" />
          <stop offset="40%" stop-color="#3a2c1c" />
          <stop offset="100%" stop-color="#1a140c" />
        </linearGradient>
        <radialGradient id="ground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.65)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <ellipse cx="48" cy="158" rx="38" ry="6" fill="url(#ground)" />

      <!-- main wax body, slightly tapered toward top -->
      <path
        d="M 36 44 L 35 130 Q 35 134, 39 134 L 57 134 Q 61 134, 61 130 L 60 44 Q 60 40, 56 40 L 40 40 Q 36 40, 36 44 Z"
        fill="url(#wax-body)"
      />
      <path
        d="M 36 44 L 35 130 Q 35 134, 39 134 L 57 134 Q 61 134, 61 130 L 60 44 Q 60 40, 56 40 L 40 40 Q 36 40, 36 44 Z"
        fill="url(#wax-side)"
      />
      <!-- pooled rim -->
      <path
        d="M 36 44 Q 38 38, 42 39 Q 46 36, 50 38 Q 54 36, 56 39 Q 60 38, 60 44 Q 58 46, 54 45 Q 50 47, 46 45 Q 42 47, 38 45 Q 36 46, 36 44 Z"
        fill="var(--c-paper-200)"
        opacity="0.9"
      />
      <!-- frozen wax drips, two on right -->
      <path
        d="M 60 78 Q 63 82, 63 90 Q 63 98, 61 102 Q 60 96, 60 90 Z"
        fill="var(--c-paper-200)"
        opacity="0.75"
      />
      <path
        d="M 38 110 Q 36 114, 36 120 Q 36 126, 38 128 Q 39 124, 39 118 Z"
        fill="var(--c-paper-200)"
        opacity="0.6"
      />

      <!-- wick + char tip -->
      <path
        d="M 47 22 Q 46 30, 47 38 L 49 38 Q 50 30, 49 22 Z"
        fill="var(--c-soot-900)"
      />
      <ellipse
        class="gate__candle-tip"
        cx="48"
        cy="20"
        rx="2.2"
        ry="3"
        fill="var(--c-soot-900)"
      />

      <!-- brass holder + saucer -->
      <path
        d="M 30 134 Q 30 137, 32 138 L 64 138 Q 66 137, 66 134 L 60 134 L 36 134 Z"
        fill="url(#brass)"
      />
      <ellipse cx="48" cy="139" rx="22" ry="4" fill="url(#brass)" />
      <ellipse cx="48" cy="141" rx="24" ry="2" fill="#1a140c" opacity="0.95" />
    </svg>

    <!-- decorative items on the desk -->
    <div class="gate__decor" aria-hidden="true">
      <!-- second, older letter peeking from behind -->
      <div class="gate__back-letter"></div>
      <!-- ink stain -->
      <svg
        class="gate__ink-stain"
        viewBox="0 0 80 60"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M 24 18 Q 18 12, 14 18 Q 8 16, 8 24 Q 4 28, 10 34 Q 8 42, 16 42 Q 22 48, 30 44 Q 36 50, 42 44 Q 50 46, 52 38 Q 58 38, 56 30 Q 60 24, 52 22 Q 50 14, 42 18 Q 36 12, 30 18 Q 26 14, 24 18 Z"
          fill="var(--c-soot-900)"
          opacity="0.85"
        />
        <ellipse cx="62" cy="50" rx="3" ry="2" fill="var(--c-soot-900)" opacity="0.6" />
        <ellipse cx="68" cy="44" rx="1.6" ry="1.2" fill="var(--c-soot-900)" opacity="0.5" />
      </svg>
    </div>

    <!-- the letter — closed (envelope-button) and opened (form) coexist; CSS shows one -->
    <div class="gate__letter-wrap">
      <!-- ───────── CHIUSA: envelope as a button ───────── -->
      <button
        ref="envelopeEl"
        class="gate__envelope"
        type="button"
        :tabindex="state === 'closed' ? 0 : -1"
        :aria-hidden="state === 'opened' ? true : undefined"
        aria-label="password"
        @click="openLetter"
      >
        <div class="gate__env-shadow"></div>
        <!-- envelope back (paper rectangle) -->
        <div class="gate__env-back">
          <!-- diagonal flap fold lines at the back, faint -->
          <svg class="gate__env-back-folds" viewBox="0 0 200 120" aria-hidden="true">
            <path
              d="M 4 4 L 100 70 L 196 4"
              stroke="rgba(58,44,28,0.18)"
              stroke-width="0.6"
              fill="none"
            />
            <path
              d="M 4 116 L 60 80"
              stroke="rgba(58,44,28,0.12)"
              stroke-width="0.5"
              fill="none"
            />
            <path
              d="M 196 116 L 140 80"
              stroke="rgba(58,44,28,0.12)"
              stroke-width="0.5"
              fill="none"
            />
          </svg>
        </div>
        <!-- triangular flap, top -->
        <div class="gate__env-flap"></div>

        <!-- wax seal -->
        <div class="gate__env-seal">
          <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <defs>
              <radialGradient id="wax-disc" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#c97250" />
                <stop offset="55%" stop-color="#a85a3a" />
                <stop offset="100%" stop-color="#5e2d18" />
              </radialGradient>
              <radialGradient id="wax-shine" cx="35%" cy="30%" r="22%">
                <stop offset="0%" stop-color="rgba(255,220,180,0.55)" />
                <stop offset="100%" stop-color="rgba(255,220,180,0)" />
              </radialGradient>
            </defs>
            <!-- irregular blob outer rim -->
            <path
              d="M 32 4
                 Q 44 3, 50 12
                 Q 60 16, 59 28
                 Q 62 38, 54 46
                 Q 50 58, 38 58
                 Q 28 62, 18 56
                 Q 6 52, 8 40
                 Q 2 30, 10 22
                 Q 14 8, 26 8
                 Q 30 4, 32 4 Z"
              fill="url(#wax-disc)"
            />
            <!-- shine highlight -->
            <ellipse cx="22" cy="20" rx="10" ry="6" fill="url(#wax-shine)" />
            <!-- embossed flourish — abstract cursive mark -->
            <path
              d="M 22 36
                 Q 28 24, 36 28
                 Q 44 30, 40 40
                 Q 36 46, 28 42
                 M 36 28 Q 40 22, 44 26"
              stroke="rgba(60,18,8,0.65)"
              stroke-width="1.4"
              fill="none"
              stroke-linecap="round"
            />
            <!-- small ridges around perimeter -->
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(60,18,8,0.18)" stroke-width="0.8" stroke-dasharray="1.6 2.2" />
          </svg>
        </div>
      </button>

      <!-- ───────── APERTA: full letter with form ───────── -->
      <article
        class="gate__letter"
        :inert="state === 'closed' ? true : undefined"
        :aria-hidden="state === 'closed' ? true : undefined"
      >
        <!-- top flap of the unfolded letter -->
        <div class="gate__letter-flap">
          <div class="gate__letter-flap-inner"></div>
        </div>

        <!-- the body of the letter -->
        <div
          class="gate__letter-body"
          :class="{ 'gate__letter-body--shake': errored && !reducedMotion }"
        >
          <form class="gate__form" novalidate @submit.prevent="onSubmit">
            <div class="gate__field">
              <input
                ref="inputEl"
                v-model="value"
                class="gate__input"
                type="password"
                name="password"
                autocomplete="current-password"
                spellcheck="false"
                autocapitalize="off"
                autocorrect="off"
                aria-label="password"
                placeholder="password"
                :aria-disabled="submitting || undefined"
                @input="onInput"
              />
              <svg
                class="gate__underline"
                viewBox="0 0 300 6"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M 4 3 Q 60 1.6, 120 3 T 240 3 T 296 2.6"
                  stroke="var(--c-ink-700)"
                  stroke-width="1.1"
                  fill="none"
                  stroke-linecap="round"
                />
              </svg>
            </div>

            <button
              class="gate__tab"
              type="submit"
              :aria-disabled="submitting || undefined"
            >
              <span class="gate__tab-word">Entra</span>
              <svg
                class="gate__tab-flourish"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M 6 3 Q 30 1.4, 50 3 T 94 3"
                  stroke="var(--c-ink-700)"
                  stroke-width="1"
                  fill="none"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </form>

          <p role="status" aria-live="polite" class="gate__live">
            <span v-if="submitting">verifica in corso</span>
            <span v-else-if="errored" class="gate__error">password non corretta</span>
          </p>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
/* ───────── scoped sub-tokens (knobs to tweak) ───────── */
.gate {
  --gate-vignette-strength: 0.92;
  --gate-grain-opacity: 0.06;
  --paper-grain-opacity: 0.09;
  --gate-paper-tilt: -1deg;
  --gate-tab-tilt: 0.5deg;
  --gate-letter-w: clamp(280px, 72vw, 420px);
  --gate-letter-h: clamp(180px, 46vw, 260px);
  --gate-flap-h: calc(var(--gate-letter-h) * 0.62);
  --gate-anim-open: 700ms;
}

.gate__controls {
  position: absolute;
  z-index: 10;
  top: clamp(var(--sp-sm), 2vh, var(--sp-md));
  right: clamp(var(--sp-sm), 2vw, var(--sp-md));
}

/* ───────── outer ───────── */
.gate {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--sp-2xl) var(--sp-md);
  overflow: hidden;
  background: radial-gradient(
    ellipse 80% 60% at 50% 35%,
    var(--c-soot-700) 0%,
    var(--c-soot-800) 50%,
    var(--c-soot-900) 100%
  );
  isolation: isolate;
}
@media (min-width: 1025px) {
  .gate {
    padding: var(--sp-3xl);
  }
}

/* ───────── atmosphere ───────── */
.gate__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* the wall behind the desk — top portion of viewport */
.gate__wall {
  position: absolute;
  inset: 0 0 38% 0;
  background: radial-gradient(
    ellipse 70% 80% at 50% 0%,
    var(--c-soot-700) 0%,
    var(--c-soot-800) 60%,
    var(--c-soot-900) 100%
  );
}

/* the wood desk — bottom portion */
.gate__desk {
  position: absolute;
  inset: auto 0 0 0;
  height: 42%;
  background:
    /* darken at very bottom (foreground edge) */
    linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 70%),
    /* second plank seam */
      linear-gradient(
        to bottom,
        transparent 50%,
        rgba(0, 0, 0, 0.32) 50.3%,
        rgba(0, 0, 0, 0.32) 50.55%,
        transparent 50.85%
      ),
    /* first plank seam */
      linear-gradient(
        to bottom,
        transparent 18%,
        rgba(0, 0, 0, 0.32) 18.3%,
        rgba(0, 0, 0, 0.32) 18.55%,
        transparent 18.85%
      ),
    /* horizon: where wood meets wall */
      linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.55) 0,
        rgba(0, 0, 0, 0.25) 1.2%,
        rgba(0, 0, 0, 0.08) 3%,
        transparent 6%
      ),
    /* wood grain */
      repeating-linear-gradient(
        to bottom,
        rgba(58, 44, 28, 0.22) 0,
        rgba(58, 44, 28, 0.22) 1px,
        transparent 1px,
        transparent 5px
      ),
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.06) 0,
      rgba(0, 0, 0, 0.06) 2px,
      transparent 2px,
      transparent 90px
    ),
    /* base wood color */
      linear-gradient(
        to bottom,
        var(--c-soot-800) 0%,
        var(--c-wood-600) 30%,
        #1a140c 100%
      );
  opacity: 0.95;
}

/* a subtle off-axis "moonlight from window" beam */
.gate__moonbeam {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    rgba(242, 217, 164, 0.04) 47%,
    rgba(242, 217, 164, 0.07) 50%,
    rgba(242, 217, 164, 0.04) 53%,
    transparent 65%
  );
  mix-blend-mode: screen;
  opacity: 0.65;
}

.gate__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 70% at 50% 45%,
    rgba(0, 0, 0, 0) 32%,
    rgba(0, 0, 0, calc(0.55 * var(--gate-vignette-strength))) 75%,
    rgba(0, 0, 0, calc(0.92 * var(--gate-vignette-strength))) 100%
  );
}

.gate__grain {
  position: absolute;
  inset: -10%;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 180px 180px;
  opacity: var(--gate-grain-opacity);
  mix-blend-mode: overlay;
}

/* ───────── candle, absolutely positioned ───────── */
.gate__candle {
  position: absolute;
  z-index: 2;
  width: clamp(64px, 7vw + 36px, 110px);
  height: auto;
  filter: drop-shadow(var(--shadow-candle-cold));
  pointer-events: none;
  /* mobile default: top-center, above the letter */
  top: clamp(var(--sp-md), 6vh, var(--sp-2xl));
  left: 50%;
  transform: translateX(-50%);
}
@media (min-width: 768px) {
  .gate__candle {
    /* tablet+: upper-left, slightly tilted into composition */
    top: clamp(var(--sp-xl), 12vh, 12vh);
    left: clamp(var(--sp-2xl), 16vw, 22vw);
    transform: translateX(0) rotate(-1.5deg);
  }
}

.gate__candle-tip {
  transform-origin: 48px 20px;
}
.gate__candle--thinking .gate__candle-tip {
  animation: gate-tip-pulse 1.6s ease-in-out infinite;
}
@keyframes gate-tip-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.65;
    transform: scale(0.8);
  }
}

/* ───────── decorative items on the desk ───────── */
.gate__decor {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

/* second envelope behind the main letter — older, more weathered */
.gate__back-letter {
  position: absolute;
  width: clamp(160px, 30vw, 220px);
  height: clamp(110px, 22vw, 150px);
  bottom: clamp(8vh, 16vh, 20vh);
  left: 50%;
  transform: translateX(-50%) rotate(-7deg) translateX(-22%);
  background: linear-gradient(to bottom, #c8b694 0%, #b09e7e 60%, #8a7559 100%);
  clip-path: polygon(
    0% 4%, 4% 0%, 22% 3%, 50% 0%, 78% 3%, 96% 0%, 100% 5%,
    100% 95%, 96% 100%, 78% 97%, 50% 100%, 22% 97%, 4% 100%, 0% 96%
  );
  box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.7), 0 4px 8px -2px rgba(0, 0, 0, 0.5);
  opacity: 0.82;
  filter: blur(0.4px);
}

.gate__ink-stain {
  position: absolute;
  width: clamp(40px, 8vw, 70px);
  height: auto;
  bottom: clamp(8vh, 14vh, 18vh);
  right: clamp(var(--sp-2xl), 14vw, 18vw);
  opacity: 0.85;
  transform: rotate(12deg);
}

/* ───────── letter wrap (envelope + open letter share this slot) ───────── */
.gate__letter-wrap {
  position: relative;
  z-index: 3;
  width: var(--gate-letter-w);
  /* enough vertical space for the open letter */
  min-height: calc(var(--gate-letter-h) + var(--gate-flap-h) + 120px);
  display: grid;
  place-items: center;
  /* push down a little so candle has room above on mobile */
  margin-top: clamp(80px, 18vh, 130px);
}
@media (min-width: 768px) {
  .gate__letter-wrap {
    margin-top: 0;
  }
}

/* ───────── ENVELOPE (closed state) ───────── */
.gate__envelope {
  appearance: none;
  position: absolute;
  inset: 0;
  margin: auto;
  width: var(--gate-letter-w);
  height: var(--gate-letter-h);
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  transform: rotate(var(--gate-paper-tilt));
  transform-origin: 50% 60%;
  transition:
    transform var(--motion-duration-base) var(--motion-ease-soft),
    opacity calc(var(--gate-anim-open) * 0.4) var(--motion-ease-soft);
  /* default state: visible */
  opacity: 1;
}

.gate[data-state='opened'] .gate__envelope {
  opacity: 0;
  pointer-events: none;
  transform: rotate(var(--gate-paper-tilt)) scale(0.96);
}

.gate__envelope:focus-visible {
  outline: none;
}
.gate__envelope:focus-visible .gate__env-back {
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(214, 200, 168, 0.12),
    0 14px 30px -10px rgba(0, 0, 0, 0.75),
    0 4px 8px -2px rgba(0, 0, 0, 0.45),
    0 0 0 2px var(--c-focus);
}

@media (hover: hover) and (pointer: fine) {
  .gate__envelope:hover {
    transform: rotate(calc(var(--gate-paper-tilt) * 0.4)) translateY(-2px);
  }
}

/* ground shadow under envelope */
.gate__env-shadow {
  position: absolute;
  inset: auto 4% -8% 4%;
  height: 30px;
  background: radial-gradient(
    ellipse 80% 100% at 50% 50%,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0) 70%
  );
  filter: blur(6px);
  z-index: 0;
}

/* envelope body (paper rectangle) */
.gate__env-back {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to bottom, #ebdcb8 0%, var(--c-paper-200) 50%, #c8b694 100%);
  clip-path: polygon(
    0% 4%, 2% 0%, 6% 3%, 14% 1%, 28% 3%, 50% 0%, 72% 3%, 86% 1%, 94% 4%, 98% 0%, 100% 4%,
    100% 96%, 98% 100%, 92% 97%, 80% 100%, 62% 97%, 50% 100%, 38% 97%, 20% 100%, 8% 97%, 2% 100%, 0% 96%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(214, 200, 168, 0.12),
    0 14px 30px -10px rgba(0, 0, 0, 0.7),
    0 4px 8px -2px rgba(0, 0, 0, 0.45);
  transition: box-shadow var(--motion-duration-fast) var(--motion-ease-soft);
}
.gate__env-back::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
  background-size: 220px 220px;
  opacity: var(--paper-grain-opacity);
  mix-blend-mode: multiply;
  clip-path: inherit;
}
.gate__env-back-folds {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* triangular flap closed over the body, top-half — meets at center */
.gate__env-flap {
  position: absolute;
  inset: 0 0 auto 0;
  z-index: 2;
  height: 62%;
  background: linear-gradient(to bottom, #d4c094 0%, #b8a380 60%, #968256 100%);
  /* triangle pointing down */
  clip-path: polygon(0% 0%, 100% 0%, 50% 96%);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.16);
}
.gate__env-flap::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.05  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23f)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.1;
  mix-blend-mode: multiply;
  clip-path: inherit;
}

/* wax seal on top of flap point */
.gate__env-seal {
  position: absolute;
  z-index: 3;
  width: clamp(48px, 9vw, 72px);
  height: clamp(48px, 9vw, 72px);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -36%);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.55))
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}
.gate__env-seal svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* ───────── LETTER (opened state) ───────── */
.gate__letter {
  position: relative;
  z-index: 2;
  width: var(--gate-letter-w);
  /* hidden until opened */
  pointer-events: none;
}
.gate[data-state='closed'] .gate__letter {
  visibility: hidden;
}

/* the unfolded top flap — anchored above the body */
.gate__letter-flap {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: var(--gate-flap-h);
  margin: 0;
  perspective: 800px;
  pointer-events: none;
  z-index: 1;
}
.gate__letter-flap-inner {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #d4c094 0%, #b8a380 60%, #968256 100%);
  /* triangle pointing up (the unfolded flap) */
  clip-path: polygon(50% 8%, 100% 100%, 0% 100%);
  transform-origin: bottom center;
  /* start folded down (matches closed envelope), then rotate up on open */
  transform: rotateX(-180deg);
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.4);
}
.gate__letter-flap-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='f2'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.05  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23f2)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.1;
  mix-blend-mode: multiply;
  clip-path: inherit;
}

/* opened state: rotate the flap up */
.gate[data-state='opened'] .gate__letter-flap-inner {
  transform: rotateX(0deg);
  transition:
    transform var(--gate-anim-open) cubic-bezier(0.16, 1, 0.3, 1)
      calc(var(--gate-anim-open) * 0.15);
}

/* the body of the open letter — paper expanding downward */
.gate__letter-body {
  position: relative;
  width: 100%;
  padding: var(--sp-xl) var(--sp-xl) var(--sp-lg);
  background: linear-gradient(to bottom, #f0e6d0 0%, var(--c-paper-100) 35%, #e3d6b8 100%);
  clip-path: polygon(
    0% 4%, 2% 0%, 6% 3%, 14% 1%, 28% 3%, 50% 0%, 72% 3%, 86% 1%, 94% 4%, 98% 0%, 100% 4%,
    100% 96%, 98% 100%, 92% 97%, 80% 100%, 62% 97%, 50% 100%, 38% 97%, 20% 100%, 8% 97%, 2% 100%, 0% 96%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.55),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06),
    0 1px 0 rgba(214, 200, 168, 0.12),
    0 18px 36px -12px rgba(0, 0, 0, 0.75),
    0 6px 12px -3px rgba(0, 0, 0, 0.45);
  transform: rotate(var(--gate-paper-tilt));
  transform-origin: 50% 0%;
  /* start: collapsed to zero height (envelope footprint) */
  max-height: var(--gate-letter-h);
  opacity: 0;
}

.gate__letter-body::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='lp'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='13' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23lp)'/></svg>");
  background-size: 220px 220px;
  opacity: var(--paper-grain-opacity);
  mix-blend-mode: multiply;
  clip-path: inherit;
  pointer-events: none;
}

.gate__letter-body::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse 6% 8% at 18% 22%, rgba(58, 44, 28, 0.13) 0%, transparent 60%),
    radial-gradient(ellipse 4% 6% at 82% 78%, rgba(58, 44, 28, 0.09) 0%, transparent 65%);
  mix-blend-mode: multiply;
  clip-path: inherit;
  pointer-events: none;
}

.gate[data-state='opened'] .gate__letter {
  pointer-events: auto;
}
.gate[data-state='opened'] .gate__letter-body {
  max-height: 800px;
  opacity: 1;
  transition:
    max-height var(--gate-anim-open) cubic-bezier(0.34, 1.2, 0.64, 1)
      calc(var(--gate-anim-open) * 0.3),
    opacity calc(var(--gate-anim-open) * 0.5)
      calc(var(--gate-anim-open) * 0.35);
}

/* shake on error */
.gate__letter-body--shake {
  animation: gate-shake var(--motion-duration-base) var(--motion-ease-out);
}
@keyframes gate-shake {
  0%, 100% { transform: rotate(var(--gate-paper-tilt)) translateX(0); }
  20% { transform: rotate(var(--gate-paper-tilt)) translateX(calc(-1 * var(--motion-shake-amplitude))); }
  45% { transform: rotate(var(--gate-paper-tilt)) translateX(var(--motion-shake-amplitude)); }
  70% { transform: rotate(var(--gate-paper-tilt)) translateX(calc(-0.5 * var(--motion-shake-amplitude))); }
}

/* ───────── form / input / tab ───────── */
.gate__form {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-xl);
  width: 100%;
}

.gate__field {
  width: 100%;
  position: relative;
}

.gate__input {
  width: 100%;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--c-ink-900);
  caret-color: var(--c-ink-700);
  font:
    400 var(--fs-body) / 1.5 'Cormorant Garamond',
    'Iowan Old Style',
    'Palatino Linotype',
    serif;
  letter-spacing: 0.01em;
  padding: var(--sp-sm) 0 var(--sp-xs);
  min-height: 44px;
}

.gate__input::placeholder {
  color: rgba(58, 44, 28, 0.42);
  font-style: italic;
}

.gate__underline {
  display: block;
  width: 100%;
  height: 6px;
  margin-top: var(--sp-xs);
  opacity: 0.85;
  transition:
    opacity var(--motion-duration-fast) var(--motion-ease-soft),
    transform var(--motion-duration-fast) var(--motion-ease-soft);
}

.gate__field:focus-within .gate__underline {
  opacity: 1;
}
.gate__field:focus-within .gate__underline path {
  stroke: var(--c-ink-900);
  stroke-width: 1.6;
}

.gate__input:focus-visible {
  outline: none;
}
.gate__field:focus-within {
  /* warm focus glow on the field area */
  box-shadow: 0 0 0 0 var(--c-focus);
}

.gate__tab {
  appearance: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--sp-xs);
  width: clamp(120px, 30vw, 160px);
  min-height: 44px;
  padding: var(--sp-sm) var(--sp-lg);
  background: linear-gradient(to bottom, #ebdcb8 0%, var(--c-paper-200) 60%, #c8b694 100%);
  border: 0;
  border-radius: var(--radius-none);
  color: var(--c-ink-900);
  font:
    400 calc(var(--fs-body) * 0.95) / 1.2 'Cormorant Garamond',
    serif;
  font-style: italic;
  letter-spacing: 0.02em;
  cursor: pointer;
  clip-path: polygon(
    0% 8%, 4% 2%, 10% 6%, 20% 1%, 34% 3%, 50% 0%, 66% 3%, 80% 1%, 90% 5%, 96% 2%, 100% 8%,
    100% 92%, 96% 98%, 88% 96%, 74% 100%, 58% 97%, 42% 100%, 26% 97%, 14% 100%, 6% 96%, 2% 99%, 0% 92%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.5),
    0 1px 0 rgba(214, 200, 168, 0.1),
    0 8px 18px -8px rgba(0, 0, 0, 0.6),
    0 3px 6px -2px rgba(0, 0, 0, 0.4);
  transform: rotate(var(--gate-tab-tilt));
  transform-origin: 50% 40%;
  transition:
    transform var(--motion-duration-base) var(--motion-ease-soft),
    background var(--motion-duration-fast) var(--motion-ease-soft);
}

.gate__tab::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='t'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23t)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.09;
  mix-blend-mode: multiply;
  clip-path: inherit;
}

.gate__tab-word {
  position: relative;
  z-index: 1;
}
.gate__tab-flourish {
  position: relative;
  z-index: 1;
  display: block;
  width: 70%;
  height: 5px;
  opacity: 0.7;
  transition: opacity var(--motion-duration-fast) var(--motion-ease-soft);
}

@media (hover: hover) and (pointer: fine) {
  .gate__tab:hover {
    background: linear-gradient(to bottom, #f1e3c2 0%, var(--c-paper-100) 60%, #d6c2a0 100%);
    transform: rotate(calc(var(--gate-tab-tilt) * 0.4)) translateY(-1px);
  }
  .gate__tab:hover .gate__tab-flourish {
    opacity: 1;
  }
}

.gate__tab:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 6px;
}
.gate__tab[aria-disabled='true'] {
  cursor: progress;
  opacity: 0.65;
}

/* ───────── live region ───────── */
.gate__live {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(-1 * var(--sp-xl));
  margin: 0;
  font:
    400 var(--fs-label) / 1.4 system-ui,
    sans-serif;
  letter-spacing: 0.02em;
  text-align: center;
  color: rgba(233, 223, 201, 0.55);
  min-height: 1.6em;
}
.gate__live span {
  font-style: italic;
}
.gate__error {
  color: var(--c-error);
}

/* ───────── reduced-motion: instant state transitions ───────── */
@media (prefers-reduced-motion: reduce) {
  .gate__envelope,
  .gate__letter-flap-inner,
  .gate__letter-body,
  .gate__candle-tip,
  .gate__tab,
  .gate__underline,
  .gate__tab-flourish {
    transition: none !important;
    animation: none !important;
  }
  .gate[data-state='opened'] .gate__envelope {
    display: none;
  }
  .gate[data-state='opened'] .gate__letter-flap-inner {
    transform: rotateX(0deg);
  }
  .gate[data-state='opened'] .gate__letter-body {
    max-height: none;
    opacity: 1;
  }
}
</style>
