/**
 * Zod schemas for the content pipeline (Phase 2, CONT-02/CONT-03).
 *
 * Pure module: no Node nor Vite imports. Used by:
 *   - vite/manifest-loader.ts (build-time validation)
 *   - vite/plugin-poems.ts (Plan 02-02, virtual:poems plugin)
 *   - scripts/manifest-check.mjs (Plan 02-03, CLI gate)
 */
import { z } from 'zod'

export const ManifestEntrySchema = z
  .object({
    photo: z.string().min(1, 'photo non può essere vuoto'),
    poem: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'slug deve essere kebab-case ascii (solo a-z, 0-9 e trattini)'),
    alt: z.string().min(8, 'alt deve avere almeno 8 caratteri (a11y)'),
    rope: z.number().int().min(0).max(3),
    rotation: z.number().min(-5).max(5),
    liftDelay: z.number().int().min(0).max(1000),
  })
  .strict()

export const ManifestSchema = z.array(ManifestEntrySchema).min(1, 'manifest vuoto')

export type ManifestEntry = z.infer<typeof ManifestEntrySchema>
export type Manifest = z.infer<typeof ManifestSchema>

export const PoemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  date: z.string(),
  file: z.string().min(1),
  body: z.string().min(1),
  alt: z.string().min(8),
  rope: z.number().int().min(0).max(3),
  rotation: z.number().min(-5).max(5),
  liftDelay: z.number().int().min(0).max(1000),
})

export type Poem = z.infer<typeof PoemSchema>
