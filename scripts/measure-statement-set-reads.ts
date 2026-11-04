/**
 * Cold/warm byte measurement for exact statement-set reads.
 *
 * Prints one JSON object. Does not decide whether to add raw-event partitions.
 * Run against a local or testnet indexer that serves GET /api/sync and follower
 * event pages:
 *
 *   npx tsx scripts/measure-statement-set-reads.ts
 *
 * Optional env: EVENT_CACHE_URL, CHAIN_ID, BELIEFS_ADDRESS, IMPLICATIONS_ADDRESS, TARGET_COUNT.
 */
import { bytes32ToCid } from '../sdk/src/utils/cid-types.js';
import { MemoryFoldStore } from '../sdk/src/utils/resumableFold.js';
import { createSDKMachinery } from '../sdk/src/machinery.js';
import { readStatementSet } from '../sdk/src/subsystems/conceptspace/queries/statement-set.js';

const eventCacheUrl = process.env.EVENT_CACHE_URL ?? 'http://127.0.0.1:42069';
const chainId = Number(process.env.CHAIN_ID ?? 31337);
const beliefs = process.env.BELIEFS_ADDRESS ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const implications = process.env.IMPLICATIONS_ADDRESS ?? '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const targetCount = Number(process.env.TARGET_COUNT ?? 100);

type Hit = { url: string; bytes: number; status: number };

async function corpusBytes(): Promise<Record<string, { bytes: number; items: number }>> {
  const out: Record<string, { bytes: number; items: number }> = {};
  for (const eventName of ['DirectSupport', 'ImplicationAttestation', 'ImplicationRevoked']) {
    const url = `${eventCacheUrl}/api/events?chainId=${chainId}&eventName=${eventName}&limit=1000`;
    const response = await fetch(url);
    const raw = await response.text();
    const items = response.ok ? (JSON.parse(raw).items?.length ?? 0) : 0;
    out[eventName] = { bytes: raw.length, items };
  }
  return out;
}

async function statementTargets(): Promise<string[]> {
  const url = `${eventCacheUrl}/api/events?chainId=${chainId}&eventName=DirectSupport&contractAddress=${beliefs}&limit=1000`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const body = await response.json() as { items?: Array<{ topic2?: string }> };
  const seen = new Set<string>();
  const targets: string[] = [];
  for (const item of body.items ?? []) {
    const topic = item.topic2;
    if (topic == null || !/^0x[0-9a-fA-F]{64}$/.test(topic) || seen.has(topic.toLowerCase())) continue;
    seen.add(topic.toLowerCase());
    try {
      targets.push(bytes32ToCid(topic as `0x${string}`));
    } catch {
      continue;
    }
    if (targets.length >= targetCount) break;
  }
  return targets;
}

function summarize(hits: Hit[]) {
  const eventHits = hits.filter(hit => hit.url.includes('/api/events'));
  return {
    requests: hits.length,
    eventRequests: eventHits.length,
    bytes: hits.reduce((sum, hit) => sum + hit.bytes, 0),
    eventBytes: eventHits.reduce((sum, hit) => sum + hit.bytes, 0),
    statuses: [...new Set(hits.map(hit => hit.status))],
  };
}

async function measuredRead(targets: string[]) {
  const hits: Hit[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const response = await original(input, init);
    const clone = response.clone();
    const raw = await clone.arrayBuffer();
    hits.push({ url: String(input), bytes: raw.byteLength, status: response.status });
    return response;
  };
  try {
    const machinery = createSDKMachinery({
      eventCacheUrl,
      defaultChainId: chainId,
      contractAddresses: { beliefs, implications },
      foldStore: new MemoryFoldStore(),
      ipfsConfig: { gateway: 'http://127.0.0.1:8080' },
    });
    const cold = await readStatementSet(machinery, targets);
    const coldHits = hits.splice(0);
    const warm = await readStatementSet(machinery, targets);
    return {
      coldRead: { status: cold.status, asOfBlock: cold.asOfBlock, error: cold.error ?? null, ...summarize(coldHits) },
      warmRead: { status: warm.status, asOfBlock: warm.asOfBlock, error: warm.error ?? null, ...summarize(hits) },
    };
  } finally {
    globalThis.fetch = original;
  }
}

const corpus = await corpusBytes();
const targets = await statementTargets();
let reads: unknown = null;
let error: string | null = null;
if (targets.length === 0) {
  error = 'no DirectSupport statement topics available to measure';
} else {
  try {
    reads = await measuredRead(targets);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
}

const report = {
  eventCacheUrl,
  chainId,
  targetCount: targets.length,
  corpus,
  reads,
  error,
  gate: error == null && reads != null ? 'measured' : 'blocked',
};
console.log(JSON.stringify(report, null, 2));
if (report.gate !== 'measured') process.exitCode = 2;
