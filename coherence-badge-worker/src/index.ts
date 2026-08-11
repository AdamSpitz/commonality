import { pathToFileURL } from 'node:url';
import { createPublicClient, http } from 'viem';
import {
  isCoherenceAttesterConfigured,
} from '@commonality/cause-assist';
import { MutableRefUpdaterAbi } from '@commonality/sdk/abis';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { readCursor, writeCursor } from './state.js';
import { createWorkerDependencies, processRefUpdated, type RefUpdatedLog } from './worker.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Outcomes that mean "not ready to mint" — advancing the cursor would drop the tip forever. */
const NON_TERMINAL_JUDGED_REASONS = new Set([
  'judgment_unavailable',
  'attester_not_configured',
  'roster_unavailable',
]);

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
  let cursor = await readCursor(config.stateFile, config.startBlock, identity);
  const dependencies = createWorkerDependencies(config.causeAssist);

  while (!signal?.aborted) {
    const head = await client.getBlockNumber();
    if (head < config.confirmations || cursor.blockNumber > head - config.confirmations) {
      await sleep(config.pollIntervalMs);
      continue;
    }
    const safeHead = head - config.confirmations;
    const toBlock = cursor.blockNumber + config.blockRange - 1n > safeHead
      ? safeHead
      : cursor.blockNumber + config.blockRange - 1n;
    const logs = await client.getContractEvents({
      address: config.mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
      eventName: 'RefUpdated',
      fromBlock: cursor.blockNumber,
      toBlock,
      strict: true,
    });

    for (const log of logs) {
      if (log.transactionHash === null || log.blockNumber === null || log.logIndex === null) {
        throw new Error('RPC returned an unmined RefUpdated log');
      }
      if (log.blockNumber === cursor.blockNumber && log.logIndex <= cursor.logIndex) continue;
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

      // Config/judgment gaps must not burn the durable cursor — restart with a key
      // should still see this tip. Permanent content miss after retries still advances
      // so one stuck CID cannot block later rosters (see worker README).
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
      cursor = { blockNumber: update.blockNumber, logIndex: update.logIndex };
      await writeCursor(config.stateFile, cursor, identity);
    }

    cursor = { blockNumber: toBlock + 1n, logIndex: -1 };
    await writeCursor(config.stateFile, cursor, identity);
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
