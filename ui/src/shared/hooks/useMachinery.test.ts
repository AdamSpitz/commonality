import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetRuntimeConfigValue = vi.fn()
const mockGetActivePolicyBundle = vi.fn()

vi.mock('../config/runtimeConfig', () => ({
  getRuntimeConfigValue: (key: string) => mockGetRuntimeConfigValue(key),
}))
vi.mock('../config/policyBundle', () => ({
  getActivePolicyBundle: () => mockGetActivePolicyBundle(),
}))

import { civilityPolicyGatewayConfig } from './useMachinery'

describe('Civility policy content gateway configuration', () => {
  beforeEach(() => {
    mockGetRuntimeConfigValue.mockReset()
    mockGetActivePolicyBundle.mockReset()
    mockGetRuntimeConfigValue.mockImplementation((key: string) => key === 'VITE_PLATFORM_API_URL' ? 'https://platform.example/' : undefined)
    mockGetActivePolicyBundle.mockReturnValue({ bundle: { digest: 'sha256:active' }, evaluator: {} })
  })

  it('routes Civility CID retrieval through the operator policy gateway', () => {
    expect(civilityPolicyGatewayConfig('civility')?.gatewayUrl).toBe('https://platform.example/policy-content')
  })

  it('accepts responses enforcing the active client digest', async () => {
    const config = civilityPolicyGatewayConfig('civility')!
    const response = new Response(null, { headers: { 'x-commonality-policy-digest': 'sha256:active' } })
    await expect(config.validateGatewayResponse?.(response)).resolves.toBeUndefined()
  })

  it('rejects missing or divergent server digests', async () => {
    const config = civilityPolicyGatewayConfig('civility')!
    await expect(config.validateGatewayResponse?.(new Response())).rejects.toThrow(/server unreported/)
    const divergent = new Response(null, { headers: { 'x-commonality-policy-digest': 'sha256:other' } })
    await expect(config.validateGatewayResponse?.(divergent)).rejects.toThrow(/server sha256:other/)
  })

  it('does not change another domain or a Civility cold start', () => {
    expect(civilityPolicyGatewayConfig('tally')).toBeNull()
    mockGetActivePolicyBundle.mockReturnValue({ status: 'unavailable' })
    expect(civilityPolicyGatewayConfig('civility')).toBeNull()
  })
})
