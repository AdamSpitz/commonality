import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatementsPage } from './StatementsPage'

const { useUserStatements } = vi.hoisted(() => ({
  useUserStatements: vi.fn(),
}))

vi.mock('../hooks/useUserStatements', () => ({
  useUserStatements,
}))

vi.mock('../components/ConnectWalletHint', () => ({
  ConnectWalletHint: ({ children }: { children: string }) => <div>{children}</div>,
}))

describe('StatementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists signed statements with links', () => {
    useUserStatements.mockReturnValue({
      connected: true,
      loading: false,
      statements: [
        { cid: 'bafy1', title: 'Local food', excerpt: 'Local food' },
        { cid: 'bafy2', title: 'Clean water', excerpt: 'Clean water for all' },
      ],
    })
    render(
      <MemoryRouter>
        <StatementsPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByTestId('signed-statement')).toHaveLength(2)
    expect(screen.getByText('Local food')).toHaveAttribute('href', '/statement/bafy1')
    expect(screen.getByText('Clean water for all')).toBeInTheDocument()
  })
})
