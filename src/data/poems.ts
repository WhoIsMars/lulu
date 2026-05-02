/**
 * Phase 2 (CONT-01) facade. Real module built by vite/plugin-poems.ts from
 * poems.txt + content/manifest.yaml. Consumers (HomeView, PolaroidView)
 * keep importing from `@/data/poems` — this re-export keeps that working.
 */
export * from 'virtual:poems'
export type { Poem } from 'virtual:poems'
