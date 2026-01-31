import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomePage } from './HomePage'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
  useNavigate: vi.fn(),
}))

// Mock the CreateStatementForm component
vi.mock('../components', () => ({
  CreateStatementForm: vi.fn(({ onStatementCreated }: any) => (
    <div data-testid="create-statement-form">
      <button onClick={() => onStatementCreated('QmTestCid123')}>
        Mock Submit
      </button>
    </div>
  )),
}))

import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { CreateStatementForm } from '../components'

const mockNavigate = vi.fn()

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
    } as any)
  })

  describe('Disconnected state', () => {
    it('displays welcome heading when wallet is not connected', () => {
      render(<HomePage />)

      expect(screen.getByRole('heading', { name: /welcome to commonality/i })).toBeInTheDocument()
    })

    it('displays platform description text', () => {
      render(<HomePage />)

      expect(screen.getByText(/coordination platform for aligned people/i)).toBeInTheDocument()
    })

    it('displays connect wallet prompt', () => {
      render(<HomePage />)

      expect(screen.getByText(/connect your wallet to get started/i)).toBeInTheDocument()
    })

    it('does not display connected-only content', () => {
      render(<HomePage />)

      expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/connected as/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create and sign statement/i })).not.toBeInTheDocument()
    })
  })

  describe('Connected state', () => {
    const testAddress = '0x1234567890abcdef'

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({
        address: testAddress,
        isConnected: true,
      } as any)
    })

    it('displays "Welcome Back" heading', () => {
      render(<HomePage />)

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    })

    it('does not display the disconnected welcome message', () => {
      render(<HomePage />)

      expect(screen.queryByText(/welcome to commonality/i)).not.toBeInTheDocument()
    })

    it('displays connected address in an alert', () => {
      render(<HomePage />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent(`Connected as: ${testAddress}`)
    })

    it('displays Quick Actions section with Create and Browse buttons', () => {
      render(<HomePage />)

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create and sign statement/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /browse statements/i })).toBeInTheDocument()
    })

    it('displays Your Activity section', () => {
      render(<HomePage />)

      expect(screen.getByText('Your Activity')).toBeInTheDocument()
      expect(screen.getByText(/view your profile to see statements/i)).toBeInTheDocument()
    })

    it('links "View My Profile" button to user profile page', () => {
      render(<HomePage />)

      const profileLink = screen.getByRole('link', { name: /view my profile/i })
      expect(profileLink).toHaveAttribute('href', `/user/${testAddress}`)
    })

    it('links "Browse Statements" to /statements', () => {
      render(<HomePage />)

      const browseLink = screen.getByRole('link', { name: /browse statements/i })
      expect(browseLink).toHaveAttribute('href', '/statements')
    })

    it('links "Go to My Profile" to user profile page', () => {
      render(<HomePage />)

      const profileLink = screen.getByRole('link', { name: /go to my profile/i })
      expect(profileLink).toHaveAttribute('href', `/user/${testAddress}`)
    })
  })

  describe('Create Statement form toggle', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0xabc',
        isConnected: true,
      } as any)
    })

    it('does not show CreateStatementForm by default', () => {
      render(<HomePage />)

      expect(screen.queryByTestId('create-statement-form')).not.toBeInTheDocument()
    })

    it('shows CreateStatementForm when "Create and Sign Statement" is clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))

      expect(screen.getByTestId('create-statement-form')).toBeInTheDocument()
    })

    it('hides Quick Actions section when form is shown', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))

      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create and sign statement/i })).not.toBeInTheDocument()
    })

    it('shows Cancel button when form is visible', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('hides form and restores Quick Actions when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      // Open form
      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))
      expect(screen.getByTestId('create-statement-form')).toBeInTheDocument()

      // Cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByTestId('create-statement-form')).not.toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create and sign statement/i })).toBeInTheDocument()
    })
  })

  describe('Statement creation callback', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0xabc',
        isConnected: true,
      } as any)
    })

    it('navigates to statement page when a statement is created', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      // Open form
      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))

      // Trigger the onStatementCreated callback via mock
      await user.click(screen.getByRole('button', { name: /mock submit/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/statement/QmTestCid123')
    })

    it('hides the form after statement creation', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      // Open form
      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))
      expect(screen.getByTestId('create-statement-form')).toBeInTheDocument()

      // Create statement
      await user.click(screen.getByRole('button', { name: /mock submit/i }))

      expect(screen.queryByTestId('create-statement-form')).not.toBeInTheDocument()
    })

    it('passes onStatementCreated callback to CreateStatementForm', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      await user.click(screen.getByRole('button', { name: /create and sign statement/i }))

      expect(CreateStatementForm).toHaveBeenCalledWith(
        expect.objectContaining({
          onStatementCreated: expect.any(Function),
        }),
        undefined
      )
    })
  })

  describe('Address-dependent links', () => {
    it('updates profile links when address changes', () => {
      const address1 = '0xfirst'
      const address2 = '0xsecond'

      vi.mocked(useAccount).mockReturnValue({
        address: address1,
        isConnected: true,
      } as any)

      const { rerender } = render(<HomePage />)

      expect(screen.getByRole('link', { name: /view my profile/i })).toHaveAttribute(
        'href',
        `/user/${address1}`
      )

      vi.mocked(useAccount).mockReturnValue({
        address: address2,
        isConnected: true,
      } as any)

      rerender(<HomePage />)

      expect(screen.getByRole('link', { name: /view my profile/i })).toHaveAttribute(
        'href',
        `/user/${address2}`
      )
    })
  })
})
