import { ref, watch, onMounted } from 'vue'

const STORAGE_KEY = 'lulu:text-scale'
const DEFAULT_SCALE = 1
const MIN_SCALE = 0.85
const MAX_SCALE = 1.6
const STEP = 0.15

const scale = ref<number>(DEFAULT_SCALE)
let initialized = false

function clamp(v: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v * 100) / 100))
}

function applyScale(s: number): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--user-font-scale', String(s))
}

function init(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? Number(raw) : NaN
  scale.value = Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_SCALE
  applyScale(scale.value)
}

watch(scale, (s) => {
  if (typeof window === 'undefined') return
  applyScale(s)
  window.localStorage.setItem(STORAGE_KEY, String(s))
})

export function useTextScale(): {
  scale: typeof scale
  increase: () => void
  decrease: () => void
  reset: () => void
  canIncrease: () => boolean
  canDecrease: () => boolean
} {
  onMounted(init)
  // also init eagerly so SSR/early consumers don't see default flicker
  init()

  return {
    scale,
    increase: () => {
      scale.value = clamp(scale.value + STEP)
    },
    decrease: () => {
      scale.value = clamp(scale.value - STEP)
    },
    reset: () => {
      scale.value = DEFAULT_SCALE
    },
    canIncrease: () => scale.value < MAX_SCALE - 0.001,
    canDecrease: () => scale.value > MIN_SCALE + 0.001,
  }
}
