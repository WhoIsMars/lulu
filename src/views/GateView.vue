<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGate } from '@/composables/useGate'
import { useReducedMotion } from '@/composables/useReducedMotion'
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
  const delay = reducedMotion.value ? 0 : 800
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
    <!-- atmospheric layers — pitch black with one strong upper-left light -->
    <div class="gate__atmosphere" aria-hidden="true">
      <div class="gate__base"></div>
      <div class="gate__keylight"></div>
      <div class="gate__floor-shadow"></div>
      <div class="gate__grain"></div>
    </div>

    <!-- candle — small, dramatic, on the left -->
    <svg
      class="gate__candle"
      :class="{
        'gate__candle--opening': state === 'opened' && !reducedMotion,
        'gate__candle--thinking': submitting && !reducedMotion,
      }"
      viewBox="0 0 60 160"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="g-wax-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7eed5" />
          <stop offset="35%" stop-color="#e9dfc9" />
          <stop offset="100%" stop-color="#b8aa83" />
        </linearGradient>
        <linearGradient id="g-wax-side" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(0,0,0,0.45)" />
          <stop offset="30%" stop-color="rgba(0,0,0,0)" />
          <stop offset="65%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.5)" />
        </linearGradient>
        <radialGradient id="g-flame" cx="50%" cy="65%" r="55%">
          <stop offset="0%" stop-color="#fff8dc" />
          <stop offset="35%" stop-color="#f9d97c" />
          <stop offset="68%" stop-color="#e8a046" />
          <stop offset="100%" stop-color="rgba(232,146,46,0)" />
        </radialGradient>
        <linearGradient id="g-brass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#7a5e3c" />
          <stop offset="50%" stop-color="#3a2c1c" />
          <stop offset="100%" stop-color="#16100a" />
        </linearGradient>
      </defs>

      <!-- flame: only visible during the "opening" flicker; otherwise the
           candle is unlit (matches Phase 1 spec — flame reserved for v2) -->
      <g class="gate__candle-flame">
        <ellipse cx="30" cy="20" rx="6" ry="11" fill="url(#g-flame)" />
        <ellipse cx="30" cy="22" rx="2.4" ry="6" fill="#ffffff" opacity="0.85" />
      </g>

      <!-- wick + char tip -->
      <rect class="gate__candle-wick" x="29.2" y="30" width="1.6" height="9" fill="#0a0604" />
      <ellipse class="gate__candle-tip" cx="30" cy="29" rx="2" ry="2.6" fill="#0a0604" />

      <!-- main wax body, taller than wide -->
      <path
        d="M 22 38 L 22 124 Q 22 128, 26 128 L 34 128 Q 38 128, 38 124 L 38 38 Q 38 35, 30 35 Q 22 35, 22 38 Z"
        fill="url(#g-wax-body)"
      />
      <path
        d="M 22 38 L 22 124 Q 22 128, 26 128 L 34 128 Q 38 128, 38 124 L 38 38 Z"
        fill="url(#g-wax-side)"
      />
      <!-- wax that has dripped down the right side -->
      <path
        d="M 38 70 Q 41 76, 41 84 Q 41 92, 39 96 Q 38 90, 38 84 Z"
        fill="#cdbb96"
        opacity="0.85"
      />
      <path
        d="M 22 92 Q 19 98, 19 106 Q 19 112, 21 114 Q 22 110, 22 104 Z"
        fill="#cdbb96"
        opacity="0.7"
      />
      <!-- pooled wax rim at top with shadow inside -->
      <ellipse cx="30" cy="38" rx="8" ry="1.5" fill="#e9dfc9" />
      <ellipse cx="30" cy="38" rx="5" ry="0.7" fill="#7a6c4a" />

      <!-- brass holder -->
      <path
        d="M 14 128 L 14 132 Q 14 134, 16 134 L 44 134 Q 46 134, 46 132 L 46 128 Z"
        fill="url(#g-brass)"
      />
      <ellipse cx="30" cy="135" rx="18" ry="2.6" fill="url(#g-brass)" />
      <ellipse cx="30" cy="137" rx="20" ry="1.4" fill="#0a0604" opacity="0.95" />
      <!-- highlight on brass cap (warm reflection of candlelight when lit) -->
      <ellipse class="gate__candle-brass-shine" cx="22" cy="131" rx="3" ry="0.6" fill="#f9d97c" opacity="0" />
    </svg>

    <!-- the letter wrap holds both states -->
    <div class="gate__letter-wrap">
      <!-- ─── CLOSED ENVELOPE ─── -->
      <button
        ref="envelopeEl"
        class="gate__envelope"
        type="button"
        :tabindex="state === 'closed' ? 0 : -1"
        :aria-hidden="state === 'opened' ? true : undefined"
        aria-label="apri la lettera"
        @click="openLetter"
      >
        <div class="gate__env-shadow"></div>
        <div class="gate__env-body">
          <!-- subtle paper grain on body -->
        </div>
        <div class="gate__env-flap"></div>

        <!-- ribbon: ONE diagonal strap with a knot under the seal -->
        <svg
          class="gate__env-ribbon"
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="g-ribbon" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#5a4530" />
              <stop offset="50%" stop-color="#382818" />
              <stop offset="100%" stop-color="#1a120a" />
            </linearGradient>
            <linearGradient id="g-ribbon-shine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="rgba(255,225,180,0.3)" />
              <stop offset="50%" stop-color="rgba(255,225,180,0)" />
            </linearGradient>
          </defs>
          <!-- vertical ribbon -->
          <rect x="96" y="0" width="8" height="120" fill="url(#g-ribbon)" />
          <rect x="96" y="0" width="2" height="120" fill="url(#g-ribbon-shine)" />
          <!-- knot tails: two strips coming down from under the seal -->
          <path
            d="M 100 64 Q 92 70, 88 76 Q 84 82, 88 86 Q 96 80, 100 72"
            stroke="url(#g-ribbon)"
            stroke-width="3.5"
            fill="none"
            stroke-linecap="round"
          />
          <path
            d="M 100 64 Q 108 72, 110 80 Q 112 86, 108 88 Q 102 80, 100 74"
            stroke="url(#g-ribbon)"
            stroke-width="3.5"
            fill="none"
            stroke-linecap="round"
          />
          <!-- subtle creases on the tails -->
          <path
            d="M 92 78 L 90 80"
            stroke="rgba(255,225,180,0.2)"
            stroke-width="0.4"
          />
        </svg>

        <!-- wax seal: split into two halves that crack apart on opening -->
        <div class="gate__env-seal">
          <div class="gate__seal-half gate__seal-half--left">
            <svg viewBox="0 0 32 64" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="g-wax-l" cx="80%" cy="35%" r="85%">
                  <stop offset="0%" stop-color="#d77c54" />
                  <stop offset="35%" stop-color="#a85a3a" />
                  <stop offset="75%" stop-color="#6e3018" />
                  <stop offset="100%" stop-color="#3e1a0c" />
                </radialGradient>
                <radialGradient id="g-wax-shine-l" cx="55%" cy="25%" r="35%">
                  <stop offset="0%" stop-color="rgba(255,220,180,0.7)" />
                  <stop offset="100%" stop-color="rgba(255,220,180,0)" />
                </radialGradient>
              </defs>
              <path
                d="M 32 4 L 32 60 Q 28 62, 18 56 Q 6 52, 8 40 Q 2 30, 10 22 Q 14 8, 26 8 Q 30 4, 32 4 Z"
                fill="url(#g-wax-l)"
              />
              <ellipse cx="22" cy="22" rx="9" ry="7" fill="url(#g-wax-shine-l)" />
              <!-- micro drip at bottom -->
              <path
                d="M 18 58 Q 18 62, 16 64"
                stroke="#5e2818"
                stroke-width="0.8"
                fill="none"
              />
            </svg>
          </div>
          <div class="gate__seal-half gate__seal-half--right">
            <svg viewBox="0 0 32 64" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="g-wax-r" cx="20%" cy="35%" r="85%">
                  <stop offset="0%" stop-color="#d77c54" />
                  <stop offset="35%" stop-color="#a85a3a" />
                  <stop offset="75%" stop-color="#6e3018" />
                  <stop offset="100%" stop-color="#3e1a0c" />
                </radialGradient>
              </defs>
              <path
                d="M 0 4 Q 4 3, 18 12 Q 28 16, 27 28 Q 30 38, 22 46 Q 18 58, 6 58 L 0 60 Z"
                fill="url(#g-wax-r)"
              />
            </svg>
          </div>
          <!-- monogram L sits on top -->
          <span class="gate__seal-mono" aria-hidden="true">L</span>
        </div>
      </button>

      <!-- ─── OPENED LETTER ─── -->
      <article
        class="gate__letter"
        :inert="state === 'closed' ? true : undefined"
        :aria-hidden="state === 'closed' ? true : undefined"
      >
        <div class="gate__letter-flap">
          <div class="gate__letter-flap-inner"></div>
        </div>

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
            </button>
          </form>

          <p role="status" aria-live="polite" class="gate__live">
            <span v-if="submitting">verifica in corso</span>
            <span v-else-if="errored" class="gate__error">password non corretta</span>
          </p>
        </div>
      </article>
    </div>

    <!-- microscopic signature in bottom-right -->
    <div class="gate__signature" aria-hidden="true">Lulu</div>
  </main>
</template>

<style scoped>
.gate {
  --gate-letter-w: clamp(15rem, 60vw, 22rem);
  --gate-letter-h: clamp(9rem, 36vw, 13rem);
  --gate-flap-h: calc(var(--gate-letter-h) * 0.62);
  --gate-paper-tilt: -1.8deg;
  --gate-anim-open: 900ms;
  --paper-grain-opacity: 0.1;
  --keylight-strength: 0.18;
}

.gate {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #050402;
  display: grid;
  place-items: center;
  isolation: isolate;
}

/* ── atmosphere ── */
.gate__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.gate__base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 50% 35%, var(--c-soot-700) 0%, var(--c-soot-800) 50%, #050402 100%);
}

/* keylight: warm radial from upper-left where the candle stands */
.gate__keylight {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 50% 40% at 22% 28%,
    rgba(244, 208, 138, calc(0.32 * var(--keylight-strength))) 0%,
    rgba(232, 176, 87, calc(0.18 * var(--keylight-strength))) 30%,
    rgba(168, 90, 58, calc(0.06 * var(--keylight-strength))) 55%,
    transparent 80%
  );
  mix-blend-mode: screen;
  transition: opacity 800ms cubic-bezier(0.4, 0, 0.2, 1);
}
.gate[data-state='opened'] {
  --keylight-strength: 1;
}

.gate__floor-shadow {
  /* warm ambient bottom of viewport, suggests floor */
  position: absolute;
  inset: auto 0 0 0;
  height: 30%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
}

.gate__grain {
  position: absolute;
  inset: -10%;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0 0.74  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 220px 220px;
  opacity: 0.06;
  mix-blend-mode: overlay;
}

.gate__signature {
  position: absolute;
  z-index: 5;
  bottom: clamp(0.6rem, 2vh, 1rem);
  right: clamp(0.6rem, 2vw, 1rem);
  font:
    400 clamp(1.5rem, 2.5vw + 0.6rem, 2.5rem) / 1 'Italianno',
    cursive;
  color: rgba(232, 220, 195, 0.18);
  pointer-events: none;
  user-select: none;
  letter-spacing: 0.02em;
}

/* ── candle: positioned upper-left ── */
.gate__candle {
  position: absolute;
  z-index: 4;
  width: clamp(40px, 5vw + 22px, 80px);
  height: auto;
  top: clamp(8vh, 14vh, 18vh);
  left: clamp(8vw, 14vw, 22vw);
  transform: rotate(-1.5deg);
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.85))
    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65));
  pointer-events: none;
}
@media (max-width: 540px) {
  .gate__candle {
    top: 8vh;
    left: 12vw;
  }
}

.gate__candle-flame {
  opacity: 0;
  transform-origin: 30px 30px;
}
.gate__candle--opening .gate__candle-flame {
  animation: gate-flame-open 1200ms cubic-bezier(0.3, 0, 0.2, 1) 1 forwards;
}
@keyframes gate-flame-open {
  0% { opacity: 0; transform: scale(0.4) translateY(4px); }
  20% { opacity: 0.4; transform: scale(0.85, 1.1) translateY(-1px) rotate(-3deg); }
  35% { opacity: 0.7; transform: scale(1.1, 0.9) translateY(0.5px) rotate(2.5deg); }
  50% { opacity: 0.55; transform: scale(0.92, 1.08) translateY(-0.6px) rotate(-2deg); }
  65% { opacity: 0.7; transform: scale(1.05, 0.95) translateY(0.3px) rotate(1.5deg); }
  82% { opacity: 0.45; transform: scale(0.95, 1.05) rotate(-0.8deg); }
  100% { opacity: 0; transform: scale(0.6); }
}

.gate__candle-tip {
  transform-origin: 30px 29px;
}
.gate__candle--thinking .gate__candle-tip {
  animation: gate-tip-pulse 1.6s ease-in-out infinite;
}
@keyframes gate-tip-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(0.8); }
}

.gate__candle--opening .gate__candle-brass-shine {
  animation: gate-brass-shine 1200ms ease-out 1 forwards;
}
@keyframes gate-brass-shine {
  0%, 100% { opacity: 0; }
  30% { opacity: 0.6; }
  60% { opacity: 0.45; }
}

/* ── letter wrap (envelope + opened letter share this slot) ── */
.gate__letter-wrap {
  position: relative;
  z-index: 6;
  width: var(--gate-letter-w);
  /* offset slightly right-and-down of center for asymmetry */
  transform: translate(3vw, 2vh);
  display: grid;
  place-items: center;
}
@media (max-width: 540px) {
  .gate__letter-wrap {
    transform: translate(0, 8vh);
  }
}

/* ─── envelope (closed) ─── */
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
    transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity calc(var(--gate-anim-open) * 0.4) ease-out;
}
.gate[data-state='opened'] .gate__envelope {
  opacity: 0;
  pointer-events: none;
  transform: rotate(var(--gate-paper-tilt)) scale(0.95);
}

.gate__envelope:focus-visible {
  outline: none;
}
.gate__envelope:focus-visible .gate__env-body {
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.18),
    0 18px 36px -10px rgba(0, 0, 0, 0.85),
    0 4px 10px -2px rgba(0, 0, 0, 0.55),
    0 0 0 2px var(--c-focus);
}
@media (hover: hover) and (pointer: fine) {
  .gate__envelope:hover {
    transform: rotate(calc(var(--gate-paper-tilt) * 0.4)) translateY(-3px);
  }
  .gate__envelope:hover .gate__env-body {
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 220, 0.55),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 24px 50px -10px rgba(0, 0, 0, 0.95),
      0 0 30px 4px rgba(244, 208, 138, 0.2);
  }
}

.gate__env-shadow {
  position: absolute;
  inset: auto 4% -10% 4%;
  height: 30px;
  background: radial-gradient(ellipse 80% 100% at 50% 50%, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(8px);
  z-index: 0;
}

.gate__env-body {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(170deg, #ede2c4 0%, #d8c8a4 50%, #b8a983 100%);
  /* slightly torn edge */
  clip-path: polygon(
    0% 4%, 2% 0%, 6% 3%, 14% 1%, 28% 3%, 50% 0%, 72% 3%, 86% 1%, 94% 4%, 98% 0%, 100% 4%,
    100% 96%, 98% 100%, 92% 97%, 80% 100%, 62% 97%, 50% 100%, 38% 97%, 20% 100%, 8% 97%, 2% 100%, 0% 96%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.15),
    0 18px 38px -12px rgba(0, 0, 0, 0.85),
    0 6px 12px -2px rgba(0, 0, 0, 0.55);
  transition: box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
.gate__env-body::before {
  /* paper grain */
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
  background-size: 200px 200px;
  opacity: var(--paper-grain-opacity);
  mix-blend-mode: multiply;
  clip-path: inherit;
}
.gate__env-body::after {
  /* directional shadow from upper-left light */
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(150deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.18) 70%, rgba(0, 0, 0, 0.3) 100%);
  mix-blend-mode: multiply;
  clip-path: inherit;
}

.gate__env-flap {
  position: absolute;
  inset: 0 0 auto 0;
  z-index: 2;
  height: 62%;
  background: linear-gradient(168deg, #d4c094 0%, #b8a380 55%, #826d4a 100%);
  clip-path: polygon(0% 0%, 100% 0%, 50% 96%);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.22);
}
.gate__env-flap::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.05  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23f)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.1;
  mix-blend-mode: multiply;
  clip-path: inherit;
}

.gate__env-ribbon {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.55));
  transition: opacity 600ms ease-out;
}
.gate[data-state='opened'] .gate__env-ribbon {
  opacity: 0;
}

/* ─── seal: split halves ─── */
.gate__env-seal {
  position: absolute;
  z-index: 4;
  width: clamp(50px, 9vw, 76px);
  height: clamp(50px, 9vw, 76px);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -36%);
  filter:
    drop-shadow(0 6px 10px rgba(0, 0, 0, 0.65))
    drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
}
.gate__seal-half {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  transition:
    transform 600ms cubic-bezier(0.6, 0, 0.4, 1) 100ms,
    opacity 480ms ease-out 380ms;
}
.gate__seal-half--left {
  left: 0;
  transform-origin: 100% 50%;
}
.gate__seal-half--right {
  right: 0;
  transform-origin: 0% 50%;
}
.gate__seal-half svg {
  width: 100%;
  height: 100%;
  display: block;
}
.gate__seal-mono {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font:
    400 calc(clamp(50px, 9vw, 76px) * 0.95) / 1 'Italianno',
    cursive;
  color: rgba(255, 235, 200, 0.95);
  text-shadow:
    0 1px 1px rgba(60, 18, 8, 0.95),
    0 0 8px rgba(255, 220, 180, 0.3);
  pointer-events: none;
  transform: translateY(-3%);
  transition: opacity 320ms ease-out 320ms;
}
.gate[data-state='opened'] .gate__seal-half--left {
  transform: translateX(-30%) rotate(-18deg);
  opacity: 0;
}
.gate[data-state='opened'] .gate__seal-half--right {
  transform: translateX(30%) rotate(18deg);
  opacity: 0;
}
.gate[data-state='opened'] .gate__seal-mono {
  opacity: 0;
}

/* ─── opened letter ─── */
.gate__letter {
  position: relative;
  z-index: 2;
  width: var(--gate-letter-w);
  pointer-events: none;
}
.gate[data-state='closed'] .gate__letter {
  visibility: hidden;
}

.gate__letter-flap {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  height: var(--gate-flap-h);
  perspective: 800px;
  pointer-events: none;
  z-index: 1;
}
.gate__letter-flap-inner {
  position: absolute;
  inset: 0;
  background: linear-gradient(170deg, #d4c094 0%, #b8a380 55%, #826d4a 100%);
  clip-path: polygon(50% 8%, 100% 100%, 0% 100%);
  transform-origin: bottom center;
  transform: rotateX(-180deg);
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.55);
}
.gate[data-state='opened'] .gate__letter-flap-inner {
  transform: rotateX(0deg);
  transition: transform var(--gate-anim-open) cubic-bezier(0.18, 1, 0.3, 1) calc(var(--gate-anim-open) * 0.2);
}

.gate__letter-body {
  position: relative;
  width: 100%;
  padding: clamp(1.4rem, 5vw, 2.6rem) clamp(1.6rem, 5vw, 2.8rem);
  background: linear-gradient(170deg, #f0e6d0 0%, var(--c-paper-100) 35%, #e3d6b8 100%);
  clip-path: polygon(
    0% 4%, 2% 0%, 6% 3%, 14% 1%, 28% 3%, 50% 0%, 72% 3%, 86% 1%, 94% 4%, 98% 0%, 100% 4%,
    100% 96%, 98% 100%, 92% 97%, 80% 100%, 62% 97%, 50% 100%, 38% 97%, 20% 100%, 8% 97%, 2% 100%, 0% 96%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    0 22px 44px -12px rgba(0, 0, 0, 0.85),
    0 8px 14px -2px rgba(0, 0, 0, 0.5);
  transform: rotate(var(--gate-paper-tilt));
  transform-origin: 50% 0%;
  max-height: 0;
  opacity: 0;
}
.gate__letter-body::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='lp'><feTurbulence type='fractalNoise' baseFrequency='1' numOctaves='3' seed='13' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23lp)'/></svg>");
  background-size: 220px 220px;
  opacity: 0.09;
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
    max-height var(--gate-anim-open) cubic-bezier(0.34, 1.2, 0.64, 1) calc(var(--gate-anim-open) * 0.3),
    opacity calc(var(--gate-anim-open) * 0.5) calc(var(--gate-anim-open) * 0.35);
}

.gate__letter-body--shake {
  animation: gate-shake 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes gate-shake {
  0%, 100% { transform: rotate(var(--gate-paper-tilt)) translateX(0); }
  25% { transform: rotate(var(--gate-paper-tilt)) translateX(-4px); }
  50% { transform: rotate(var(--gate-paper-tilt)) translateX(4px); }
  75% { transform: rotate(var(--gate-paper-tilt)) translateX(-2px); }
}

/* ─── form ─── */
.gate__form {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1.4rem, 4vh, 2.2rem);
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
    serif;
  letter-spacing: 0.01em;
  padding: 0.6rem 0 0.3rem;
  min-height: 44px;
  text-align: center;
}
.gate__input::placeholder {
  color: rgba(58, 44, 28, 0.55);
  font:
    400 1.7em / 1 'Italianno',
    cursive;
  letter-spacing: 0.02em;
}
.gate__underline {
  display: block;
  width: 100%;
  height: 6px;
  margin-top: 0.25rem;
  opacity: 0.85;
  transition: opacity 200ms ease-out;
}
.gate__field:focus-within .gate__underline {
  opacity: 1;
}
.gate__field:focus-within .gate__underline path {
  stroke: var(--c-ink-900);
  stroke-width: 1.6;
}

.gate__tab {
  appearance: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 7rem;
  min-height: 44px;
  padding: 0.6rem 1.6rem;
  background: linear-gradient(168deg, #d4c094 0%, #b8a380 55%, #826d4a 100%);
  border: 0;
  border-radius: 1px;
  color: rgba(26, 20, 12, 0.9);
  font:
    400 1.4rem / 1 'Italianno',
    cursive;
  letter-spacing: 0.02em;
  cursor: pointer;
  clip-path: polygon(
    0% 8%, 4% 2%, 12% 5%, 30% 0%, 60% 2%, 84% 0%, 96% 4%, 100% 10%,
    100% 90%, 96% 96%, 84% 100%, 60% 98%, 30% 100%, 12% 95%, 4% 98%, 0% 92%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.45),
    inset 0 -1px 0 rgba(0, 0, 0, 0.18),
    0 8px 18px -8px rgba(0, 0, 0, 0.7),
    0 3px 6px -2px rgba(0, 0, 0, 0.45);
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    background 220ms ease-out,
    box-shadow 220ms ease-out;
}
.gate__tab::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='t'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23t)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.12;
  mix-blend-mode: multiply;
  clip-path: inherit;
  pointer-events: none;
}
.gate__tab-word {
  position: relative;
  z-index: 1;
}
@media (hover: hover) and (pointer: fine) {
  .gate__tab:hover {
    background: linear-gradient(168deg, #e0cfa6 0%, #c8b793 55%, #927b58 100%);
    transform: translateY(-2px);
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 220, 0.55),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 12px 24px -6px rgba(0, 0, 0, 0.75),
      0 0 18px 2px rgba(244, 208, 138, 0.22);
  }
}
.gate__tab:active {
  transform: translateY(0);
}
.gate__tab:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 4px;
}
.gate__tab[aria-disabled='true'] {
  cursor: progress;
  opacity: 0.65;
}

.gate__live {
  margin: 0;
  font:
    400 var(--fs-label) / 1.4 system-ui,
    sans-serif;
  text-align: center;
  color: rgba(58, 44, 28, 0.55);
  font-style: italic;
  min-height: 1.6em;
  position: absolute;
  bottom: -2.2rem;
  left: 0;
  right: 0;
}
.gate__error {
  color: var(--c-error);
}

/* ─── reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .gate__envelope,
  .gate__seal-half,
  .gate__seal-mono,
  .gate__env-ribbon,
  .gate__letter-body,
  .gate__letter-flap-inner,
  .gate__candle-tip,
  .gate__candle-flame,
  .gate__candle-brass-shine {
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
