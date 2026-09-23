import { decodeEventLog, type Hex } from 'viem';
import { AssuranceContractAbi } from '../abis.js';
import type { RawEventFromCache } from './eventCacheClient.js';

const MAX_LOGS_PER_CALL = 10_000;
const MAX_SPLITS = 8;

export interface ProjectLogSource {
  getBlockNumber(): Promise<bigint>;
  getLogs(args: { address: Hex; fromBlock: bigint; toBlock: bigint }): Promise<readonly unknown[]>;
  getBlock(args: { blockNumber: bigint }): Promise<{ timestamp: bigint }>;
}

interface RpcLog {
  address: string;
  blockNumber: bigint | null;
  transactionHash: Hex | null;
  logIndex: number | null;
  topics: readonly Hex[];
  data: Hex;
}

function asLog(value: unknown): RpcLog | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const log = value as Partial<RpcLog>;
  if (typeof log.address !== 'string' || typeof log.data !== 'string' || !Array.isArray(log.topics)) return undefined;
  return log as RpcLog;
}

function isTooManyLogs(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes('response size') || (message.includes('more than') && message.includes('result'));
}

async function getLogsComplete(
  source: ProjectLogSource,
  address: Hex,
  fromBlock: bigint,
  toBlock: bigint,
  depth = 0,
): Promise<RpcLog[]> {
  let logs: RpcLog[];
  try {
    logs = (await source.getLogs({ address, fromBlock, toBlock })).flatMap((log) => {
      const parsed = asLog(log);
      return parsed ? [parsed] : [];
    });
  } catch (error) {
    if (fromBlock === toBlock || depth >= MAX_SPLITS || !isTooManyLogs(error)) throw error;
    return split(source, address, fromBlock, toBlock, depth);
  }
  if (logs.length < MAX_LOGS_PER_CALL || fromBlock === toBlock) return logs;
  if (depth >= MAX_SPLITS) {
    throw new Error(`More than ${MAX_LOGS_PER_CALL} logs between blocks ${fromBlock} and ${toBlock}`);
  }
  return split(source, address, fromBlock, toBlock, depth);
}

async function split(
  source: ProjectLogSource,
  address: Hex,
  fromBlock: bigint,
  toBlock: bigint,
  depth: number,
): Promise<RpcLog[]> {
  const mid = fromBlock + (toBlock - fromBlock) / 2n;
  const [left, right] = await Promise.all([
    getLogsComplete(source, address, fromBlock, mid, depth + 1),
    getLogsComplete(source, address, mid + 1n, toBlock, depth + 1),
  ]);
  return [...left, ...right];
}

export async function readProjectLogsFromNode(
  source: ProjectLogSource,
  chainId: number | undefined,
  address: string,
  fromBlock: bigint,
): Promise<RawEventFromCache[]> {
  const head = await source.getBlockNumber();
  const start = fromBlock > head ? head : fromBlock;
  const logs = await getLogsComplete(source, address as Hex, start, head);
  const timestamps = new Map<bigint, bigint>();
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber).filter((n): n is bigint => n != null))];
  await Promise.all(blockNumbers.map(async (blockNumber) => {
    timestamps.set(blockNumber, (await source.getBlock({ blockNumber })).timestamp);
  }));

  const events: RawEventFromCache[] = [];
  for (const log of logs) {
    if (!log.transactionHash || log.logIndex == null || log.blockNumber == null || !log.topics[0]) continue;
    const timestamp = timestamps.get(log.blockNumber);
    if (timestamp == null) throw new Error(`Missing timestamp for block ${log.blockNumber}`);
    let eventName: string;
    try {
      eventName = (decodeEventLog({
        abi: AssuranceContractAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      }) as { eventName: string }).eventName;
    } catch {
      continue;
    }
    events.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      chainId,
      contractAddress: log.address,
      eventName,
      blockNumber: log.blockNumber.toString(),
      blockTimestamp: timestamp.toString(),
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      topic0: log.topics[0] ?? null,
      topic1: log.topics[1] ?? null,
      topic2: log.topics[2] ?? null,
      topic3: log.topics[3] ?? null,
      data: log.data,
    });
  }
  return events;
}
