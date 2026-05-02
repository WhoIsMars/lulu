<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { usePointerLight } from '@/composables/usePointerLight'
import { poems, type Poem } from '@/data/poems'
import ZoomControls from '@/components/ZoomControls.vue'

const router = useRouter()
const reducedMotion = useReducedMotion()
usePointerLight()

const baseUrl = import.meta.env.BASE_URL

/**
 * Distribute ALL poems across 3 ropes — dynamic so adding/removing entries
 * in manifest.yaml never drops polaroids from view.
 */
const ROPE_COUNT = 3
const perRope = Math.ceil(poems.length / ROPE_COUNT)
const ropes: Poem[][] = Array.from({ length: ROPE_COUNT }, (_, i) =>
  poems.slice(i * perRope, (i + 1) * perRope),
).filter((r) => r.length > 0)

function openPolaroid(p: Poem): void {
  void router.push({ name: 'polaroid', params: { slug: p.slug } })
}
</script>

<template>
  <main
    class="home"
    :data-rm="reducedMotion ? 'true' : 'false'"
    aria-label="stanza"
  >
    <!-- atmosphere: pitch black with ONE strong moonbeam from upper-right -->
    <div class="home__atmosphere" aria-hidden="true">
      <div class="home__base"></div>
      <div class="home__moonbeam"></div>
      <div class="home__floor-light"></div>
      <div class="home__grain"></div>
    </div>

    <!-- top-right zoom -->
    <div class="home__controls">
      <ZoomControls />
    </div>

    <!-- room: 3 ropes, each polaroid hangs from its peg, the rope CURVES -->
    <div class="home__room">
      <div
        v-for="(rope, ropeIdx) in ropes"
        :key="ropeIdx"
        class="home__rope"
        :data-rope="ropeIdx"
      >
        <!-- The actual rope is an SVG curve so it can sag organically -->
        <svg
          class="home__rope-line"
          viewBox="0 0 1000 40"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M 0 4 Q 250 32, 500 36 T 1000 4"
            stroke="rgba(214, 200, 168, 0.32)"
            stroke-width="1.2"
            fill="none"
            stroke-linecap="round"
          />
          <path
            d="M 0 5 Q 250 33, 500 37 T 1000 5"
            stroke="rgba(0, 0, 0, 0.45)"
            stroke-width="1"
            fill="none"
            stroke-linecap="round"
          />
        </svg>

        <ul class="home__pegs">
          <li
            v-for="(p, polIdx) in rope"
            :key="p.slug"
            class="home__peg-item"
            :style="{
              '--peg-idx': polIdx,
              '--rope-idx': ropeIdx,
              '--rot': `${p.rotation}deg`,
            }"
          >
            <button
              class="home__polaroid"
              type="button"
              :aria-label="`${p.title}, ${p.date}`"
              @click="openPolaroid(p)"
            >
              <span class="home__peg" aria-hidden="true">
                <svg viewBox="0 0 26 32" aria-hidden="true" focusable="false">
                  <defs>
                    <linearGradient id="peg-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stop-color="#7a5e3c" />
                      <stop offset="40%" stop-color="#4a3722" />
                      <stop offset="100%" stop-color="#1a1108" />
                    </linearGradient>
                    <linearGradient id="peg-shine" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stop-color="rgba(255,225,170,0.45)" />
                      <stop offset="50%" stop-color="rgba(255,225,170,0)" />
                    </linearGradient>
                  </defs>
                  <!-- single rounded rectangle peg with light highlight on left -->
                  <rect x="6" y="2" width="14" height="28" rx="2" fill="url(#peg-grad)" />
                  <rect x="6" y="2" width="3" height="28" rx="2" fill="url(#peg-shine)" />
                  <rect x="11" y="6" width="1" height="20" fill="rgba(0,0,0,0.55)" />
                  <circle cx="13" cy="14" r="1" fill="#0a0604" />
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
                  <span class="home__photo-grain" aria-hidden="true"></span>
                  <span class="home__photo-vignette" aria-hidden="true"></span>
                </span>
                <span class="home__caption">
                  {{ p.title }}
                </span>
                <!-- ground shadow + warm glow halo (activates on hover) -->
                <span class="home__card-shadow" aria-hidden="true"></span>
                <span class="home__card-glow" aria-hidden="true"></span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- candle-cursor mask -->
    <div class="home__darkness" aria-hidden="true"></div>

    <!-- candle SVG that follows the pointer (refined silhouette) -->
    <svg
      class="home__cursor-candle"
      viewBox="0 0 32 80"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cursor-wax-v" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f6ecd2" />
          <stop offset="40%" stop-color="#e9dfc9" />
          <stop offset="100%" stop-color="#c2b48f" />
        </linearGradient>
        <linearGradient id="cursor-wax-side" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(0,0,0,0.32)" />
          <stop offset="35%" stop-color="rgba(0,0,0,0)" />
          <stop offset="65%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.36)" />
        </linearGradient>
        <radialGradient id="cursor-flame-outer" cx="50%" cy="65%" r="55%">
          <stop offset="0%" stop-color="#fff8dc" />
          <stop offset="30%" stop-color="#f9d97c" />
          <stop offset="65%" stop-color="#e8a046" />
          <stop offset="100%" stop-color="rgba(232,146,46,0)" />
        </radialGradient>
        <radialGradient id="cursor-flame-core" cx="50%" cy="60%" r="40%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#fff0c2" />
          <stop offset="100%" stop-color="rgba(255,240,194,0)" />
        </radialGradient>
        <linearGradient id="brass-cap" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#7a5e3c" />
          <stop offset="55%" stop-color="#3a2c1c" />
          <stop offset="100%" stop-color="#16100a" />
        </linearGradient>
      </defs>

      <!-- flame group -->
      <g class="home__cursor-flame-group">
        <ellipse cx="16" cy="14" rx="6" ry="11" fill="url(#cursor-flame-outer)" />
        <ellipse cx="16" cy="16" rx="2.4" ry="6" fill="url(#cursor-flame-core)" />
      </g>

      <!-- wick -->
      <rect x="15.4" y="22" width="1.2" height="6" fill="#0a0604" />

      <!-- wax body — taller, slimmer, with a single drip on right -->
      <path
        d="M 12 28 L 12 64 Q 12 67, 14 67 L 18 67 Q 20 67, 20 64 L 20 28 Q 20 27, 16 27 Q 12 27, 12 28 Z"
        fill="url(#cursor-wax-v)"
      />
      <!-- side shading -->
      <path
        d="M 12 28 L 12 64 Q 12 67, 14 67 L 18 67 Q 20 67, 20 64 L 20 28 Z"
        fill="url(#cursor-wax-side)"
      />
      <!-- single wax drip on right -->
      <path
        d="M 20 46 Q 21.6 50, 21.4 54 Q 21 57, 20 56 Q 20 52, 20 50 Z"
        fill="#d8c6a0"
        opacity="0.85"
      />
      <!-- pooled wax rim at top -->
      <ellipse cx="16" cy="28" rx="4.2" ry="0.9" fill="#e9dfc9" />
      <ellipse cx="16" cy="28" rx="2.5" ry="0.4" fill="#aa9e7a" />

      <!-- brass cap / saucer -->
      <rect x="9" y="67" width="14" height="3" rx="0.4" fill="url(#brass-cap)" />
      <ellipse cx="16" cy="71" rx="9" ry="1.6" fill="url(#brass-cap)" />
      <ellipse cx="16" cy="72.3" rx="10" ry="1" fill="#0a0604" opacity="0.95" />
    </svg>
  </main>
</template>

<style scoped>
.home {
  /* candle-cursor light radius */
  --light-radius: clamp(7rem, 22vw, 14rem);
  --light-soft: clamp(11rem, 32vw, 20rem);
  --darkness-floor: 0.95;
  --darkness-floor-touch: 0.97;
  /* polaroid sizing — fits 5 per rope, 3 ropes, in any viewport */
  --polaroid-w: clamp(4.2rem, 11vw, 10rem);
  --polaroid-h: calc(var(--polaroid-w) * 1.26);
  --polaroid-photo-h: calc(var(--polaroid-w) * 0.96);
  --rope-gap-h: clamp(0.45rem, 2vw, 1.8rem);
  --rope-gap-v: clamp(0.3rem, 3vh, 1.4rem);
  --grain-opacity: 0.06;
  --moonbeam-strength: 0.18;
  --candle-warmth: 250, 220, 170;
}

.home {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #050402;
  cursor: none;
}
.home,
.home * {
  cursor: none !important;
}
@media (pointer: coarse) {
  .home,
  .home * {
    cursor: auto !important;
  }
}

/* ── atmosphere ── */
.home__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* base layer: pitch black with subtle radial warmth bottom-center */
.home__base {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 35% at 50% 105%, rgba(168, 90, 58, 0.06) 0%, transparent 65%),
    radial-gradient(ellipse 90% 80% at 50% 50%, var(--c-soot-800) 0%, #050402 75%);
}

/* moonbeam: ONE strong diagonal slash from upper-right, illuminates a slice */
.home__moonbeam {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 25%,
    rgba(232, 220, 195, calc(var(--moonbeam-strength) * 0.4)) 38%,
    rgba(232, 220, 195, var(--moonbeam-strength)) 47%,
    rgba(232, 220, 195, calc(var(--moonbeam-strength) * 0.55)) 53%,
    transparent 65%
  );
  mix-blend-mode: screen;
}
/* dust particles within the moonbeam — slow drift */
.home__moonbeam::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle 1px at 28% 20%, rgba(248, 232, 198, 0.85), transparent 50%),
    radial-gradient(circle 1.2px at 35% 35%, rgba(248, 232, 198, 0.7), transparent 50%),
    radial-gradient(circle 0.8px at 42% 50%, rgba(248, 232, 198, 0.6), transparent 50%),
    radial-gradient(circle 1px at 49% 62%, rgba(248, 232, 198, 0.75), transparent 50%),
    radial-gradient(circle 0.8px at 56% 78%, rgba(248, 232, 198, 0.55), transparent 50%),
    radial-gradient(circle 1.2px at 30% 70%, rgba(248, 232, 198, 0.65), transparent 50%),
    radial-gradient(circle 0.9px at 44% 28%, rgba(248, 232, 198, 0.55), transparent 50%);
  mix-blend-mode: screen;
  animation: home-dust-drift 14s linear infinite;
}
@keyframes home-dust-drift {
  from { transform: translate(0, 0); }
  to { transform: translate(-12px, -22px); }
}

/* faint floor highlight — a soft pool where the moonbeam hits the floor */
.home__floor-light {
  position: absolute;
  inset: auto 0 0 0;
  height: 30%;
  background: radial-gradient(
    ellipse 30% 60% at 65% 100%,
    rgba(232, 220, 195, 0.06) 0%,
    transparent 70%
  );
  mix-blend-mode: screen;
}

.home__grain {
  position: absolute;
  inset: -10%;
  z-index: 3;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.85  0 0 0 0 0.74  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 220px 220px;
  opacity: var(--grain-opacity);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.home__controls {
  position: absolute;
  z-index: 9;
  top: clamp(0.5rem, 2vh, 1rem);
  right: clamp(0.5rem, 2vw, 1rem);
}

/* ── room: 3 ropes evenly spaced ── */
.home__room {
  position: relative;
  z-index: 6;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  padding: clamp(1.6rem, 6vh, 3.6rem) clamp(0.5rem, 2vw, 2rem)
    clamp(1.2rem, 4vh, 2.4rem);
  gap: var(--rope-gap-v);
  pointer-events: auto;
}

.home__rope {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* the rope sags — SVG curve */
.home__rope-line {
  position: absolute;
  top: -0.5rem;
  left: 2%;
  right: 2%;
  width: 96%;
  height: 1.6rem;
  pointer-events: none;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.45));
}

.home__pegs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: var(--rope-gap-h);
  width: 100%;
  flex-wrap: nowrap;
  /* small per-rope offset to suggest different heights on each line */
}
.home__rope[data-rope='1'] .home__pegs {
  margin-top: 0.4rem;
}
.home__rope[data-rope='2'] .home__pegs {
  margin-top: 0.2rem;
}

.home__peg-item {
  display: block;
  /* each polaroid hangs slightly differently — odd ones drop a couple px more */
  margin-top: calc((var(--peg-idx, 0) % 2) * 4px);
}

/* ── POLAROID — strong physical hover ── */
.home__polaroid {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  position: relative;
  display: block;
  transform: rotate(var(--rot, 0deg));
  transform-origin: 50% 8%;
  perspective: 1000px;
  transition:
    transform 380ms cubic-bezier(0.18, 1, 0.32, 1),
    filter 380ms ease-out;
}

@keyframes home-sway {
  0%, 100% {
    transform: rotate(var(--rot, 0deg)) translateX(0);
  }
  50% {
    transform: rotate(calc(var(--rot, 0deg) + 0.4deg)) translateX(2px);
  }
}
.home__polaroid {
  animation: home-sway calc(7s + var(--peg-idx, 0) * 0.5s + var(--rope-idx, 0) * 0.3s)
    ease-in-out infinite;
  animation-delay: calc(var(--peg-idx, 0) * -1.3s + var(--rope-idx, 0) * -0.7s);
}

.home__polaroid:focus-visible {
  outline: none;
}
.home__polaroid:focus-visible .home__card {
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.5),
    0 22px 44px -12px rgba(0, 0, 0, 0.85),
    0 6px 14px -2px rgba(0, 0, 0, 0.6),
    0 0 0 3px var(--c-focus);
}

/* HOVER = MAGNIFYING LENS: polaroid leaps to foreground, scales 2.2×
   bringing photo to readable size. Pause sway. Heavy z-index lift. */
@media (hover: hover) and (pointer: fine) {
  .home__polaroid:hover {
    animation-play-state: paused;
    transform: rotate(0deg) translateY(-26px) scale(2.2);
    z-index: 50;
    transition:
      transform 380ms cubic-bezier(0.18, 1, 0.32, 1),
      filter 380ms ease-out;
  }
  .home__polaroid:hover .home__card {
    box-shadow:
      0 4px 0 rgba(255, 245, 220, 0.7),
      0 60px 100px -10px rgba(0, 0, 0, 0.98),
      0 24px 40px -6px rgba(0, 0, 0, 0.85),
      0 0 0 1px rgba(255, 245, 220, 0.25);
  }
  .home__polaroid:hover .home__card-glow {
    opacity: 1;
    transform: scale(1.6);
  }
  .home__polaroid:hover .home__card-shadow {
    transform: translateX(-50%) translateY(20px) scale(0.65);
    opacity: 0.35;
  }
  .home__polaroid:hover .home__photo img {
    filter: brightness(1.1) contrast(1.12) saturate(1.08);
    transform: scale(1.02);
  }
  .home__polaroid:hover .home__caption {
    color: rgba(58, 44, 28, 0.98);
  }
  .home__polaroid:hover .home__peg {
    /* peg follows the lift but doesn't scale — keeps proportion */
    transform: translateX(-50%) translateY(0);
  }
}

.home__polaroid:active {
  transform: rotate(calc(var(--rot, 0deg) * 0.4)) translateY(-5px) scale(0.97);
}

.home__peg {
  position: absolute;
  top: -1.05rem;
  left: 50%;
  transform: translateX(-50%);
  width: clamp(0.85rem, 2.2vw, 1.5rem);
  height: auto;
  z-index: 2;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
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
  background: linear-gradient(170deg, #f7efd8 0%, #ede2c4 50%, #d8c8a4 100%);
  border-radius: 1px;
  padding: 5% 5% 0 5%;
  box-shadow:
    0 1px 0 rgba(255, 245, 220, 0.45),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08),
    0 14px 28px -10px rgba(0, 0, 0, 0.78),
    0 4px 10px -2px rgba(0, 0, 0, 0.55);
  transition: box-shadow 380ms cubic-bezier(0.18, 1, 0.32, 1);
}
.home__card::before {
  /* paper grain on the polaroid frame */
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='2' seed='17' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.05  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
  background-size: 180px 180px;
  opacity: 0.07;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.home__card-glow {
  position: absolute;
  inset: -25%;
  background: radial-gradient(
    ellipse 60% 60% at 50% 50%,
    rgba(244, 208, 138, 0.4) 0%,
    rgba(232, 176, 87, 0.18) 35%,
    rgba(232, 176, 87, 0) 70%
  );
  opacity: 0;
  transform: scale(0.85);
  transition:
    opacity 400ms ease-out,
    transform 400ms cubic-bezier(0.18, 1, 0.32, 1);
  pointer-events: none;
  z-index: -1;
  filter: blur(10px);
}

.home__card-shadow {
  position: absolute;
  bottom: -1rem;
  left: 50%;
  transform: translateX(-50%) scale(0.75);
  width: 82%;
  height: 0.7rem;
  background: radial-gradient(
    ellipse 50% 50% at 50% 50%,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0) 70%
  );
  filter: blur(5px);
  opacity: 0.78;
  z-index: -1;
  transition:
    transform 380ms cubic-bezier(0.18, 1, 0.32, 1),
    opacity 380ms ease-out;
}

.home__photo {
  position: relative;
  display: block;
  width: 100%;
  height: var(--polaroid-photo-h);
  background: #0e0a05;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.55),
    inset 0 2px 5px rgba(0, 0, 0, 0.55),
    inset 0 -2px 4px rgba(0, 0, 0, 0.35);
}
.home__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* film treatment: slightly lower contrast/saturation when "in shadow" */
  filter: brightness(0.88) contrast(1.05) saturate(0.9);
  transition:
    filter 400ms ease-out,
    transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
}
.home__photo-grain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='fg'><feTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23fg)'/></svg>");
  background-size: 160px 160px;
  opacity: 0.12;
  mix-blend-mode: overlay;
  pointer-events: none;
}
.home__photo-vignette {
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

.home__caption {
  position: relative;
  display: block;
  text-align: center;
  padding: 6% 4% 0;
  font:
    400 clamp(0.55rem, 0.7vw + 0.32rem, 0.95rem) / 1.2 'Italianno',
    'Cormorant Garamond',
    cursive;
  letter-spacing: 0.005em;
  color: rgba(58, 44, 28, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 280ms ease-out;
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
    rgba(0, 0, 0, calc(0.5 * var(--darkness-floor))) calc(var(--light-radius) * 0.5),
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
    circle calc(var(--light-soft) * 0.65) at var(--mx, 50%) var(--my, 50%),
    rgba(var(--candle-warmth), calc(0.16 * var(--lit, 0))) 0%,
    rgba(var(--candle-warmth), 0) 70%
  );
  mix-blend-mode: screen;
}

.home__cursor-candle {
  position: fixed;
  width: clamp(22px, 2.4vw + 12px, 36px);
  height: auto;
  left: var(--mx, 50%);
  top: var(--my, 50%);
  transform: translate(-50%, -75%);
  z-index: 8;
  pointer-events: none;
  filter: drop-shadow(0 0 18px rgba(244, 208, 138, calc(0.55 * var(--lit, 0))))
    drop-shadow(0 0 36px rgba(232, 176, 87, calc(0.32 * var(--lit, 0))));
}

.home__cursor-flame-group {
  opacity: var(--lit, 0);
  transform-origin: 16px 22px;
  transition: opacity 220ms ease-out;
  animation: home-flame-flicker 2.6s ease-in-out infinite;
}
@keyframes home-flame-flicker {
  0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
  12% { transform: scale(1.08, 0.92) translate(-0.4px, -0.6px) rotate(-1.6deg); }
  28% { transform: scale(0.92, 1.08) translate(0.5px, 0.5px) rotate(1.8deg); }
  44% { transform: scale(1.05, 0.95) translate(-0.3px, -0.4px) rotate(-1deg); }
  62% { transform: scale(0.96, 1.06) translate(0.4px, 0.3px) rotate(1.2deg); }
  82% { transform: scale(1.02, 0.98) translate(-0.2px, -0.3px) rotate(-0.6deg); }
}

@media (pointer: coarse) {
  .home__cursor-candle {
    display: none;
  }
  .home__darkness {
    --darkness-floor: var(--darkness-floor-touch);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home__cursor-flame-group,
  .home__polaroid,
  .home__moonbeam::before {
    animation: none !important;
  }
  .home__polaroid:hover {
    transform: rotate(var(--rot, 0deg)) translateY(-5px);
  }
}
</style>
