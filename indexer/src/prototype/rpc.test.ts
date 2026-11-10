import assert from "node:assert/strict";
import { test } from "node:test";
import { MeteredRpc, RpcFailure } from "./rpc";

test("meter counts retries, stops at hard budget, and does not retry monthly exhaustion", async () => {
  const previous = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++;
      const { id } = JSON.parse(String(init?.body));
      return calls === 1 ? new Response(JSON.stringify({ id, error: { code: -32005, message: "compute units per second" } }), { status: 429 }) :
        new Response(JSON.stringify({ id, result: "0x1" }));
    };
    const rpc = new MeteredRpc("https://example.invalid/secret", 2);
    assert.equal(await rpc.request("eth_chainId", []), "0x1");
    assert.deepEqual(rpc.calls, { eth_chainId: 2 });
    await assert.rejects(rpc.request("eth_chainId", []), /budget exhausted/);
    const flag = process.env.INDEXER_RPC_BUDGET_FLAG_PATH;
    process.env.INDEXER_RPC_BUDGET_FLAG_PATH = "/tmp/commonality-rpc-monthly-capacity-test-flag";
    globalThis.fetch = async () => { calls++; return new Response('{"error":{"message":"monthly capacity limit exceeded"}}', { status: 429 }); };
    calls = 0;
    await assert.rejects(new MeteredRpc("https://example.invalid/secret").request("eth_getLogs", []), /monthly capacity/);
    assert.equal(calls, 1);
    const { readFileSync, rmSync } = await import("node:fs");
    assert.match(readFileSync(process.env.INDEXER_RPC_BUDGET_FLAG_PATH, "utf8"), /T/);
    rmSync(process.env.INDEXER_RPC_BUDGET_FLAG_PATH);
    if (flag == null) delete process.env.INDEXER_RPC_BUDGET_FLAG_PATH;
    else process.env.INDEXER_RPC_BUDGET_FLAG_PATH = flag;
  } finally { globalThis.fetch = previous; }
});

test("range errors are classified without leaking upstream response or URL; invalid envelope fails", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"error":{"message":"query returned more than allowed; credential=secret"}}');
    await assert.rejects(new MeteredRpc("https://example.invalid/secret").request("eth_getLogs", []), error =>
      error instanceof RpcFailure && error.rangeLimit && !error.message.includes("secret"));
    globalThis.fetch = async () => new Response('{"id":999,"result":[]}');
    await assert.rejects(new MeteredRpc("https://example.invalid").request("eth_getLogs", []), /envelope/);
    globalThis.fetch = async () => { throw new Error("URL contained secret"); };
    await assert.rejects(new MeteredRpc("https://example.invalid/secret").request("eth_getLogs", []), error =>
      error instanceof Error && error.message === "RPC eth_getLogs transport failed");
  } finally { globalThis.fetch = previous; }
});
