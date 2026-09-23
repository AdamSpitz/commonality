import { BeliefsAbi } from "../../abis/BeliefsAbi";
import { ImplicationsAbi } from "../../abis/ImplicationsAbi";
import { AlignmentAttestationsAbi } from "../../abis/AlignmentAttestationsAbi";
import { AccountAssertionsAbi } from "../../abis/AccountAssertionsAbi";
import { TrustRegistryAbi } from "../../abis/TrustRegistryAbi";
import { MutableRefUpdaterAbi } from "../../abis/MutableRefUpdaterAbi";
import { NudgePublicationsAbi } from "../../abis/NudgePublicationsAbi";
import { PublishedDataAbi } from "../../abis/PublishedDataAbi";
import { BeneficiaryIdentityAbi } from "../../abis/BeneficiaryIdentityAbi";
import type { IndexerDeploymentContext } from "./ponderEnv";

/** Conceptspace contract registrations. Does not import funding ABIs. */
export function conceptspaceContracts(context: IndexerDeploymentContext) {
  const beliefs = context.getDeployments(
    "Beliefs",
    "BELIEFS_CONTRACT_ADDRESS",
    context.contractStartBlock("BELIEFS_START_BLOCK", context.startBlock),
  );
  const implications = context.getDeployments(
    "Implications",
    "IMPLICATIONS_CONTRACT_ADDRESS",
    context.contractStartBlock("IMPLICATIONS_START_BLOCK", context.startBlock),
  );
  const alignment = context.getDeployments(
    "AlignmentAttestations",
    process.env.ALIGNMENT_ATTESTATIONS_ADDRESS
      ? "ALIGNMENT_ATTESTATIONS_ADDRESS"
      : "ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS",
    context.contractStartBlock("ALIGNMENT_ATTESTATIONS_START_BLOCK", context.fundingPortalStartBlock),
  );
  const accountAssertions = context.getDeployments(
    "AccountAssertions",
    "ACCOUNT_ASSERTIONS_ADDRESS",
    context.contractStartBlock("ACCOUNT_ASSERTIONS_START_BLOCK", context.startBlock),
  );
  const trustRegistry = context.getDeployments(
    "TrustRegistry",
    "TRUST_REGISTRY_ADDRESS",
    context.contractStartBlock("TRUST_REGISTRY_START_BLOCK", context.startBlock),
  );
  const mutableRefUpdater = context.getDeployments(
    "MutableRefUpdater",
    "MUTABLE_REF_UPDATER_ADDRESS",
    context.contractStartBlock("MUTABLE_REF_UPDATER_START_BLOCK", context.startBlock),
  );
  const nudgePublications = context.getDeployments(
    "NudgePublications",
    "NUDGE_PUBLICATIONS_CONTRACT_ADDRESS",
    context.contractStartBlock("NUDGE_PUBLICATIONS_START_BLOCK", context.startBlock),
  );
  const publishedData = context.getDeployments(
    "PublishedData",
    "PUBLISHED_DATA_CONTRACT_ADDRESS",
    context.contractStartBlock("PUBLISHED_DATA_START_BLOCK", context.publishedDataStartBlock),
  );
  const beneficiaryIdentity = context.getDeployments(
    "BeneficiaryIdentity",
    "BENEFICIARY_IDENTITY_ADDRESS",
    context.contractStartBlock("BENEFICIARY_IDENTITY_START_BLOCK", context.startBlock),
  );

  return {
    Beliefs: {
      abi: BeliefsAbi,
      chain: context.chain,
      ...context.deploymentConfig(beliefs, context.startBlock),
    },
    Implications: {
      abi: ImplicationsAbi,
      chain: context.chain,
      ...context.deploymentConfig(implications, context.startBlock),
    },
    AlignmentAttestations: {
      abi: AlignmentAttestationsAbi,
      chain: context.chain,
      ...context.deploymentConfig(alignment, context.fundingPortalStartBlock),
    },
    AccountAssertions: {
      abi: AccountAssertionsAbi,
      chain: context.chain,
      ...context.deploymentConfig(accountAssertions, context.startBlock),
    },
    TrustRegistry: {
      abi: TrustRegistryAbi,
      chain: context.chain,
      ...context.deploymentConfig(trustRegistry, context.startBlock),
    },
    MutableRefUpdater: {
      abi: MutableRefUpdaterAbi,
      chain: context.chain,
      ...context.deploymentConfig(mutableRefUpdater, context.startBlock),
    },
    NudgePublications: {
      abi: NudgePublicationsAbi,
      chain: context.chain,
      ...context.deploymentConfig(nudgePublications, context.startBlock),
    },
    PublishedData: {
      abi: PublishedDataAbi,
      chain: context.chain,
      ...context.deploymentConfig(publishedData, context.publishedDataStartBlock),
    },
    BeneficiaryIdentity: {
      abi: BeneficiaryIdentityAbi,
      chain: context.chain,
      ...context.deploymentConfig(beneficiaryIdentity, context.startBlock),
    },
  } as const;
}
