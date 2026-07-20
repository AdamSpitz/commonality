import { beforeEach, describe, expect, it, vi } from 'vitest'
import { displayPolicyFromDenylist, isCidDeniedByDisplayDenylist, loadDisplayDenylist } from './displayDenylist'
import { loadRuntimeConfig } from './runtimeConfig'

describe('display denylist', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.unstubAllGlobals()
    await loadRuntimeConfig('/missing-config.json')
  })

  it('normalizes ipfs URIs when checking denied CIDs', () => {
    expect(isCidDeniedByDisplayDenylist('ipfs://BAFYDENIED/path', { deniedCids: ['bafydenied'], honoredRetractors: [] })).toBe(true)
    expect(isCidDeniedByDisplayDenylist('ipfs://bafyallowed', { deniedCids: ['bafydenied'], honoredRetractors: [] })).toBe(false)
  })

  it('loads the denylist from runtime config', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/config.json') {
        return new Response(JSON.stringify({ VITE_DISPLAY_DENYLIST_URL: '/denylist.json' }), { status: 200 })
      }
      return new Response(JSON.stringify({ deniedCids: ['ipfs://BAFYDENIED'] }), { status: 200 })
    }))

    await loadRuntimeConfig('/config.json')
    const denylist = await loadDisplayDenylist()

    expect(denylist.deniedCids).toEqual(['bafydenied'])
    expect(denylist.honoredRetractors).toEqual([])
  })

  it('normalizes honored retractors for CID-first read policy', () => {
    const retractor = '0xaaaa000000000000000000000000000000000001'
    const denylist = {
      deniedCids: [],
      honoredRetractors: [retractor as `0x${string}`],
    }

    expect(displayPolicyFromDenylist(denylist)).toEqual({
      honoredRetractors: ['0xaaaa000000000000000000000000000000000001'],
    })
  })
})
