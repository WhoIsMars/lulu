<script setup lang="ts">
/**
 * Phase 4 (ASSET-01/02/03) — responsive <picture> with AVIF/WebP/JPEG sources
 * and an inline LQIP placeholder.
 *
 * Renders an `<img>` that fills its parent (`width: 100%; height: 100%;
 * object-fit: cover; display: block`) so it can drop into the existing
 * `.home__photo` / `.pview__photo` containers without disturbing layout.
 *
 * The LQIP (a ~260-byte base64 WebP data URL) paints instantly as the
 * `<picture>` background; once the full image fires `@load`, we toggle a
 * `data-loaded` attr that hides the placeholder.
 */
import { ref } from 'vue'
import type { PoemPicture } from 'virtual:poems'

interface Props {
  picture: PoemPicture
  lqip: string
  alt: string
  /** `sizes` attribute forwarded to every `<source>` and the fallback `<img>`. */
  sizes?: string
  /** When true, drops `loading="lazy"` and uses `loading="eager"`. */
  eager?: boolean
  /** Maps to the `fetchpriority` attribute on `<img>`. */
  priority?: 'high' | 'low' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  sizes: '100vw',
  eager: false,
  priority: 'auto',
})

const loaded = ref(false)

/** vite-imagetools returns sources keyed by short tokens; the spec MIME for
 *  `.jpg` is `image/jpeg`, so we normalize that one explicitly. */
function mimeFor(token: string): string {
  if (token === 'jpg') return 'image/jpeg'
  return 'image/' + token
}

function onLoad(): void {
  loaded.value = true
}
</script>

<template>
  <picture class="polaroid-picture" :data-loaded="loaded ? 'true' : 'false'">
    <source
      v-for="(srcset, mime) in picture.sources"
      :key="mime"
      :type="mimeFor(String(mime))"
      :srcset="srcset"
      :sizes="sizes"
    />
    <img
      :src="picture.img.src"
      :width="picture.img.w"
      :height="picture.img.h"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="priority"
      decoding="async"
      :style="{ backgroundImage: `url(${lqip})` }"
      @load="onLoad"
    />
  </picture>
</template>

<style scoped>
.polaroid-picture {
  display: block;
  width: 100%;
  height: 100%;
}

.polaroid-picture > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* LQIP background: the data URL paints immediately; once @load fires we
     fade the full image in over the placeholder. background-size: cover so
     the 16-px placeholder stretches to fill the same area as the image. */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: opacity 280ms ease-out;
}

.polaroid-picture[data-loaded='false'] > img {
  /* Subtle initial state — the LQIP shows through while the image decodes.
     We don't hide the <img> entirely (would defer paint); we just let the
     decoding-async path settle, then bump opacity to 1 on load. */
  opacity: 0.999;
}

@media (prefers-reduced-motion: reduce) {
  .polaroid-picture > img {
    transition: none;
  }
}
</style>
