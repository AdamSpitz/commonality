import { pathToFileURL } from 'node:url';
import { createPublicClient, http } from 'viem';
import { PublishedDataAbi } from '@commonality/sdk/abis';
import { createCalldataContentResolver, type PublishedDataId } from '@commonality/sdk/published-data';
import { loadConfig, type MirrorConfig } from './config.js';
import { addPublishedDataToIpfs } from './ipfs.js';
import { mirrorPublication, type PublicationLog } from './mirror.js';
import { readNextBlock, writeNextBlock } from './state.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runMirror(config: MirrorConfig, signal?: AbortSignal): Promise<void> {
  const client = createPublicClient({ transport: http(config.rpcUrl) });
  const resolver = createCalldataContentResolver({
    publishedDataAddress: config.publishedDataAddress,
    getTransaction: async (hash) => {
      const transaction = await client.getTransaction({ hash });
      return { from: transaction.from, to: transaction.to, input: transaction.input };
    },
  });
  let nextBlock = await readNextBlock(config.stateFile, config.startBlock);

  while (!signal?.aborted) {
    const head = await client.getBlockNumber();
    if (head < config.confirmations || nextBlock > head - config.confirmations) {
      await sleep(config.pollIntervalMs);
      continue;
    }

    const safeHead = head - config.confirmations;
    const toBlock = nextBlock + config.blockRange - 1n > safeHead
      ? safeHead
      : nextBlock + config.blockRange - 1n;
    const logs = await client.getContractEvents({
      address: config.publishedDataAddress,
      abi: PublishedDataAbi,
      eventName: 'DataPublished',
      fromBlock: nextBlock,
      toBlock,
      strict: true,
    });

    for (const log of logs) {
      if (log.transactionHash === null || log.blockNumber === null || log.logIndex === null) {
        throw new Error('RPC returned an unmined DataPublished log');
      }
      const publication: PublicationLog = {
        publisher: log.args.publisher,
        dataId: log.args.dataId as PublishedDataId,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
      };
      const cid = await mirrorPublication(publication, {
        resolveContent: resolver,
        addToIpfs: addPublishedDataToIpfs,
        ipfsApiUrl: config.ipfsApiUrl,
      });
      console.log(`Pinned ${cid} from ${log.transactionHash}:${log.logIndex}`);
    }

    nextBlock = toBlock + 1n;
    await writeNextBlock(config.stateFile, nextBlock);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  runMirror(loadConfig(), controller.signal).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
