<script setup lang="ts">
import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

const reducedMotion = computed(() => usePreferredReducedMotion().value === 'reduce')
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="crossfade" mode="out-in" :duration="400" :css="!reducedMotion">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.crossfade-enter-active,
.crossfade-leave-active {
  transition: opacity var(--motion-duration-slow) var(--motion-ease-soft);
}
.crossfade-enter-from,
.crossfade-leave-to {
  opacity: 0;
}
.crossfade-leave-active {
  pointer-events: none;
}
</style>
