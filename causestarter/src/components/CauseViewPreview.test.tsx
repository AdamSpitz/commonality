import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CauseViewPreview } from './CauseViewPreview'

describe('CauseViewPreview', () => {
  const planks = [{
    id: 'plank-1',
    text: 'Oak Street should have safe lighting after dark.',
    origin: 'user' as const,
    disposition: 'adopted' as const,
  }]

  it('teaches both supporter views using the founder’s own planks', () => {
    render(<CauseViewPreview description="Safer streets" planks={planks} />)
    expect(screen.getByText('Oak Street should have safe lighting after dark.')).toBeInTheDocument()
    expect(screen.getByText(/supporting at least one issue/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All selected' }))
    expect(screen.getByText(/supporting every selected issue/i)).toBeInTheDocument()
    expect(document.body.textContent?.toLowerCase()).not.toContain('conjunctive')
  })
})
