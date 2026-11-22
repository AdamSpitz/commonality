import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatementImagesSection } from './StatementImagesSection'

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
}))

vi.mock('../hooks/useMachinery', () => ({
  useMachinery: () => ({ contractAddresses: { statementImages: '0x2222222222222222222222222222222222222222' } }),
}))

vi.mock('../hooks/useWriteClients', () => ({
  useWriteClients: () => null,
}))

vi.mock('./AddressDisplay', () => ({
  AddressDisplay: ({ address }: { address: string }) => <span>{address}</span>,
}))

vi.mock('../config/runtimeConfig', () => ({
  getRuntimeConfigValue: (key: string) => (key === 'VITE_IPFS_GATEWAY' ? 'https://gateway.example/ipfs' : undefined),
}))

vi.mock('@commonality/sdk/statement-images', () => ({
  loadStatementImageWall: async () => ({
    statementId: '0x' + 'ab'.repeat(32),
    adoptions: [{
      signer: '0x1111111111111111111111111111111111111111',
      statementId: '0x' + 'ab'.repeat(32),
      imageId: '0x' + 'cd'.repeat(32),
      adopted: true,
    }],
    safety: [],
    beliefs: { '0x1111111111111111111111111111111111111111': 1 },
  }),
  believingAdoptionPointers: () => [{
    signer: '0x1111111111111111111111111111111111111111',
    statementId: '0x' + 'ab'.repeat(32),
    imageId: '0x' + 'cd'.repeat(32),
  }],
  mosaicTiles: () => [],
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
  it('does not fetch or render an image on the core site', async () => {
    render(<StatementImagesSection statementCid="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" pixels="never" />)
    expect(await screen.findByTestId('statement-image-cid')).toHaveTextContent('bafybeig')
    expect(document.querySelector('img')).toBeNull()
    expect(document.body.textContent).not.toContain('gateway.example')
  })
})
