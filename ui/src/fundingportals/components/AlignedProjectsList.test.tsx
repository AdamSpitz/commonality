import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlignedProjectsList } from './AlignedProjectsList'

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
    getAllAlignedProjectsForCause: vi.fn(),
    getProject: vi.fn(),
    fetchFromIPFS: vi.fn(),
  }
})

vi.mock('../../content-funding/hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(() => ({
    state: null,
    channels: [],
    loading: false,
  })),
}))

import {
  createSDKMachinery,
  getAllAlignedProjectsForCause,
  getProject,
  fetchFromIPFS,
} from '@commonality/sdk'

const mockMachinery = {} as any

const NOW_SECS = Math.floor(Date.now() / 1000)
const FAR_FUTURE = String(NOW_SECS + 86400 * 365 * 10)  // active
const PAST = String(NOW_SECS - 86400)                    // refunding (deadline passed)

const ADDR_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const ADDR_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const ADDR_C = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'

function makeProject(overrides: {
  projectAddress?: string
  alignmentType?: 'direct' | 'indirect'
  totalReceived?: string
  threshold?: string
  deadline?: string
} = {}) {
  return {
    projectAddress: ADDR_A,
    alignmentType: 'direct' as const,
    totalReceived: '0',
    threshold: '1000000000000000000',
    deadline: FAR_FUTURE,
    ...overrides,
  }
}

describe('AlignedProjectsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(getProject).mockResolvedValue(null)
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
  })

  describe('Query arguments', () => {
    it('passes trusted implication and alignment attesters to the SDK query', async () => {
      const trustedImplicationAttesters = ['0x1111111111111111111111111111111111111111']
      const trustedAlignmentAttesters = new Set(['0x2222222222222222222222222222222222222222'])
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(
        <AlignedProjectsList
          statementCid="QmTest"
          trustedImplicationAttesters={trustedImplicationAttesters}
          trustedAlignmentAttesters={trustedAlignmentAttesters}
        />
      )

      await waitFor(() => {
        expect(getAllAlignedProjectsForCause).toHaveBeenCalledWith(
          mockMachinery,
          'QmTest',
          trustedImplicationAttesters,
          trustedAlignmentAttesters
        )
      })
    })
  })

  describe('Loading state', () => {
    it('shows spinner while data loads', () => {
      vi.mocked(getAllAlignedProjectsForCause).mockReturnValue(new Promise(() => {}))

      render(<AlignedProjectsList statementCid="QmTest" />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error message when loading fails', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockRejectedValue(new Error('Network error'))

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows generic error for non-Error exceptions', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockRejectedValue('string error')

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load aligned projects')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('shows "No aligned projects yet" when no projects returned', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('No aligned projects yet.')).toBeInTheDocument()
      })
    })

    it('shows "No projects match" message when all projects are filtered out', async () => {
      // Active project only — filtering to 'succeeded' will exclude it
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ totalReceived: '0', threshold: '1000000000000000000', deadline: FAR_FUTURE }),
      ])

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        // Wait for the project card to appear (loading complete)
        expect(screen.getByText('Project 0xAAAAAA...')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Succeeded', pressed: false }))

      expect(screen.getByText('No projects match the current filters.')).toBeInTheDocument()
    })
  })

  describe('Project display', () => {
    it('shows sort and filter controls', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Latest' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Deadline' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Most Funded' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Closest to Goal' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Direct' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Indirect' })).toBeInTheDocument()
      })
    })

    it('shows project metadata name when available', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([makeProject()])
      vi.mocked(getProject).mockResolvedValue({ metadataCid: 'cid1' } as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Alpha Project' })

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument()
      })
    })

    it('shows truncated address when no metadata available', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A }),
      ])
      vi.mocked(getProject).mockResolvedValue(null)

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Project 0xAAAAAA...')).toBeInTheDocument()
      })
    })

    it('shows alignment chips for direct and indirect projects', async () => {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, alignmentType: 'direct' }),
        makeProject({ projectAddress: ADDR_B, alignmentType: 'indirect' }),
      ])

      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        // "Direct" and "Indirect" appear in both filter buttons and alignment chips on cards
        expect(screen.getAllByText('Direct').length).toBeGreaterThanOrEqual(2)
        expect(screen.getAllByText('Indirect').length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('Status filter', () => {
    function setupThreeStatusProjects() {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, totalReceived: '0', deadline: FAR_FUTURE }),         // active
        makeProject({ projectAddress: ADDR_B, totalReceived: '1000000000000000000', threshold: '1000000000000000000', deadline: FAR_FUTURE }), // succeeded
        makeProject({ projectAddress: ADDR_C, totalReceived: '0', deadline: PAST }),               // refunding
      ])
      vi.mocked(getProject).mockImplementation(async (_machinery, address) => {
        const cidMap: Record<string, string> = {
          [ADDR_A]: 'cid-a',
          [ADDR_B]: 'cid-b',
          [ADDR_C]: 'cid-c',
        }
        return cidMap[address] ? { metadataCid: cidMap[address] } as any : null
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        const nameMap: Record<string, string> = {
          'cid-a': 'Active Project',
          'cid-b': 'Succeeded Project',
          'cid-c': 'Refunding Project',
        }
        return nameMap[cid as string] ? { name: nameMap[cid as string] } : null
      })
    }

    it('shows all projects by default', async () => {
      setupThreeStatusProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Active Project')).toBeInTheDocument()
        expect(screen.getByText('Succeeded Project')).toBeInTheDocument()
        expect(screen.getByText('Refunding Project')).toBeInTheDocument()
      })
    })

    it('shows only active projects when "Funding" status filter is selected', async () => {
      setupThreeStatusProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Active Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Funding', pressed: false }))

      await waitFor(() => {
        expect(screen.getByText('Active Project')).toBeInTheDocument()
        expect(screen.queryByText('Succeeded Project')).not.toBeInTheDocument()
        expect(screen.queryByText('Refunding Project')).not.toBeInTheDocument()
      })
    })

    it('shows only succeeded projects when "Succeeded" filter is selected', async () => {
      setupThreeStatusProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Succeeded Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Succeeded', pressed: false }))

      await waitFor(() => {
        expect(screen.queryByText('Active Project')).not.toBeInTheDocument()
        expect(screen.getByText('Succeeded Project')).toBeInTheDocument()
        expect(screen.queryByText('Refunding Project')).not.toBeInTheDocument()
      })
    })

    it('shows only refunding projects when "Refunding" filter is selected', async () => {
      setupThreeStatusProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Refunding Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Refunding', pressed: false }))

      await waitFor(() => {
        expect(screen.queryByText('Active Project')).not.toBeInTheDocument()
        expect(screen.queryByText('Succeeded Project')).not.toBeInTheDocument()
        expect(screen.getByText('Refunding Project')).toBeInTheDocument()
      })
    })
  })

  describe('Alignment filter', () => {
    function setupDirectIndirectProjects() {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, alignmentType: 'direct' }),
        makeProject({ projectAddress: ADDR_B, alignmentType: 'indirect' }),
      ])
      vi.mocked(getProject).mockImplementation(async (_machinery, address) => {
        return address === ADDR_A
          ? { metadataCid: 'cid-direct' } as any
          : { metadataCid: 'cid-indirect' } as any
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        return cid === 'cid-direct'
          ? { name: 'Direct Project' }
          : { name: 'Indirect Project' }
      })
    }

    it('shows all projects by default', async () => {
      setupDirectIndirectProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Direct Project')).toBeInTheDocument()
        expect(screen.getByText('Indirect Project')).toBeInTheDocument()
      })
    })

    it('shows only direct projects when "Direct" filter is selected', async () => {
      setupDirectIndirectProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Direct Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Direct', pressed: false }))

      await waitFor(() => {
        expect(screen.getByText('Direct Project')).toBeInTheDocument()
        expect(screen.queryByText('Indirect Project')).not.toBeInTheDocument()
      })
    })

    it('shows only indirect projects when "Indirect" filter is selected', async () => {
      setupDirectIndirectProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Indirect Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Indirect', pressed: false }))

      await waitFor(() => {
        expect(screen.queryByText('Direct Project')).not.toBeInTheDocument()
        expect(screen.getByText('Indirect Project')).toBeInTheDocument()
      })
    })
  })

  describe('Sort options', () => {
    // Three projects with distinct, predictable sort keys:
    //   Alpha (ADDR_A): deadline=100 (earliest), totalReceived=900 (most funded), 900/1000 = 90% progress
    //   Beta  (ADDR_B): deadline=200 (middle),   totalReceived=500,               500/1000 = 50% progress
    //   Gamma (ADDR_C): deadline=300 (latest),   totalReceived=100 (least funded), 100/1000 = 10% progress
    function setupSortProjects() {
      vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
        makeProject({ projectAddress: ADDR_A, deadline: '100', totalReceived: '900', threshold: '1000' }),
        makeProject({ projectAddress: ADDR_B, deadline: '200', totalReceived: '500', threshold: '1000' }),
        makeProject({ projectAddress: ADDR_C, deadline: '300', totalReceived: '100', threshold: '1000' }),
      ])
      vi.mocked(getProject).mockImplementation(async (_machinery, address) => {
        const cidMap: Record<string, string> = {
          [ADDR_A]: 'cid-a',
          [ADDR_B]: 'cid-b',
          [ADDR_C]: 'cid-c',
        }
        return { metadataCid: cidMap[address] } as any
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        const nameMap: Record<string, string> = {
          'cid-a': 'Project Alpha',
          'cid-b': 'Project Beta',
          'cid-c': 'Project Gamma',
        }
        return { name: nameMap[cid as string] }
      })
    }

    it('sorts by highest deadline first by default ("latest")', async () => {
      setupSortProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 })
        // Gamma (deadline=300) first, Alpha (deadline=100) last
        expect(headings[0]).toHaveTextContent('Project Gamma')
        expect(headings[1]).toHaveTextContent('Project Beta')
        expect(headings[2]).toHaveTextContent('Project Alpha')
      })
    })

    it('sorts by earliest deadline first when "Deadline" is selected', async () => {
      setupSortProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Deadline', pressed: false }))

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 })
        // Alpha (deadline=100) first, Gamma (deadline=300) last
        expect(headings[0]).toHaveTextContent('Project Alpha')
        expect(headings[1]).toHaveTextContent('Project Beta')
        expect(headings[2]).toHaveTextContent('Project Gamma')
      })
    })

    it('sorts by highest totalReceived first when "Most Funded" is selected', async () => {
      setupSortProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Most Funded', pressed: false }))

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 })
        // Alpha (totalReceived=900) first, Gamma (totalReceived=100) last
        expect(headings[0]).toHaveTextContent('Project Alpha')
        expect(headings[1]).toHaveTextContent('Project Beta')
        expect(headings[2]).toHaveTextContent('Project Gamma')
      })
    })

    it('sorts by highest funding progress first when "Closest to Goal" is selected', async () => {
      setupSortProjects()
      render(<AlignedProjectsList statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Closest to Goal', pressed: false }))

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 })
        // Alpha (90%) first, Gamma (10%) last
        expect(headings[0]).toHaveTextContent('Project Alpha')
        expect(headings[1]).toHaveTextContent('Project Beta')
        expect(headings[2]).toHaveTextContent('Project Gamma')
      })
    })
  })
})
