/**
 * ABIs for Pubstarter factory contracts
 * These emit events when new projects, tokens, and marketplaces are created
 */

export const PremintingERC1155FactoryAbi = [
  {
    type: "event",
    name: "PubstarterERC1155ContractCreated",
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
    name: "PubstarterERC1155SecondaryMarketCreated",
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
    name: "PubstarterAssuranceContractCreated",
    inputs: [
      {
        name: "assuranceContract",
        type: "address",
        indexed: true,
      },
    ],
  },
] as const;
