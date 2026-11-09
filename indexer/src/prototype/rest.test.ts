import assert from "node:assert/strict";
import test from "node:test";
import { createPrototypeApp } from "./http";
import type { Hex } from "viem";
import type { Snapshot } from "./types";

const publisher = ("0x" + "ab".repeat(20)) as Hex;
const dataId = ("0x" + "11".repeat(32)) as Hex;
const topic1 = "0x" + publisher.slice(2).padStart(64, "0");

function snapshot(): Snapshot {
  return {
    version: 1,
    chainId: 31337,
    scope: "a".repeat(64),
    fromBlock: 1n,
    head: { number: 20n, hash: ("0x" + "1".repeat(64)) as Hex, timestamp: 20n },
    durable: { number: 12n, hash: ("0x" + "2".repeat(64)) as Hex, timestamp: 12n },
    children: [],
    rows: [{
      id: `31337-0x${"3".repeat(64)}-0`,
      chainId: 31337,
      contractAddress: ("0x" + "cd".repeat(20)) as Hex,
      eventName: "DataPublished",
      blockNumber: "5",
      blockTimestamp: "5",
      transactionHash: ("0x" + "3".repeat(64)) as Hex,
      logIndex: 0,
      topic0: "0x" + "4".repeat(64),
      topic1,
      topic2: dataId,
      topic3: null,
      data: "0x",
    }, {
      id: `31337-0x${"5".repeat(64)}-1`,
      chainId: 31337,
      contractAddress: ("0x" + "cd".repeat(20)) as Hex,
      eventName: "DataPublished",
      blockNumber: "10",
      blockTimestamp: "10",
      transactionHash: ("0x" + "5".repeat(64)) as Hex,
      logIndex: 1,
      topic0: ("0x" + "4".repeat(64)) as Hex,
      topic1,
      topic2: dataId,
      topic3: null,
      data: "0x",
    }],
  };
}

test("prototype serves the indexer REST routes from a snapshot", async () => {
  const previousBlocks = process.env.EVENT_SEGMENT_BLOCKS;
  const previousConfirmations = process.env.EVENT_SEGMENT_CONFIRMATIONS;
  process.env.EVENT_SEGMENT_BLOCKS = "10";
  process.env.EVENT_SEGMENT_CONFIRMATIONS = "1";
  try {
    const app = createPrototypeApp(() => snapshot(), "hardhat");
    const sync = await app.request("http://indexer.test/api/sync");
    assert.equal(sync.status, 200);
    const syncBody = await sync.json() as { ready: boolean; upstreamId: string; chains: Array<{ indexedThrough: string; finalizedThrough: string; indexedCheckpoint: string }> };
    assert.equal(syncBody.ready, true);
    assert.equal(syncBody.upstreamId, "a".repeat(64));
    assert.equal(syncBody.chains[0]?.indexedThrough, "20");
    assert.equal(syncBody.chains[0]?.finalizedThrough, "12");
    assert.equal(syncBody.chains[0]?.indexedCheckpoint, "0000000000000020");

    const events = await app.request("http://indexer.test/api/events?chainId=31337&eventName=DataPublished");
    const eventsBody = await events.json() as { items: Array<{ blockNumber: string }>; truncated: boolean };
    assert.equal(eventsBody.items.length, 2);
    assert.equal(eventsBody.items[0]?.blockNumber, "5");
    assert.equal(eventsBody.truncated, false);

    const published = await app.request(`http://indexer.test/api/published-data/${dataId}`);
    const publishedBody = await published.json() as { status: string; publications: Array<{ publisher: string }> };
    assert.equal(publishedBody.status, "active");
    assert.equal(publishedBody.publications[0]?.publisher.toLowerCase(), publisher);

    const manifest = await app.request("http://indexer.test/api/event-segments/manifest?chainId=31337&eventName=DataPublished");
    const manifestBody = await manifest.json() as { segments: Array<{ fromBlock: string; count: number }> };
    assert.equal(manifestBody.segments.length, 1);
    assert.equal(manifestBody.segments[0]?.fromBlock, "0");
    assert.equal(manifestBody.segments[0]?.count, 1);

    const meta = await app.request("http://indexer.test/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ _meta { block { number } } }" }),
    });
    const metaBody = await meta.json() as { data: { _meta: { block: { number: number }; status: { hardhat: { block: { number: number } } } } } };
    assert.equal(metaBody.data._meta.block.number, 20);
    assert.equal(metaBody.data._meta.status.hardhat.block.number, 20);

    const other = await app.request("http://indexer.test/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ events { id } }" }),
    });
    assert.equal(other.status, 400);
  } finally {
    if (previousBlocks == null) delete process.env.EVENT_SEGMENT_BLOCKS;
    else process.env.EVENT_SEGMENT_BLOCKS = previousBlocks;
    if (previousConfirmations == null) delete process.env.EVENT_SEGMENT_CONFIRMATIONS;
    else process.env.EVENT_SEGMENT_CONFIRMATIONS = previousConfirmations;
  }
});

test("empty prototype snapshot is not ready", async () => {
  const app = createPrototypeApp(() => undefined, "hardhat");
  const sync = await app.request("http://indexer.test/api/sync");
  const body = await sync.json() as { ready: boolean; chains: unknown[] };
  assert.equal(body.ready, false);
  assert.deepEqual(body.chains, []);
});
