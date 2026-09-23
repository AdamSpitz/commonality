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
import { loadConceptspaceServiceHostConfigFromEnv } from "../src/conceptspaceEnvConfig.js";

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

  it("does not start funding services from the conceptspace env loader", () => {
    const config = loadConceptspaceServiceHostConfigFromEnv({
      SERVICE_HOST_PORT: "3011",
      IMPLICATION_ATTESTER_ENABLED: "false",
      IMPLICATION_FINDER_ENABLED: "false",
      IMPLICATION_GRAPH_NUDGER_ENABLED: "false",
      BRIDGE_CREATOR_ENABLED: "false",
      BEAT_MEMORY_ENABLED: "false",
      EXPLORER_CURATOR_ENABLED: "false",
      CONTENT_ATTESTER_ENABLED: "true",
      CONTENT_FINDER_ENABLED: "true",
      BEAT_AGENT_ENABLED: "true",
      RECURRING_PLEDGE_SCHEDULER_ENABLED: "true",
    });
    assert.deepStrictEqual(config.services, []);
  });

  it("rejects a funding instance on the conceptspace env loader", () => {
    assert.throws(
      () => loadConceptspaceServiceHostConfigFromEnv({
        SERVICE_HOST_INSTANCES: "content-attester",
      }),
      /funding service/,
    );
  });

  it("does not import funding packages from the conceptspace env loader", async () => {
    const source = await readFile(
      new URL("../src/conceptspaceEnvConfig.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of [
      "content-finder",
      "content-attester",
      "beat-agent",
      "recurringPledgeScheduler",
      "content-funding",
      "envConfig",
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `conceptspace env loader mentions ${forbidden}`,
      );
    }
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
