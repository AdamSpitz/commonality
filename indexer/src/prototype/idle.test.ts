import assert from "node:assert/strict";
import test from "node:test";
import { PrototypeIdleGate, prototypeRequestOpensFastPoll } from "./idle";

test("prototype fast-poll ignores liveness probes and accepts readers", () => {
  assert.equal(prototypeRequestOpensFastPoll("POST", "/graphql"), false);
  assert.equal(prototypeRequestOpensFastPoll("GET", "/api/events"), true);
  assert.equal(prototypeRequestOpensFastPoll("POST", "/api/indexer-wake"), true);
  assert.equal(prototypeRequestOpensFastPoll("GET", "/api/indexer-wake"), false);
  assert.equal(prototypeRequestOpensFastPoll("GET", "/api/project-read-demand"), false);
});

test("a reader does not abort the fast-poll interval", async () => {
  const gate = new PrototypeIdleGate(30_000, 60_000);
  let settled = false;
  const pending = gate.wait(50, { interruptible: false }).then(() => { settled = true; });
  gate.note("GET", "/api/events");
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(settled, false);
  await pending;
  assert.equal(settled, true);
});

test("idle gate stays closed until a reader opens it, and that wait returns early", async () => {
  let now = 1_000;
  const gate = new PrototypeIdleGate(30_000, 60_000, () => now);
  assert.equal(gate.fast(), false);
  const pending = gate.wait(30_000);
  gate.note("GET", "/api/events?chainId=1");
  await pending;
  assert.equal(gate.fast(), true);
  now = 61_000;
  assert.equal(gate.fast(), false);
  gate.note("POST", "/graphql");
  assert.equal(gate.fast(), false);
});
