import assert from "node:assert/strict";
import { test } from "node:test";
import { HOUR_MS, SpendLedger, SpendParked, spendLimitsFromEnv } from "./spend";

test("hardhat is ungated unless the guard is forced on", () => {
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "hardhat" }), null);
  assert.ok(spendLimitsFromEnv({ PONDER_CHAIN: "hardhat", INDEXER_SPEND_GUARD: "1" }));
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia", INDEXER_SPEND_GUARD: "0" }), null);
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia" })?.hourlyCu, 100_000);
});

test("a CU burst parks and does not record the refused call", () => {
  let now = 1_000_000;
  const ledger = new SpendLedger({ hourlyCu: 100, dailyCu: 1_000, hourlyRequests: 10, dailyRequests: 10 }, () => now);
  ledger.admit("eth_getLogs", now);
  ledger.admit("eth_getBlockByNumber", now);
  assert.throws(() => ledger.admit("eth_getLogs", now), (error: unknown) => {
    assert.ok(error instanceof SpendParked);
    assert.match(error.reason, /hourly CU/);
    assert.equal(error.untilMs, now + HOUR_MS);
    return true;
  });
  now += HOUR_MS;
  ledger.admit("eth_getLogs", now);
});

test("request ceiling parks even when CU weight is zero", () => {
  const ledger = new SpendLedger({ hourlyCu: 100_000, dailyCu: 1_000_000, hourlyRequests: 1, dailyRequests: 10 });
  ledger.admit("eth_chainId", 0);
  assert.throws(() => ledger.admit("eth_chainId", 0), SpendParked);
});
