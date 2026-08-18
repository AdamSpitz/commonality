import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectedPlankSupport } from './SelectedPlankSupport'
import { sendCallsPreferAtomic } from '../lib/causeRoster'
import { getUserBelief } from '@commonality/sdk/conceptspace'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x1111111111111111111111111111111111111111', isConnected: true })),
}))
vi.mock('../lib/useWriteClients', () => ({ useWriteClients: vi.fn(() => ({ walletClient: {}, publicClient: {} })) }))
vi.mock('../lib/runtimeConfig', () => ({
  getRuntimeConfigValue: vi.fn(() => '0x2222222222222222222222222222222222222222'),
}))
vi.mock('../lib/causeRoster', () => ({ sendCallsPreferAtomic: vi.fn() }))
vi.mock('@commonality/sdk/conceptspace', () => ({
  BeliefStates: { NO_OPINION: 0, BELIEVES: 1, DISBELIEVES: 2 },
  getUserBelief: vi.fn(),
}))
vi.mock('./WalletButton', () => ({ WalletButton: () => <button>Connect</button> }))

const BELIEVES = 1
const NO_OPINION = 0

const planks = [
  { cid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy', text: 'School crossings should be safer.' },
  { cid: 'bafybeifjzv3oc6zqklqvfmv2j5xgqqjped3zrm4y2a3s4u5v6w7x2y3z4a', text: 'Public parks should remain open.' },
]

describe('SelectedPlankSupport', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(sendCallsPreferAtomic).mockReset().mockResolvedValue({ hashes: ['0xabc'], batched: true })
    vi.mocked(getUserBelief).mockReset().mockImplementation(async (_machinery, _user, cid) => ({
      statementCid: cid,
      beliefState: NO_OPINION,
    }))
  })

  it('signs only selected statements the user has not already signed', async () => {
    vi.mocked(getUserBelief).mockImplementation(async (_machinery, _user, cid) => ({
      statementCid: cid,
      beliefState: cid === planks[0].cid ? BELIEVES : NO_OPINION,
    }))
    const onSupported = vi.fn()
    render(<SelectedPlankSupport machinery={{} as never} planks={planks} onSupported={onSupported} />)

    const button = await screen.findByTestId('support-selected-planks')
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(sendCallsPreferAtomic).toHaveBeenCalledOnce())
    const calls = vi.mocked(sendCallsPreferAtomic).mock.calls[0]![1]
    expect(calls).toHaveLength(1)
    expect(calls[0]!.functionName).toBe('setBelief')
    expect(onSupported).toHaveBeenCalledOnce()
  })

  it('hides when every selected statement is already signed', async () => {
    vi.mocked(getUserBelief).mockResolvedValue({
      statementCid: planks[0].cid,
      beliefState: BELIEVES,
    })
    const { container } = render(<SelectedPlankSupport machinery={{} as never} planks={planks} onSupported={vi.fn()} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(screen.queryByTestId('support-selected-planks')).not.toBeInTheDocument()
    expect(sendCallsPreferAtomic).not.toHaveBeenCalled()
  })

  it('stays hidden when no statements are selected', () => {
    const { container } = render(<SelectedPlankSupport machinery={{} as never} planks={[]} onSupported={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
