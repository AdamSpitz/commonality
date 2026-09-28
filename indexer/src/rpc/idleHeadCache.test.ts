import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createIdleHeadCache,
  idleHeadCacheEnabled,
  requestWakesIndexer,
} from "./idleHeadCache";

const head = (id: string, number = "0x10") =>
  JSON.stringify({ jsonrpc: "2.0", id, result: { number, hash: "0xabc" } });

test("idle cache is on for base sepolia unless disabled", () => {
  assert.equal(idleHeadCacheEnabled("base-sepolia", {}), true);
  assert.equal(idleHeadCacheEnabled("base-sepolia", { INDEXER_IDLE_HEAD_CACHE: "0" }), false);
  assert.equal(idleHeadCacheEnabled("mainnet", {}), false);
  assert.equal(idleHeadCacheEnabled("mainnet", { INDEXER_IDLE_HEAD_CACHE: "1" }), true);
});

test("client reads and the wake endpoint count; health and demand do not", () => {
  assert.equal(requestWakesIndexer("POST", "/graphql"), true);
  assert.equal(requestWakesIndexer("GET", "/api/events"), true);
  assert.equal(requestWakesIndexer("POST", "/api/indexer-wake"), true);
  assert.equal(requestWakesIndexer("GET", "/api/indexer-wake"), false);
  assert.equal(requestWakesIndexer("GET", "/health"), false);
  assert.equal(requestWakesIndexer("GET", "/ready"), false);
  assert.equal(requestWakesIndexer("GET", "/api/project-read-demand"), false);
});

test("replays the latest block while idle and refreshes after the interval", async () => {
  let clock = 1_000;
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = String(init?.body);
    calls.push(body);
    const id = JSON.parse(body).id;
    return new Response(head(id, calls.length === 1 ? "0x10" : "0x11"), { status: 200 });
  };
  const cache = createIdleHeadCache({ idleIntervalMs: 30_000, wakeMs: 60_000, now: () => clock, fetchImpl });
  const restore = cache.install();
  try {
    const first = await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", true] }),
    });
    assert.equal(JSON.parse(await first.text()).result.number, "0x10");

    clock = 10_000;
    const second = await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber", params: ["latest", true] }),
    });
    const replayed = JSON.parse(await second.text());
    assert.equal(replayed.id, 2);
    assert.equal(replayed.result.number, "0x10");
    assert.equal(calls.length, 1);

    clock = 31_000;
    const third = await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "eth_getBlockByNumber", params: ["latest", true] }),
    });
    assert.equal(JSON.parse(await third.text()).result.number, "0x11");
    assert.equal(calls.length, 2);
  } finally {
    restore();
  }
});

test("a wake lets the next poll through, then idle caching resumes", async () => {
  let clock = 5_000;
  let upstream = 0;
  const fetchImpl: typeof fetch = async () => {
    upstream += 1;
    return new Response(head(String(upstream), `0x${upstream.toString(16)}`), { status: 200 });
  };
  const cache = createIdleHeadCache({ idleIntervalMs: 30_000, wakeMs: 60_000, now: () => clock, fetchImpl });
  const restore = cache.install();
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", true] });
  try {
    await fetch("https://rpc.example", { method: "POST", body });
    clock = 6_000;
    await fetch("https://rpc.example", { method: "POST", body });
    assert.equal(upstream, 1);

    cache.noteWake();
    clock = 7_000;
    await fetch("https://rpc.example", { method: "POST", body });
    assert.equal(upstream, 2);

    clock = 66_000;
    await fetch("https://rpc.example", { method: "POST", body });
    assert.equal(upstream, 3);

    clock = 80_000;
    await fetch("https://rpc.example", { method: "POST", body });
    assert.equal(upstream, 3);
  } finally {
    restore();
  }
});

test("does not cache logs, historical blocks, or errors", async () => {
  let upstream = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    upstream += 1;
    const method = JSON.parse(String(init?.body)).method;
    if (method === "eth_getLogs") return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: [] }), { status: 200 });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: "nope" } }), { status: 200 });
  };
  const cache = createIdleHeadCache({ now: () => 1_000, fetchImpl });
  const restore = cache.install();
  try {
    await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [{}] }),
    });
    await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [{}] }),
    });
    await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["0x10", false] }),
    });
    await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", true] }),
    });
    await fetch("https://rpc.example", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", true] }),
    });
    assert.equal(upstream, 5);
  } finally {
    restore();
  }
});
