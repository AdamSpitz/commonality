import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateProjectPage } from './CreateProjectPage'

const mockNavigate = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock wagmi
const mockAccount = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const,
  isConnected: true,
}
const mockWalletClient = { data: { writeContract: vi.fn() } }
const mockPublicClient = { waitForTransactionReceipt: vi.fn() }

vi.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useWalletClient: () => mockWalletClient,
  usePublicClient: () => mockPublicClient,
}))

// Mock SDK
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createProject: vi.fn(),
    uploadToIPFS: vi.fn(),
    uploadBlobToIPFS: vi.fn(),
  }
})

import { createProject, uploadToIPFS, uploadBlobToIPFS } from '@commonality/sdk'

describe('CreateProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAccount.isConnected = true
    mockAccount.address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    // Set required env var for contract address
    import.meta.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'
    // Mock URL.createObjectURL for image preview (not available in JSDOM)
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-preview-url')
  })

  describe('Wallet not connected', () => {
    it('shows connect wallet message when not connected', () => {
      mockAccount.isConnected = false
      mockAccount.address = undefined as any

      render(<CreateProjectPage />)

      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    })

    it('does not show the form when not connected', () => {
      mockAccount.isConnected = false
      mockAccount.address = undefined as any

      render(<CreateProjectPage />)

      expect(screen.queryByLabelText(/project name/i)).not.toBeInTheDocument()
    })
  })

  describe('Form rendering', () => {
    it('displays the page heading', () => {
      render(<CreateProjectPage />)

      expect(screen.getByRole('heading', { name: 'Create Project' })).toBeInTheDocument()
    })

    it('displays all form fields', () => {
      render(<CreateProjectPage />)

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/funding goal/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument()
    })

    it('displays the recipient picker with default "Send to my account" option', () => {
      render(<CreateProjectPage />)

      expect(screen.getByLabelText(/send to my account/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/pick from a saved contact/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/enter an ethereum address/i)).toBeInTheDocument()
    })

    it('displays initial token type row', () => {
      render(<CreateProjectPage />)

      expect(screen.getByLabelText(/token id/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/supply/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
    })

    it('displays Add Token Type button', () => {
      render(<CreateProjectPage />)

      expect(screen.getByRole('button', { name: /add token type/i })).toBeInTheDocument()
    })

    it('displays Create Project submit button', () => {
      render(<CreateProjectPage />)

      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
    })
  })

  describe('Token type management', () => {
    it('adds a new token type row when Add Token Type is clicked', async () => {
      render(<CreateProjectPage />)
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: /add token type/i }))

      const tokenIdFields = screen.getAllByLabelText(/token id/i)
      expect(tokenIdFields).toHaveLength(2)
    })

    it('removes a token type row when delete is clicked', async () => {
      render(<CreateProjectPage />)
      const user = userEvent.setup()

      // Add a second row first
      await user.click(screen.getByRole('button', { name: /add token type/i }))
      expect(screen.getAllByLabelText(/token id/i)).toHaveLength(2)

      // Remove one
      const deleteButtons = screen.getAllByLabelText(/remove token type/i)
      await user.click(deleteButtons[0])

      expect(screen.getAllByLabelText(/token id/i)).toHaveLength(1)
    })

    it('does not show delete button when only one token type exists', () => {
      render(<CreateProjectPage />)

      expect(screen.queryByLabelText(/remove token type/i)).not.toBeInTheDocument()
    })
  })

  describe('Form validation', () => {
    it('shows error when project name is empty', async () => {
      render(<CreateProjectPage />)
      const user = userEvent.setup()

      await user.click(screen.getByRole('button', { name: /create project/i }))

      expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
      expect(uploadToIPFS).not.toHaveBeenCalled()
    })

    it('shows error when threshold is missing', async () => {
      render(<CreateProjectPage />)
      const user = userEvent.setup()

      setFieldValue(/project name/i, 'Test Project')
      await user.click(screen.getByRole('button', { name: /create project/i }))

      expect(screen.getByText(/funding goal must be positive/i)).toBeInTheDocument()
    })

    it('shows error when deadline is missing', async () => {
      render(<CreateProjectPage />)
      const user = userEvent.setup()

      setFieldValue(/project name/i, 'Test Project')
      setFieldValue(/funding goal/i, '10')

      await user.click(screen.getByRole('button', { name: /create project/i }))

      expect(screen.getByText(/deadline is required/i)).toBeInTheDocument()
    })

    it('shows error when token supply is missing', async () => {
      render(<CreateProjectPage />)
      const user = userEvent.setup()

      setFieldValue(/project name/i, 'Test Project')
      setFieldValue(/funding goal/i, '10')
      setFieldValue(/deadline/i, futureDeadlineValue())

      await user.click(screen.getByRole('button', { name: /create project/i }))

      expect(screen.getByText(/token type 1: supply must be positive/i)).toBeInTheDocument()
    })
  })

  describe('Successful submission', () => {
    function fillForm() {
      setFieldValue(/project name/i, 'Test Project')
      setFieldValue(/description/i, 'A test description')
      setFieldValue(/funding goal/i, '10')
      setFieldValue(/deadline/i, futureDeadlineValue())
      setFieldValue(/supply/i, '100')
      setFieldValue(/price/i, '0.1')
    }

    it('uploads metadata to IPFS and creates project on submit', async () => {
      vi.mocked(uploadToIPFS).mockResolvedValue('bafymetadata123' as any)
      vi.mocked(createProject).mockResolvedValue({
        hash: '0xhash',
        projectDetails: {
          tokenAddress: '0xtoken',
          marketplaceAddress: '0xmarket',
          assuranceContractAddress: '0xassurance',
        },
      } as any)

      render(<CreateProjectPage />)
      const user = userEvent.setup()
      fillForm()

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(uploadToIPFS).toHaveBeenCalledWith(
          expect.objectContaining({}),
          { name: 'Test Project', description: 'A test description' }
        )
        expect(createProject).toHaveBeenCalled()
      })
    })

    it('shows success message and View Project button after creation', async () => {
      vi.mocked(uploadToIPFS).mockResolvedValue('bafymetadata123' as any)
      vi.mocked(createProject).mockResolvedValue({
        hash: '0xhash',
        projectDetails: {
          tokenAddress: '0xtoken',
          marketplaceAddress: '0xmarket',
          assuranceContractAddress: '0xassurance',
        },
      } as any)

      render(<CreateProjectPage />)
      const user = userEvent.setup()
      fillForm()

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(screen.getByText(/project created successfully/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /view project/i })).toBeInTheDocument()
      })
    })

    it('navigates to project page when View Project is clicked', async () => {
      vi.mocked(uploadToIPFS).mockResolvedValue('bafymetadata123' as any)
      vi.mocked(createProject).mockResolvedValue({
        hash: '0xhash',
        projectDetails: {
          tokenAddress: '0xtoken',
          marketplaceAddress: '0xmarket',
          assuranceContractAddress: '0xassurance',
        },
      } as any)

      render(<CreateProjectPage />)
      const user = userEvent.setup()
      fillForm()

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view project/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /view project/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/projects/eip155%3A31337%3A0xassurance')
    })
  })

  describe('Per-token images', () => {
    function fillFormMinimal() {
      setFieldValue(/project name/i, 'Test Project')
      setFieldValue(/funding goal/i, '10')
      setFieldValue(/deadline/i, futureDeadlineValue())
      setFieldValue(/supply/i, '100')
      setFieldValue(/price/i, '0.1')
    }

    it('renders Token Name field for each token type', () => {
      render(<CreateProjectPage />)
      expect(screen.getByLabelText(/token name/i)).toBeInTheDocument()
    })

    it('renders image upload button for each token type', () => {
      render(<CreateProjectPage />)
      expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument()
    })

    it('does not call uploadBlobToIPFS when no image is selected', async () => {
      vi.mocked(uploadToIPFS).mockResolvedValue('bafymeta' as any)
      vi.mocked(createProject).mockResolvedValue({
        hash: '0xhash',
        projectDetails: {
          tokenAddress: '0xtoken',
          marketplaceAddress: '0xmarket',
          assuranceContractAddress: '0xassurance',
        },
      } as any)

      render(<CreateProjectPage />)
      const user = userEvent.setup()
      fillFormMinimal()
      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => expect(screen.getByText(/project created successfully/i)).toBeInTheDocument())
      expect(uploadBlobToIPFS).not.toHaveBeenCalled()
    })

    it('uploads image and per-token metadata when an image is selected', async () => {
      vi.mocked(uploadBlobToIPFS).mockResolvedValue('bafyimage123' as any)
      vi.mocked(uploadToIPFS)
        .mockResolvedValueOnce('bafytokenmeta' as any)  // per-token metadata
        .mockResolvedValueOnce('bafyprojectmeta' as any) // project metadata
      vi.mocked(createProject).mockResolvedValue({
        hash: '0xhash',
        projectDetails: {
          tokenAddress: '0xtoken',
          marketplaceAddress: '0xmarket',
          assuranceContractAddress: '0xassurance',
        },
      } as any)

      render(<CreateProjectPage />)
      const user = userEvent.setup()
      fillFormMinimal()

      // Upload a fake image file
      const imageFile = new File(['image data'], 'token.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput, imageFile)

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(uploadBlobToIPFS).toHaveBeenCalledWith(expect.objectContaining({}), imageFile)
        expect(uploadToIPFS).toHaveBeenCalledWith(
          expect.objectContaining({}),
          expect.objectContaining({ image: 'ipfs://bafyimage123' })
        )
        expect(uploadToIPFS).toHaveBeenCalledWith(
          expect.objectContaining({}),
          expect.objectContaining({ tokens: { '0': 'bafytokenmeta' } })
        )
      })
    })

    it('includes token name in per-token metadata', async () => {
      vi.mocked(uploadBlobToIPFS).mockResolvedValue('bafyimage123' as any)
      vi.mocked(uploadToIPFS)
        .mockResolvedValueOnce('bafytokenmeta' as any)
        .mockResolvedValueOnce('bafyprojectmeta' as any)
      vi.mocked(createProject).mockResolvedValue({
        hash: '0xhash',
        projectDetails: {
          tokenAddress: '0xtoken',
          marketplaceAddress: '0xmarket',
          assuranceContractAddress: '0xassurance',
        },
      } as any)

      render(<CreateProjectPage />)
      const user = userEvent.setup()
      fillFormMinimal()
      setFieldValue(/token name/i, 'Gold Tier')

      const imageFile = new File(['image data'], 'token.png', { type: 'image/png' })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput, imageFile)

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(uploadToIPFS).toHaveBeenCalledWith(
          expect.objectContaining({}),
          expect.objectContaining({ name: 'Gold Tier', image: 'ipfs://bafyimage123' })
        )
      })
    })
  })

  describe('Error handling', () => {
    it('shows error when IPFS upload fails', async () => {
      vi.mocked(uploadToIPFS).mockRejectedValue(new Error('IPFS upload failed'))

      render(<CreateProjectPage />)
      const user = userEvent.setup()

      setFieldValue(/project name/i, 'Test')
      setFieldValue(/funding goal/i, '10')
      setFieldValue(/deadline/i, futureDeadlineValue())
      setFieldValue(/supply/i, '100')
      setFieldValue(/price/i, '0.1')

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(screen.getByText('IPFS upload failed')).toBeInTheDocument()
      })
    })

    it('shows error when contract call fails', async () => {
      vi.mocked(uploadToIPFS).mockResolvedValue('bafymetadata123' as any)
      vi.mocked(createProject).mockRejectedValue(new Error('Transaction reverted'))

      render(<CreateProjectPage />)
      const user = userEvent.setup()

      setFieldValue(/project name/i, 'Test')
      setFieldValue(/funding goal/i, '10')
      setFieldValue(/deadline/i, futureDeadlineValue())
      setFieldValue(/supply/i, '100')
      setFieldValue(/price/i, '0.1')

      await user.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(screen.getByText('Transaction reverted')).toBeInTheDocument()
      })
    })
  })
})

function futureDeadlineValue() {
  return new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16)
}

function setFieldValue(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}
