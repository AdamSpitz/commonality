import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YourSignedStatements } from './YourSignedStatements'

const { useUserStatements } = vi.hoisted(() => ({
  useUserStatements: vi.fn(),
}))

vi.mock('../hooks/useUserStatements', () => ({
  useUserStatements,
}))

vi.mock('./ConnectWalletHint', () => ({
  ConnectWalletHint: ({ children }: { children: string }) => <div>{children}</div>,
}))

describe('YourSignedStatements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks to connect when the wallet is disconnected', () => {
    useUserStatements.mockReturnValue({ statements: [], loading: false, connected: false, error: null })
    render(
      <MemoryRouter>
        <YourSignedStatements />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Connect a wallet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('home-statements-link')).not.toBeInTheDocument()
  })

  it('shows the signed count and a link to the list', () => {
    useUserStatements.mockReturnValue({
      statements: [{ cid: 'a' }, { cid: 'b' }],
      loading: false,
      connected: true,
      error: null,
    })
    render(
      <MemoryRouter>
        <YourSignedStatements />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-statements-count')).toHaveTextContent('2 signed statements')
    expect(screen.getByTestId('home-statements-link')).toHaveAttribute('href', '/statements')
  })
})
