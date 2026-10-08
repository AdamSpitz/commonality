import { getRuntimeConfig } from '../../shared'
import { testDataEnvironment } from '../testData/testDataDocuments'

export const SIMULATION_HEARTBEAT_VERSION = 'commonality-campaign-heartbeat-v1' as const
export const DEFAULT_SIMULATION_HEARTBEAT_URL = '/simulations/heartbeat.json'
export const HEARTBEAT_STALE_MS = 15_000
export const HEARTBEAT_POLL_MS = 3_000

export type SimulationReplayMode = 'compress' | 'realtime'

export interface SimulationHeartbeat {
  version: typeof SIMULATION_HEARTBEAT_VERSION
  campaignId: string
  replay: SimulationReplayMode
  startedAt: string
  updatedAt: string
  simNow: number
  nextDueAtSim: number | null
  dueLagSeconds: number
  mined: number
  failed: number
  submitted: number
  planned: number
  stopped: boolean
  nativeCost: string
}

export function simulationHeartbeatUrl(): string | undefined {
  const configured = getRuntimeConfig().VITE_SIMULATION_HEARTBEAT_URL
  if (configured) return configured
  if (testDataEnvironment() === 'local') return DEFAULT_SIMULATION_HEARTBEAT_URL
  return undefined
}

export function isSimulationHeartbeat(value: unknown): value is SimulationHeartbeat {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.version === SIMULATION_HEARTBEAT_VERSION
    && typeof record.campaignId === 'string'
    && (record.replay === 'compress' || record.replay === 'realtime')
    && typeof record.startedAt === 'string'
    && typeof record.updatedAt === 'string'
    && typeof record.simNow === 'number'
    && (record.nextDueAtSim === null || typeof record.nextDueAtSim === 'number')
    && typeof record.dueLagSeconds === 'number'
    && typeof record.mined === 'number'
    && typeof record.failed === 'number'
    && typeof record.submitted === 'number'
    && typeof record.planned === 'number'
    && typeof record.stopped === 'boolean'
    && typeof record.nativeCost === 'string'
}

export function isHeartbeatStale(heartbeat: SimulationHeartbeat, nowMs = Date.now()): boolean {
  const updated = Date.parse(heartbeat.updatedAt)
  if (!Number.isFinite(updated)) return true
  return nowMs - updated > HEARTBEAT_STALE_MS
}

export async function fetchSimulationHeartbeat(url: string): Promise<SimulationHeartbeat | null> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : String(reason)
    throw new Error(`Could not load simulation heartbeat from ${url}: ${detail}`)
  }
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Could not load simulation heartbeat (HTTP ${response.status}).`)
  const body: unknown = await response.json()
  if (!isSimulationHeartbeat(body)) {
    throw new Error('Simulation heartbeat file is not a supported campaign heartbeat document.')
  }
  return body
}
