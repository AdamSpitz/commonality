import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ isConnected: false, address: undefined as string | undefined }))
vi.mock('wagmi', () => ({ useAccount: () => account }))

vi.mock('../testData/useTestDataRun', () => ({
  useTestDataRun: () => ({ environment: 'local', registryUrl: '/test-data/registry.enc.json', error: null, run: {
    runId: 'run-1', network: 'local', chainId: 31337, createdAt: '2026-10-21',
    users: [
      { id: 1, label: 'Alice', address: '0x1', privateKey: 'alice-key', bio: 'AI researcher' },
      { id: 2, label: 'Bob', address: '0x2', privateKey: 'bob-key' },
    ],
    entities: { areas: [{ id: 'ai', title: 'AI pause', activeUserIds: [1],
      statements: [{ id: 's1', text: 'Pause the labs', path: '/statement/cid1' }],
      causeBoards: [{ title: 'Pause board', path: '/cause/owner/pause' }],
      bridges: [{ title: 'Pause treaty', path: '/bridge/owner/treaty' }],
      projects: [{ title: 'Treaty draft', path: '/projects/0x1', assuranceContract: '0x1' }],
    }] },
  } }),
}))

import { TestDataAreaPage } from './TestDataAreaPage'

function renderArea(area = 'ai') {
  return render(<MemoryRouter initialEntries={[`/admin/test-data/run-1/areas/${area}?key=capability`]}>
    <Routes><Route path="/admin/test-data/:runId/areas/:areaId" element={<TestDataAreaPage />} /></Routes>
  </MemoryRouter>)
}

describe('TestDataAreaPage', () => {
  beforeEach(() => { window._setupTestDataWallet = vi.fn(); account.isConnected = false; account.address = undefined })
  it('keeps the current user visible after the wallet provider remounts the page', () => {
    account.isConnected = true
    account.address = '0x1'
    renderArea()
    expect(screen.getByRole('alert')).toHaveTextContent('Connected as Alice')
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toBeTruthy()
  })
  it('shows only area activity and connects the selected active user', () => {
    renderArea()
    expect(screen.getByRole('heading', { name: 'AI pause' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Pause the labs' })).toHaveAttribute('href', '/statement/cid1')
    expect(screen.getByRole('link', { name: 'Treaty draft' })).toHaveAttribute('href', '/projects/0x1')
    expect(screen.getByRole('link', { name: 'Bridge · Pause treaty' })).toBeTruthy()
    expect(screen.queryByText('Bob')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Connect as Alice' }))
    expect(window._setupTestDataWallet).toHaveBeenCalledWith('alice-key', { chainId: 31337, label: 'Alice' })
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'All areas in this run' })).toHaveAttribute('href', '/admin/test-data/run-1?key=capability')
  })
  it('handles a stale area link without showing unrelated users', () => {
    renderArea('missing')
    expect(screen.getByRole('alert')).toHaveTextContent('no recorded area')
    expect(screen.queryByText('Alice')).toBeNull()
  })
  it('shows wallet setup failures', () => {
    window._setupTestDataWallet = vi.fn(() => { throw new Error('Wrong network') })
    renderArea()
    fireEvent.click(screen.getByRole('button', { name: 'Connect as Alice' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong network')
    expect(screen.queryByRole('link', { name: 'Open dashboard' })).toBeNull()
  })
})
