import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberPublishedCluster } from '../lib/bridgeStore'
import { MediatorPage } from './MediatorPage'

const mediator = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const fields = { mediatorAddress: mediator, mediatorName: 'Ada', mediatorNote: 'Shared settlement' }
const machinery = {}
vi.mock('../../shared', () => ({ useMachinery: () => machinery }))
vi.mock('../lib/bridgeCluster', () => ({
  resolveClusterCid: vi.fn(async () => 'cluster-cid'),
  loadClusterDocument: vi.fn(async () => ({ fields })),
}))
vi.mock('../components/ClusterMediatorOptIn', () => ({
  ClusterMediatorOptIn: () => <div>Opt in to mediator</div>,
}))

describe('MediatorPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('lists a bridge remembered by opening its public page, without bookmarking a cause', async () => {
    rememberPublishedCluster({ owner: mediator, slug: 'settlement', clusterCid: 'cluster-cid', mediatorName: 'Ada', parents: [] })
    render(<MemoryRouter initialEntries={[`/mediator/${mediator}`]}><Routes>
      <Route path="/mediator/:address" element={<MediatorPage />} />
    </Routes></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ada' })).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Bridge cluster' })).toHaveAttribute('href', `/bridge/${mediator}/settlement`)
    expect(screen.getByText('Opt in to mediator')).toBeTruthy()
  })
})
