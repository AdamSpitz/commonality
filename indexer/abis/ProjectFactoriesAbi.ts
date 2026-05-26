/**
 * ABIs for project support factory contracts
 * These emit events when new projects, tokens, and marketplaces are created
 */

export const PremintingERC1155FactoryAbi = [
  {
    type: "event",
    name: "LazyGivingERC1155ContractCreated",
    inputs: [
      {
        name: "erc1155",
        type: "address",
        indexed: true,
      },
    ],
  },
] as const;

export const MarketplaceFactoryAbi = [
  {
    type: "event",
    name: "LazyGivingERC1155SecondaryMarketCreated",
    inputs: [
      {
        name: "marketplace",
        type: "address",
        indexed: true,
      },
    ],
  },
] as const;

export const AssuranceContractFactoryAbi = [
  {
    type: "event",
    name: "LazyGivingAssuranceContractCreated",
    inputs: [
      {
        name: "assuranceContract",
        type: "address",
        indexed: true,
      },
    ],
  },
] as const;

export const ValueThresholdConditionFactoryAbi = [
  {
    type: "event",
    name: "ValueThresholdConditionCreated",
    inputs: [
      {
        name: "condition",
        type: "address",
        indexed: true,
      },
    ],
  },
  {
    type: "function",
    name: "createCondition",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "progressSource",
        type: "address",
      },
      {
        name: "threshold",
        type: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },
] as const;
