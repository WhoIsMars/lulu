import { describe, it, expect } from 'vitest'
import config from '../../vite.config'

// Vite's defineConfig accepts a function. Resolve it with a minimal env to inspect the resolved object.
async function resolved(envBase: string | undefined) {
  const original = process.env.VITE_BASE
  if (envBase === undefined) delete process.env.VITE_BASE
  else process.env.VITE_BASE = envBase
  try {
    const cfg =
      typeof config === 'function'
        ? await (config as (ctx: { mode: string; command: string }) => unknown)({
            mode: 'production',
            command: 'build',
          })
        : config
    return cfg as {
      base?: string
      build?: { sourcemap?: boolean }
      resolve?: { alias?: Record<string, string> }
    }
  } finally {
    if (original === undefined) delete process.env.VITE_BASE
    else process.env.VITE_BASE = original
  }
}

describe('vite.config base resolution', () => {
  it('uses /lulu/ when VITE_BASE=/lulu/', async () => {
    const cfg = await resolved('/lulu/')
    expect(cfg.base).toBe('/lulu/')
  })

  it('defaults to / when VITE_BASE is unset', async () => {
    const cfg = await resolved(undefined)
    expect(cfg.base).toBe('/')
  })

  it('uses / when VITE_BASE=/', async () => {
    const cfg = await resolved('/')
    expect(cfg.base).toBe('/')
  })

  it('disables sourcemaps in build', async () => {
    const cfg = await resolved('/lulu/')
    expect(cfg.build?.sourcemap).toBe(false)
  })

  it('aliases @ to ./src', async () => {
    const cfg = await resolved('/lulu/')
    const alias = cfg.resolve?.alias as Record<string, string>
    expect(alias['@']).toMatch(/\/src$/)
  })
})
