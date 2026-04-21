import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentSubmissionForm } from './ContentSubmissionForm'

const submitContentSubmission = vi.fn()
const clearError = vi.fn()

vi.mock('../hooks/usePlatformApi', () => ({
  usePlatformApi: vi.fn(() => ({
    submitContentSubmission,
    isLoading: false,
    error: null,
    clearError,
  })),
}))

describe('ContentSubmissionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitContentSubmission.mockResolvedValue({
      contentUrl: 'https://x.com/alice/status/123',
      statementCid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy',
    })
  })

  it('submits the current statement CID with the provided URL and perspective', async () => {
    const user = userEvent.setup()

    render(
      <ContentSubmissionForm statementCid="bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy" />,
    )

    await user.type(screen.getByPlaceholderText('https://x.com/alice/status/123'), 'https://x.com/alice/status/123')
    await user.type(screen.getByPlaceholderText('Optional context for the attester'), 'supportive')
    await user.click(screen.getByRole('button', { name: 'Submit Content' }))

    expect(submitContentSubmission).toHaveBeenCalledWith({
      contentUrl: 'https://x.com/alice/status/123',
      statementCid: 'bafybeidagx4zc6phhtjng6f3sjzlicqm2ssq4eb6wskinjtuvkt275fmpy',
      declaredPerspective: 'supportive',
    })

    expect(await screen.findByText('Queued for content-attester review.')).toBeInTheDocument()
  })
})
