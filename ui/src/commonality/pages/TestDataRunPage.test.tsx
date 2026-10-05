import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ runId: 'run-1' }),
    useSearchParams: () => [new URLSearchParams('key=capability'), vi.fn()],
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
          { id: 82, label: 'Kurt ★', address: '0x0000000000000000000000000000000000000003', privateKey: '0x3333333333333333333333333333333333333333333333333333333333333333', engagement: 'ACTIVE', wealth: 1, interests: {}, trustNetwork: [], spotlightOrder: 1 },
        ],
        actions: [],
        metrics: { errors: [] },
        entities: {
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

import { TestDataRunPage } from './TestDataRunPage'

describe('TestDataRunPage pages', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('links each bridge and cause board near the top of the run', async () => {
    render(<MemoryRouter><TestDataRunPage /></MemoryRouter>)
    const bridge = await screen.findByRole('link', { name: /Bridge\s+·\s+Abortion common ground/ })
    const board = screen.getByRole('link', { name: /Natural left\s+·\s+Abortion common ground — natural-left/ })
    const cause = screen.getByRole('link', { name: 'Open Source' })
    expect(bridge).toHaveAttribute('href', '/bridge/0x2/cluster')
    expect(board).toHaveAttribute('href', '/cause/0x2/left')
    expect(cause).toHaveAttribute('href', '/cause/0x1/open-source')
    const section = screen.getByTestId('test-data-run-pages')
    expect(section.compareDocumentPosition(screen.getByText('All recorded activity'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('lists spotlight profiles first under Show curated only', async () => {
    render(<MemoryRouter><TestDataRunPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Show curated only/ }))
    const labels = screen.getAllByRole('row').map((row) => row.textContent ?? '')
    const kurt = labels.findIndex((text) => text.includes('Kurt'))
    const fred = labels.findIndex((text) => text.includes('Fred'))
    const mira = labels.findIndex((text) => text.includes('Mira'))
    expect(kurt).toBeGreaterThan(-1)
    expect(kurt).toBeLessThan(fred)
    expect(fred).toBeLessThan(mira)
  })
})
