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

vi.mock('../hooks/useViewCounts', () => ({
  useViewCounts: () => ({
    perPlank: new Map([
      ['bafy1', { direct: 2, indirect: 1, total: 3 }],
      ['bafy2', { direct: 0, indirect: 0, total: 0 }],
    ]),
    loading: false,
    refresh: vi.fn(),
  }),
}))

vi.mock('../hooks/useCauseProjects', () => ({
  useCauseProjects: () => ({
    countByPlankCid: new Map([
      ['bafy1', 4],
      ['bafy2', 0],
    ]),
  }),
}))

vi.mock('../hooks/useAlignmentTrust', () => ({
  useAlignmentTrust: () => ({
    trustedAlignmentAttesters: new Set<string>(),
    alignmentTrustReady: true,
  }),
}))

vi.mock('@ui/shared', () => ({
  useTrustedAttesters: () => [],
}))

vi.mock('../components/SupportButton', () => ({
  SupportButton: () => <button type="button">Sign</button>,
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
      refresh: vi.fn(),
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
    expect(screen.getByText(/3 · 2 direct · 1 indirect/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '4 projects' })).toHaveAttribute(
      'href',
      '/statement/bafy1?section=fundable-projects',
    )
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/statement/bafy2?section=fundable-projects',
    )
  })
})
