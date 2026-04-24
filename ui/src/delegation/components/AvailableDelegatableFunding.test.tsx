import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvailableDelegatableFunding } from './AvailableDelegatableFunding'
import { BrowserRouter } from 'react-router-dom'

const mockGetNoteIntentAttestationsByStatement = vi.fn()
const mockGetNote = vi.fn()

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk')>('@commonality/sdk')
  return {
    ...actual,
    getNoteIntentAttestationsByStatement: (...args: unknown[]) => mockGetNoteIntentAttestationsByStatement(...args),
    getNote: (...args: unknown[]) => mockGetNote(...args),
  }
})

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: () => ({ mock: true }),
}))

const ETH_ZERO = '0x0000000000000000000000000000000000000000'
const testStatementCid = 'bafyTestStatement123'

function makeNote(overrides: { id?: string; amount?: string; token?: string; owner?: string; rootOwner?: string; active?: boolean } = {}) {
  return {
    id: overrides.id || '1',
    chainHash: '0xhash',
    amount: overrides.amount || '1000000000000000000',
    token: overrides.token ?? ETH_ZERO,
    tokenType: 0,
    tokenId: '0',
    owner: overrides.owner || '0x1234567890abcdef1234567890abcdef12345678',
    rootOwner: overrides.rootOwner || '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    active: overrides.active ?? true,
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
  }
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('AvailableDelegatableFunding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockGetNoteIntentAttestationsByStatement.mockReturnValue(new Promise(() => {}))

    renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    expect(screen.getByText(/Loading funds from delegates/)).toBeInTheDocument()
  })

  it('renders nothing when no attestations exist', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([])

    const { container } = renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.queryByText(/Loading funds from delegates/)).not.toBeInTheDocument()
    })
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when all note fetches return null', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '1', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockResolvedValue(null)

    const { container } = renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.queryByText(/Loading funds from delegates/)).not.toBeInTheDocument()
    })
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when notes are inactive', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '1', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockResolvedValue(makeNote({ active: false }))

    const { container } = renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.queryByText(/Loading funds from delegates/)).not.toBeInTheDocument()
    })
    expect(container.firstChild).toBeNull()
  })

  it('shows ETH total and note table when active notes exist', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '1', intendedStatementId: testStatementCid },
      { noteId: '2', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockImplementation((_, noteId: string) => {
      if (noteId === '1') return Promise.resolve(makeNote({ id: '1', amount: '1000000000000000000' }))
      if (noteId === '2') return Promise.resolve(makeNote({ id: '2', amount: '2000000000000000000' }))
      return Promise.resolve(null)
    })

    renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Funds from Delegates')).toBeInTheDocument()
    })
    expect(screen.getByText(/ETH pledged by delegates/)).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('shows note ID as link to note detail page', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '42', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockResolvedValue(makeNote({ id: '42' }))

    renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('#42')).toBeInTheDocument()
    })
    const link = screen.getByRole('link', { name: '#42' })
    expect(link).toHaveAttribute('href', '/notes/42')
  })

  it('shows truncated addresses for root owner and current owner', async () => {
    const rootOwner = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    const owner = '0x1234567890abcdef1234567890abcdef12345678'
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '1', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockResolvedValue(makeNote({ rootOwner, owner }))

    renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument()
      expect(screen.getByText('0xabcd...abcd')).toBeInTheDocument()
    })
  })

  it('handles getNote rejection gracefully', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '1', intendedStatementId: testStatementCid },
      { noteId: '2', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockImplementation((_, noteId: string) => {
      if (noteId === '1') return Promise.reject(new Error('Failed'))
      if (noteId === '2') return Promise.resolve(makeNote({ id: '2' }))
      return Promise.resolve(null)
    })

    renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('#2')).toBeInTheDocument()
    })
    expect(screen.queryAllByText('#1').length).toBe(0)
  })

  it('handles getNoteIntentAttestationsByStatement rejection gracefully', async () => {
    mockGetNoteIntentAttestationsByStatement.mockRejectedValue(new Error('Network error'))

    const { container } = renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.queryByText(/Loading funds from delegates/)).not.toBeInTheDocument()
    })
    expect(container.firstChild).toBeNull()
  })

  it('filters out non-ETH notes from total but still displays them', async () => {
    mockGetNoteIntentAttestationsByStatement.mockResolvedValue([
      { noteId: '1', intendedStatementId: testStatementCid },
      { noteId: '2', intendedStatementId: testStatementCid },
    ])
    mockGetNote.mockImplementation((_, noteId: string) => {
      if (noteId === '1') return Promise.resolve(makeNote({ id: '1', amount: '1000000000000000000' }))
      if (noteId === '2') return Promise.resolve(makeNote({ id: '2', token: '0x1111111111111111111111111111111111111111', amount: '5000000000000000000' }))
      return Promise.resolve(null)
    })

    renderWithRouter(
      <AvailableDelegatableFunding statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/ETH pledged by delegates/)).toBeInTheDocument()
    })
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })
})
