import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MovementCreatorsPage } from './MovementPages'

describe('Movement branded surfaces', () => {
  it('renders the movement-specific content wrapper copy', () => {
    render(
      <MemoryRouter>
        <MovementCreatorsPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /movement content/i })).toBeInTheDocument()
    expect(screen.getByText(/main wedge/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /how this movement surface works/i })).toHaveAttribute('href', '/about')
  })
})
