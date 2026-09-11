import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExistingBeneficiaryProjects } from './ExistingBeneficiaryProjects'

const useExistingBeneficiaryProjects = vi.fn()

vi.mock('../hooks/useExistingBeneficiaryProjects', () => ({
  useExistingBeneficiaryProjects: (...args: unknown[]) => useExistingBeneficiaryProjects(...args),
}))

vi.mock('../hooks/useProjectDisavowals', () => ({
  useProjectDisavowals: () => new Set<string>(),
}))

describe('ExistingBeneficiaryProjects', () => {
  beforeEach(() => {
    useExistingBeneficiaryProjects.mockReset()
  })

  it('shows reuse candidates without blocking a new proposal', () => {
    useExistingBeneficiaryProjects.mockReturnValue({
      loading: false,
      canonical: 'example.org',
      matches: [
        { id: '0xabc', name: 'Garden beds', description: 'Soil and water' },
      ],
    })
    render(
      <MemoryRouter>
        <ExistingBeneficiaryProjects domain="example.org" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('existing-beneficiary-projects')).toHaveTextContent(/reuse one if its stated scope already fits/i)
    expect(screen.getByRole('link', { name: 'Garden beds' }).getAttribute('href')).toMatch(/\/projects\/.+0xabc$/i)
    expect(screen.getByText('Soil and water')).toBeInTheDocument()
  })

  it('stays quiet when the domain is not canonical yet', () => {
    useExistingBeneficiaryProjects.mockReturnValue({
      loading: false,
      canonical: null,
      matches: [],
    })
    const { container } = render(
      <MemoryRouter>
        <ExistingBeneficiaryProjects domain="not a domain" />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
