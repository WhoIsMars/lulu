/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*?raw' {
  const content: string
  export default content
}

declare module 'virtual:poems' {
  /**
   * Phase 4 (ASSET-01..03): each poem carries a `picture` (vite-imagetools
   * `as=picture` payload — AVIF/WebP/JPEG sources + a fallback `<img>`) and a
   * `lqip` data URL (16-px WebP base64 placeholder).
   */
  export interface PoemPicture {
    sources: Record<string, string>
    img: { src: string; w: number; h: number }
  }
  export interface Poem {
    slug: string
    title: string
    date: string
    file: string
    body: string
    alt: string
    rope: number
    rotation: number
    liftDelay: number
    picture: PoemPicture
    lqip: string
  }
  export const poems: readonly Poem[]
  export function getPoem(slug: string): Poem | undefined
  export function getNextPoem(slug: string): Poem | undefined
  export function getPrevPoem(slug: string): Poem | undefined
}
