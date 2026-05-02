<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGate } from '@/composables/useGate'
import { useReducedMotion } from '@/composables/useReducedMotion'

const router = useRouter()
const { verify } = useGate()
const reducedMotion = useReducedMotion()
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

const value = ref('')
const submitting = ref(false)
const errored = ref(false)

onMounted(() => inputEl.value?.focus())

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
  <main class="gate" :data-reduced-motion="reducedMotion ? 'true' : 'false'">
    <div class="gate__center">
      <!-- candela spenta — UI-SPEC §Candela. Inline SVG, no flame, no glow. Wick tip pulses during submit (default motion only). -->
      <svg
        class="gate__candle"
        :class="{ 'gate__candle--thinking': submitting && !reducedMotion }"
        viewBox="0 0 64 96"
        width="72"
        height="108"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="wax" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--c-paper-100)" />
            <stop offset="100%" stop-color="var(--c-paper-200)" />
          </linearGradient>
        </defs>
        <!-- wax body -->
        <rect x="22" y="24" width="20" height="64" rx="2" fill="url(#wax)" />
        <!-- wick -->
        <rect class="gate__wick" x="31" y="14" width="2" height="12" fill="var(--c-soot-900)" />
      </svg>

      <form class="gate__form" novalidate @submit.prevent="onSubmit">
        <div class="gate__strip" :class="{ 'gate__strip--shake': errored && !reducedMotion }">
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
        </div>
        <button class="gate__submit" type="submit" :aria-disabled="submitting || undefined">
          Entra
        </button>
      </form>

      <p role="status" aria-live="polite" class="gate__live">
        <span v-if="submitting">verifica in corso</span>
        <span v-else-if="errored" class="gate__error">password non corretta</span>
      </p>
    </div>
  </main>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  min-height: 100dvh; /* Pitfall 8 — iOS bottom-bar safe */
  display: grid;
  place-items: center;
  background:
    radial-gradient(
      ellipse 70% 50% at 50% 35%,
      var(--c-soot-700) 0%,
      var(--c-soot-800) 55%,
      var(--c-soot-900) 100%
    );
  padding: var(--sp-2xl) var(--sp-md);
}

@media (min-width: 1025px) {
  .gate {
    padding: var(--sp-3xl);
  }
}

.gate__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(420px, 100% - var(--sp-xl) * 2);
  gap: var(--sp-lg);
}

.gate__candle {
  width: clamp(56px, 5vw + 40px, 88px);
  height: auto;
  filter: drop-shadow(var(--shadow-candle-cold));
}

.gate__candle--thinking .gate__wick {
  animation: gate-wick-pulse 1.5s ease-in-out infinite;
}

@keyframes gate-wick-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.gate__form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-xl);
  width: 100%;
}

.gate__strip {
  width: clamp(220px, 60vw, 340px);
  min-height: 44px;
  padding: var(--sp-sm) var(--sp-md);
  background: var(--c-paper-100);
  border-radius: var(--radius-none);
  box-shadow:
    var(--shadow-paper),
    inset 0 1px 0 rgba(0, 0, 0, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
}

.gate__strip:focus-within {
  outline: 2px solid var(--c-focus);
  outline-offset: 4px;
}

.gate__strip--shake {
  animation: gate-shake var(--motion-duration-base) var(--motion-ease-out);
}

@keyframes gate-shake {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(calc(-1 * var(--motion-shake-amplitude)));
  }
  50% {
    transform: translateX(var(--motion-shake-amplitude));
  }
  75% {
    transform: translateX(calc(-0.5 * var(--motion-shake-amplitude)));
  }
  100% {
    transform: translateX(0);
  }
}

.gate__input {
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--c-ink-700);
  outline: 0;
  color: var(--c-ink-900);
  caret-color: var(--c-ink-700);
  font:
    400 var(--fs-body) / 1.5 'Cormorant Garamond',
    serif;
  padding: var(--sp-xs) 0;
  transition:
    border-bottom-color var(--motion-duration-fast) var(--motion-ease-soft),
    border-bottom-width var(--motion-duration-fast) var(--motion-ease-soft);
}

.gate__input:focus {
  border-bottom: 2px solid var(--c-ink-900);
}

.gate__input::placeholder {
  color: rgba(58, 44, 28, 0.5);
}

.gate__submit {
  width: clamp(220px, 60vw, 340px);
  min-height: 44px;
  padding: var(--sp-sm) var(--sp-md);
  background: var(--c-paper-200);
  color: var(--c-ink-700);
  border: 1px solid rgba(58, 44, 28, 0.25);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-paper);
  font:
    400 var(--fs-label) / 1.4 system-ui,
    sans-serif;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background var(--motion-duration-fast) var(--motion-ease-soft);
}

@media (hover: hover) and (pointer: fine) {
  .gate__submit:hover {
    background: var(--c-paper-100);
  }
}

.gate__submit:focus-visible {
  outline: 2px solid var(--c-focus);
  outline-offset: 3px;
}

.gate__submit[aria-disabled='true'] {
  cursor: progress;
  opacity: 0.6;
}

.gate__live {
  min-height: 1.5em; /* reserves vertical space so layout never shifts when message appears */
  margin: 0;
  font:
    400 var(--fs-label) / 1.4 system-ui,
    sans-serif;
  text-align: center;
}

.gate__error {
  color: var(--c-error);
  font-style: italic;
}
</style>
