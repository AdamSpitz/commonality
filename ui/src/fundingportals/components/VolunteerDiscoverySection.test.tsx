import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VolunteerDiscoverySection } from './VolunteerDiscoverySection'

const mocks = vi.hoisted(() => ({
  machinery: { contractAddresses: { publishedData: '0x1111111111111111111111111111111111111111' } },
  clients: { publicClient: {} },
  load: vi.fn(),
  publish: vi.fn(),
  sync: vi.fn(),
}))

vi.mock('wagmi', () => ({ useAccount: () => ({ address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }) }))
vi.mock('../../shared', () => ({ useMachinery: () => mocks.machinery, useWriteClients: () => mocks.clients }))
vi.mock('@commonality/sdk/volunteer-discovery', async (importOriginal) => ({
  ...await importOriginal<object>(), loadVolunteerDiscovery: mocks.load,
}))
vi.mock('@commonality/sdk/displayable-documents', () => ({ publishDocumentToPublishedData: mocks.publish }))
vi.mock('@commonality/sdk/indexer-sync', () => ({ waitForIndexerToSyncToTxHash: mocks.sync }))

describe('VolunteerDiscoverySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.load.mockResolvedValue([])
    mocks.publish.mockResolvedValue({ txHash: '0x123' })
    mocks.sync.mockResolvedValue(undefined)
  })

  it('shows validation errors without attempting a transaction', async () => {
    render(<VolunteerDiscoverySection statementCids={['bafystatement']} />)
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Skills'), { target: { value: 'x'.repeat(41) } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'I can help' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('at most 40 characters')
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('waits for the indexer before reloading a published record', async () => {
    let finishSync!: () => void
    mocks.sync.mockReturnValue(new Promise<void>((resolve) => { finishSync = resolve }))
    render(<VolunteerDiscoverySection statementCids={['bafystatement']} />)
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Skills'), { target: { value: 'design' } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'I can help' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledWith(mocks.machinery, mocks.clients.publicClient, '0x123'))
    expect(mocks.load).toHaveBeenCalledOnce()
    finishSync()
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2))
  })
})
