import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeAbiParameters, parseAbiItem, toEventSelector, type AbiEvent, type Hex } from "viem";
import { syncWindow } from "./sync";
import { RpcFailure } from "./rpc";
import { compareRows } from "./compare";
import { lockSnapshot, readSnapshot, validateSnapshot, writeSnapshot } from "./store";
import { loadCatalog } from "./catalog";
import { captureRawEvent } from "../utils/rawEvents";
import { address, hex, json, type Catalog, type RawLog, type Rpc } from "./types";

const hash = (n: number): Hex => `0x${n.toString(16).padStart(64, "0")}`;
const parent = address(`0x${"11".repeat(20)}`);
const child = address(`0x${"22".repeat(20)}`);
const event = parseAbiItem("event Changed(uint256 value)") as AbiEvent;
const created = parseAbiItem("event Created(address child)") as AbiEvent;
const source = { name: "Fixed", address: parent, startBlock: 1n, events: [event] };
const fixed: Catalog = { sources: [source], factories: [] };
const factory: Catalog = {
  sources: [{ ...source, name: "Factory", events: [created] }],
  factories: [{ source, event: created, parameter: "child", childName: "Child", childEvents: [event] }],
};

class Chain implements Rpc {
  calls: { method: string; params: unknown[] }[] = [];
  logs: RawLog[] = [];
  forks = new Map<bigint, number>();
  rangeLimit = 100_000n;
  addressLimit = 100;
  topicLimit = 100;
  fail?: string;
  duringLogs?: () => void;
  hash(n: bigint): Hex { return hash(Number(n) + (this.forks.get(n) ?? 0)); }
  log(n: bigint, addr = parent, e = event, index = 0): RawLog {
    return { address: addr, blockNumber: hex(n), blockHash: this.hash(n), transactionHash: hash(Number(n) + 1000),
      logIndex: hex(BigInt(index)), topics: [toEventSelector(e)], data: e === created ?
        encodeAbiParameters([{ type: "address" }], [child]) : encodeAbiParameters([{ type: "uint256" }], [7n]) };
  }
  async request(method: string, params: unknown[]): Promise<unknown> {
    this.calls.push({ method, params });
    if (this.fail === method) throw new Error("simulated transport failure");
    if (method === "eth_chainId") return hex(31337n);
    if (method === "eth_getBlockByNumber") {
      assert.equal(params[1], false, "never fetch full transactions");
      const n = BigInt(params[0] as string);
      return { number: hex(n), hash: this.hash(n), timestamp: hex(n * 2n) };
    }
    if (method === "eth_getLogs") {
      const filter = params[0] as { fromBlock: Hex; toBlock: Hex; address: Hex[]; topics: Hex[][] };
      const from = BigInt(filter.fromBlock), to = BigInt(filter.toBlock);
      assert.ok(filter.address.length, "never query all addresses");
      if (to - from + 1n > this.rangeLimit) throw new RpcFailure("range limit", true);
      if (filter.address.length > this.addressLimit || filter.topics[0]!.length > this.topicLimit) throw new RpcFailure("size limit", true);
      const logs = this.logs.filter(log => BigInt(log.blockNumber) >= from && BigInt(log.blockNumber) <= to &&
        filter.address.includes(log.address) && filter.topics[0]!.includes(log.topics[0]!));
      this.duringLogs?.();
      return logs;
    }
    throw new Error(`Unexpected ${method}`);
  }
}
const options = { chainId: 31337, fromBlock: 1n, toBlock: 10n, finalizedBlock: 5n };

test("raw rows match Ponder capture, with one timestamp lookup per event block", async () => {
  const chain = new Chain();
  chain.logs = [chain.log(3n), chain.log(3n, parent, event, 1)];
  const result = await syncWindow(chain, fixed, options);
  const expected = chain.logs.map(log => captureRawEvent({ log: { ...log, logIndex: Number(BigInt(log.logIndex)) },
    block: { number: 3n, timestamp: 6n } }, "Changed", 31337));
  assert.deepEqual(result.rows, JSON.parse(json(expected)));
  assert.equal(chain.calls.filter(call => call.method === "eth_getBlockByNumber" && call.params[0] === "0x3").length, 1);
});

test("quiet-block RPC count is independent of elapsed block count", async () => {
  for (const toBlock of [20n, 1000n]) {
    const chain = new Chain();
    const result = await syncWindow(chain, fixed, { ...options, toBlock });
    assert.equal(result.head.number, toBlock);
    assert.equal(result.rows.length, 0);
    assert.equal(chain.calls.filter(call => call.method === "eth_getLogs").length, 1);
    assert.equal(chain.calls.filter(call => call.method === "eth_getBlockByNumber").length, 7);
  }
});

test("range rejection splits and covers every log; irreducible failure stops", async () => {
  const chain = new Chain();
  chain.rangeLimit = 2n;
  chain.logs = Array.from({ length: 10 }, (_, i) => chain.log(BigInt(i + 1)));
  const result = await syncWindow(chain, fixed, options);
  assert.equal(result.rows.length, 10);
  chain.rangeLimit = 0n;
  await assert.rejects(syncWindow(chain, fixed, options), /Single-block/);
});

test("factory discovery includes constructor logs before the creation event", async () => {
  const chain = new Chain();
  chain.logs = [chain.log(3n, child, event, 0), chain.log(3n, parent, created, 1), chain.log(9n, child)];
  const result = await syncWindow(chain, factory, options);
  assert.equal(result.children.length, 1);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0]!.contractAddress, child);
  const restarted = await syncWindow(chain, factory, { ...options, toBlock: 12n, finalizedBlock: 10n }, result);
  assert.equal(restarted.rows.length, 3);
  assert.equal(restarted.children.length, 1);
  assert.ok(chain.calls.filter(call => call.method === "eth_getLogs").some(call =>
    (call.params[0] as { address: string[] }).address.includes(child)));
});

test("single-block limits split address and topic filters without losing events", async () => {
  const chain = new Chain();
  chain.addressLimit = 1;
  chain.topicLimit = 1;
  chain.logs = [chain.log(1n), chain.log(1n, child, created, 1)];
  const catalog: Catalog = { sources: [source, { ...source, address: child, events: [created] }], factories: [] };
  const result = await syncWindow(chain, catalog, { ...options, toBlock: 1n, finalizedBlock: 1n });
  assert.equal(result.rows.length, 2);
});

test("same-height reorg after unchanged oldest tip block replaces orphaned rows and children", async () => {
  const chain = new Chain();
  chain.logs = [chain.log(8n, parent, created, 1), chain.log(8n, child)];
  const first = await syncWindow(chain, factory, options);
  const original = json(first);
  chain.forks.set(8n, 100);
  chain.forks.set(10n, 100);
  chain.logs = [];
  const second = await syncWindow(chain, factory, options, first);
  assert.equal(second.rows.length, 0);
  assert.equal(second.children.length, 0);
  assert.equal(json(first), original, "transition does not mutate committed state");
});

test("deep reorg, mid-query fork, wrong chain, and changed source scope refuse commit", async () => {
  const chain = new Chain();
  const first = await syncWindow(chain, fixed, options);
  chain.forks.set(5n, 100);
  await assert.rejects(syncWindow(chain, fixed, options, first), /Deep reorg/);
  chain.forks.clear();
  chain.duringLogs = () => chain.forks.set(10n, 100);
  await assert.rejects(syncWindow(chain, fixed, options, first), /Chain changed/);
  chain.duringLogs = undefined;
  await assert.rejects(syncWindow(chain, fixed, { ...options, chainId: 1 }), /chain ID/);
  await assert.rejects(syncWindow(chain, { ...fixed, sources: [{ ...source, startBlock: 2n }] }, options, first), /scope changed/);
});

test("failure leaves state intact; snapshot restart and writer exclusion", async () => {
  const dir = await mkdtemp(join(tmpdir(), "raw-log-prototype-"));
  const path = join(dir, "state.json");
  try {
    const chain = new Chain();
    chain.logs = [chain.log(3n, parent, created, 1), chain.log(3n, child)];
    const first = await syncWindow(chain, factory, options);
    const unlock = await lockSnapshot(path);
    await assert.rejects(lockSnapshot(path), /EEXIST/);
    await writeSnapshot(path, first);
    const before = await readFile(path, "utf8");
    chain.fail = "eth_getLogs";
    await assert.rejects(syncWindow(chain, factory, { ...options, toBlock: 12n }, first), /simulated/);
    assert.equal(await readFile(path, "utf8"), before);
    const restored = await readSnapshot(path);
    assert.deepEqual(restored, first);
    chain.fail = undefined;
    await writeSnapshot(path, await syncWindow(chain, factory, { ...options, toBlock: 12n }, restored));
    assert.equal((await readSnapshot(path))!.head.number, 12n);
    const committed = await readSnapshot(path);
    await assert.rejects(Promise.resolve().then(() => validateSnapshot({ ...committed!, rows: [committed!.rows[0]!, committed!.rows[0]!] })), /Duplicate/);
    await unlock();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("missing factory history and oversized ranges are rejected", async () => {
  await assert.rejects(syncWindow(new Chain(), factory, { ...options, fromBlock: 2n }), /omits factory history/);
  await assert.rejects(syncWindow(new Chain(), fixed, { ...options, maxBlocks: 2n }), /oversized/);
});

test("empty sources do not issue unrestricted queries; malformed logs fail closed", async () => {
  const chain = new Chain();
  await syncWindow(chain, { sources: [], factories: [] }, options);
  assert.equal(chain.calls.some(call => call.method === "eth_getLogs"), false);
  chain.logs = [{ ...chain.log(3n), removed: true }];
  await assert.rejects(syncWindow(chain, fixed, options), /invalid\/out-of-scope/);
});

test("parity detects missing, extra and changed row fields", async () => {
  const chain = new Chain();
  chain.logs = [chain.log(3n)];
  const { rows } = await syncWindow(chain, fixed, options);
  assert.equal(compareRows(rows, rows).equal, true);
  assert.equal(compareRows([], rows).missing.length, 1);
  assert.equal(compareRows(rows, []).extra.length, 1);
  assert.equal(compareRows([{ ...rows[0]!, blockTimestamp: "100" }], rows).changed.length, 1);
});

test("real catalog preserves all six factory rules and conceptspace exclusions", async () => {
  const env = { ...process.env };
  try {
    process.env.PONDER_CHAIN = "hardhat";
    process.env.INDEXER_CONTRACTS = "all";
    const names = ["AssuranceContractFactory", "FixedControllerFactory", "ERC1155Factory", "CreatorAssuranceContractFactory", "ProspectiveContentRoundFactory", "Beliefs"];
    process.env.INDEXER_DEPLOYMENT_MANIFEST = JSON.stringify({ hardhat: Object.fromEntries(names.map((name, i) =>
      [name, [{ address: `0x${(i + 1).toString(16).padStart(40, "0")}`, startBlock: 1 }]])) });
    const catalog = await loadCatalog();
    assert.equal(catalog.factories.length, 6);
    // Exercise real ABI decoding/child parameter mappings for every factory rule.
    for (const rule of catalog.factories) {
      const inputs = rule.event.inputs;
      const values = inputs.map(input => input.type === "address" ? child : input.type === "bool" ? false :
        input.type.startsWith("uint") ? 0n : hash(0));
      const indexed = inputs.flatMap((input, i) => input.indexed ? [encodeAbiParameters([input], [values[i]])] : []);
      const chain = new Chain();
      chain.logs = [{ ...chain.log(3n), address: rule.source.address, topics: [toEventSelector(rule.event), ...indexed],
        data: encodeAbiParameters(inputs.filter(input => !input.indexed), values.filter((_, i) => !inputs[i]!.indexed)) }];
      const result = await syncWindow(chain, { sources: [], factories: [rule] }, options);
      assert.equal(result.children[0]!.address, child, rule.childName);
    }
    process.env.INDEXER_CONTRACTS = "conceptspace";
    const conceptspace = await loadCatalog();
    assert.equal(conceptspace.factories.length, 0);
    assert.ok(conceptspace.sources.every(s => s.name !== "AssuranceContractFactory"));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
});
