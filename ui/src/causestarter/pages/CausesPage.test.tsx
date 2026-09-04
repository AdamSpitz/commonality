import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CausesPage } from './CausesPage'

vi.mock('../hooks/useUserCauses', () => ({
  useUserCauses: () => ({ causes: [], loading: false, removeBookmark: vi.fn() }),
}))

vi.mock('../components/YourCauses', () => ({
  YourCauses: () => <div data-testid="your-causes" />,
}))

describe('CausesPage', () => {
  it('labels the page as the Organize workspace', () => {
    render(
      <MemoryRouter>
        <CausesPage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('organize-workspace')).toBeInTheDocument()
    expect(screen.getByText('Organize')).toBeInTheDocument()
    expect(screen.getByTestId('your-causes')).toBeInTheDocument()
  })
})
