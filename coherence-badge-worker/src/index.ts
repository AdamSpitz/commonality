import { pathToFileURL } from 'node:url';
import { createPublicClient, http } from 'viem';
import {
  isCoherenceAttesterConfigured,
} from '@commonality/cause-assist';
import { MutableRefUpdaterAbi } from '@commonality/sdk/abis';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { readState, writeState, type WorkerState } from './state.js';
import { createWorkerDependencies, processRefUpdated, type RefUpdatedLog } from './worker.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Outcomes that mean "not ready to mint" — advancing the cursor would drop the tip forever. */
const NON_TERMINAL_JUDGED_REASONS = new Set([
  'judgment_unavailable',
  'attester_not_configured',
  'roster_unavailable',
]);
const UNAVAILABLE_RETRY_MS = 60_000;

async function retryPending(
  state: WorkerState,
  dependencies: ReturnType<typeof createWorkerDependencies>,
  config: WorkerConfig,
  identity: { chainId: number; mutableRefUpdaterAddress: `0x${string}` },
): Promise<void> {
  const index = state.pending.findIndex((item) => item.retryAfter <= Date.now());
  if (index < 0) return;
  const item = state.pending[index];
  const result = await processRefUpdated(item.log, dependencies, config.contentRetryCount, config.contentRetryDelayMs);
  if (result.status === 'judged' && NON_TERMINAL_JUDGED_REASONS.has(result.result.reason)) {
    throw new Error(`Pending RefUpdated ${item.log.transactionHash}:${item.log.logIndex} non-terminal attest reason ${result.result.reason}`);
  }
  if (result.status === 'unavailable') {
    item.retryAfter = Date.now() + UNAVAILABLE_RETRY_MS;
    state.pending.splice(index, 1);
    state.pending.push(item);
  } else {
    state.pending.splice(index, 1);
    console.log(`Pending RefUpdated ${item.log.transactionHash}:${item.log.logIndex} ${result.status === 'judged' ? result.result.reason : result.status}`);
  }
  await writeState(config.stateFile, state, identity);
}

export function validateRpcChainId(rpcChainId: number, configuredChainId: number): void {
  if (rpcChainId !== configuredChainId) {
    throw new Error(`RPC chain ID ${rpcChainId} does not match configured CHAIN_ID ${configuredChainId}`);
  }
}

/**
 * Refuse to scan when the worker cannot mint. Scanning without a key/LLM advances
 * the durable cursor past RefUpdated tips and permanently skips badges.
 */
export function assertWorkerCanMint(config: WorkerConfig): void {
  if (!config.causeAssist.apiKey?.trim()) {
    throw new Error(
      'coherence-badge-worker requires XAI_API_KEY or OPENROUTER_API_KEY (LLM judgment only; heuristics never mint)',
    );
  }
  if (!isCoherenceAttesterConfigured(config.causeAssist)) {
    throw new Error(
      'coherence-badge-worker requires CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY, RPC URL, and ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
    );
  }
}

export async function runWorker(config: WorkerConfig, signal?: AbortSignal): Promise<void> {
  assertWorkerCanMint(config);
  const client = createPublicClient({ transport: http(config.rpcUrl) });
  validateRpcChainId(await client.getChainId(), config.chainId);
  const identity = {
    chainId: config.chainId,
    mutableRefUpdaterAddress: config.mutableRefUpdaterAddress,
  };
  const state = await readState(config.stateFile, config.startBlock, identity);
  const dependencies = createWorkerDependencies(config.causeAssist);

  while (!signal?.aborted) {
    await retryPending(state, dependencies, config, identity);
    const head = await client.getBlockNumber();
    if (head < config.confirmations || state.cursor.blockNumber > head - config.confirmations) {
      await sleep(config.pollIntervalMs);
      continue;
    }
    const safeHead = head - config.confirmations;
    const toBlock = state.cursor.blockNumber + config.blockRange - 1n > safeHead
      ? safeHead
      : state.cursor.blockNumber + config.blockRange - 1n;
    const logs = await client.getContractEvents({
      address: config.mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
      eventName: 'RefUpdated',
      fromBlock: state.cursor.blockNumber,
      toBlock,
      strict: true,
    });

    for (const log of logs) {
      if (log.transactionHash === null || log.blockNumber === null || log.logIndex === null) {
        throw new Error('RPC returned an unmined RefUpdated log');
      }
      if (log.blockNumber === state.cursor.blockNumber && log.logIndex <= state.cursor.logIndex) continue;
      const update: RefUpdatedLog = {
        owner: log.args.owner,
        name: log.args.name,
        currentRefValue: log.args.currentRefValue,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
      };
      const result = await processRefUpdated(
        update,
        dependencies,
        config.contentRetryCount,
        config.contentRetryDelayMs,
      );

      // Configuration and judgment gaps stop the scan. Content outages are
      // queued durably so one unavailable CID does not block later rosters.
      if (result.status === 'judged' && NON_TERMINAL_JUDGED_REASONS.has(result.result.reason)) {
        throw new Error(
          `RefUpdated ${update.transactionHash}:${update.logIndex} non-terminal attest reason ${result.result.reason}; refusing to advance cursor`,
        );
      }

      console.log(
        result.status === 'judged'
          ? `RefUpdated ${update.transactionHash}:${update.logIndex} judged ${result.result.reason}`
          : `RefUpdated ${update.transactionHash}:${update.logIndex} ${result.status}${result.status === 'ignored' ? `:${result.reason}` : ''}`,
      );
      if (result.status === 'unavailable' && !state.pending.some((item) =>
        item.log.transactionHash === update.transactionHash && item.log.logIndex === update.logIndex)) {
        state.pending.push({ log: update, retryAfter: Date.now() + UNAVAILABLE_RETRY_MS });
      }
      state.cursor = { blockNumber: update.blockNumber, logIndex: update.logIndex };
      await writeState(config.stateFile, state, identity);
    }

    state.cursor = { blockNumber: toBlock + 1n, logIndex: -1 };
    await writeState(config.stateFile, state, identity);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  runWorker(loadWorkerConfig(), controller.signal).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
