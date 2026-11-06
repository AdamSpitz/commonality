import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ runId: 'run-1' }),
  }
})

vi.mock('../testData/testDataDocuments', async () => {
  const actual = await vi.importActual<typeof import('../testData/testDataDocuments')>('../testData/testDataDocuments')
  return {
    ...actual,
    testDataEnvironment: () => 'testnet',
    testDataRegistryUrl: () => '/test-data/registry.enc.json',
    fetchEncryptedTestData: vi.fn(async (url: string) => {
      if (url.endsWith('registry.enc.json')) {
        return { schema: 'commonality-test-data-v1', updatedAt: '2026-10-01T00:00:00.000Z', runs: [
          { runId: 'run-1', createdAt: '2026-10-01T00:00:00.000Z', network: 'testnet', chainId: 84532, userCount: 0, actionCount: 0, href: 'runs/run-1/run.enc.json' },
        ] }
      }
      return {
        schema: 'commonality-test-data-v1',
        runId: 'run-1',
        createdAt: '2026-10-01T00:00:00.000Z',
        network: 'testnet',
        chainId: 84532,
        parameters: {},
        users: [
          { id: 0, label: 'Mira ★', address: '0x0000000000000000000000000000000000000001', privateKey: '0x1111111111111111111111111111111111111111111111111111111111111111', engagement: 'CASUAL', wealth: 1, interests: {}, trustNetwork: [] },
          { id: 28, label: 'Fred ★', address: '0x0000000000000000000000000000000000000002', privateKey: '0x2222222222222222222222222222222222222222222222222222222222222222', engagement: 'CASUAL', wealth: 1, interests: {}, trustNetwork: [], spotlightOrder: 2 },
          { id: 82, label: 'Kurt ★', address: '0x0000000000000000000000000000000000000003', privateKey: '0x3333333333333333333333333333333333333333333333333333333333333333', engagement: 'ACTIVE', wealth: 1, interests: {}, trustNetwork: [], spotlightOrder: 1, bio: 'Sings in the choir', favoriteCauseId: 'congregational-music' },
        ],
        actions: [{ type: 'create-cause' }, { type: 'create-bridge' }, { type: 'create-bridge-board' }],
        metrics: { errors: [] },
        entities: {
          areas: [
            { id: 'zebra', title: 'Zebra civic', statements: [], causeBoards: [], bridges: [], projects: [], activeUserIds: [] },
            { id: 'ai', title: 'AI pause', statements: [{ id: 's1', text: 'Pause the labs', path: '/statement/pause' }], causeBoards: [], bridges: [{ title: 'Pause treaty', path: '/bridge/owner/treaty' }], projects: [{ title: 'Treaty draft', path: '/projects/0x1', assuranceContract: '0x1' }], activeUserIds: [82] },
          ],
          causeBoards: [
            { title: 'open-source', role: 'plain', slug: 'campaign-open-source', path: '/cause/0x1/open-source' },
            { title: 'Abortion common ground — common ground', role: 'commonality', slug: 'medium-abortion-common-ground-bridge', path: '/cause/0x2/common' },
            { title: 'Abortion common ground — natural-left', role: 'natural-left', slug: 'medium-abortion-common-ground-left', path: '/cause/0x2/left' },
          ],
          bridges: [
            { title: 'abortion-common-ground bridge', slug: 'medium-abortion-common-ground-cluster', path: '/bridge/0x2/cluster' },
          ],
        },
      }
    }),
  }
})

const account = vi.hoisted(() => ({ isConnected: false, address: undefined as string | undefined }))
vi.mock('wagmi', () => ({ useAccount: () => account }))

import { TestDataRunPage } from './TestDataRunPage'

function CurrentSearch() {
  return <output data-testid="current-search">{useLocation().search}</output>
}

function renderRun(area = '') {
  return render(<MemoryRouter initialEntries={[`/admin/test-data/run-1?key=capability${area ? `&area=${area}` : ''}`]}><TestDataRunPage /><CurrentSearch /></MemoryRouter>)
}

describe('TestDataRunPage launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    account.isConnected = false
    account.address = undefined
    window._setupTestDataWallet = vi.fn()
  })

  it('opens public pages directly and limits users to the bookmarked area', async () => {
    renderRun('ai')
    expect(await screen.findByRole('link', { name: 'Pause treaty' })).toHaveAttribute('href', '/bridge/owner/treaty')
    expect(screen.getByRole('link', { name: 'Open statement' })).toHaveAttribute('href', '/statement/pause')
    expect(screen.getByRole('link', { name: 'Treaty draft' })).toHaveAttribute('href', '/projects/0x1')
    expect(screen.getByText('Sings in the choir')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Connect as Mira ★' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Connect as Kurt ★' }))
    expect(window._setupTestDataWallet).toHaveBeenCalledWith(expect.stringMatching(/^0x3/), { chainId: 84532, label: 'Kurt ★' })
    fireEvent.click(screen.getByRole('button', { name: /Show all users/ }))
    expect(screen.getByRole('button', { name: 'Connect as Mira ★' })).toBeTruthy()
    expect(screen.getByText('Run diagnostics').closest('details')).not.toHaveAttribute('open')
  })

  it('shows the current account when returning to the launcher', async () => {
    account.isConnected = true
    account.address = '0x0000000000000000000000000000000000000003'
    renderRun('ai')
    expect(await screen.findByRole('alert')).toHaveTextContent('Connected as Kurt ★')
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('button', { name: 'Connect as Kurt ★' })).toBeDisabled()
  })

  it('handles stale areas without showing unrelated users', async () => {
    renderRun('missing')
    expect(await screen.findByRole('alert')).toHaveTextContent('no recorded area')
    expect(screen.queryByRole('button', { name: /Connect as/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all areas' }))
    expect(screen.getByRole('button', { name: 'Connect as Mira ★' })).toBeTruthy()
  })

  it('reports connection errors', async () => {
    window._setupTestDataWallet = vi.fn(() => { throw new Error('Wrong network') })
    renderRun('ai')
    fireEvent.click(await screen.findByRole('button', { name: 'Connect as Kurt ★' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong network')
  })

  it('keeps the unfiltered run browser available', async () => {
    renderRun()
    expect(await screen.findByRole('link', { name: 'Open Source' })).toHaveAttribute('href', '/cause/0x1/open-source')
    expect(screen.getByRole('button', { name: 'Connect as Mira ★' })).toBeTruthy()
  })

  it('stores area selection in the URL without losing the capability', async () => {
    renderRun()
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Demo area' }))
    fireEvent.click(screen.getByRole('option', { name: 'AI pause' }))
    expect(screen.getByTestId('current-search')).toHaveTextContent('?key=capability&area=ai')
    expect(screen.getByRole('link', { name: 'Pause treaty' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Connect as Mira ★' })).toBeNull()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Demo area' }))
    fireEvent.click(screen.getByRole('option', { name: 'All areas' }))
    expect(screen.getByTestId('current-search')).toHaveTextContent('?key=capability')
    expect(screen.getByRole('button', { name: 'Connect as Mira ★' })).toBeTruthy()
  })
})
