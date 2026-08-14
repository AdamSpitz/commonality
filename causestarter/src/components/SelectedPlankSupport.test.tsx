import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SelectedPlankSupport } from './SelectedPlankSupport'
import { sendCallsPreferAtomic } from '../lib/causeRoster'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x1111111111111111111111111111111111111111', isConnected: true })),
}))
vi.mock('../lib/useWriteClients', () => ({ useWriteClients: vi.fn(() => ({ walletClient: {}, publicClient: {} })) }))
vi.mock('../lib/runtimeConfig', () => ({
  getRuntimeConfigValue: vi.fn(() => '0x2222222222222222222222222222222222222222'),
}))
vi.mock('../lib/causeRoster', () => ({ sendCallsPreferAtomic: vi.fn() }))
vi.mock('./WalletButton', () => ({ WalletButton: () => <button>Connect</button> }))

const planks = [
  { cid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy', text: 'School crossings should be safer.' },
  { cid: 'bafybeifjzv3oc6zqklqvfmv2j5xgqqjped3zrm4y2a3s4u5v6w7x2y3z4a', text: 'Public parks should remain open.' },
]

describe('SelectedPlankSupport', () => {
  beforeEach(() => {
    vi.mocked(sendCallsPreferAtomic).mockReset().mockResolvedValue({ hashes: ['0xabc'], batched: true })
  })

  it('shows exact text before submitting distinct statement calls', async () => {
    const onSupported = vi.fn()
    render(
      <MemoryRouter>
        <SelectedPlankSupport planks={planks} onSupported={onSupported} />
      </MemoryRouter>,
    )

    expect(screen.getByText(planks[0].text)).toBeInTheDocument()
    expect(screen.getByText(planks[1].text)).toBeInTheDocument()
    expect(screen.queryByText(/CID:/)).not.toBeInTheDocument()
    expect(screen.getByText(/not the organizer, narrative, cause roster/i)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('support-selected-planks'))
    await waitFor(() => expect(sendCallsPreferAtomic).toHaveBeenCalledOnce())
    const calls = vi.mocked(sendCallsPreferAtomic).mock.calls[0]![1]
    expect(calls).toHaveLength(2)
    expect(calls.every((call) => call.functionName === 'setBelief')).toBe(true)
    expect(onSupported).toHaveBeenCalledOnce()
  })

  it('stays hidden when fewer than two statements are selected', () => {
    const { container } = render(<SelectedPlankSupport planks={planks.slice(0, 1)} onSupported={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
