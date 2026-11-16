import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { generatePrivateKey } from 'viem/accounts'
import { encodeClaimTicketCode } from '@commonality/sdk/claim-tickets'
import { ClaimTicketPage } from './ClaimTicketPage'

const transitKey = generatePrivateKey()
const project = '0x1111111111111111111111111111111111111111'
const destination = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const sendTransaction = vi.fn()
const signTypedDataAsync = vi.fn()
const waitForTransactionReceipt = vi.fn()

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: destination, isConnected: true }),
  useChainId: () => 31337,
  usePublicClient: () => ({
    readContract: vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'ticketProjectOf') return project
      if (functionName === 'transitAddress') {
        const { privateKeyToAddress } = await import('viem/accounts')
        return privateKeyToAddress(transitKey)
      }
      return null
    }),
    waitForTransactionReceipt,
  }),
  useWalletClient: () => ({ data: { sendTransaction } }),
  useSignTypedData: () => ({ signTypedDataAsync }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ClaimTicketPage />
    </MemoryRouter>,
  )
}

describe('ClaimTicketPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signTypedDataAsync.mockResolvedValue('0xdestination')
    sendTransaction.mockResolvedValue('0xhash')
    waitForTransactionReceipt.mockResolvedValue({ status: 'success' })
    import.meta.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'
    import.meta.env.VITE_PLATFORM_API_URL = 'http://platform.test'
    window.history.replaceState(null, '', '/claim')
  })

  it('reads a fragment code and removes it before anything else can see it', async () => {
    window.history.replaceState(null, '', '/claim#ct1%3Asecret')
    renderPage()
    expect(await screen.findByDisplayValue('ct1:secret')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(window.location.search).not.toContain('ct1')
  })

  it('does not send the code to the relay, and falls back to a local submission if the relay is down', async () => {
    const code = encodeClaimTicketCode({ chainId: 31337n, project, transitKey })
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body ?? '')
      expect(body).not.toContain(code)
      expect(body).not.toContain(transitKey)
      return { ok: false, json: async () => ({ message: 'down' }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const user = userEvent.setup()
    fireEvent.change(screen.getByLabelText(/claim code/i), { target: { value: code } })
    await user.click(screen.getByRole('button', { name: /redeem to this account/i }))

    await waitFor(() => expect(sendTransaction).toHaveBeenCalledWith({ to: project, data: expect.stringMatching(/^0x/) }))
    expect(screen.getByText(/accepting the work and claiming proceeds are separate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/claim code/i)).toHaveValue('')
  })

  it('falls back to the wallet when the relay is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderPage()
    fireEvent.change(screen.getByLabelText(/claim code/i), { target: { value: encodeClaimTicketCode({ chainId: 31337n, project, transitKey }) } })
    await userEvent.click(screen.getByRole('button', { name: /redeem to this account/i }))
    await waitFor(() => expect(sendTransaction).toHaveBeenCalled())
    expect(await screen.findByText(/accepting the work and claiming proceeds are separate/i)).toBeInTheDocument()
  })

  it('waits for sponsored confirmation and reports a reverted receipt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ transactionHash: '0xrelay' }) }))
    let confirm!: (receipt: { status: string }) => void
    waitForTransactionReceipt.mockImplementation(() => new Promise(resolve => { confirm = resolve }))
    renderPage()
    fireEvent.change(screen.getByLabelText(/claim code/i), { target: { value: encodeClaimTicketCode({ chainId: 31337n, project, transitKey }) } })
    await userEvent.click(screen.getByRole('button', { name: /redeem to this account/i }))
    await waitFor(() => expect(waitForTransactionReceipt).toHaveBeenCalledWith({ hash: '0xrelay' }))
    expect(screen.queryByText(/ticket is bound to this account/i)).not.toBeInTheDocument()
    confirm({ status: 'reverted' })
    expect(await screen.findByText(/redemption transaction reverted/i)).toBeInTheDocument()
    expect(sendTransaction).not.toHaveBeenCalled()
  })
})
