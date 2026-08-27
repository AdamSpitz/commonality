import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SupportButton } from './SupportButton'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

const mockMachinery = {}
const { useWriteClients } = vi.hoisted(() => ({
  useWriteClients: vi.fn(),
}))

vi.mock('../../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared')>()
  return {
    ...actual,
    useWriteClients,
    useMachinery: vi.fn(() => mockMachinery),
    getRuntimeConfigValue: vi.fn((key: string) => {
      if (key === 'VITE_BELIEFS_CONTRACT_ADDRESS') return '0x1111111111111111111111111111111111111111'
      return undefined
    }),
  }
})

vi.mock('../../shared/components/WalletButton', () => ({
  WalletButton: () => <button type="button">Connect Wallet</button>,
}))

vi.mock('@commonality/sdk/conceptspace', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk/conceptspace')>(
    '@commonality/sdk/conceptspace',
  )
  return {
    ...actual,
    getUserBelief: vi.fn(),
    believeStatement: vi.fn(),
    clearOpinion: vi.fn(),
  }
})

import { useAccount } from 'wagmi'
import {
  BeliefStates,
  believeStatement,
  clearOpinion,
  getUserBelief,
} from '@commonality/sdk/conceptspace'

const CID = 'bafytestcid' as const
const USER = '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'

function mockWriteClients() {
  return {
    publicClient: {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    },
    walletClient: {
      chain: { id: 31337 },
      account: { address: USER },
    },
  }
}

describe('SupportButton', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccount).mockReturnValue({ address: USER, isConnected: true } as any)
    vi.mocked(useWriteClients).mockReturnValue(mockWriteClients() as any)
    vi.mocked(getUserBelief).mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.NO_OPINION })
    vi.mocked(believeStatement).mockResolvedValue('0xhash' as `0x${string}`)
    vi.mocked(clearOpinion).mockResolvedValue('0xhash' as `0x${string}`)
  })

  it('prompts to connect when wallet is disconnected', () => {
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)

    render(<SupportButton statementCid={CID} />)

    expect(screen.getByText(/connect a wallet to publicly sign/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('shows Sign this statement when the user does not yet support', async () => {
    render(<SupportButton statementCid={CID} />)

    expect(await screen.findByRole('button', { name: /sign this statement/i })).toBeInTheDocument()
    expect(screen.queryByText(/you've declared your support/i)).not.toBeInTheDocument()
  })

  it('shows declared support and retract when the user already believes', async () => {
    vi.mocked(getUserBelief).mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.BELIEVES })

    render(<SupportButton statementCid={CID} />)

    expect(await screen.findByText(/you've declared your support for this statement/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retract your support for this statement/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign this statement/i })).not.toBeInTheDocument()
  })

  it('records support and switches to the supported state', async () => {
    const onSupported = vi.fn()
    // After the tx, polling should observe the new indexed belief.
    vi.mocked(getUserBelief)
      .mockResolvedValueOnce({ statementCid: CID, beliefState: BeliefStates.NO_OPINION })
      .mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.BELIEVES })

    render(<SupportButton statementCid={CID} onSupported={onSupported} />)

    const stand = await screen.findByRole('button', { name: /sign this statement/i })
    fireEvent.click(stand)

    await waitFor(() => {
      expect(believeStatement).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(onSupported).toHaveBeenCalledWith({ action: 'support', indexed: false })
    })
    await waitFor(() => {
      expect(onSupported).toHaveBeenCalledWith({ action: 'support', indexed: true })
    })
    expect(await screen.findByText(/you've declared your support for this statement/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retract your support for this statement/i })).toBeInTheDocument()
  })

  it('retracts support and returns to the stand CTA', async () => {
    vi.mocked(getUserBelief)
      .mockResolvedValueOnce({ statementCid: CID, beliefState: BeliefStates.BELIEVES })
      .mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.NO_OPINION })
    const onSupported = vi.fn()

    render(<SupportButton statementCid={CID} onSupported={onSupported} />)

    const retract = await screen.findByRole('button', { name: /retract your support for this statement/i })
    fireEvent.click(retract)

    await waitFor(() => {
      expect(clearOpinion).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(onSupported).toHaveBeenCalledWith({ action: 'retract', indexed: false })
    })
    await waitFor(() => {
      expect(onSupported).toHaveBeenCalledWith({ action: 'retract', indexed: true })
    })
    expect(await screen.findByRole('button', { name: /sign this statement/i })).toBeInTheDocument()
    expect(screen.getByText(/you retracted your support/i)).toBeInTheDocument()
  })

  it('does not repeat the optimistic support callback when indexing times out', async () => {
    const onSupported = vi.fn()
    vi.mocked(getUserBelief).mockResolvedValue({
      statementCid: CID,
      beliefState: BeliefStates.NO_OPINION,
    })

    render(<SupportButton statementCid={CID} onSupported={onSupported} />)
    fireEvent.click(await screen.findByRole('button', { name: /sign this statement/i }))

    await waitFor(() => expect(onSupported).toHaveBeenCalledTimes(1))
    await waitFor(
      () => expect(screen.getByRole('button', { name: /retract your support/i })).not.toBeDisabled(),
      { timeout: 5000 },
    )
    expect(onSupported).toHaveBeenCalledTimes(1)
    expect(onSupported).toHaveBeenCalledWith({ action: 'support', indexed: false })
  }, 10000)

  it('does not repeat the optimistic retract callback when indexing times out', async () => {
    const onSupported = vi.fn()
    vi.mocked(getUserBelief).mockResolvedValue({
      statementCid: CID,
      beliefState: BeliefStates.BELIEVES,
    })

    render(<SupportButton statementCid={CID} onSupported={onSupported} />)
    fireEvent.click(await screen.findByRole('button', { name: /retract your support/i }))

    await waitFor(() => expect(onSupported).toHaveBeenCalledTimes(1))
    await waitFor(
      () => expect(screen.getByRole('button', { name: /sign this statement/i })).not.toBeDisabled(),
      { timeout: 5000 },
    )
    expect(onSupported).toHaveBeenCalledTimes(1)
    expect(onSupported).toHaveBeenCalledWith({ action: 'retract', indexed: false })
  }, 10000)

  it('ignores an in-flight support completion after switching wallets', async () => {
    const USER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    let resolveReceipt!: (value: { status: string }) => void
    const receipt = new Promise<{ status: string }>((resolve) => {
      resolveReceipt = resolve
    })
    const oldClients = mockWriteClients()
    oldClients.publicClient.waitForTransactionReceipt.mockReturnValue(receipt)
    vi.mocked(useWriteClients).mockReturnValue(oldClients as any)
    const onSupported = vi.fn()

    const { rerender } = render(<SupportButton statementCid={CID} onSupported={onSupported} />)
    fireEvent.click(await screen.findByRole('button', { name: /sign this statement/i }))
    await waitFor(() => expect(believeStatement).toHaveBeenCalled())

    vi.mocked(useAccount).mockReturnValue({ address: USER_B, isConnected: true } as any)
    vi.mocked(useWriteClients).mockReturnValue(mockWriteClients() as any)
    vi.mocked(getUserBelief).mockResolvedValue({
      statementCid: CID,
      beliefState: BeliefStates.NO_OPINION,
    })
    rerender(<SupportButton statementCid={CID} onSupported={onSupported} />)
    expect(await screen.findByRole('button', { name: /sign this statement/i })).toBeInTheDocument()

    resolveReceipt({ status: 'success' })
    await waitFor(() => expect(oldClients.publicClient.waitForTransactionReceipt).toHaveBeenCalled())
    await Promise.resolve()

    expect(screen.getByRole('button', { name: /sign this statement/i })).toBeInTheDocument()
    expect(screen.queryByText(/you've declared your support/i)).not.toBeInTheDocument()
    // In-flight completion must not notify after the wallet context changed.
    expect(onSupported).not.toHaveBeenCalled()
  })

  it('clears retract banner when switching to another wallet that still supports', async () => {
    const USER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    vi.mocked(getUserBelief).mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.BELIEVES })

    const { rerender } = render(<SupportButton statementCid={CID} />)

    const retract = await screen.findByRole('button', { name: /retract your support for this statement/i })
    fireEvent.click(retract)

    await waitFor(() => {
      expect(clearOpinion).toHaveBeenCalled()
    })
    expect(await screen.findByText(/you retracted your support/i)).toBeInTheDocument()

    vi.mocked(useAccount).mockReturnValue({ address: USER_B, isConnected: true } as any)
    vi.mocked(getUserBelief).mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.BELIEVES })
    rerender(<SupportButton statementCid={CID} />)

    expect(await screen.findByText(/you've declared your support for this statement/i)).toBeInTheDocument()
    expect(screen.queryByText(/you retracted your support/i)).not.toBeInTheDocument()
  })

  it('uses a short Sign / Signed / Retract control in compact mode', async () => {
    vi.mocked(getUserBelief).mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.BELIEVES })

    render(<SupportButton statementCid={CID} label="Sign" compact />)

    expect(await screen.findByText('Signed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retract' })).toBeInTheDocument()
    expect(screen.queryByText(/you've declared your support/i)).not.toBeInTheDocument()
  })

  it('shows Retracted after a compact retract', async () => {
    vi.mocked(getUserBelief)
      .mockResolvedValueOnce({ statementCid: CID, beliefState: BeliefStates.BELIEVES })
      .mockResolvedValue({ statementCid: CID, beliefState: BeliefStates.NO_OPINION })

    render(<SupportButton statementCid={CID} label="Sign" compact />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retract' }))

    expect(await screen.findByText('Retracted')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Sign' })).toBeInTheDocument()
    expect(screen.queryByText(/you retracted your support/i)).not.toBeInTheDocument()
  })
})
