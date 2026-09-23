import { factory } from "ponder";
import { AssuranceContractFactoryAbi } from "../../abis/AssuranceContractFactoryAbi";
import { PremintingERC1155FactoryAbi } from "../../abis/PremintingERC1155FactoryAbi";
import { ProjectFactoryAbi } from "../../abis/ProjectFactoryAbi";
import { AssuranceContractAbi } from "../../abis/AssuranceContractAbi";
import { PremintingERC1155Abi } from "../../abis/PremintingERC1155Abi";
import { DelegatableNotesAbi } from "../../abis/DelegatableNotesAbi";
import { RecurringPledgesAbi } from "../../abis/RecurringPledgesAbi";
import { NoteIntentAbi } from "../../abis/NoteIntentAbi";
import { ContentRegistryAbi } from "../../abis/ContentRegistryAbi";
import { BeneficiaryRegistryAbi } from "../../abis/BeneficiaryRegistryAbi";
import { BeneficiaryEscrowAbi } from "../../abis/BeneficiaryEscrowAbi";
import { CreatorAssuranceContractFactoryAbi } from "../../abis/CreatorAssuranceContractFactoryAbi";
import { CreatorAssuranceVetoAbi } from "../../abis/CreatorAssuranceVetoAbi";
import { ProspectiveContentRoundFactoryAbi } from "../../abis/ProspectiveContentRoundFactoryAbi";
import { MaterializedContentTokensAbi } from "../../abis/MaterializedContentTokensAbi";
import type { IndexerDeploymentContext } from "./ponderEnv";

const assuranceContractCreatedEvent = AssuranceContractFactoryAbi.find(
  (item) => item.type === "event" && item.name === "LazyGivingAssuranceContractCreated",
)!;
const erc1155ContractCreatedEvent = PremintingERC1155FactoryAbi.find(
  (item) => item.type === "event" && item.name === "LazyGivingERC1155ContractCreated",
)!;
const prospectiveRoundCreatedEvent = ProspectiveContentRoundFactoryAbi.find(
  (item) => item.type === "event" && item.name === "ProspectiveRoundCreated",
)!;
const prospectiveRoundMaterializedEvent = ProspectiveContentRoundFactoryAbi.find(
  (item) => item.type === "event" && item.name === "ProspectiveRoundMaterialized",
)!;
const creatorContractCreatedEvent = CreatorAssuranceContractFactoryAbi.find(
  (item) => item.type === "event" && item.name === "CreatorContractCreated",
)!;

/** Funding contract registrations. Imported by the shared feed only. */
export function fundingContracts(context: IndexerDeploymentContext) {
  const assuranceFactory = context.getDeployments(
    "AssuranceContractFactory",
    "ASSURANCE_CONTRACT_FACTORY_ADDRESS",
    context.contractStartBlock("ASSURANCE_CONTRACT_FACTORY_START_BLOCK", context.lazyGivingStartBlock),
  );
  const projectFactory = context.getDeployments(
    "ProjectFactory",
    "PROJECT_FACTORY_ADDRESS",
    context.contractStartBlock("PROJECT_FACTORY_START_BLOCK", context.lazyGivingStartBlock),
  );
  const erc1155Factory = context.getDeployments(
    "ERC1155Factory",
    "ERC1155_FACTORY_ADDRESS",
    context.contractStartBlock("ERC1155_FACTORY_START_BLOCK", context.lazyGivingStartBlock),
  );
  const delegatableNotes = context.getDeployments(
    "DelegatableNotes",
    process.env.DELEGATABLE_NOTES_ADDRESS ? "DELEGATABLE_NOTES_ADDRESS" : "DELEGATABLE_NOTES_CONTRACT_ADDRESS",
    context.contractStartBlock("DELEGATABLE_NOTES_START_BLOCK", context.delegationStartBlock),
  );
  const recurringPledges = context.getDeployments(
    "RecurringPledges",
    "RECURRING_PLEDGES_ADDRESS",
    context.contractStartBlock("RECURRING_PLEDGES_START_BLOCK", context.delegationStartBlock),
  );
  const noteIntent = context.getDeployments(
    "NoteIntent",
    "NOTE_INTENT_ADDRESS",
    context.contractStartBlock("NOTE_INTENT_START_BLOCK", context.delegationStartBlock),
  );
  const contentRegistry = context.getDeployments(
    "ContentRegistry",
    "CONTENT_REGISTRY_ADDRESS",
    context.contractStartBlock("CONTENT_REGISTRY_START_BLOCK", context.contentFundingStartBlock),
  );
  const beneficiaryRegistry = context.getDeployments(
    "BeneficiaryRegistry",
    "BENEFICIARY_REGISTRY_ADDRESS",
    context.contractStartBlock("BENEFICIARY_REGISTRY_START_BLOCK", context.contentFundingStartBlock),
  );
  const beneficiaryEscrow = context.getDeployments(
    "BeneficiaryEscrow",
    "BENEFICIARY_ESCROW_ADDRESS",
    context.contractStartBlock("BENEFICIARY_ESCROW_START_BLOCK", context.contentFundingStartBlock),
  );
  const creatorFactory = context.getDeployments(
    "CreatorAssuranceContractFactory",
    "CREATOR_CONTRACT_FACTORY_ADDRESS",
    context.contractStartBlock("CREATOR_CONTRACT_FACTORY_START_BLOCK", context.contentFundingStartBlock),
  );
  const creatorVeto = context.getDeployments(
    "CreatorAssuranceVeto",
    "CREATOR_ASSURANCE_VETO_ADDRESS",
    context.contractStartBlock("CREATOR_ASSURANCE_VETO_START_BLOCK", context.contentFundingStartBlock),
  );
  const prospectiveFactory = context.getDeployments(
    "ProspectiveContentRoundFactory",
    "PROSPECTIVE_CONTENT_ROUND_FACTORY_ADDRESS",
    context.contractStartBlock("PROSPECTIVE_CONTENT_ROUND_FACTORY_START_BLOCK", context.contentFundingStartBlock),
  );

  const assuranceFactoryAddress = context.factoryAddress(assuranceFactory);
  const erc1155FactoryAddress = context.factoryAddress(erc1155Factory);
  const prospectiveFactoryAddress = context.factoryAddress(prospectiveFactory);
  const creatorFactoryAddress = context.factoryAddress(creatorFactory);

  return {
    AssuranceContractFactory: {
      abi: AssuranceContractFactoryAbi,
      chain: context.chain,
      ...context.deploymentConfig(assuranceFactory, context.lazyGivingStartBlock),
    },
    ProjectFactory: {
      abi: ProjectFactoryAbi,
      chain: context.chain,
      ...context.deploymentConfig(projectFactory, context.lazyGivingStartBlock),
    },
    ERC1155Factory: {
      abi: PremintingERC1155FactoryAbi,
      chain: context.chain,
      ...context.deploymentConfig(erc1155Factory, context.lazyGivingStartBlock),
    },
    AssuranceContract: {
      abi: AssuranceContractAbi,
      chain: context.chain,
      address: assuranceFactoryAddress
        ? factory({
            ...assuranceFactoryAddress,
            event: assuranceContractCreatedEvent,
            parameter: "assuranceContract",
          })
        : undefined,
      startBlock: context.deploymentStartBlock(assuranceFactory, context.lazyGivingStartBlock),
    },
    PremintingERC1155: {
      abi: PremintingERC1155Abi,
      chain: context.chain,
      address: erc1155FactoryAddress
        ? factory({
            ...erc1155FactoryAddress,
            event: erc1155ContractCreatedEvent,
            parameter: "erc1155",
          })
        : undefined,
      startBlock: context.deploymentStartBlock(erc1155Factory, context.lazyGivingStartBlock),
    },
    DelegatableNotes: {
      abi: DelegatableNotesAbi,
      chain: context.chain,
      ...context.deploymentConfig(delegatableNotes, context.delegationStartBlock),
    },
    RecurringPledges: {
      abi: RecurringPledgesAbi,
      chain: context.chain,
      ...context.deploymentConfig(recurringPledges, context.delegationStartBlock),
    },
    NoteIntent: {
      abi: NoteIntentAbi,
      chain: context.chain,
      ...context.deploymentConfig(noteIntent, context.delegationStartBlock),
    },
    ContentRegistry: {
      abi: ContentRegistryAbi,
      chain: context.chain,
      ...context.deploymentConfig(contentRegistry, context.contentFundingStartBlock),
    },
    BeneficiaryRegistry: {
      abi: BeneficiaryRegistryAbi,
      chain: context.chain,
      ...context.deploymentConfig(beneficiaryRegistry, context.contentFundingStartBlock),
    },
    BeneficiaryEscrow: {
      abi: BeneficiaryEscrowAbi,
      chain: context.chain,
      ...context.deploymentConfig(beneficiaryEscrow, context.contentFundingStartBlock),
    },
    CreatorAssuranceContractFactory: {
      abi: CreatorAssuranceContractFactoryAbi,
      chain: context.chain,
      ...context.deploymentConfig(creatorFactory, context.contentFundingStartBlock),
    },
    CreatorAssuranceVeto: {
      abi: CreatorAssuranceVetoAbi,
      chain: context.chain,
      ...context.deploymentConfig(creatorVeto, context.contentFundingStartBlock),
    },
    ProspectiveContentRoundFactory: {
      abi: ProspectiveContentRoundFactoryAbi,
      chain: context.chain,
      ...context.deploymentConfig(prospectiveFactory, context.contentFundingStartBlock),
    },
    MaterializedContentTokens: {
      abi: MaterializedContentTokensAbi,
      chain: context.chain,
      address: prospectiveFactoryAddress
        ? factory({
            ...prospectiveFactoryAddress,
            event: prospectiveRoundMaterializedEvent,
            parameter: "tokenContract",
          })
        : undefined,
      startBlock: context.deploymentStartBlock(prospectiveFactory, context.contentFundingStartBlock),
    },
    ProspectiveContentAssuranceContract: {
      abi: AssuranceContractAbi,
      chain: context.chain,
      address: prospectiveFactoryAddress
        ? factory({
            ...prospectiveFactoryAddress,
            event: prospectiveRoundCreatedEvent,
            parameter: "round",
          })
        : undefined,
      startBlock: context.deploymentStartBlock(prospectiveFactory, context.contentFundingStartBlock),
    },
    CreatorAssuranceContract: {
      abi: AssuranceContractAbi,
      chain: context.chain,
      address: creatorFactoryAddress
        ? factory({
            ...creatorFactoryAddress,
            event: creatorContractCreatedEvent,
            parameter: "contractAddress",
          })
        : undefined,
      startBlock: context.deploymentStartBlock(creatorFactory, context.contentFundingStartBlock),
    },
  } as const;
}
