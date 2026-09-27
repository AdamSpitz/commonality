import assert from "node:assert/strict";
import { test } from "node:test";
import { fundingContracts } from "./fundingContracts";
import { loadIndexerDeploymentContext } from "./ponderEnv";
import {
  conceptspaceContractNames,
  fundingContractNames,
  fundingIndexerRoutesEnabled,
  indexerContractEnabled,
  readIndexerContractCapability,
  selectIndexerContracts,
} from "./contractCapabilities";

test("fixed-controller projects are discovered and indexed from their factory deployment", () => {
  const address = "0x1111111111111111111111111111111111111111" as const;
  const context = loadIndexerDeploymentContext();
  context.getDeployments = (name) => name === "FixedControllerFactory"
    ? [{ address, startBlock: 123 }]
    : [];
  const contracts = fundingContracts(context);
  assert.equal(contracts.FixedControllerFactory.address, address);
  assert.equal(contracts.FixedControllerFactory.startBlock, 123);
  const market = contracts.FixedControllerAssuranceContract;
  assert.equal(market.startBlock, 123);
  assert.equal(market.address?.address, address);
  assert.equal(market.address?.event.name, "FixedControllerAssuranceCreated");
  assert.equal(market.address?.parameter, "assuranceContract");
  assert.ok(market.abi.some(item => item.type === "event" && item.name === "AssuranceContractInitialized"));
  assert.ok(market.abi.some(item => item.type === "event" && item.name === "ERC1155Bought"));
});

test("conceptspace indexing does not enable funding contracts", () => {
  assert.equal(indexerContractEnabled("BeneficiaryIdentity", "conceptspace"), true);
  assert.equal(indexerContractEnabled("DelegatableNotes", "conceptspace"), false);
  assert.equal(indexerContractEnabled("DelegatableNotes", "all"), true);
});

test("conceptspace and funding contract names do not overlap", () => {
  const funding = new Set<string>(fundingContractNames);
  for (const name of conceptspaceContractNames) {
    assert.equal(funding.has(name), false, name);
  }
});

test("conceptspace selection drops funding contracts", () => {
  const contracts = {
    Beliefs: { kind: "conceptspace" },
    Implications: { kind: "conceptspace" },
    AlignmentAttestations: { kind: "conceptspace" },
    AccountAssertions: { kind: "conceptspace" },
    TrustRegistry: { kind: "conceptspace" },
    MutableRefUpdater: { kind: "conceptspace" },
    NudgePublications: { kind: "conceptspace" },
    PublishedData: { kind: "conceptspace" },
    BeneficiaryIdentity: { kind: "conceptspace" },
    AssuranceContractFactory: { kind: "funding" },
    FixedControllerFactory: { kind: "funding" },
    FixedControllerAssuranceContract: { kind: "funding" },
    ProjectFactory: { kind: "funding" },
    ERC1155Factory: { kind: "funding" },
    AssuranceContract: { kind: "funding" },
    PremintingERC1155: { kind: "funding" },
    DelegatableNotes: { kind: "funding" },
    RecurringPledges: { kind: "funding" },
    NoteIntent: { kind: "funding" },
    ContentRegistry: { kind: "funding" },
    BeneficiaryRegistry: { kind: "funding" },
    BeneficiaryEscrow: { kind: "funding" },
    CreatorAssuranceContractFactory: { kind: "funding" },
    CreatorAssuranceVeto: { kind: "funding" },
    ProspectiveContentRoundFactory: { kind: "funding" },
    MaterializedContentTokens: { kind: "funding" },
    ProspectiveContentAssuranceContract: { kind: "funding" },
    CreatorAssuranceContract: { kind: "funding" },
  };

  const selected = selectIndexerContracts(contracts, "conceptspace");
  assert.deepEqual(Object.keys(selected), [...conceptspaceContractNames]);
  assert.deepEqual(Object.keys(selectIndexerContracts(contracts, "all")).sort(), Object.keys(contracts).sort());
});

test("INDEXER_CONTRACTS defaults to the shared feed", () => {
  assert.equal(readIndexerContractCapability(undefined), "all");
  assert.equal(readIndexerContractCapability(""), "all");
  assert.equal(readIndexerContractCapability("conceptspace"), "conceptspace");
  assert.throws(() => readIndexerContractCapability("funding"), /INDEXER_CONTRACTS/);
  assert.equal(fundingIndexerRoutesEnabled(undefined), true);
  assert.equal(fundingIndexerRoutesEnabled("conceptspace"), false);
});
