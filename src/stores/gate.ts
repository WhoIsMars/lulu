import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

const NAMESPACE = 'lulu:gate' // D-09

export const useGateStore = defineStore('gate', () => {
  const unlocked = useStorage(NAMESPACE, false, sessionStorage)

  function unlock(): void {
    unlocked.value = true
  }
  function lock(): void {
    unlocked.value = false
  }

  return { unlocked, unlock, lock }
})
