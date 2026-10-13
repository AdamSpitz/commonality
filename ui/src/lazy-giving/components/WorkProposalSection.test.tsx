import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkProposalSection } from './WorkProposalSection'

const mocks = vi.hoisted(() => ({
  getState: vi.fn(), accept: vi.fn(), veto: vi.fn(), release: vi.fn(), machinery: {}, clients: {},
}))
vi.mock('@commonality/sdk/lazy-giving', () => ({
  getProjectWorkState: mocks.getState, acceptWorkProject: mocks.accept, vetoWorkProject: mocks.veto,
  releaseFailedProjectWork: mocks.release,
}))
vi.mock('../../shared', () => ({
  useMachinery: () => mocks.machinery,
  useWriteClients: () => mocks.clients,
  getRuntimeConfigValue: () => '0x1111111111111111111111111111111111111111',
}))
const bob = '0x2222222222222222222222222222222222222222'
const project = '0x3333333333333333333333333333333333333333'
const state = { thirdParty: true, beneficiaryAddress: bob, acceptedAt: 0n, vetoWindow: 604800n, timestamp: 100n, cancelled: false, succeeded: false, failed: false }

describe('WorkProposalSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getState.mockResolvedValue(state)
    mocks.accept.mockResolvedValue('0xtx')
    mocks.veto.mockResolvedValue('0xtx')
    mocks.release.mockResolvedValue('0xtx')
  })

  it('lets the beneficiary accept and veto through the configured project factory', async () => {
    const onRefresh = vi.fn()
    render(<WorkProposalSection projectAddress={project} address={bob} onRefresh={onRefresh} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Accept work proposal' }))
    expect(mocks.accept).toHaveBeenCalledWith(mocks.clients, '0x1111111111111111111111111111111111111111', project)
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce())
    await userEvent.click(screen.getByRole('button', { name: 'Veto work proposal' }))
    expect(mocks.veto).toHaveBeenCalledWith(mocks.clients, '0x1111111111111111111111111111111111111111', project)
  })

  it('explains acceptance and refunds to contributors without offering beneficiary controls', async () => {
    render(<WorkProposalSection projectAddress={project} address={undefined} onRefresh={vi.fn()} />)
    expect(await screen.findByText(/must accept this proposal/)).toHaveTextContent(/even if the funding goal was reached/)
    expect(screen.queryByRole('button', { name: 'Accept work proposal' })).not.toBeInTheDocument()
  })

  it('removes acceptance and veto controls once a proposal has failed', async () => {
    mocks.getState.mockResolvedValue({ ...state, failed: true })
    render(<WorkProposalSection projectAddress={project} address={bob} onRefresh={vi.fn()} />)
    await screen.findByText(/expired or failed/)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps a transaction failure visible and allows retry', async () => {
    mocks.accept.mockRejectedValue(new Error('Acceptance transaction rejected'))
    render(<WorkProposalSection projectAddress={project} address={bob} onRefresh={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Accept work proposal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Acceptance transaction rejected')
    expect(screen.getByRole('button', { name: 'Accept work proposal' })).toBeEnabled()
  })

  it('lets any connected account release failed reservations for another attempt', async () => {
    mocks.getState.mockResolvedValue({ ...state, failed: true, reservationActive: true })
    render(<WorkProposalSection projectAddress={project} address={project} onRefresh={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Release work items for another attempt' }))
    expect(mocks.release).toHaveBeenCalledWith(mocks.clients, '0x1111111111111111111111111111111111111111', project)
  })
})
