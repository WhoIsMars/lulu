import { computed, type ComputedRef } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

export function useReducedMotion(): ComputedRef<boolean> {
  const pref = usePreferredReducedMotion()
  return computed(() => pref.value === 'reduce')
}
