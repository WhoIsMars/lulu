<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { usePointerLight } from '@/composables/usePointerLight'
import { poems, type Poem } from '@/data/poems'
import ZoomControls from '@/components/ZoomControls.vue'

const router = useRouter()
const reducedMotion = useReducedMotion()
usePointerLight()

const baseUrl = import.meta.env.BASE_URL

/** Build ropes from manifest data — group by `rope` index. */
const ropeCount = 4
const ropes: Poem[][] = Array.from({ length: ropeCount }, (_, i) =>
  poems.filter((p) => p.rope === i),
)

/* ── narrow-viewport carousel state ── */
const NARROW_BREAKPOINT = 768
const isNarrow = ref(false)
const activeRope = ref(0)

function checkNarrow(): void {
  isNarrow.value = window.innerWidth < NARROW_BREAKPOINT
}

function setActiveRope(i: number): void {
  activeRope.value = Math.max(0, Math.min(ropeCount - 1, i))
}

const totalRopes = computed(() => ropes.length)

onMounted(() => {
  checkNarrow()
  window.addEventListener('resize', checkNarrow, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('resize', checkNarrow)
})

function openPolaroid(p: Poem): void {
  void router.push({ name: 'polaroid', params: { slug: p.slug } })
}
</script>

<template>
  <main
    class="home"
    :data-rm="reducedMotion ? 'true' : 'false'"
    :data-narrow="isNarrow ? 'true' : 'false'"
    aria-label="stanza"
  >
    <!-- atmospheric layers -->
    <div class="home__atmosphere" aria-hidden="true">
      <div class="home__sky"></div>
      <div class="home__beams"></div>
      <div class="home__floor"></div>
      <div class="home__moonbeam"></div>
      <div class="home__grain"></div>
    </div>

    <!-- floating dust motes -->
    <div class="home__dust" aria-hidden="true">
      <span
        v-for="i in 12"
        :key="i"
        :style="{ '--i': i }"
        class="home__dust-mote"
      ></span>
    </div>

    <!-- candle echo on the desk -->
    <svg
      class="home__candle-echo"
      viewBox="0 0 32 56"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M 12 18 L 12 44 Q 12 46, 14 46 L 18 46 Q 20 46, 20 44 L 20 18 Q 20 16, 18 16 L 14 16 Q 12 16, 12 18 Z"
        fill="var(--c-paper-200)"
        opacity="0.85"
      />
      <path d="M 15 8 Q 15 12, 16 16 L 16 16 Q 17 12, 17 8 Z" fill="var(--c-soot-900)" />
      <ellipse cx="16" cy="7" rx="1.2" ry="1.5" fill="var(--c-soot-900)" />
      <path d="M 8 46 Q 8 48, 10 48 L 22 48 Q 24 48, 24 46 Z" fill="#3a2c1c" />
      <ellipse cx="16" cy="49" rx="9" ry="2" fill="#1a140c" />
    </svg>

    <!-- top-right: zoom controls -->
    <div class="home__controls">
      <ZoomControls />
    </div>

    <!-- the room -->
    <div
      class="home__room"
      :style="{ '--active-rope': activeRope }"
    >
      <div
        v-for="(rope, ropeIdx) in ropes"
        :key="ropeIdx"
        class="home__rope"
        :data-active="ropeIdx === activeRope ? 'true' : 'false'"
        :inert="isNarrow && ropeIdx !== activeRope ? true : undefined"
      >
        <div class="home__rope-line" aria-hidden="true"></div>
        <ul class="home__pegs">
          <li
            v-for="(p, polIdx) in rope"
            :key="p.slug"
            class="home__peg-item"
            :style="{ '--peg-idx': polIdx }"
          >
            <button
              class="home__polaroid"
              type="button"
              :style="{
                '--rot': `${p.rotation}deg`,
                '--lift-delay': `${p.liftDelay}ms`,
              }"
              :aria-label="`${p.title}, ${p.date}`"
              @click="openPolaroid(p)"
            >
              <span class="home__peg" aria-hidden="true">
                <svg viewBox="0 0 32 38" aria-hidden="true" focusable="false">
                  <defs>
                    <linearGradient id="peg-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stop-color="#5a4530" />
                      <stop offset="55%" stop-color="#3a2c1c" />
                      <stop offset="100%" stop-color="#1a140c" />
                    </linearGradient>
                  </defs>
                  <!-- top jaw -->
                  <path
                    d="M 6 2 L 26 2 Q 28 2, 28 4 L 28 16 Q 28 18, 26 18 L 22 18 L 22 22 L 10 22 L 10 18 L 6 18 Q 4 18, 4 16 L 4 4 Q 4 2, 6 2 Z"
                    fill="url(#peg-grad)"
                  />
                  <!-- bottom jaw -->
                  <path
                    d="M 9 22 L 23 22 Q 25 22, 25 24 L 25 34 Q 25 36, 23 36 L 9 36 Q 7 36, 7 34 L 7 24 Q 7 22, 9 22 Z"
                    fill="url(#peg-grad)"
                  />
                  <!-- center spring -->
                  <line x1="16" y1="6" x2="16" y2="22" stroke="rgba(0,0,0,0.5)" stroke-width="1" />
                  <circle cx="16" cy="14" r="1.3" fill="#1a140c" />
                </svg>
              </span>

              <span class="home__card">
                <span class="home__photo">
                  <img
                    :src="`${baseUrl}photos/${p.file}`"
                    :alt="p.alt ?? p.title"
                    loading="lazy"
                    decoding="async"
                  />
                  <span class="home__photo-shine" aria-hidden="true"></span>
                </span>
                <span class="home__caption">
                  <span class="home__caption-title">{{ p.title }}</span>
                  <span class="home__caption-date">{{ p.date }}</span>
                </span>
                <!-- ground shadow on the floor -->
                <span class="home__card-shadow" aria-hidden="true"></span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- carousel indicator (only on narrow viewports) -->
    <nav
      v-if="isNarrow"
      class="home__indicator"
      aria-label="navigazione fili"
    >
      <button
        v-for="i in totalRopes"
        :key="i"
        class="home__indicator-dot"
        type="button"
        :data-active="i - 1 === activeRope ? 'true' : 'false'"
        :aria-label="`filo ${i} di ${totalRopes}`"
        :aria-current="i - 1 === activeRope ? 'true' : undefined"
        @click="setActiveRope(i - 1)"
      ></button>
    </nav>

    <!-- candle-cursor mask -->
    <div class="home__darkness" aria-hidden="true"></div>

    <!-- the cursor IS a tiny candle (with flame) following the pointer -->
    <svg
      class="home__cursor-candle"
      viewBox="0 0 28 56"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cursor-wax" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f1e6cf" />
          <stop offset="100%" stop-color="#d6c8a8" />
        </linearGradient>
        <radialGradient id="cursor-flame" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stop-color="#fff5d2" />
          <stop offset="35%" stop-color="#f4d08a" />
          <stop offset="70%" stop-color="#e8b057" />
          <stop offset="100%" stop-color="rgba(232,176,87,0)" />
        </radialGradient>
        <radialGradient id="cursor-flame-core" cx="50%" cy="55%" r="40%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="60%" stop-color="#fff0c7" />
          <stop offset="100%" stop-color="rgba(255,240,199,0)" />
        </radialGradient>
      </defs>

      <g class="home__cursor-flame-group">
        <ellipse cx="14" cy="10" rx="6.5" ry="9" fill="url(#cursor-flame)" />
        <ellipse cx="14" cy="11" rx="3" ry="5.5" fill="url(#cursor-flame-core)" />
      </g>

      <rect x="13.4" y="16" width="1.2" height="6" fill="#1a140c" />

      <rect x="10" y="22" width="8" height="22" rx="1" fill="url(#cursor-wax)" />
      <rect x="10" y="22" width="2" height="22" fill="rgba(0,0,0,0.18)" />
      <rect x="16" y="22" width="2" height="22" fill="rgba(0,0,0,0.16)" />
      <ellipse cx="14" cy="22" rx="4" ry="0.9" fill="#e9dfc9" />

      <rect x="8" y="44" width="12" height="3" rx="0.5" fill="#3a2c1c" />
      <ellipse cx="14" cy="47.5" rx="8" ry="1.5" fill="#1a140c" />
    </svg>
  </main>
</template>

<style scoped>
.home {
  --light-radius: clamp(160px, 26vw, 280px);
  --light-soft: clamp(220px, 34vw, 380px);
  --darkness-floor: 0.93;
  --darkness-floor-touch: 0.96;
  --polaroid-w: clamp(96px, 11vw, 152px);
  --polaroid-h: calc(var(--polaroid-w) * 1.22);
  --polaroid-photo-h: calc(var(--polaroid-w) * 0.92);
  --grain-opacity: 0.05;
  --moonbeam-opacity: 0.075;
  --dust-opacity: 0.55;
  --candle-warmth: 250, 220, 170;
  --rope-fade: 350ms;
}

.home {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--c-soot-900);
  cursor: none;
}
@media (pointer: coarse) {
  .home {
    cursor: auto;
  }
}

/* ── atmosphere ── */
.home__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.home__sky {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      to right,
      transparent 0,
      transparent 38px,
      rgba(58, 44, 28, 0.06) 38px,
      rgba(58, 44, 28, 0.06) 39px
    ),
    radial-gradient(
      ellipse 18% 26% at 78% 26%,
      rgba(242, 217, 164, 0.12) 0%,
      rgba(242, 217, 164, 0.06) 50%,
      transparent 80%
    ),
    radial-gradient(
      ellipse 90% 80% at 50% 8%,
      var(--c-soot-700) 0%,
      var(--c-soot-800) 55%,
      var(--c-soot-900) 100%
    );
}

.home__sky::before {
  content: '';
  position: absolute;
  width: 14%;
  height: 22%;
  top: 14%;
  right: 12%;
  background:
    linear-gradient(
      to right,
      transparent 49.6%,
      rgba(0, 0, 0, 0.5) 49.6%,
      rgba(0, 0, 0, 0.5) 50.4%,
      transparent 50.4%
    ),
    linear-gradient(
      to bottom,
      transparent 49.6%,
      rgba(0, 0, 0, 0.5) 49.6%,
      rgba(0, 0, 0, 0.5) 50.4%,
      transparent 50.4%
    ),
    linear-gradient(135deg, rgba(242, 217, 164, 0.16), rgba(208, 188, 140, 0.08));
  border: 1px solid rgba(0, 0, 0, 0.45);
  box-shadow:
    inset 0 0 14px rgba(0, 0, 0, 0.55),
    0 0 30px rgba(242, 217, 164, 0.07);
  opacity: 0.9;
}

.home__sky::after {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  top: 18%;
  right: 15%;
  border-radius: 50%;
  background: radial-gradient(circle, #f3e6c0 0%, #d8c89c 60%, #8a7a52 100%);
  box-shadow: 0 0 30px 6px rgba(242, 217, 164, 0.25);
  opacity: 0.95;
}

.home__beams {
  position: absolute;
  inset: 0 0 auto 0;
  height: 26%;
  background:
    linear-gradient(to top, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.5) 100%),
    linear-gradient(
      to bottom,
      transparent 35%,
      rgba(0, 0, 0, 0.55) 35.4%,
      rgba(0, 0, 0, 0.55) 35.9%,
      transparent 36.3%
    ),
    linear-gradient(
      to bottom,
      transparent 65%,
      rgba(0, 0, 0, 0.55) 65.4%,
      rgba(0, 0, 0, 0.55) 65.9%,
      transparent 66.3%
    ),
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.06) 0,
      rgba(0, 0, 0, 0.06) 2px,
      transparent 2px,
      transparent 100px
    ),
    linear-gradient(to bottom, var(--c-wood-600) 0%, #1a140c 100%);
  opacity: 0.92;
  z-index: 1;
}

.home__floor {
  position: absolute;
  inset: auto 0 0 0;
  height: 16%;
  background:
    linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 80%),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0, rgba(0, 0, 0, 0.15) 2%, transparent 5%),
    repeating-linear-gradient(
      to bottom,
      rgba(58, 44, 28, 0.18) 0,
      rgba(58, 44, 28, 0.18) 1px,
      transparent 1px,
      transparent 5px
    ),
    linear-gradient(to bottom, var(--c-soot-800) 0%, var(--c-wood-600) 50%, #1a140c 100%);
  opacity: 0.95;
  z-index: 1;
}

.home__moonbeam {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgba(242, 217, 164, calc(var(--moonbeam-opacity) * 0.5)) 44%,
    rgba(242, 217, 164, var(--moonbeam-opacity)) 50%,
    rgba(242, 217, 164, calc(var(--moonbeam-opacity) * 0.5)) 56%,
    transparent 70%
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

.home__grain {
  position: absolute;
  inset: -10%;
  z-index: 3;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 180px 180px;
  opacity: var(--grain-opacity);
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* ── dust ── */
.home__dust {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}
.home__dust-mote {
  position: absolute;
  display: block;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(244, 208, 138, var(--dust-opacity));
  filter: blur(0.6px);
  top: calc((var(--i) * 67 / 100) * 1%);
  left: calc((var(--i) * 53 / 100) * 1%);
  animation: home-dust-drift calc(8s + var(--i) * 0.7s) ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.5s);
  opacity: 0;
}
@keyframes home-dust-drift {
  0%,
  100% {
    transform: translate(0, 0);
    opacity: 0;
  }
  10% {
    opacity: 0.55;
  }
  50% {
    transform: translate(calc(var(--i) * 1.5px), calc(-30px - var(--i) * 1px));
    opacity: 0.75;
  }
  90% {
    opacity: 0.3;
  }
}

/* ── candle echo ── */
.home__candle-echo {
  position: absolute;
  z-index: 5;
  width: clamp(24px, 3vw + 12px, 40px);
  height: auto;
  bottom: clamp(var(--sp-md), 4vh, var(--sp-xl));
  right: clamp(var(--sp-md), 4vw, var(--sp-2xl));
  filter: drop-shadow(var(--shadow-candle-cold));
  opacity: 0.85;
  pointer-events: none;
}

/* ── top-right zoom controls ── */
.home__controls {
  position: absolute;
  z-index: 9;
  top: clamp(var(--sp-sm), 2vh, var(--sp-md));
  right: clamp(var(--sp-sm), 2vw, var(--sp-md));
}

/* ── room layout ── */
.home__room {
  position: relative;
  z-index: 6;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  padding: clamp(36px, 8vh, 72px) clamp(var(--sp-md), 3vw, var(--sp-2xl))
    clamp(40px, 7vh, 80px);
  pointer-events: auto;
}

.home__rope {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.home__rope-line {
  position: absolute;
  top: 0;
  left: 5%;
  right: 5%;
  height: 2px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(180, 158, 120, 0.18) 4%,
    rgba(214, 200, 168, 0.5) 50%,
    rgba(180, 158, 120, 0.18) 96%,
    transparent 100%
  );
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
}

.home__pegs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: clamp(var(--sp-md), 3vw, var(--sp-2xl));
  width: 100%;
  flex-wrap: nowrap;
}

.home__peg-item {
  display: block;
}

.home__polaroid {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  position: relative;
  display: block;
  transform: rotate(var(--rot, 0deg));
  transform-origin: 50% 8%;
  transition:
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1) var(--lift-delay, 0ms),
    filter 320ms ease-out var(--lift-delay, 0ms);
  /* tilt the card slightly forward toward the viewer at rest */
  perspective: 1000px;
}

/* a slow gentle sway on idle (deterministic, paused under reduced-motion) */
@keyframes home-sway {
  0%,
  100% {
    transform: rotate(var(--rot, 0deg)) translateX(0);
  }
  50% {
    transform: rotate(calc(var(--rot, 0deg) + 0.3deg)) translateX(2px);
  }
}
.home__polaroid {
  animation: home-sway calc(6s + var(--peg-idx, 0) * 0.4s) ease-in-out infinite;
  animation-delay: calc(var(--peg-idx, 0) * -1.1s);
}

.home__polaroid:focus-visible {
  outline: none;
}
.home__polaroid:focus-visible .home__card {
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.5),
    0 18px 36px -10px rgba(0, 0, 0, 0.85),
    0 4px 12px -2px rgba(0, 0, 0, 0.6),
    0 0 0 3px var(--c-focus);
}

@media (hover: hover) and (pointer: fine) {
  .home__polaroid:hover {
    animation-play-state: paused;
    transform: rotate(calc(var(--rot, 0deg) * 0.3)) translateY(-8px) scale(1.03);
  }
  .home__polaroid:hover .home__card {
    box-shadow:
      0 1px 0 rgba(255, 245, 220, 0.55),
      0 28px 56px -10px rgba(0, 0, 0, 0.95),
      0 8px 18px -2px rgba(0, 0, 0, 0.7),
      0 0 24px 2px rgba(244, 208, 138, 0.18);
  }
  .home__polaroid:hover .home__card-shadow {
    transform: translateX(-50%) translateY(8px) scale(0.85);
    opacity: 0.55;
  }
}

.home__peg {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: clamp(20px, 2.4vw, 28px);
  height: auto;
  z-index: 2;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.65));
}
.home__peg svg {
  width: 100%;
  height: auto;
  display: block;
}

.home__card {
  position: relative;
  display: block;
  width: var(--polaroid-w);
  height: var(--polaroid-h);
  background: linear-gradient(to bottom, #f4ecd6 0%, var(--c-paper-100) 35%, #ddd0b0 100%);
  border-radius: 1px;
  padding: 6% 6% 0 6%;
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.4),
    0 14px 28px -10px rgba(0, 0, 0, 0.75),
    0 3px 8px -2px rgba(0, 0, 0, 0.5);
  transition: box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1);
}
.home__card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='17' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.06  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
  background-size: 200px 200px;
  opacity: 0.06;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.home__card-shadow {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%) scale(0.7);
  width: 80%;
  height: 14px;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(5px);
  opacity: 0.75;
  z-index: -1;
  transition:
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 320ms ease-out;
}

.home__photo {
  position: relative;
  display: block;
  width: 100%;
  height: var(--polaroid-photo-h);
  background: var(--c-soot-800);
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(0, 0, 0, 0.5);
}
.home__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: brightness(0.92) contrast(1.05);
}

.home__photo-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0) 70%,
    rgba(0, 0, 0, 0.12) 100%
  );
  pointer-events: none;
  mix-blend-mode: screen;
}

.home__caption {
  position: relative;
  display: block;
  text-align: center;
  padding: 7% 4% 0;
  color: var(--c-ink-700);
}
.home__caption-title {
  display: block;
  font:
    400 calc(clamp(10px, 0.9vw + 6px, 13px) * var(--user-font-scale, 1)) / 1.25 'Cormorant Garamond',
    serif;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.home__caption-date {
  display: block;
  margin-top: 2px;
  font:
    400 calc(clamp(8px, 0.6vw + 5px, 10px) * var(--user-font-scale, 1)) / 1.2 'Cormorant Garamond',
    serif;
  font-style: italic;
  opacity: 0.6;
}

/* ── narrow viewport: carousel mode ── */
@media (max-width: 767px) {
  .home__room {
    /* one rope visible at a time */
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 0;
    gap: 0;
    transform: translateX(calc(var(--active-rope, 0) * -100%));
    transition: transform var(--rope-fade) cubic-bezier(0.65, 0, 0.35, 1);
  }
  .home__rope {
    flex: 0 0 100vw;
    width: 100vw;
    height: 100%;
    align-items: center;
    padding: clamp(48px, 10vh, 80px) var(--sp-md) clamp(80px, 14vh, 120px);
  }
  .home__rope[data-active='false'] {
    opacity: 0.35;
  }
  .home__pegs {
    flex-wrap: nowrap;
    justify-content: center;
    gap: var(--sp-md);
  }
}

/* ── carousel indicator (mobile only) ── */
.home__indicator {
  position: absolute;
  z-index: 9;
  bottom: clamp(var(--sp-md), 4vh, var(--sp-xl));
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  gap: var(--sp-sm);
  padding: var(--sp-xs) var(--sp-sm);
  background: rgba(0, 0, 0, 0.45);
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.home__indicator-dot {
  appearance: none;
  background: transparent;
  border: 1px solid rgba(244, 208, 138, 0.45);
  border-radius: 50%;
  width: 9px;
  height: 9px;
  padding: 0;
  cursor: pointer;
  transition:
    background 200ms ease-out,
    border-color 200ms ease-out,
    transform 200ms ease-out;
}
.home__indicator-dot[data-active='true'] {
  background: var(--c-focus);
  border-color: var(--c-focus);
  transform: scale(1.3);
  box-shadow: 0 0 8px 2px rgba(244, 208, 138, 0.5);
}
.home__indicator-dot:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 3px;
}

/* ── candle-cursor mask ── */
.home__darkness {
  position: fixed;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  background: radial-gradient(
    circle var(--light-soft) at var(--mx, 50%) var(--my, 50%),
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, calc(0.55 * var(--darkness-floor))) calc(var(--light-radius) * 0.55),
    rgba(0, 0, 0, var(--darkness-floor)) calc(var(--light-soft) * 0.85)
  );
}

.home::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  background: radial-gradient(
    circle calc(var(--light-soft) * 0.7) at var(--mx, 50%) var(--my, 50%),
    rgba(var(--candle-warmth), calc(0.12 * var(--lit, 0))) 0%,
    rgba(var(--candle-warmth), 0) 70%
  );
  mix-blend-mode: screen;
}

/* the cursor candle SVG follows the pointer */
.home__cursor-candle {
  position: fixed;
  width: clamp(28px, 3vw + 16px, 44px);
  height: auto;
  left: var(--mx, 50%);
  top: var(--my, 50%);
  transform: translate(-50%, -68%);
  z-index: 8;
  pointer-events: none;
  filter: drop-shadow(0 0 14px rgba(244, 208, 138, calc(0.5 * var(--lit, 0))))
    drop-shadow(0 0 28px rgba(232, 176, 87, calc(0.3 * var(--lit, 0))));
}

.home__cursor-flame-group {
  opacity: var(--lit, 0);
  transform-origin: 14px 19px;
  transition: opacity 200ms ease-out;
  animation: home-flame-flicker 2.4s ease-in-out infinite;
}
@keyframes home-flame-flicker {
  0%,
  100% {
    transform: scale(1) translateY(0) rotate(0deg);
  }
  20% {
    transform: scale(1.06, 0.95) translateY(-0.6px) rotate(-1.2deg);
  }
  45% {
    transform: scale(0.94, 1.07) translateY(0.4px) rotate(1.4deg);
  }
  70% {
    transform: scale(1.04, 0.97) translateY(-0.3px) rotate(-0.8deg);
  }
}

/* on touch devices, the cursor candle is hidden — there's no pointer hover */
@media (pointer: coarse) {
  .home__cursor-candle {
    display: none;
  }
  .home__darkness {
    --darkness-floor: var(--darkness-floor-touch);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home__dust-mote,
  .home__cursor-flame-group,
  .home__polaroid {
    animation: none !important;
  }
  .home__polaroid:hover {
    transform: rotate(var(--rot, 0deg)) translateY(-3px);
  }
  .home__room {
    transition: none !important;
  }
}

.home[data-rm='true'] .home__dust-mote {
  display: none;
}
</style>
