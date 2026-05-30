import { describe, expect, it } from 'vitest'
import { getCsmMediatorNudger, getTallyMediatorOptInPath } from './csmMediatorNudger'
import type { UiRuntimeConfig } from './runtimeConfig'

const emptyLocalConfig: UiRuntimeConfig = {
  VITE_PLATFORM_API_URL: undefined,
  VITE_CSM_MEDIATOR_NUDGER: undefined,
  COMMONALITY_ENVIRONMENT: 'local',
}

describe('CSM mediator nudger configuration', () => {
  it('provides a local default mediator so dev/demo CSM opt-in links are testable', () => {
    const mediator = getCsmMediatorNudger(emptyLocalConfig)

    expect(mediator).toMatchObject({
      address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      name: 'Common Sense Majority mediator',
      sourceType: 'bridge-creator',
    })
  })

  it('does not silently invent a mediator for non-local deployments', () => {
    const mediator = getCsmMediatorNudger({
      ...emptyLocalConfig,
      COMMONALITY_ENVIRONMENT: 'testnet',
    })

    expect(mediator).toBeNull()
  })

  it('accepts a configured address and fills in default discovery copy', () => {
    const mediator = getCsmMediatorNudger({
      ...emptyLocalConfig,
      COMMONALITY_ENVIRONMENT: 'testnet',
      VITE_CSM_MEDIATOR_NUDGER: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    })

    expect(mediator).toMatchObject({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      name: 'Common Sense Majority mediator',
      description: expect.stringContaining('CSM bridge statements'),
      sourceType: 'bridge-creator',
    })
  })

  it('accepts configured metadata for the Tally opt-in flow', () => {
    const mediator = getCsmMediatorNudger({
      ...emptyLocalConfig,
      COMMONALITY_ENVIRONMENT: 'testnet',
      VITE_CSM_MEDIATOR_NUDGER: JSON.stringify({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        name: 'Pilot mediator',
        description: 'Suggests bridge statements from the pilot service.',
        serviceUrl: 'https://bridge.example',
        sourceType: 'bridge-creator',
        version: '2026-05-pilot',
      }),
    })

    expect(mediator).toMatchObject({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      name: 'Pilot mediator',
      serviceUrl: 'https://bridge.example',
      version: '2026-05-pilot',
    })
  })

  it('rejects malformed configured mediator values instead of producing broken links', () => {
    expect(getCsmMediatorNudger({
      ...emptyLocalConfig,
      COMMONALITY_ENVIRONMENT: 'testnet',
      VITE_CSM_MEDIATOR_NUDGER: '{not json}',
    })).toBeNull()

    expect(getCsmMediatorNudger({
      ...emptyLocalConfig,
      COMMONALITY_ENVIRONMENT: 'testnet',
      VITE_CSM_MEDIATOR_NUDGER: '0xnot-an-address',
    })).toBeNull()
  })

  it('builds the Tally settings deep link that enables the mediator nudger', () => {
    const path = getTallyMediatorOptInPath({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      name: 'Pilot mediator',
      description: 'Suggests bridge statements from the pilot service.',
      serviceUrl: 'https://bridge.example',
      sourceType: 'bridge-creator',
      version: '2026-05-pilot',
    })
    const url = new URL(path, 'https://tally.example')

    expect(url.pathname).toBe('/settings')
    expect(url.searchParams.get('addNudger')).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    expect(url.searchParams.get('nudgerName')).toBe('Pilot mediator')
    expect(url.searchParams.get('nudgerDescription')).toBe('Suggests bridge statements from the pilot service.')
    expect(url.searchParams.get('nudgerServiceUrl')).toBe('https://bridge.example')
    expect(url.searchParams.get('nudgerSourceType')).toBe('bridge-creator')
    expect(url.searchParams.get('nudgerVersion')).toBe('2026-05-pilot')
  })
})
