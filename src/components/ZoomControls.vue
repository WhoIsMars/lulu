<script setup lang="ts">
import { useTextScale } from '@/composables/useTextScale'

const { increase, decrease, reset, canIncrease, canDecrease, scale } = useTextScale()
</script>

<template>
  <div
    class="zoom"
    role="group"
    aria-label="dimensione testo"
  >
    <button
      class="zoom__btn"
      type="button"
      :disabled="!canDecrease()"
      aria-label="diminuisci dimensione testo"
      @click="decrease"
    >
      <span class="zoom__glyph zoom__glyph--minus">A−</span>
    </button>
    <button
      class="zoom__btn zoom__btn--reset"
      type="button"
      :aria-label="`dimensione testo ${Math.round(scale * 100)} percento, ripristina al 100`"
      @click="reset"
    >
      <span class="zoom__pct">{{ Math.round(scale * 100) }}%</span>
    </button>
    <button
      class="zoom__btn"
      type="button"
      :disabled="!canIncrease()"
      aria-label="aumenta dimensione testo"
      @click="increase"
    >
      <span class="zoom__glyph zoom__glyph--plus">A+</span>
    </button>
  </div>
</template>

<style scoped>
.zoom {
  display: inline-flex;
  align-items: stretch;
  gap: 1px;
  padding: 2px;
  border-radius: 2px;
  background: linear-gradient(to bottom, rgba(58, 44, 28, 0.55) 0%, rgba(26, 20, 12, 0.7) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 245, 220, 0.06),
    0 4px 12px -4px rgba(0, 0, 0, 0.6);
  /* not affected by user font scale (controls the scale, would create feedback loop) */
  font-size: 14px;
}

.zoom__btn {
  appearance: none;
  background: linear-gradient(to bottom, #ebdcb8 0%, var(--c-paper-200) 60%, #c8b694 100%);
  border: 0;
  border-radius: 1px;
  min-width: 36px;
  min-height: 36px;
  padding: 0 var(--sp-sm);
  color: var(--c-ink-900);
  cursor: pointer;
  font:
    400 14px / 1 'Cormorant Garamond',
    serif;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 150ms ease-out,
    transform 150ms ease-out;
  position: relative;
}
@media (min-width: 768px) {
  .zoom__btn {
    min-width: 44px;
    min-height: 44px;
  }
}
.zoom__btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='z'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.05  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23z)'/></svg>");
  background-size: 120px 120px;
  opacity: 0.08;
  mix-blend-mode: multiply;
  border-radius: inherit;
  pointer-events: none;
}
.zoom__btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #f1e3c2 0%, var(--c-paper-100) 60%, #d6c2a0 100%);
  transform: translateY(-1px);
}
.zoom__btn:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 3px;
  z-index: 1;
}
.zoom__btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.zoom__btn--reset {
  min-width: 48px;
  font-size: 11px;
  font-style: italic;
  color: var(--c-ink-700);
}
.zoom__glyph,
.zoom__pct {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .zoom__btn {
    transition: none !important;
  }
  .zoom__btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
