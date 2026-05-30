import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentSubmissionForm } from './ContentSubmissionForm'

const submitContentSubmission = vi.fn()
const clearError = vi.fn()
const mockUsePlatformApi = vi.fn()

vi.mock('../hooks/usePlatformApi', () => ({
  usePlatformApi: () => mockUsePlatformApi(),
}))

const STATEMENT_CID = 'bafybeidagx4zc6phhtj3jng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy'

function renderForm() {
  return render(<ContentSubmissionForm statementCid={STATEMENT_CID} />)
}

function urlInput() {
  return screen.getByRole('textbox', { name: 'Content URL' })
}

function perspectiveInput() {
  return screen.getByRole('textbox', { name: 'Perspective' })
}

function submitButton() {
  return screen.getByRole('button', { name: 'Submit Content' })
}

function formElement() {
  return document.querySelector('form') as HTMLFormElement
}

describe('ContentSubmissionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitContentSubmission.mockResolvedValue({
      contentUrl: 'https://x.com/alice/status/123',
      statementCid: STATEMENT_CID,
    })
    mockUsePlatformApi.mockReturnValue({
      submitContentSubmission,
      isLoading: false,
      error: null,
      clearError,
    })
  })

  describe('rendering', () => {
    it('renders the form heading', () => {
      renderForm()

      expect(screen.getByRole('heading', { name: 'Submit Content for Evaluation' })).toBeInTheDocument()
    })

    it('renders the description text', () => {
      renderForm()

      expect(screen.getByText(/Queue a post, video, or article/)).toBeInTheDocument()
    })

    it('renders the content URL input', () => {
      renderForm()

      expect(urlInput()).toBeInTheDocument()
    })

    it('renders the perspective input', () => {
      renderForm()

      expect(perspectiveInput()).toBeInTheDocument()
    })

    it('renders the submit button', () => {
      renderForm()

      expect(submitButton()).toBeInTheDocument()
    })

    it('shows a safe error when the platform API is unavailable', () => {
      mockUsePlatformApi.mockReturnValue({
        submitContentSubmission,
        isLoading: false,
        error: {
          code: 'network_error',
          message: 'Platform API request failed: Failed to fetch',
        },
        clearError,
      })

      renderForm()

      expect(screen.getByRole('alert')).toHaveTextContent('Platform API request failed: Failed to fetch')
    })
  })

  describe('submission', () => {
    it('submits the current statement CID with the provided URL and perspective', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), 'https://x.com/alice/status/123')
      await user.type(perspectiveInput(), 'supportive')
      await user.click(submitButton())

      expect(submitContentSubmission).toHaveBeenCalledWith({
        contentUrl: 'https://x.com/alice/status/123',
        statementCid: STATEMENT_CID,
        declaredPerspective: 'supportive',
      })

      expect(await screen.findByText('Queued for content-attester review.')).toBeInTheDocument()
    })

    it('submits without perspective when perspective is empty', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), 'https://x.com/alice/status/456')
      await user.click(submitButton())

      expect(submitContentSubmission).toHaveBeenCalledWith({
        contentUrl: 'https://x.com/alice/status/456',
        statementCid: STATEMENT_CID,
        declaredPerspective: undefined,
      })
    })

    it('trims whitespace from URL and perspective before submitting', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), '  https://x.com/alice/status/789  ')
      await user.type(perspectiveInput(), '  neutral  ')
      await user.click(submitButton())

      expect(submitContentSubmission).toHaveBeenCalledWith({
        contentUrl: 'https://x.com/alice/status/789',
        statementCid: STATEMENT_CID,
        declaredPerspective: 'neutral',
      })
    })

    it('does not submit when URL is empty', () => {
      renderForm()

      fireEvent.submit(formElement())

      expect(submitContentSubmission).not.toHaveBeenCalled()
    })

    it('does not submit when URL is only whitespace', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), '   ')
      fireEvent.submit(formElement())

      expect(submitContentSubmission).not.toHaveBeenCalled()
    })
  })

  describe('success state', () => {
    it('clears form fields after successful submission', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), 'https://x.com/alice/status/123')
      await user.type(perspectiveInput(), 'supportive')
      await user.click(submitButton())

      expect(await screen.findByText('Queued for content-attester review.')).toBeInTheDocument()
      expect(urlInput()).toHaveValue('')
      expect(perspectiveInput()).toHaveValue('')
    })

    it('clears success message when user types in URL field', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), 'https://x.com/alice/status/123')
      await user.click(submitButton())

      expect(await screen.findByText('Queued for content-attester review.')).toBeInTheDocument()

      await user.type(urlInput(), ' more')
      expect(screen.queryByText('Queued for content-attester review.')).not.toBeInTheDocument()
    })
  })

  describe('button disabled state', () => {
    it('disables submit button when URL is empty', () => {
      renderForm()

      expect(submitButton()).toBeDisabled()
    })

    it('disables submit button when URL is only whitespace', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), '   ')
      expect(screen.getByRole('button', { name: 'Submit Content' })).toBeDisabled()
    })

    it('enables submit button when URL has content', async () => {
      const user = userEvent.setup()

      renderForm()

      await user.type(urlInput(), 'https://x.com/alice/status/123')
      expect(submitButton()).not.toBeDisabled()
    })
  })
})
