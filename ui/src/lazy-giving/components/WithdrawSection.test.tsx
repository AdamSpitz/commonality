import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WithdrawSection } from './WithdrawSection'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const PROJECT_ADDR = '0xaaaa000000000000000000000000000000000001'

vi.mock('wagmi', () => ({
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk/abis', async () => {
  const actual = await vi.importActual('@commonality/sdk/abis')
  return {
    ...actual,
    AssuranceContractAbi: [],
  }
})

vi.mock('@commonality/sdk/lazy-giving', async () => {
  const actual = await vi.importActual('@commonality/sdk/lazy-giving')
  return {
    ...actual,
    withdrawProjectFunds: vi.fn(),
  }
})

import { useWalletClient, usePublicClient } from 'wagmi'
import { withdrawProjectFunds } from '@commonality/sdk/lazy-giving'

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: PROJECT_ADDR,
    erc1155Address: '0xbbbb000000000000000000000000000000000002',
    recipient: USER_ADDR,
    threshold: '1000000000000000000',
    deadline: String(Math.floor(Date.now() / 1000) + 86400),
    totalReceived: '2000000000000000000',
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

describe('WithdrawSection', () => {
  const onRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(withdrawProjectFunds).mockResolvedValue(undefined as any)
  })

  it('renders heading and description', () => {
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)
    expect(screen.getByRole('heading', { name: 'Withdraw Funds' })).toBeInTheDocument()
    expect(screen.getByText(/funding threshold has been met/)).toBeInTheDocument()
  })

  it('renders Withdraw Funds button', () => {
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)
    expect(screen.getByRole('button', { name: 'Withdraw Funds' })).toBeInTheDocument()
  })

  it('calls withdrawProjectFunds when button clicked', async () => {
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    await waitFor(() => {
      expect(withdrawProjectFunds).toHaveBeenCalledWith(
        expect.objectContaining({ account: USER_ADDR }),
        expect.objectContaining({ address: PROJECT_ADDR }),
      )
    })
  })

  it('shows success message after withdrawal', async () => {
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    await waitFor(() => {
      expect(screen.getByText('Funds withdrawn successfully!')).toBeInTheDocument()
    })
  })

  it('calls onRefresh after withdrawal', async () => {
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  it('shows error message when withdrawal fails', async () => {
    vi.mocked(withdrawProjectFunds).mockRejectedValue(new Error('Already withdrawn'))
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    await waitFor(() => {
      expect(screen.getByText('Already withdrawn')).toBeInTheDocument()
    })
  })

  it('shows non-Error exception as generic message', async () => {
    vi.mocked(withdrawProjectFunds).mockRejectedValue('string error')
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to withdraw funds')).toBeInTheDocument()
    })
  })

  it('does nothing when address is undefined', async () => {
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={undefined} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    expect(withdrawProjectFunds).not.toHaveBeenCalled()
  })

  it('shows loading state while withdrawing', async () => {
    vi.mocked(withdrawProjectFunds).mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<WithdrawSection project={makeProject()} address={USER_ADDR} onRefresh={onRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdrawing...' })).toBeInTheDocument()
    })
  })
})
