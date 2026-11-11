import assert from "node:assert/strict";
import { test } from "node:test";
import { HOUR_MS, SpendLedger, SpendParked, spendLimitsFromEnv } from "./spend";

test("hardhat is ungated unless the guard is forced on", () => {
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "hardhat" }), null);
  assert.ok(spendLimitsFromEnv({ PONDER_CHAIN: "hardhat", INDEXER_SPEND_GUARD: "1" }));
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia", INDEXER_SPEND_GUARD: "0" }), null);
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia" })?.hourlyCu, 100_000);
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia" })?.catchupRequests, 0);
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia", INDEXER_CATCHUP: "1" })?.catchupRequests, 10_000);
  assert.equal(spendLimitsFromEnv({ PONDER_CHAIN: "base-sepolia", INDEXER_CATCHUP: "1" })?.catchupCu, 500_000);
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

test("catch-up allowance does not spend the quiet hourly ceiling", () => {
  const ledger = new SpendLedger({
    hourlyCu: 100, dailyCu: 10_000, hourlyRequests: 1, dailyRequests: 10,
    catchupRequests: 2, catchupCu: 200,
  });
  ledger.setCatchingUp(true);
  ledger.admit("eth_getLogs", 0);
  ledger.admit("eth_getBlockByNumber", 0);
  ledger.setCatchingUp(false);
  ledger.admit("eth_chainId", 0);
  assert.throws(() => ledger.admit("eth_chainId", 0), (error: unknown) => {
    assert.ok(error instanceof SpendParked);
    assert.match(error.reason, /hourly requests/);
    return true;
  });
});

test("an exhausted catch-up allowance falls back to the quiet ceiling", () => {
  const ledger = new SpendLedger({
    hourlyCu: 100_000, dailyCu: 1_000_000, hourlyRequests: 1, dailyRequests: 10,
    catchupRequests: 1, catchupCu: 500_000,
  });
  ledger.setCatchingUp(true);
  ledger.admit("eth_getLogs", 0);
  ledger.admit("eth_getBlockByNumber", 0);
  assert.throws(() => ledger.admit("eth_getLogs", 0), (error: unknown) => {
    assert.ok(error instanceof SpendParked);
    assert.match(error.reason, /hourly requests/);
    return true;
  });
});

test("catch-up allowance does not spend or wait on the quiet daily ceiling", () => {
  const ledger = new SpendLedger({
    hourlyCu: 100_000, dailyCu: 60, hourlyRequests: 10, dailyRequests: 1,
    catchupRequests: 4, catchupCu: 500,
  });
  ledger.admit("eth_getLogs", 0);
  ledger.setCatchingUp(true);
  ledger.admit("eth_getLogs", 0);
  ledger.admit("eth_getBlockByNumber", 0);
  ledger.setCatchingUp(false);
  assert.throws(() => ledger.admit("eth_chainId", 0), (error: unknown) => {
    assert.ok(error instanceof SpendParked);
    assert.match(error.reason, /daily/);
    return true;
  });
});

test("request ceiling parks even when CU weight is zero", () => {
  const ledger = new SpendLedger({ hourlyCu: 100_000, dailyCu: 1_000_000, hourlyRequests: 1, dailyRequests: 10 });
  ledger.admit("eth_chainId", 0);
  assert.throws(() => ledger.admit("eth_chainId", 0), SpendParked);
});
