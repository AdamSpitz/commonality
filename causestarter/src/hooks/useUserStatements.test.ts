import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStatements } from './useUserStatements'

const { getUserBeliefs, useAccount, machinery } = vi.hoisted(() => ({
  getUserBeliefs: vi.fn(),
  useAccount: vi.fn(),
  machinery: { contractAddresses: { beliefs: '0x1' } },
}))

vi.mock('@commonality/sdk/conceptspace', () => ({
  getUserBeliefs,
}))

vi.mock('wagmi', () => ({
  useAccount,
}))

vi.mock('../lib/useMachinery', () => ({
  useMachinery: () => machinery,
}))

describe('useUserStatements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAccount.mockReturnValue({ address: undefined })
    getUserBeliefs.mockResolvedValue([])
  })

  it('does not query when the wallet is disconnected', async () => {
    const { result } = renderHook(() => useUserStatements())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connected).toBe(false)
    expect(result.current.statements).toEqual([])
    expect(getUserBeliefs).not.toHaveBeenCalled()
  })

  it('loads signed statements for the connected wallet', async () => {
    useAccount.mockReturnValue({ address: '0xabc' })
    getUserBeliefs.mockResolvedValue([{ cid: 'bafy1', title: 'Hello' }])
    const { result } = renderHook(() => useUserStatements())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connected).toBe(true)
    expect(result.current.statements).toEqual([{ cid: 'bafy1', title: 'Hello' }])
    expect(getUserBeliefs).toHaveBeenCalledWith(machinery, '0xabc')
  })
})
