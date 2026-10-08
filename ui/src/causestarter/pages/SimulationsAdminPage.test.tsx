import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SimulationsAdminPage } from './SimulationsAdminPage'
import type { SimulationHeartbeat } from '../simulations/simulationHeartbeat'

const mocks = vi.hoisted(() => ({
  environment: 'local' as 'local' | 'testnet' | 'disabled',
  heartbeatUrl: '/simulations/heartbeat.json' as string | undefined,
  fetchHeartbeat: vi.fn(),
}))

vi.mock('../testData/testDataDocuments', () => ({
  testDataEnvironment: () => mocks.environment,
}))
vi.mock('../simulations/simulationHeartbeat', async () => {
  const actual = await vi.importActual<typeof import('../simulations/simulationHeartbeat')>('../simulations/simulationHeartbeat')
  return {
    ...actual,
    simulationHeartbeatUrl: () => mocks.heartbeatUrl,
    fetchSimulationHeartbeat: mocks.fetchHeartbeat,
  }
})

function heartbeat(overrides: Partial<SimulationHeartbeat> = {}): SimulationHeartbeat {
  return {
    version: 'commonality-campaign-heartbeat-v1',
    campaignId: 'medium-realistic-v1',
    replay: 'realtime',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    simNow: 12,
    nextDueAtSim: 20,
    dueLagSeconds: 0,
    mined: 4,
    failed: 0,
    submitted: 0,
    planned: 8,
    stopped: false,
    nativeCost: '0',
    ...overrides,
  }
}

function renderPage(key = 'abc') {
  return render(
    <MemoryRouter initialEntries={[`/admin/simulations?key=${key}`]}>
      <SimulationsAdminPage />
    </MemoryRouter>,
  )
}

describe('SimulationsAdminPage', () => {
  beforeEach(() => {
    mocks.environment = 'local'
    mocks.heartbeatUrl = '/simulations/heartbeat.json'
    mocks.fetchHeartbeat.mockReset()
  })
  afterEach(() => {
    cleanup()
  })

  it('refuses mainnet', () => {
    mocks.environment = 'disabled'
    renderPage()
    expect(screen.getByText(/disabled on mainnet/i)).toBeInTheDocument()
  })

  it('asks for the capability URL when the key is missing', () => {
    render(
      <MemoryRouter initialEntries={['/admin/simulations']}>
        <SimulationsAdminPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/bookmarked admin capability URL/i)).toBeInTheDocument()
  })

  it('shows the live card while a fresh heartbeat is running', async () => {
    mocks.fetchHeartbeat.mockResolvedValue(heartbeat())
    renderPage()
    expect(await screen.findByTestId('simulation-live-now')).toBeInTheDocument()
    expect(screen.getByText('medium-realistic-v1')).toBeInTheDocument()
    expect(screen.getByText(/4 mined/i)).toBeInTheDocument()
  })

  it('warns when the heartbeat is stale', async () => {
    mocks.fetchHeartbeat.mockResolvedValue(heartbeat({
      updatedAt: '2020-01-01T00:00:00.000Z',
    }))
    renderPage()
    expect(await screen.findByTestId('simulation-heartbeat-stale')).toBeInTheDocument()
  })

  it('explains how to start when no heartbeat file exists', async () => {
    mocks.fetchHeartbeat.mockResolvedValue(null)
    renderPage()
    expect(await screen.findByTestId('simulation-heartbeat-missing')).toBeInTheDocument()
    expect(screen.getByTestId('simulation-heartbeat-missing')).toHaveTextContent('--replay realtime')
  })
})
