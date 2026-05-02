import { onMounted, onUnmounted } from 'vue'

/**
 * Pointer-driven candle light. Writes --mx, --my, --lit CSS custom properties
 * on document.documentElement once per animation frame. Vue reactivity is NOT
 * involved in the hot path — pointer coordinates live in module-scoped vars,
 * a single requestAnimationFrame batches DOM writes, and the entire viewport
 * reveal is a CSS radial-gradient mask consuming the variables (GPU-composited).
 *
 * Mobile: pointermove + pointerdown together cover touch-and-drag. The first
 * touch sets --lit to 1 (candle "accesa"); pointerleave/enter on the document
 * handles cursor-leaves-window.
 */
export function usePointerLight(): void {
  let raf = 0
  let x = 0
  let y = 0
  let lit = 0

  function flush(): void {
    raf = 0
    const root = document.documentElement
    root.style.setProperty('--mx', x + 'px')
    root.style.setProperty('--my', y + 'px')
    root.style.setProperty('--lit', String(lit))
  }
  function schedule(): void {
    if (!raf) raf = requestAnimationFrame(flush)
  }
  function onMove(e: PointerEvent): void {
    x = e.clientX
    y = e.clientY
    lit = 1
    schedule()
  }
  function onLeave(): void {
    lit = 0
    schedule()
  }
  function onEnter(): void {
    lit = 1
    schedule()
  }

  onMounted(() => {
    x = window.innerWidth / 2
    y = window.innerHeight / 2
    lit = 0
    schedule()
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave, { passive: true })
    document.addEventListener('pointerenter', onEnter, { passive: true })
  })

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onMove)
    document.removeEventListener('pointerleave', onLeave)
    document.removeEventListener('pointerenter', onEnter)
    const root = document.documentElement
    root.style.removeProperty('--mx')
    root.style.removeProperty('--my')
    root.style.removeProperty('--lit')
  })
}
