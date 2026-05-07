import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FundingPortalSummary } from './FundingPortalSummary'

vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getTotalFundingForCause: vi.fn(),
    getAllAlignedProjectsForCause: vi.fn(),
    getProject: vi.fn(),
    fetchFromIPFS: vi.fn(),
  }
})

vi.mock('../utils', () => ({
  computeAvailableDelegatableFunding: vi.fn(),
}))

import {
  createSDKMachinery,
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getProject,
  fetchFromIPFS,
} from '@commonality/sdk'
import { computeAvailableDelegatableFunding } from '../utils'

const mockMachinery = {} as any

const NOW_SECS = Math.floor(Date.now() / 1000)
const FAR_FUTURE = String(NOW_SECS + 86400 * 365 * 10)

const ADDR_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const ADDR_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const ADDR_C = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
const ADDR_D = '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'

const ETH_CURRENCY = {
  kind: 'native' as const,
  symbol: 'ETH',
  decimals: 18,
  tokenAddress: null,
  tokenType: 0,
}

const USDZZZ_CURRENCY = {
  kind: 'erc20' as const,
  symbol: 'USDZZZ',
  decimals: 6,
  tokenAddress: '0x1234567890123456789012345678901234567890',
  tokenType: 0,
}

function makeFundingMetrics(overrides: Partial<{
  totalRaisedAcrossProjects: Array<{ amount: bigint; currency: { symbol: string; decimals: number } }>
  projectCount: number
}> = {}) {
  return {
    totalRaisedAcrossProjects: [],
    totalAvailableFromNotes: [],
    projectCount: 0,
    noteCount: 0,
    ...overrides,
  }
}

function makeProject(overrides: {
  projectAddress?: string
  alignmentType?: 'direct' | 'indirect'
  totalReceived?: string
  threshold?: string
  deadline?: string
  fundingCurrency?: typeof ETH_CURRENCY | typeof USDZZZ_CURRENCY
} = {}) {
  return {
    projectAddress: ADDR_A,
    alignmentType: 'direct' as const,
    totalReceived: '0',
    threshold: '1000000000000000000',
    deadline: FAR_FUTURE,
    fundingCurrency: ETH_CURRENCY,
    ...overrides,
  }
}

describe('FundingPortalSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(getProject).mockResolvedValue(null)
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
    vi.mocked(computeAvailableDelegatableFunding).mockResolvedValue([])
  })

  describe('Loading state', () => {
    it('shows spinner while data loads', () => {
      vi.mocked(getTotalFundingForCause).mockReturnValue(new Promise(() => {}))
      vi.mocked(getAllAlignedProjectsForCause).mockReturnValue(new Promise(() => {}))

      render(<FundingPortalSummary statementCid="QmTest" />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error alert with message when loading fails', async () => {
      vi.mocked(getTotalFundingForCause).mockRejectedValue(new Error('Network error'))
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows generic error message for non-Error exceptions', async () => {
      vi.mocked(getTotalFundingForCause).mockRejectedValue('string error')
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load funding portal summary')).toBeInTheDocument()
      })
    })
  })

  describe('Metrics display', () => {
    beforeEach(() => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(makeFundingMetrics())
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])
    })

    it('shows "Funding Portal" heading', async () => {
      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Funding Portal')).toBeInTheDocument()
      })
    })

    it('shows "View Funding Portal" button linking to /portal/:statementCid', async () => {
      render(<FundingPortalSummary statementCid="QmMyCid" />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'View Funding Portal' })
        expect(link).toHaveAttribute('href', '/portal/QmMyCid')
      })
    })

    it('shows total raised in ETH', async () => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(
        makeFundingMetrics({
          totalRaisedAcrossProjects: [
            { amount: 500000000000000000n, currency: { symbol: 'ETH', decimals: 18 } },
          ],
        })
      )

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('0.5 ETH')).toBeInTheDocument()
      })
    })

    it('shows available delegatable funding in ETH', async () => {
      vi.mocked(computeAvailableDelegatableFunding).mockResolvedValue([
        { amount: 250000000000000000n, currency: { symbol: 'ETH', decimals: 18 } },
      ])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('0.25 ETH')).toBeInTheDocument()
      })
    })

    it('uses the portal payment currency for empty funding labels', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ fundingCurrency: USDZZZ_CURRENCY }),
      ])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getAllByText('0 USDZZZ')).toHaveLength(2)
      })
      expect(screen.queryByText('0 ETH')).not.toBeInTheDocument()
    })

    it('shows grouped mixed-currency delegatable funding', async () => {
      vi.mocked(computeAvailableDelegatableFunding).mockResolvedValue([
        { amount: 250000000000000000n, currency: { symbol: 'ETH', decimals: 18 } },
        { amount: 1500000000000000000n, currency: { symbol: 'tokens', decimals: 18 } },
      ] as any)

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('0.25 ETH + 1.5 tokens')).toBeInTheDocument()
      })
    })

    it('shows aligned project count', async () => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(
        makeFundingMetrics({ projectCount: 7 })
      )

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument()
      })
    })
  })

  describe('Empty projects', () => {
    it('does not show "Top Projects" section when no projects', async () => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(makeFundingMetrics())
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Funding Portal')).toBeInTheDocument()
      })
      expect(screen.queryByText('Top Projects by Funding Progress')).not.toBeInTheDocument()
    })
  })

  describe('Top projects display', () => {
    beforeEach(() => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(makeFundingMetrics({ projectCount: 1 }))
    })

    it('shows "Top Projects by Funding Progress" heading when projects exist', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([makeProject()])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Top Projects by Funding Progress')).toBeInTheDocument()
      })
    })

    it('shows project metadata name when available', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([makeProject({ projectAddress: ADDR_A })])
      vi.mocked(getProject).mockResolvedValue({ metadataCid: 'cid-a' } as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'My Great Project' })

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('My Great Project')).toBeInTheDocument()
      })
    })

    it('shows truncated address fallback when no metadata available', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([makeProject({ projectAddress: ADDR_A })])
      vi.mocked(getProject).mockResolvedValue(null)

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        // AlignedProjectCard: `Project ${address.slice(0, 8)}...`
        // ADDR_A.slice(0, 8) = '0xAAAAAA'
        expect(screen.getByText('Project 0xAAAAAA...')).toBeInTheDocument()
      })
    })

    it('shows project card link to /projects/:address', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([makeProject({ projectAddress: ADDR_A })])
      vi.mocked(getProject).mockResolvedValue({ metadataCid: 'cid-a' } as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Alpha Project' })

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Alpha Project/ })
        expect(link).toHaveAttribute('href', `/projects/${ADDR_A}`)
      })
    })

    it('shows funding amounts for each project card', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({
          projectAddress: ADDR_A,
          totalReceived: '500000000000000000',
          threshold: '1000000000000000000',
        }),
      ])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        // AlignedProjectCard renders: "{totalReceived} / {threshold} ETH"
        expect(screen.getByText('0.5 / 1 ETH')).toBeInTheDocument()
      })
    })

    it('shows Direct alignment chip for direct project', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, alignmentType: 'direct' }),
      ])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Direct')).toBeInTheDocument()
      })
    })

    it('shows Indirect alignment chip for indirect project', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, alignmentType: 'indirect' }),
      ])

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Indirect')).toBeInTheDocument()
      })
    })

    it('shows only top 3 projects when more than 3 exist', async () => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(makeFundingMetrics({ projectCount: 4 }))
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, totalReceived: '900', threshold: '1000' }), // 90%
        makeProject({ projectAddress: ADDR_B, totalReceived: '700', threshold: '1000' }), // 70%
        makeProject({ projectAddress: ADDR_C, totalReceived: '500', threshold: '1000' }), // 50%
        makeProject({ projectAddress: ADDR_D, totalReceived: '100', threshold: '1000' }), // 10% — excluded
      ])
      vi.mocked(getProject).mockImplementation(async (_m, address) => {
        const cidMap: Record<string, string> = {
          [ADDR_A]: 'cid-a', [ADDR_B]: 'cid-b', [ADDR_C]: 'cid-c', [ADDR_D]: 'cid-d',
        }
        return cidMap[address] ? { metadataCid: cidMap[address] } as any : null
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        const nameMap: Record<string, string> = {
          'cid-a': 'Project A', 'cid-b': 'Project B', 'cid-c': 'Project C', 'cid-d': 'Project D',
        }
        return nameMap[cid as string] ? { name: nameMap[cid as string] } : null
      })

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Project A')).toBeInTheDocument()
        expect(screen.getByText('Project B')).toBeInTheDocument()
        expect(screen.getByText('Project C')).toBeInTheDocument()
      })
      // Project D (10%) is the 4th — should not appear
      expect(screen.queryByText('Project D')).not.toBeInTheDocument()
    })

    it('sorts projects by funding progress descending (highest % first)', async () => {
      // Input order: Gamma (10%), Beta (50%), Alpha (90%) — component should reorder
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_C, totalReceived: '100', threshold: '1000' }), // 10%
        makeProject({ projectAddress: ADDR_B, totalReceived: '500', threshold: '1000' }), // 50%
        makeProject({ projectAddress: ADDR_A, totalReceived: '900', threshold: '1000' }), // 90%
      ])
      vi.mocked(getProject).mockImplementation(async (_m, address) => {
        const cidMap: Record<string, string> = {
          [ADDR_A]: 'cid-a', [ADDR_B]: 'cid-b', [ADDR_C]: 'cid-c',
        }
        return cidMap[address] ? { metadataCid: cidMap[address] } as any : null
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        const nameMap: Record<string, string> = {
          'cid-a': 'Project Alpha',
          'cid-b': 'Project Beta',
          'cid-c': 'Project Gamma',
        }
        return nameMap[cid as string] ? { name: nameMap[cid as string] } : null
      })

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 })
        // Alpha (90%) first, Gamma (10%) last
        expect(headings[0]).toHaveTextContent('Project Alpha')
        expect(headings[1]).toHaveTextContent('Project Beta')
        expect(headings[2]).toHaveTextContent('Project Gamma')
      })
    })

    it('calls computeAvailableDelegatableFunding with the statementCid', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(<FundingPortalSummary statementCid="QmSpecificCid" />)

      await waitFor(() => {
        expect(screen.getByText('Funding Portal')).toBeInTheDocument()
      })
      expect(computeAvailableDelegatableFunding).toHaveBeenCalledWith(
        mockMachinery,
        'QmSpecificCid'
      )
    })

    it('renders multiple project cards for multiple projects', async () => {
      vi.mocked(getTotalFundingForCause).mockResolvedValue(makeFundingMetrics({ projectCount: 2 }))
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, totalReceived: '900', threshold: '1000' }),
        makeProject({ projectAddress: ADDR_B, totalReceived: '100', threshold: '1000' }),
      ])
      vi.mocked(getProject).mockImplementation(async (_m, address) => {
        return address === ADDR_A
          ? { metadataCid: 'cid-a' } as any
          : { metadataCid: 'cid-b' } as any
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        return cid === 'cid-a' ? { name: 'First Project' } : { name: 'Second Project' }
      })

      render(<FundingPortalSummary statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('First Project')).toBeInTheDocument()
        expect(screen.getByText('Second Project')).toBeInTheDocument()
      })
    })
  })
})
