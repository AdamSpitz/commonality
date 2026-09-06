import assert from "node:assert/strict";
import { test } from "node:test";
import {
  installEthGetLogsRangeGuard,
  isEthGetLogsRangeOrSizeError,
  operatorHintForGetLogsRangeError,
} from "./ethGetLogsRangeGuard";

test("detects Alchemy-style range and size errors", () => {
  assert.equal(isEthGetLogsRangeOrSizeError("query exceeds max block range 2000"), true);
  assert.equal(
    isEthGetLogsRangeOrSizeError("Log response size exceeded. Try a smaller block range."),
    true,
  );
  assert.equal(isEthGetLogsRangeOrSizeError("block range is too wide"), true);
  assert.equal(
    isEthGetLogsRangeOrSizeError("query returned more than 10000 results"),
    true,
  );
});

test("does not treat CUPS or prune errors as range/size", () => {
  assert.equal(
    isEthGetLogsRangeOrSizeError(
      "Your app has exceeded its compute units per second capacity.",
    ),
    false,
  );
  assert.equal(
    isEthGetLogsRangeOrSizeError("pruned history unavailable: requested 42768673"),
    false,
  );
});

test("operator hint names the env var and the next range to try", () => {
  const hint = operatorHintForGetLogsRangeError(10000);
  assert.match(hint, /PONDER_ETH_GET_LOGS_BLOCK_RANGE=10000/);
  assert.match(hint, /1000/);
  assert.match(hint, /deploy_only/);
  assert.match(hint, /START_BLOCK/);
  assert.match(hint, /sepolia\.base\.org/);
});

test("fetch wrapper warns once on a range error for eth_getLogs", async () => {
  const seen: string[] = [];
  const restore = installEthGetLogsRangeGuard({
    configuredRange: 10000,
    warn: (message) => seen.push(message),
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: "block range too large" } }), {
        status: 200,
      }),
  });
  try {
    await fetch("https://example.invalid", {
      method: "POST",
      body: JSON.stringify({ method: "eth_getLogs", params: [] }),
    });
    await fetch("https://example.invalid", {
      method: "POST",
      body: JSON.stringify({ method: "eth_getLogs", params: [] }),
    });
  } finally {
    restore();
  }
  assert.equal(seen.length, 1);
  assert.match(seen[0]!, /PONDER_ETH_GET_LOGS_BLOCK_RANGE=10000/);
});

test("fetch wrapper ignores non-getLogs RPC errors", async () => {
  const seen: string[] = [];
  const restore = installEthGetLogsRangeGuard({
    configuredRange: 10000,
    warn: (message) => seen.push(message),
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: "block range too large" } }), {
        status: 200,
      }),
  });
  try {
    await fetch("https://example.invalid", {
      method: "POST",
      body: JSON.stringify({ method: "eth_blockNumber" }),
    });
  } finally {
    restore();
  }
  assert.equal(seen.length, 0);
});
