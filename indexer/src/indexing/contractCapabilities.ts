/**
 * Which contract families a Ponder process indexes.
 *
 * `all` is the shared production feed. `conceptspace` omits assurance,
 * delegation, and content-funding contracts. Alignment attestations stay
 * with Conceptspace: the contract is about arbitrary subjects, not projects.
 */
export const indexerContractCapabilities = ["all", "conceptspace"] as const;

export type IndexerContractCapability = (typeof indexerContractCapabilities)[number];

export const conceptspaceContractNames = [
  "Beliefs",
  "Implications",
  "AlignmentAttestations",
  "AccountAssertions",
  "TrustRegistry",
  "MutableRefUpdater",
  "NudgePublications",
  "PublishedData",
  "BeneficiaryIdentity",
] as const;

export const fundingContractNames = [
  "AssuranceContractFactory",
  "ProjectFactory",
  "ERC1155Factory",
  "AssuranceContract",
  "PremintingERC1155",
  "DelegatableNotes",
  "RecurringPledges",
  "NoteIntent",
  "ContentRegistry",
  "BeneficiaryRegistry",
  "BeneficiaryEscrow",
  "CreatorAssuranceContractFactory",
  "CreatorAssuranceVeto",
  "ProspectiveContentRoundFactory",
  "MaterializedContentTokens",
  "ProspectiveContentAssuranceContract",
  "CreatorAssuranceContract",
] as const;

const conceptspaceNames = new Set<string>(conceptspaceContractNames);
const fundingNames = new Set<string>(fundingContractNames);

/** Funding HTTP routes belong on the shared feed, not a Conceptspace-only process. */
export function fundingIndexerRoutesEnabled(
  raw: string | undefined = process.env.INDEXER_CONTRACTS,
): boolean {
  return readIndexerContractCapability(raw) === "all";
}

export function readIndexerContractCapability(
  raw: string | undefined,
): IndexerContractCapability {
  const value = raw === undefined || raw === "" ? "all" : raw;
  if (value === "all" || value === "conceptspace") return value;
  throw new Error(
    `Invalid INDEXER_CONTRACTS "${raw}". Expected one of: ${indexerContractCapabilities.join(", ")}.`,
  );
}

/** Every registered contract belongs to exactly one capability. */
export function assertIndexerContractPartition(names: readonly string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    const inConceptspace = conceptspaceNames.has(name);
    const inFunding = fundingNames.has(name);
    if (inConceptspace === inFunding) {
      throw new Error(
        `Indexer contract "${name}" must be listed in exactly one of conceptspaceContractNames or fundingContractNames.`,
      );
    }
    seen.add(name);
  }
  for (const name of [...conceptspaceNames, ...fundingNames]) {
    if (!seen.has(name)) {
      throw new Error(
        `Indexer contract "${name}" is classified but not registered in ponder.config.ts.`,
      );
    }
  }
}

export function selectIndexerContracts<T extends Record<string, unknown>>(
  contracts: T,
  capability: IndexerContractCapability,
): T {
  const names = Object.keys(contracts);
  assertIndexerContractPartition(names);
  if (capability === "all") return contracts;
  const selected: Record<string, unknown> = {};
  for (const name of names) {
    if (conceptspaceNames.has(name)) selected[name] = contracts[name];
  }
  return selected as T;
}
