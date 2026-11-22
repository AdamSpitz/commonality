/**
 * Watch ImageAdopted and publish a mosaic-safety yes only when the LLM says safe.
 * This process holds the operator key. The cause-assist HTTP service must not.
 * The checker loads image bytes from the gateway before it judges. Silence is not a no.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createPublicClient, getAddress, http, type Address, type Hash, type Hex } from 'viem'
import { StatementImagesAbi } from '@commonality/sdk/abis/conceptspace'
import { bytes32ToCid } from '@commonality/sdk/utils'
import { runPollLoop } from '@commonality/sdk/utils'
import {
  attestMosaicSafetyIfJudged,
  isMosaicSafetyAttesterConfigured,
  type MosaicSafetyAttestResult,
} from './attestMosaicSafety.js'
import { loadConfigFromEnv } from './config.js'
import { createCauseAssistMachinery, createLoadStatementText } from './loadStatementText.js'
import type { CauseAssistConfig } from './types.js'

export interface ImageAdoptedLog {
  signer: Address
  statementId: Hex
  imageId: Hex
  transactionHash: Hash
  blockNumber: bigint
  logIndex: number
}

export type ProcessAdoptionResult =
  | { status: 'ignored'; reason: 'invalid_id' }
  | { status: 'unavailable' }
  | { status: 'judged'; result: MosaicSafetyAttestResult }

export interface MosaicSafetyWorkerConfig {
  rpcUrl: string
  chainId: number
  statementImagesAddress: Address
  startBlock: bigint
  confirmations: bigint
  blockRange: bigint
  pollIntervalMs: number
  stateFile: string
  contentRetryCount: number
  contentRetryDelayMs: number
  causeAssist: CauseAssistConfig & { statementImagesContractAddress: string }
}

const NON_TERMINAL = new Set(['judgment_unavailable', 'attester_not_configured'])
const UNAVAILABLE_RETRY_MS = 60_000

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function parseDeploymentEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '')
  }
  return out
}

export async function loadMosaicSafetyWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MosaicSafetyWorkerConfig> {
  const file = env.DEPLOYMENT_ENV_FILE?.trim()
  const fromFile = file ? parseDeploymentEnv(await readFile(file, 'utf8')) : {}
  const merged = { ...fromFile, ...env }
  const rpcUrl = merged.RPC_URL?.trim() || merged.CAUSE_ASSIST_ETHEREUM_RPC_URL?.trim()
  if (!rpcUrl) throw new Error('RPC_URL is required')
  const statementImages = merged.STATEMENT_IMAGES_CONTRACT_ADDRESS?.trim()
  if (!statementImages) throw new Error('STATEMENT_IMAGES_CONTRACT_ADDRESS is required')
  const privateKey = merged.CAUSE_ASSIST_MOSAIC_SAFETY_ATTESTER_PRIVATE_KEY?.trim()
  if (!privateKey) throw new Error('CAUSE_ASSIST_MOSAIC_SAFETY_ATTESTER_PRIVATE_KEY is required')
  const startBlock = merged.STATEMENT_IMAGES_START_BLOCK?.trim() || merged.START_BLOCK?.trim()
  if (!startBlock) throw new Error('STATEMENT_IMAGES_START_BLOCK or START_BLOCK is required')
  const causeAssist = {
    ...loadConfigFromEnv({ ...merged, CAUSE_ASSIST_ETHEREUM_RPC_URL: rpcUrl }),
    ethereumPrivateKey: privateKey,
    statementImagesContractAddress: statementImages,
  }
  return {
    rpcUrl,
    chainId: Number(required(merged, 'CHAIN_ID')),
    statementImagesAddress: getAddress(statementImages),
    startBlock: BigInt(startBlock),
    confirmations: BigInt(merged.CONFIRMATIONS ?? '12'),
    blockRange: BigInt(merged.BLOCK_RANGE ?? '1000'),
    pollIntervalMs: Number(merged.POLL_INTERVAL_MS ?? '10000'),
    stateFile: merged.STATE_FILE ?? './data/mosaic-safety-worker.json',
    contentRetryCount: Number(merged.CONTENT_RETRY_COUNT ?? '3'),
    contentRetryDelayMs: Number(merged.CONTENT_RETRY_DELAY_MS ?? '2000'),
    causeAssist,
  }
}

export function assertMosaicWorkerCanAttest(config: MosaicSafetyWorkerConfig): void {
  if (!config.causeAssist.apiKey?.trim()) {
    throw new Error('mosaic-safety worker requires XAI_API_KEY or OPENROUTER_API_KEY')
  }
  if (!config.causeAssist.ipfsGatewayUrl?.trim()) {
    throw new Error('mosaic-safety worker requires CAUSE_ASSIST_IPFS_GATEWAY_URL or IPFS_GATEWAY')
  }
  if (!isMosaicSafetyAttesterConfigured(config.causeAssist)) {
    throw new Error('mosaic-safety worker is missing its operator key, RPC URL, or StatementImages address')
  }
}

export interface ProcessAdoptionDeps {
  loadStatementText(cid: string): Promise<string | null>
  attest: typeof attestMosaicSafetyIfJudged
  sleep(ms: number): Promise<void>
}

export function createProcessAdoptionDeps(config: MosaicSafetyWorkerConfig): ProcessAdoptionDeps {
  const machinery = createCauseAssistMachinery(config.causeAssist)
  return {
    loadStatementText: createLoadStatementText(machinery),
    attest: attestMosaicSafetyIfJudged,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }
}

export async function processImageAdopted(
  log: ImageAdoptedLog,
  config: MosaicSafetyWorkerConfig,
  deps: ProcessAdoptionDeps,
  retryCount = config.contentRetryCount,
  retryDelayMs = config.contentRetryDelayMs,
): Promise<ProcessAdoptionResult> {
  let statementCid: string
  let imageCid: string
  try {
    statementCid = bytes32ToCid(log.statementId)
    imageCid = bytes32ToCid(log.imageId)
  } catch {
    return { status: 'ignored', reason: 'invalid_id' }
  }

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const statementText = await deps.loadStatementText(statementCid)
    if (!statementText) {
      if (attempt < retryCount) await deps.sleep(retryDelayMs)
      continue
    }
    const result = await deps.attest(
      { statementText, statementCid, imageCid },
      config.causeAssist,
    )
    return { status: 'judged', result }
  }
  return { status: 'unavailable' }
}

interface Cursor { blockNumber: bigint; logIndex: number }
interface Pending { log: ImageAdoptedLog; retryAfter: number }
interface State { cursor: Cursor; pending: Pending[] }

async function readState(path: string, fallback: bigint, chainId: number, address: Address): Promise<State> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as {
      chainId?: number
      statementImagesAddress?: string
      blockNumber?: string
      logIndex?: number
      pending?: Array<{ log: Omit<ImageAdoptedLog, 'blockNumber'> & { blockNumber: string }; retryAfter: number }>
    }
    if (parsed.blockNumber === undefined || parsed.logIndex === undefined) throw new Error('missing cursor')
    if (parsed.chainId !== chainId || parsed.statementImagesAddress?.toLowerCase() !== address.toLowerCase()) {
      throw new Error('state belongs to a different chain or StatementImages contract')
    }
    return {
      cursor: { blockNumber: BigInt(parsed.blockNumber), logIndex: parsed.logIndex },
      pending: (parsed.pending ?? []).map(({ log, retryAfter }) => ({
        log: { ...log, blockNumber: BigInt(log.blockNumber) },
        retryAfter,
      })),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { cursor: { blockNumber: fallback, logIndex: -1 }, pending: [] }
    }
    throw new Error(`Cannot read mosaic-safety worker state ${path}: ${String(error)}`)
  }
}

async function writeState(path: string, state: State, chainId: number, address: Address): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp`
  await writeFile(temporary, `${JSON.stringify({
    chainId,
    statementImagesAddress: address,
    blockNumber: state.cursor.blockNumber.toString(),
    logIndex: state.cursor.logIndex,
    pending: state.pending.map(({ log, retryAfter }) => ({
      log: { ...log, blockNumber: log.blockNumber.toString() },
      retryAfter,
    })),
  })}\n`)
  await rename(temporary, path)
}

export async function runMosaicSafetyWorker(config: MosaicSafetyWorkerConfig, signal?: AbortSignal): Promise<void> {
  assertMosaicWorkerCanAttest(config)
  const client = createPublicClient({ transport: http(config.rpcUrl) })
  const state = await readState(config.stateFile, config.startBlock, config.chainId, config.statementImagesAddress)
  const deps = createProcessAdoptionDeps(config)
  let chainReady = false
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  await runPollLoop({
    serviceName: 'commonality-mosaic-safety-worker',
    signal,
    poll: async () => {
      if (!chainReady) {
        const chainId = await client.getChainId()
        if (chainId !== config.chainId) {
          throw new Error(`RPC chain ID ${chainId} does not match configured CHAIN_ID ${config.chainId}`)
        }
        chainReady = true
      }
      await pollOnce()
    },
  })

  async function handle(log: ImageAdoptedLog): Promise<ProcessAdoptionResult> {
    const result = await processImageAdopted(log, config, deps)
    if (result.status === 'judged' && NON_TERMINAL.has(result.result.reason)) {
      throw new Error(
        `ImageAdopted ${log.transactionHash}:${log.logIndex} non-terminal attest reason ${result.result.reason}; refusing to advance cursor`,
      )
    }
    console.log(
      result.status === 'judged'
        ? `ImageAdopted ${log.transactionHash}:${log.logIndex} judged ${result.result.reason}`
        : `ImageAdopted ${log.transactionHash}:${log.logIndex} ${result.status}${result.status === 'ignored' ? `:${result.reason}` : ''}`,
    )
    return result
  }

  async function pollOnce(): Promise<void> {
    const due = state.pending.findIndex((item) => item.retryAfter <= Date.now())
    if (due >= 0) {
      const item = state.pending[due]
      const result = await handle(item.log)
      if (result.status === 'unavailable') {
        item.retryAfter = Date.now() + UNAVAILABLE_RETRY_MS
        state.pending.splice(due, 1)
        state.pending.push(item)
      } else {
        state.pending.splice(due, 1)
      }
      await writeState(config.stateFile, state, config.chainId, config.statementImagesAddress)
    }

    const head = await client.getBlockNumber()
    if (head < config.confirmations || state.cursor.blockNumber > head - config.confirmations) {
      await sleep(config.pollIntervalMs)
      return
    }
    const safeHead = head - config.confirmations
    const toBlock = state.cursor.blockNumber + config.blockRange - 1n > safeHead
      ? safeHead
      : state.cursor.blockNumber + config.blockRange - 1n
    const logs = await client.getContractEvents({
      address: config.statementImagesAddress,
      abi: StatementImagesAbi,
      eventName: 'ImageAdopted',
      fromBlock: state.cursor.blockNumber,
      toBlock,
      strict: true,
    })
    for (const log of logs) {
      if (log.transactionHash === null || log.blockNumber === null || log.logIndex === null) {
        throw new Error('RPC returned an unmined ImageAdopted log')
      }
      if (log.blockNumber === state.cursor.blockNumber && log.logIndex <= state.cursor.logIndex) continue
      const adopted: ImageAdoptedLog = {
        signer: log.args.signer,
        statementId: log.args.statementId,
        imageId: log.args.imageId,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
      }
      const result = await handle(adopted)
      if (result.status === 'unavailable' && !state.pending.some((item) =>
        item.log.transactionHash === adopted.transactionHash && item.log.logIndex === adopted.logIndex)) {
        state.pending.push({ log: adopted, retryAfter: Date.now() + UNAVAILABLE_RETRY_MS })
      }
      state.cursor = { blockNumber: adopted.blockNumber, logIndex: adopted.logIndex }
      await writeState(config.stateFile, state, config.chainId, config.statementImagesAddress)
    }
    state.cursor = { blockNumber: toBlock + 1n, logIndex: -1 }
    await writeState(config.stateFile, state, config.chainId, config.statementImagesAddress)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController()
  process.once('SIGINT', () => controller.abort())
  process.once('SIGTERM', () => controller.abort())
  loadMosaicSafetyWorkerConfig().then((config) => runMosaicSafetyWorker(config, controller.signal)).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
