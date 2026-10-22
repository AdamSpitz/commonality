import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ isConnected: false, address: undefined as string | undefined }))
vi.mock('wagmi', () => ({ useAccount: () => account }))

vi.mock('../testData/useTestDataRun', () => ({
  useTestDataRun: () => ({ environment: 'local', registryUrl: '/test-data/registry.enc.json', error: null, run: {
    runId: 'run-1', network: 'local', chainId: 31337, createdAt: '2026-10-21',
    users: [
      { id: 4, label: 'Fake user 2', address: '0x4', privateKey: 'fake-2', roles: ['lurker', 'supporter'] },
      { id: 3, label: 'Zoe ★', address: '0x3', privateKey: 'zoe-key', roles: ['supporter'] },
      { id: 1, label: 'Alice', address: '0x1', privateKey: 'alice-key', bio: 'AI researcher', roles: ['project-founder', 'supporter'] },
      { id: 2, label: 'Bob', address: '0x2', privateKey: 'bob-key' },
    ],
    entities: { areas: [{ id: 'ai', title: 'AI pause', activeUserIds: [1, 3, 4],
      statements: [
        { id: 's1', text: 'Pause the labs', path: '/statement/cid1', causeId: 'treaty', partTitle: 'Pause treaty' },
        { id: 's2', text: 'A lab can pause itself', path: '/statement/cid2', causeId: 'labs', partTitle: 'Labs' },
      ],
      causeBoards: [{ title: 'Pause board', path: '/cause/owner/pause', causeId: 'treaty', partTitle: 'Pause treaty' }],
      bridges: [{ title: 'Pause treaty', path: '/bridge/owner/treaty', causeId: 'treaty', partTitle: 'Pause treaty' }],
      projects: [
        { title: 'Treaty draft', path: '/projects/0x1', assuranceContract: '0x1' },
        { title: 'Alpha note', path: '/projects/0x2', assuranceContract: '0x2' },
      ],
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
    expect(screen.getByText('Pause the labs')).toBeTruthy()
    expect(screen.getByText('Pause board').closest('a')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Open statement' }).map(link => link.getAttribute('href'))).toEqual(['/statement/cid1', '/statement/cid2'])
    expect(screen.getByRole('link', { name: 'Open cause board' })).toHaveAttribute('href', '/cause/owner/pause')
    const projectLinks = screen.getAllByRole('link', { name: /Alpha note|Treaty draft/ })
    expect(projectLinks.map(link => link.textContent)).toEqual(['Alpha note', 'Treaty draft'])
    expect(screen.getByRole('heading', { name: 'Bridges (1)' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Statements (1)' })).toBeTruthy()
    expect(screen.getAllByText('Pause the labs')).toHaveLength(1)
    expect(screen.getByText('A lab can pause itself')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open bridge' })).toHaveAttribute('href', '/bridge/owner/treaty')
    const bridgeHeading = screen.getByText('Pause treaty')
    const looseHeading = screen.getByRole('heading', { name: 'Statements (1)' })
    expect(bridgeHeading.compareDocumentPosition(screen.getByText('Pause the labs')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(looseHeading.compareDocumentPosition(screen.getByText('A lab can pause itself')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Pause the labs').compareDocumentPosition(looseHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('Bob')).toBeNull()
    const names = ['Zoe ★', 'Alice', 'Fake user 2'].map(name => screen.getByText(name))
    expect(names[0].compareDocumentPosition(names[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(names[1].compareDocumentPosition(names[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Starts projects and stays with that work.')).toBeTruthy()
    expect(screen.getByText('Sends money to projects without organizing them.')).toBeTruthy()
    expect(screen.getByText('May send a little money without following the work.')).toBeTruthy()
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
