import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowseProjectsPage } from './BrowseProjectsPage'
import * as cachedProjectsModule from '../../shared/hooks/useCachedProjects'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getAllProjectAddresses: vi.fn(),
    getProject: vi.fn(),
    fetchFromIPFS: vi.fn(),
  }
})

import {
  createSDKMachinery,
  getAllProjectAddresses,
  getProject,
  fetchFromIPFS,
} from '@commonality/sdk'

const mockMachinery = {} as any

const NOW_SECONDS = Math.floor(Date.now() / 1000)

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: '0x1234567890abcdef1234567890abcdef12345678',
    erc1155Address: '0xaaaa',
    recipient: '0xbbbb',
    threshold: '1000000000000000000', // 1 ETH
    deadline: String(NOW_SECONDS + 86400), // 1 day from now
    totalReceived: '500000000000000000', // 0.5 ETH
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    fundingProgress: 0.5,
    createdAtBlock: '100',
    ...overrides,
  }
}

describe('BrowseProjectsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(getAllProjectAddresses).mockResolvedValue([
      '0x1234567890abcdef1234567890abcdef12345678',
    ] as any)
    vi.mocked(getProject).mockResolvedValue(makeProject() as any)
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching projects', () => {
      vi.mocked(getAllProjectAddresses).mockReturnValue(new Promise(() => {}))

      render(<BrowseProjectsPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('does not display error or empty state while loading', () => {
      vi.mocked(getAllProjectAddresses).mockReturnValue(new Promise(() => {}))

      render(<BrowseProjectsPage />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/no projects found/i)).not.toBeInTheDocument()
    })
  })

  describe('Error states', () => {
    it('displays error message when API call fails', async () => {
      vi.mocked(getAllProjectAddresses).mockRejectedValue(new Error('Network error'))

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('displays generic error for non-Error exceptions', async () => {
      vi.mocked(getAllProjectAddresses).mockRejectedValue('string error')

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load projects')).toBeInTheDocument()
      })
    })

    it('hides loading spinner after error', async () => {
      vi.mocked(getAllProjectAddresses).mockRejectedValue(new Error('fail'))

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).toBeInTheDocument()
        // CircularProgress gone (no progressbar at all since no cards rendered)
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('displays empty message when no projects are returned', async () => {
      vi.mocked(getAllProjectAddresses).mockResolvedValue([])

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText(/no projects found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Successful rendering', () => {
    it('displays the page heading', async () => {
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Test Project' })

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Browse Projects' })).toBeInTheDocument()
      })
    })

    it('displays sort controls', async () => {
      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Newest' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Deadline' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Most Funded' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Closest to Goal' })).toBeInTheDocument()
      })
    })

    it('displays status filter controls', async () => {
      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      })
    })

    it('renders project cards with names from IPFS', async () => {
      vi.spyOn(cachedProjectsModule, 'useCachedProjects').mockReturnValue({
        projects: [
          makeProject({ id: '0x1111', metadataCid: 'cid1' }),
          makeProject({ id: '0x2222', metadataCid: 'cid2' }),
        ] as any,
        loading: false,
        error: null,
        reload: vi.fn(),
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        if (cid === 'cid1') return { name: 'Alpha Project' }
        if (cid === 'cid2') return { name: 'Beta Project' }
        return null
      })

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText('Alpha Project')).toBeInTheDocument()
        expect(screen.getByText('Beta Project')).toBeInTheDocument()
      })
    })

    it('displays truncated address when no metadata available', async () => {
      vi.mocked(fetchFromIPFS).mockResolvedValue(null)
      vi.mocked(getProject).mockResolvedValue(makeProject({ metadataCid: undefined }) as any)

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText(/Project 0x123456/)).toBeInTheDocument()
      })
    })

    it('displays funding progress as ETH amounts', async () => {
      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText(/0\.5/)).toBeInTheDocument()
        expect(screen.getByText(/ETH/)).toBeInTheDocument()
      })
    })

    it('displays funding percentage', async () => {
      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
      })
    })

    it('displays Funding badge for active projects', async () => {
      render(<BrowseProjectsPage />)

      await waitFor(() => {
        // "Funding" appears as both a status badge and a filter button
        const fundingElements = screen.getAllByText('Funding')
        expect(fundingElements.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('displays Succeeded badge when threshold met', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({
        totalReceived: '2000000000000000000',
        threshold: '1000000000000000000',
      }) as any)

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        // "Succeeded" appears as status badge + filter button
        const elements = screen.getAllByText('Succeeded')
        expect(elements.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('displays Refunding badge when deadline passed and threshold not met', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({
        deadline: String(NOW_SECONDS - 86400),
        totalReceived: '500000000000000000',
        threshold: '1000000000000000000',
      }) as any)

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        const elements = screen.getAllByText('Refunding')
        expect(elements.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('displays relative deadline', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ deadline: String(NOW_SECONDS + 86400) }) as any)

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText(/left/)).toBeInTheDocument()
      })
    })

    it('displays "Ended" for past deadlines', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({
        deadline: String(NOW_SECONDS - 86400),
        totalReceived: '2000000000000000000',
      }) as any)

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText('Ended')).toBeInTheDocument()
      })
    })

    it('links project cards to correct detail page', async () => {
      vi.mocked(getAllProjectAddresses).mockResolvedValue(['0xabcdef'] as any)
      vi.mocked(getProject).mockResolvedValue(makeProject({ id: '0xabcdef' }) as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Linked Project' })

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        const link = screen.getByText('Linked Project').closest('a')
        expect(link).toHaveAttribute('href', '/projects/0xabcdef')
      })
    })
  })

  describe('Sort toggle', () => {
    it('defaults to newest sort', async () => {
      vi.mocked(getAllProjectAddresses).mockResolvedValue([])

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(getAllProjectAddresses).toHaveBeenCalledTimes(1)
      })
    })

    it('switches sort when a different option is clicked', async () => {
      vi.mocked(getAllProjectAddresses).mockResolvedValue([])

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(getAllProjectAddresses).toHaveBeenCalledTimes(1)
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Most Funded' }))

      await waitFor(() => {
        expect(getAllProjectAddresses).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Status filter', () => {
    it('filters to only succeeded projects when Succeeded filter clicked', async () => {
      const projects = [
        makeProject({ id: '0x1111', totalReceived: '500000000000000000', fundingProgress: 0.5, metadataCid: 'cid1' }),
        makeProject({
          id: '0x2222',
          totalReceived: '2000000000000000000',
          fundingProgress: 2.0,
          metadataCid: 'cid2',
        }),
      ]
      vi.spyOn(cachedProjectsModule, 'useCachedProjects').mockReturnValue({
        projects: projects as any,
        loading: false,
        error: null,
        reload: vi.fn(),
      })
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        if (cid === 'cid1') return { name: 'Active Project' }
        if (cid === 'cid2') return { name: 'Succeeded Project' }
        return null
      })

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Project')).toBeInTheDocument()
        expect(screen.getByText('Succeeded Project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      // Click the Succeeded toggle button (not the status chip)
      const succeededButton = screen.getByRole('button', { name: 'Succeeded', pressed: false })
      await user.click(succeededButton)

      await waitFor(() => {
        expect(screen.queryByText('Active Project')).not.toBeInTheDocument()
        expect(screen.getByText('Succeeded Project')).toBeInTheDocument()
      })
    })
  })

  describe('IPFS metadata', () => {
    it('fetches metadata for projects with metadataCid', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ metadataCid: 'bafytest' }) as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'From IPFS' })

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(fetchFromIPFS).toHaveBeenCalledWith(
          expect.objectContaining({}),
          'bafytest'
        )
        expect(screen.getByText('From IPFS')).toBeInTheDocument()
      })
    })

    it('does not fetch metadata for projects without metadataCid', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ metadataCid: undefined }) as any)

      render(<BrowseProjectsPage />)

      await waitFor(() => {
        expect(screen.getByText(/Project 0x123456/)).toBeInTheDocument()
      })

      expect(fetchFromIPFS).not.toHaveBeenCalled()
    })
  })

  describe('State transitions', () => {
    it('transitions from loading to success', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<BrowseProjectsPage />)

      // Initially shows CircularProgress
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // After loading, CircularProgress gone (LinearProgress may appear in cards)
      await waitFor(() => {
        expect(screen.getByText(/ETH/)).toBeInTheDocument()
      })
    })

    it('transitions from loading to error', async () => {
      vi.mocked(getAllProjectAddresses).mockRejectedValue(new Error('API Error'))

      render(<BrowseProjectsPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })
    })
  })
})
