import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { loadCatalog } from "../src/prototype/catalog";
import { compareWithPonder } from "../src/prototype/compare";
import { MeteredRpc } from "../src/prototype/rpc";
import { readHeader, syncWindow } from "../src/prototype/sync";
import type { Server } from "node:http";
import { createPrototypeApp, listen } from "../src/prototype/http";
import { earliestConfiguredBlock, localServeConfig } from "../src/prototype/local";
import { lockSnapshot, readSnapshot, writeSnapshot } from "../src/prototype/store";
import { json, type Snapshot } from "../src/prototype/types";
import { DEFAULT_IDLE_HEAD_INTERVAL_MS, DEFAULT_IDLE_HEAD_WAKE_MS, idleHeadCacheEnabled } from "../src/rpc/idleHeadCache";
import { PrototypeIdleGate } from "../src/prototype/idle";
import { getIndexerChainId, getIndexerChainName } from "../src/utils/chain";

async function main() {
  const { values } = parseArgs({ options: {
    from: { type: "string" }, to: { type: "string" }, out: { type: "string" },
    contracts: { type: "string" }, compare: { type: "string" },
    polls: { type: "string", default: "1" }, interval: { type: "string", default: "4000" },
    "max-blocks": { type: "string", default: "10000" }, "max-requests": { type: "string", default: "1000" },
    window: { type: "string", default: "10000" }, finality: { type: "string", default: "finalized" },
    serve: { type: "string" }, host: { type: "string", default: "127.0.0.1" },
    local: { type: "boolean" },
    help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("raw-log-prototype --from N --to N|latest --out PATH [--contracts Name,Name] [--compare INDEXER_URL] [--polls N] [--serve PORT] [--host HOST] [--finality finalized|depth:N] [--max-blocks N] [--max-requests N] [--window N] [--interval MS]\n--local --serve PORT replaces the local Ponder process: start block, poll, and finality come from the deployment env (hardhat uses depth:0 and a 100ms poll). Snapshot path is INDEXER_SNAPSHOT_PATH.\nUses existing deployment env and PONDER_RPC_URL_<chainId>. No env files are loaded automatically. Writes only a separate local snapshot; no database access.");
    return;
  }
  if (!values.local && (!values.from || !values.to || !values.out)) throw new Error("--from, --to, and --out are required; see --help");
  const positive = (value: string, max: number) => {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new Error("Invalid numeric option");
    return Number(value);
  };
  const catalog = await loadCatalog(values.contracts?.split(","));
  const local = values.local ? localServeConfig(process.env, earliestConfiguredBlock(catalog)) : undefined;
  const fromBlock = local ? local.fromBlock : BigInt(positive(values.from!, Number.MAX_SAFE_INTEGER));
  const maxBlocks = local ? undefined : BigInt(positive(values["max-blocks"], 100_000));
  const serving = values.serve != null || local != null;
  const polls = serving ? Number.POSITIVE_INFINITY : positive(values.polls, 100);
  const servePort = serving ? positive(values.serve ?? "42069", 65535) : undefined;
  const interval = local ? local.intervalMs : positive(values.interval, 60_000);
  const window = local ? local.window : BigInt(positive(values.window, 100_000));
  const maxRequests = local ? local.maxRequests : positive(values["max-requests"], 100_000);
  const finality = local ? local.finality : values.finality;
  const out = local ? local.out : values.out!;
  const to = local ? "latest" : values.to!;
  if (finality !== "finalized" && !/^depth:\d+$/.test(finality ?? "")) throw new Error("Invalid finality policy");
  if (values.host !== "127.0.0.1" && values.host !== "0.0.0.0") throw new Error("Host must be 127.0.0.1 or 0.0.0.0");
  const chainId = getIndexerChainId();
  const url = process.env[`PONDER_RPC_URL_${chainId}`] ?? (chainId === 31337 ? "http://localhost:8545" : undefined);
  if (!url) throw new Error("Missing configured RPC URL");
  const rpc = new MeteredRpc(url, maxRequests);
  const idle = serving && idleHeadCacheEnabled(getIndexerChainName())
    ? new PrototypeIdleGate(
      positive(process.env.INDEXER_IDLE_HEAD_INTERVAL_MS ?? String(DEFAULT_IDLE_HEAD_INTERVAL_MS), 3_600_000),
      positive(process.env.INDEXER_IDLE_HEAD_WAKE_MS ?? String(DEFAULT_IDLE_HEAD_WAKE_MS), 3_600_000),
    )
    : undefined;
  const unlock = await lockSnapshot(out);
  let server: Server | undefined;
  let stop = false;
  const onStop = () => { stop = true; };
  process.on("SIGINT", onStop);
  process.on("SIGTERM", onStop);
  try {
    let snapshot = await readSnapshot(out);
    const current = (): Snapshot | undefined => snapshot;
    if (servePort != null) {
      server = await listen(createPrototypeApp(current), servePort, (method, path) => idle?.note(method, path), values.host);
      console.error(json({ serving: `http://${values.host}:${servePort}`, routes: ["/api/events", "/api/sync", "/api/event-segments", "/api/published-data", "/api/project-read-demand", "/api/indexer-wake", "/status", "/graphql _meta"] }));
    }
    for (let poll = 0; poll < polls && !stop; poll++) {
      if (poll && idle && !idle.fast()) {
        await idle.wait(idle.idleIntervalMs);
        if (!idle.fast()) {
          console.log(json({ poll: poll + 1, skipped: "idle", indexedThrough: snapshot?.head.number, totalRpcRequests: rpc.calls }));
          continue;
        }
      } else if (poll) {
        await (idle ? idle.wait(interval) : delay(interval));
      }
      const before = { ...rpc.calls };
      const started = Date.now();
      try {
        const head = await readHeader(rpc, to === "latest" ? "latest" : BigInt(to));
        const depth = finality === "finalized" ? undefined : BigInt(finality.slice(6));
        if (depth !== undefined && depth > head.number) throw new Error("Finality depth exceeds the current head");
        const finalized = depth === undefined ? (await readHeader(rpc, "finalized")).number : head.number - depth;
        const span = head.number - fromBlock + 1n;
        const next = await syncWindow(rpc, catalog, { chainId, fromBlock, toBlock: head.number, finalizedBlock: finalized, maxBlocks: maxBlocks ?? span, window }, snapshot);
        const parity = values.compare ? await compareWithPonder(values.compare, catalog, next, !values.contracts) : undefined;
        if (parity && !parity.equal) {
          console.log(json({ parity, rpcRequests: rpc.calls }));
          throw new Error("Ponder parity mismatch; snapshot not committed");
        }
        await writeSnapshot(out, next);
        console.log(json({ poll: poll + 1, fromBlock, indexedThrough: next.head.number, finalizedThrough: next.durable.number,
          rows: next.rows.length, children: next.children.length, elapsedMs: Date.now() - started,
          rpcRequests: Object.fromEntries(Object.entries(rpc.calls).map(([method, count]) => [method, count - (before[method] ?? 0)])),
          totalRpcRequests: rpc.calls, parity }));
        snapshot = next;
      } catch (error) {
        if (!serving) throw error;
        console.error(json({ poll: poll + 1, error: error instanceof Error ? error.message : "sync failed", retry: true }));
      }
    }
  } finally {
    process.off("SIGINT", onStop);
    process.off("SIGTERM", onStop);
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await unlock();
    console.error(json({ totalRpcRequests: rpc.calls }));
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Prototype failed");
  process.exitCode = 1;
});
