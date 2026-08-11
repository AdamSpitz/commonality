import { pathToFileURL } from 'node:url';
import { createPublicClient, http } from 'viem';
import { MutableRefUpdaterAbi } from '@commonality/sdk/abis';
import { loadWorkerConfig, type WorkerConfig } from './config.js';
import { readCursor, writeCursor } from './state.js';
import { createWorkerDependencies, processRefUpdated, type RefUpdatedLog } from './worker.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function validateRpcChainId(rpcChainId: number, configuredChainId: number): void {
  if (rpcChainId !== configuredChainId) {
    throw new Error(`RPC chain ID ${rpcChainId} does not match configured CHAIN_ID ${configuredChainId}`);
  }
}

export async function runWorker(config: WorkerConfig, signal?: AbortSignal): Promise<void> {
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
      console.log(`RefUpdated ${update.transactionHash}:${update.logIndex} ${result.status}`);
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
