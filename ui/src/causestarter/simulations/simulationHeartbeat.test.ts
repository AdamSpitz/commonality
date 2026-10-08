import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SIMULATION_HEARTBEAT_URL,
  fetchSimulationHeartbeat,
  isHeartbeatStale,
  isSimulationHeartbeat,
  simulationHeartbeatUrl,
  type SimulationHeartbeat,
} from './simulationHeartbeat'

const runtimeConfig = vi.hoisted(() => ({
  COMMONALITY_ENVIRONMENT: 'local' as string,
  VITE_SIMULATION_HEARTBEAT_URL: '' as string,
}))
vi.mock('../../shared', () => ({ getRuntimeConfig: () => runtimeConfig }))

function heartbeat(overrides: Partial<SimulationHeartbeat> = {}): SimulationHeartbeat {
  return {
    version: 'commonality-campaign-heartbeat-v1',
    campaignId: 'medium-realistic-v1',
    replay: 'realtime',
    startedAt: '2026-09-17T09:12:00.000Z',
    updatedAt: '2026-09-17T09:12:05.000Z',
    simNow: 5,
    nextDueAtSim: 12,
    dueLagSeconds: 0,
    mined: 3,
    failed: 0,
    submitted: 0,
    planned: 10,
    stopped: false,
    nativeCost: '0',
    ...overrides,
  }
}

describe('simulation heartbeat helpers', () => {
  beforeEach(() => {
    runtimeConfig.COMMONALITY_ENVIRONMENT = 'local'
    runtimeConfig.VITE_SIMULATION_HEARTBEAT_URL = ''
  })

  it('defaults to the local well-known URL', () => {
    expect(simulationHeartbeatUrl()).toBe(DEFAULT_SIMULATION_HEARTBEAT_URL)
  })

  it('is absent on mainnet unless configured', () => {
    runtimeConfig.COMMONALITY_ENVIRONMENT = 'mainnet'
    expect(simulationHeartbeatUrl()).toBeUndefined()
  })

  it('treats a heartbeat older than 15s as stale', () => {
    const now = Date.parse('2026-09-17T09:12:21.000Z')
    expect(isHeartbeatStale(heartbeat(), now)).toBe(true)
    expect(isHeartbeatStale(heartbeat({ updatedAt: '2026-09-17T09:12:20.000Z' }), now)).toBe(false)
  })

  it('rejects documents that are not campaign heartbeats', () => {
    expect(isSimulationHeartbeat({ version: 'nope' })).toBe(false)
  })

  it('returns null when the heartbeat file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchSimulationHeartbeat('/simulations/heartbeat.json')).resolves.toBeNull()
  })

  it('parses a valid heartbeat document', async () => {
    const body = heartbeat()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    }))
    await expect(fetchSimulationHeartbeat('/simulations/heartbeat.json')).resolves.toEqual(body)
  })
})
