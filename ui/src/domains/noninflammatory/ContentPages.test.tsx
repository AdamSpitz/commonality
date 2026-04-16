import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NoninflammatoryCreatorsPage } from './ContentPages'

describe('Noninflammatory branded surfaces', () => {
  it('renders the noninflammatory-specific wrapper copy', () => {
    render(
      <MemoryRouter>
        <NoninflammatoryCreatorsPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /noninflammatory content/i })).toBeInTheDocument()
    expect(screen.getByText(/bridge-building/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /why this domain exists/i })).toHaveAttribute('href', '/about')
  })
})
