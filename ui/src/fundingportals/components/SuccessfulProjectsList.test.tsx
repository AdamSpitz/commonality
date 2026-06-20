import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SuccessfulProjectsList } from './SuccessfulProjectsList'

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getSuccessfulProjectsForCause: vi.fn(),
    getProject: vi.fn(),
    fetchFromIPFS: vi.fn(),
  }
})

import {
  createSDKMachinery,
  fetchFromIPFS,
  getProject,
  getSuccessfulProjectsForCause,
} from '@commonality/sdk'

const mockMachinery = {} as any
const PROJECT_ADDR = '0x1111111111111111111111111111111111111111'
const OTHER_PROJECT_ADDR = '0x2222222222222222222222222222222222222222'
const ATTESTER_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const ATTESTER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'

const usdc = {
  kind: 'erc20',
  symbol: 'USDC',
  decimals: 6,
  tokenAddress: '0x3333333333333333333333333333333333333333',
  tokenType: 0,
} as const

function makeSuccessfulProject(overrides: Partial<any> = {}): any {
  return {
    projectAddress: PROJECT_ADDR,
    successType: 'direct',
    outstandingReceipts: '3',
    currentReceiptPrice: '1500000',
    totalReceived: '12500000',
    fundingCurrency: usdc,
    successAttesters: [ATTESTER_A],
    ...overrides,
  }
}

describe('SuccessfulProjectsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(getProject).mockResolvedValue({ metadataCid: 'bafyProjectMetadata' } as any)
    vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Clean Water Build', description: 'Installed community wells.' })
  })

  it('shows a loading spinner while successful projects load', () => {
    vi.mocked(getSuccessfulProjectsForCause).mockReturnValue(new Promise(() => {}) as any)

    render(<SuccessfulProjectsList statementCid="bafyCause" />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows an empty-state message when no successful projects have outstanding receipts', async () => {
    vi.mocked(getSuccessfulProjectsForCause).mockResolvedValue([])

    render(<SuccessfulProjectsList statementCid="bafyCause" />)

    expect(await screen.findByText('No successful projects with outstanding receipts yet.')).toBeInTheDocument()
  })

  it('passes trusted implication and success attester filters to the SDK query', async () => {
    vi.mocked(getSuccessfulProjectsForCause).mockResolvedValue([])
    const trustedImplicationAttesters = new Set(['0ximplication'])
    const trustedSuccessAttesters = new Set(['0xsuccess'])

    render(
      <SuccessfulProjectsList
        statementCid="bafyCause"
        trustedImplicationAttesters={trustedImplicationAttesters}
        trustedSuccessAttesters={trustedSuccessAttesters}
      />,
    )

    await screen.findByText('No successful projects with outstanding receipts yet.')
    expect(getSuccessfulProjectsForCause).toHaveBeenCalledWith(
      mockMachinery,
      'bafyCause',
      trustedImplicationAttesters,
      trustedSuccessAttesters,
    )
  })

  it('renders indexed successful projects with metadata, receipt status, funding, vouches, and LazyGiving links', async () => {
    vi.mocked(getSuccessfulProjectsForCause).mockResolvedValue([
      makeSuccessfulProject({ successAttesters: [ATTESTER_A, ATTESTER_B] }),
    ])

    render(<SuccessfulProjectsList statementCid="bafyCause" />)

    expect(await screen.findByRole('heading', { name: 'Clean Water Build' })).toBeInTheDocument()
    expect(screen.getByText('Installed community wells.')).toBeInTheDocument()
    expect(screen.getByText('Direct success')).toBeInTheDocument()
    expect(screen.getByText('3 receipts outstanding')).toBeInTheDocument()
    expect(screen.getByText('12.5 USDC')).toBeInTheDocument()
    expect(screen.getByText('1.5 USDC')).toBeInTheDocument()
    expect(screen.getByText('0xAAAA…AAAA, 0xBBBB…BBBB')).toBeInTheDocument()

    const encodedProjectRef = encodeURIComponent(`eip155:31337:${PROJECT_ADDR}`)
    expect(screen.getByRole('link', { name: 'Open project' })).toHaveAttribute('href', `/projects/${encodedProjectRef}`)
    expect(screen.getByRole('link', { name: 'Buy & burn receipts' })).toHaveAttribute('href', `/projects/${encodedProjectRef}?retro=1`)
  })

  it('falls back gracefully when project metadata cannot be loaded', async () => {
    vi.mocked(getSuccessfulProjectsForCause).mockResolvedValue([
      makeSuccessfulProject({ projectAddress: OTHER_PROJECT_ADDR, successType: 'indirect', outstandingReceipts: '1' }),
    ])
    vi.mocked(getProject).mockResolvedValue({ metadataCid: 'bafyMissingMetadata' } as any)
    vi.mocked(fetchFromIPFS).mockRejectedValue(new Error('IPFS unavailable'))

    render(<SuccessfulProjectsList statementCid="bafyCause" />)

    expect(await screen.findByRole('heading', { name: `Project ${OTHER_PROJECT_ADDR.slice(0, 8)}…` })).toBeInTheDocument()
    expect(screen.getByText('Indirect success')).toBeInTheDocument()
    expect(screen.getByText('1 receipt outstanding')).toBeInTheDocument()
    expect(screen.queryByText('Installed community wells.')).not.toBeInTheDocument()
  })

  it('shows a fallback when the SDK cannot determine the current receipt price', async () => {
    vi.mocked(getSuccessfulProjectsForCause).mockResolvedValue([
      makeSuccessfulProject({ currentReceiptPrice: null }),
    ])

    render(<SuccessfulProjectsList statementCid="bafyCause" />)

    expect(await screen.findByRole('heading', { name: 'Clean Water Build' })).toBeInTheDocument()
    expect(screen.getByText('Not available')).toBeInTheDocument()
  })

  it('shows an error alert when the successful-projects query fails', async () => {
    vi.mocked(getSuccessfulProjectsForCause).mockRejectedValue(new Error('Indexer unavailable'))

    render(<SuccessfulProjectsList statementCid="bafyCause" />)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Indexer unavailable')).toBeInTheDocument()
  })
})
