import assert from "node:assert/strict";
import { test } from "node:test";
import {
  conceptspaceContractNames,
  fundingContractNames,
  fundingIndexerRoutesEnabled,
  readIndexerContractCapability,
  selectIndexerContracts,
} from "./contractCapabilities";

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
