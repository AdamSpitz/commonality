import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlankRow } from './PlankRow'

afterEach(cleanup)

vi.mock('./SupportButton', () => ({
  SupportButton: () => <button type="button">Support</button>,
}))

function renderDraft(publishing: boolean, mutationLocked = false) {
  const handlers = {
    onTextChange: vi.fn(),
    onDelete: vi.fn(),
    onReview: vi.fn(),
    onPublish: vi.fn(),
  }
  render(
    <MemoryRouter>
      <PlankRow
        plank={{ id: 'plank', text: 'Repair every streetlight.', origin: 'user' }}
        index={0}
        selected={false}
        onSelectedChange={vi.fn()}
        support={undefined}
        supportLoading={false}
        projectCount={0}
        onSupported={vi.fn()}
        {...handlers}
        reviewing={false}
        publishing={publishing}
        mutationLocked={mutationLocked}
      />
    </MemoryRouter>,
  )
  return handlers
}

describe('PlankRow', () => {
  it('labels direct and indirect support separately, including a zero indirect count', () => {
    render(
      <MemoryRouter>
        <PlankRow
          plank={{ id: 'plank', text: 'Repair every streetlight.', origin: 'user', cid: 'bafktest' }}
          index={0}
          selected
          onSelectedChange={vi.fn()}
          support={{ direct: 1, indirect: 0, total: 1 }}
          supportLoading={false}
          projectCount={0}
          onSupported={vi.fn()}
          onTextChange={vi.fn()}
          onDelete={vi.fn()}
          onReview={vi.fn()}
          onPublish={vi.fn()}
          reviewing={false}
          publishing={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/1 · 1 direct · 0 indirect/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByTestId('plank-in-totals-0')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('In these totals')).not.toBeInTheDocument()
    expect(screen.queryByText('Left out of totals')).not.toBeInTheDocument()
  })

  it('disables editing, review, and deletion while publication is pending', () => {
    const handlers = renderDraft(true)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /check phrasing/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /remove statement 1/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /remove statement 1/i }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
  })

  it('locks this draft while another cause mutation is pending', () => {
    const handlers = renderDraft(false, true)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /publish statement/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /check phrasing/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /remove statement 1/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /remove statement 1/i }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
  })

  it('shows review feedback without replacing the text field', () => {
    render(
      <MemoryRouter>
        <PlankRow
          plank={{ id: 'plank', text: 'Better parks.', origin: 'user' }}
          index={0}
          selected={false}
          onSelectedChange={vi.fn()}
          support={undefined}
          supportLoading={false}
          projectCount={0}
          onSupported={vi.fn()}
          onTextChange={vi.fn()}
          onDelete={vi.fn()}
          onReview={vi.fn()}
          onPublish={vi.fn()}
          reviewing={false}
          publishing={false}
          review={{
            summary: 'Too vague for an implication attester.',
            issues: ['Name what should change about parks.'],
            exampleWording: 'City parks should stay free to enter and open after dark.',
          }}
          onUseExampleWording={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('textbox')).toHaveValue('Better parks.')
    expect(screen.getByTestId('plank-review-0')).toHaveTextContent(/Too vague/)
    expect(screen.getByTestId('plank-review-example-0')).toHaveTextContent(/stay free/)
    expect(screen.getByTestId('plank-use-example-0')).toBeInTheDocument()
  })
})
