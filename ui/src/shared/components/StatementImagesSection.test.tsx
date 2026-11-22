import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatementImagesSection } from './StatementImagesSection'
import { loadStatementImageWall } from '@commonality/sdk/statement-images'
import { waitForIndexerToSyncToBlockNumber } from '@commonality/sdk/indexer-sync'

const mockMachinery = { contractAddresses: { statementImages: '0x2222222222222222222222222222222222222222' } }
let canWrite = false
const mockWriteClients = {
  publicClient: {
    waitForTransactionReceipt: async () => ({ status: 'success', blockNumber: 123n }),
  },
}

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
}))

vi.mock('../hooks/useMachinery', () => ({
  useMachinery: () => mockMachinery,
}))

vi.mock('../hooks/useWriteClients', () => ({
  useWriteClients: () => canWrite ? mockWriteClients : null,
}))

vi.mock('@commonality/sdk/indexer-sync', () => ({
  waitForIndexerToSyncToBlockNumber: vi.fn(async () => {}),
}))

vi.mock('./AddressDisplay', () => ({
  AddressDisplay: ({ address }: { address: string }) => <span>{address}</span>,
}))

const runtimeConfig: Record<string, string | undefined> = {
  VITE_IPFS_GATEWAY: 'https://gateway.example/ipfs',
}

vi.mock('../config/runtimeConfig', () => ({
  getRuntimeConfigValue: (key: string) => runtimeConfig[key],
}))

vi.mock('../config/policyBundle', () => ({
  loadOptionalPolicyBundle: async () => ({ status: 'unavailable' }),
}))

vi.mock('@commonality/sdk/statement-images', () => ({
  loadStatementImageWall: vi.fn(async () => ({
    statementId: '0x' + 'ab'.repeat(32),
    adoptions: [{
      signer: '0x1111111111111111111111111111111111111111',
      statementId: '0x' + 'ab'.repeat(32),
      imageId: '0x' + 'cd'.repeat(32),
      adopted: true,
    }],
    safety: [],
    beliefs: { '0x1111111111111111111111111111111111111111': 1 },
  })),
  believingAdoptionPointers: () => [{
    signer: '0x1111111111111111111111111111111111111111',
    statementId: '0x' + 'ab'.repeat(32),
    imageId: '0x' + 'cd'.repeat(32),
  }],
  mosaicTiles: () => [],
  statementImageCidHiddenByPolicy: (_snapshot: unknown, cid: string) => cid.startsWith('bafyblocked'),
  loadSignerImageAdoptions: async () => [],
  adoptStatementImage: async () => '0x',
  revokeStatementImage: async () => '0x',
}))

vi.mock('@commonality/sdk/conceptspace', () => ({
  getUserBeliefs: async () => [],
}))

vi.mock('@commonality/sdk/utils', () => ({
  bytes32ToCid: () => 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  cidToBytes32: () => '0x' + '11'.repeat(32),
}))

describe('StatementImagesSection', () => {
  afterEach(() => {
    delete runtimeConfig.VITE_MOSAIC_SAFETY_ATTESTER
    canWrite = false
    vi.clearAllMocks()
  })

  it('does not fetch or render an image on the core site', async () => {
    render(<StatementImagesSection statementCid="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" pixels="never" />)
    expect(await screen.findByTestId('statement-image-cid')).toHaveTextContent('bafybeig')
    expect(document.querySelector('img')).toBeNull()
    expect(document.body.textContent).not.toContain('gateway.example')
  })

  it('keeps unapproved image pointers as text when no attested wall tiles exist', async () => {
    runtimeConfig.VITE_MOSAIC_SAFETY_ATTESTER = '0x3333333333333333333333333333333333333333'
    render(<StatementImagesSection statementCid="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" pixels="wall" />)
    expect(await screen.findByTestId('statement-image-cid')).toHaveTextContent('bafybeig')
    expect(document.querySelector('img')).toBeNull()
  })

  it('appends image CIDs to the configured gateway path', async () => {
    render(<StatementImagesSection statementCid="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" pixels="own" />)
    await screen.findByTestId('statement-image-cid')
    expect(document.querySelector('img')).toHaveAttribute('src', `${runtimeConfig.VITE_IPFS_GATEWAY}/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)
  })

  it('hides the previous statement image while a new statement is loading', async () => {
    const view = render(<StatementImagesSection statementCid="first" pixels="own" />)
    await screen.findByTestId('statement-image-cid')
    vi.mocked(loadStatementImageWall).mockReturnValueOnce(new Promise(() => {}))
    view.rerender(<StatementImagesSection statementCid="second" pixels="own" />)
    expect(screen.queryByTestId('statement-image-cid')).toBeNull()
    expect(document.querySelector('img')).toBeNull()
  })

  it('waits for indexed revocation before reloading pointers', async () => {
    canWrite = true
    let finishSync!: () => void
    vi.mocked(waitForIndexerToSyncToBlockNumber).mockReturnValueOnce(new Promise((resolve) => { finishSync = resolve }))
    render(<StatementImagesSection statementCid="first" pixels="never" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(waitForIndexerToSyncToBlockNumber).toHaveBeenCalledWith(mockMachinery, 123n))
    expect(loadStatementImageWall).toHaveBeenCalledTimes(1)
    await act(async () => finishSync())
    await waitFor(() => expect(loadStatementImageWall).toHaveBeenCalledTimes(2))
  })

  it('waits for indexed adoption before reloading pointers', async () => {
    canWrite = true
    let finishSync!: () => void
    vi.mocked(waitForIndexerToSyncToBlockNumber).mockReturnValueOnce(new Promise((resolve) => { finishSync = resolve }))
    render(<StatementImagesSection statementCid="first" pixels="never" allowAdopt />)
    fireEvent.click(await screen.findByRole('button', { name: 'Attach a CID you already published' }))
    fireEvent.change(screen.getByLabelText('Image CID you already published'), { target: { value: 'published-cid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adopt this CID' }))
    await waitFor(() => expect(waitForIndexerToSyncToBlockNumber).toHaveBeenCalledWith(mockMachinery, 123n))
    expect(loadStatementImageWall).toHaveBeenCalledTimes(1)
    await act(async () => finishSync())
    await waitFor(() => expect(loadStatementImageWall).toHaveBeenCalledTimes(2))
  })
})
