import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkRequestDetailPage } from './WorkRequestDetailPage'

const mocks = vi.hoisted(() => {
  const address = `0x${'aa'.repeat(20)}`
  const other = `0x${'bb'.repeat(20)}`
  return { address, other, decision: vi.fn(), acceptance: vi.fn(), reload: vi.fn() }
})

vi.mock('wagmi', () => ({ useAccount: () => ({ address: mocks.address }) }))
vi.mock('../../shared', () => ({
  useMachinery: () => ({ contractAddresses: { publishedData: mocks.address, mutableRefUpdater: mocks.address } }),
  useWriteClients: () => ({ walletClient: { chain: { id: 1 } } }),
}))
vi.mock('@commonality/sdk/work-requests', () => ({
  decisionFor: () => null,
  totalsForRequest: () => [],
  requestVersionCids: () => new Set(['request']),
  publishWorkDecision: mocks.decision,
  publishWorkAcceptance: mocks.acceptance,
  publishWorkOffer: vi.fn(),
  publishWorkResponse: vi.fn(),
  publishContributionLink: vi.fn(),
}))
vi.mock('../hooks/useWorkRequests', () => ({
  useWorkRequests: () => ({
    loading: false, error: null, reload: mocks.reload,
    board: {
      requests: [{ actor: mocks.other, slug: 'park', current: { cid: 'request', body: { outcome: 'A park', requirements: [], participationLimits: [] } }, versions: [] }],
      offers: [
        { actor: mocks.other, slug: 'others-offer', current: { cid: 'other-offer', body: { requestVersionCid: 'request' } } },
        { actor: mocks.address, slug: 'my-offer', current: { cid: 'my-offer', body: { requestVersionCid: 'request' } } },
      ],
      responses: [{ actor: mocks.other, slug: 'response', current: { cid: 'response-version', body: { requestVersionCid: 'request', providerAddress: mocks.address, workItemIds: ['park'], projectAddress: mocks.other } } }],
      decisions: [], acceptances: [], backing: [], contributionLinks: [],
    },
  }),
}))

function showPage() {
  render(<MemoryRouter initialEntries={[`/work/requests/${mocks.other}/park`]}>
    <Routes><Route path="/work/requests/:author/:slug" element={<WorkRequestDetailPage />} /></Routes>
  </MemoryRouter>)
}

describe('WorkRequestDetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lets the donor decide on their own offer when someone else published first', async () => {
    showPage()
    expect(screen.queryByRole('button', { name: 'Approve others-offer' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve my-offer' }))
    await waitFor(() => expect(mocks.decision).toHaveBeenCalled())
    expect(mocks.decision.mock.calls[0][2]).toMatchObject({ offerOwner: mocks.address, offerSlug: 'my-offer', offerVersionCid: 'my-offer', responseOwner: mocks.other, responseVersionCid: 'response-version' })
  })

  it('lets the named provider accept a response published by another wallet', async () => {
    showPage()
    fireEvent.click(screen.getByRole('button', { name: 'Accept response as provider' }))
    await waitFor(() => expect(mocks.acceptance).toHaveBeenCalled())
    expect(mocks.acceptance.mock.calls[0][2]).toMatchObject({ responseOwner: mocks.other, responseSlug: 'response', responseVersionCid: 'response-version' })
  })

  it('requires an explicit offer and response before reporting a contribution', () => {
    showPage()
    expect(screen.getByRole('button', { name: 'Record a contribution link' })).toBeDisabled()
    expect(screen.getByText(/Contribution and refund transactions are not yet verified/)).toBeInTheDocument()
  })
})
