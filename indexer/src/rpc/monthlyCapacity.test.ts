import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  installMonthlyCapacityGuard,
  isMonthlyCapacityError,
  operatorHintForMonthlyCapacity,
} from "./monthlyCapacity";

test("detects Alchemy monthly capacity 429 bodies", () => {
  assert.equal(
    isMonthlyCapacityError(
      "Monthly capacity limit exceeded. Visit https://dashboard.alchemy.com/settings/billing to upgrade your scaling policy for continued service.",
    ),
    true,
  );
  assert.equal(isMonthlyCapacityError("Your app has exceeded its compute units per second capacity."), false);
});

test("operator hint forbids schema bump and public RPC as the fix", () => {
  const hint = operatorHintForMonthlyCapacity();
  assert.match(hint, /monthly capacity/i);
  assert.match(hint, /DATABASE_SCHEMA/);
  assert.match(hint, /sepolia\.base\.org/);
  assert.match(hint, /START_BLOCK/);
});

test("fetch wrapper writes the flag on a monthly-capacity 429", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rpc-budget-"));
  const flagPath = join(dir, "flag");
  const seen: string[] = [];
  const restore = installMonthlyCapacityGuard({
    flagPath,
    warn: (message) => seen.push(message),
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          error: { code: 429, message: "Monthly capacity limit exceeded." },
        }),
        { status: 429 },
      ),
  });
  try {
    await fetch("https://example.invalid", {
      method: "POST",
      body: JSON.stringify({ method: "eth_chainId" }),
    });
    await fetch("https://example.invalid", {
      method: "POST",
      body: JSON.stringify({ method: "eth_blockNumber" }),
    });
  } finally {
    restore();
  }
  assert.equal(seen.length, 1);
  assert.match(readFileSync(flagPath, "utf8"), /T/);
  rmSync(dir, { recursive: true, force: true });
});
