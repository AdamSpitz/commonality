import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Civility policy bundle runtime', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('stays unavailable when no bundle URL is configured', async () => {
    const { loadRuntimeConfig } = await import('./runtimeConfig')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    await loadRuntimeConfig('/missing.json')
    const { loadActivePolicyBundle } = await import('./policyBundle')
    await expect(loadActivePolicyBundle('civility')).resolves.toMatchObject({ status: 'unavailable' })
  })
})
