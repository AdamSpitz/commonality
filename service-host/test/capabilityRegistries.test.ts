import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { describe, it } from "mocha";
import {
  conceptspaceServiceKinds,
  fundingServiceKinds,
  serviceKinds,
} from "../src/config.js";
import { conceptspaceServiceFactories } from "../src/conceptspaceServiceRegistry.js";
import { fundingServiceFactories } from "../src/fundingServiceRegistry.js";
import { serviceFactories } from "../src/serviceRegistry.js";

describe("capability service registries", () => {
  it("partitions every hosted kind into conceptspace or funding", () => {
    const conceptspace = new Set<string>(conceptspaceServiceKinds);
    const funding = new Set<string>(fundingServiceKinds);
    assert.deepStrictEqual(
      [...conceptspace].filter((kind) => funding.has(kind)),
      [],
    );
    assert.deepStrictEqual(
      [...serviceKinds].sort(),
      [...conceptspace, ...funding].sort(),
    );
  });

  it("keeps the pledge scheduler out of the conceptspace factory map", () => {
    assert.deepStrictEqual(
      Object.keys(conceptspaceServiceFactories).sort(),
      [...conceptspaceServiceKinds].sort(),
    );
    assert.equal(
      "recurring-pledge-scheduler" in conceptspaceServiceFactories,
      false,
    );
    assert.equal(
      "recurring-pledge-scheduler" in fundingServiceFactories,
      true,
    );
    assert.equal(Object.keys(serviceFactories).length, serviceKinds.length);
  });

  it("does not import funding packages from the conceptspace registry", async () => {
    const source = await readFile(
      new URL("../src/conceptspaceServiceRegistry.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of [
      "content-finder",
      "content-attester",
      "beat-agent",
      "recurringPledgeScheduler",
      "content-funding",
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `conceptspace registry mentions ${forbidden}`,
      );
    }
  });
});
