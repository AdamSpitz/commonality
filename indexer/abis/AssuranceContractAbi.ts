/**
 * ABI for MultiERC1155_AssuranceContract
 * Combines events from AssuranceContract, ERC1155PrimaryMarket, and ContractMetadata
 */

export const AssuranceContractAbi = [
  // From AssuranceContract.sol
  {
    type: "event",
    name: "AssuranceContractInitialized",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
      },
      {
        name: "threshold",
        type: "uint256",
        indexed: false,
      },
      {
        name: "deadline",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "AssuranceContractWithdrawal",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
      },
    ],
  },

  // From ERC1155PrimaryMarket.sol
  {
    type: "event",
    name: "ERC1155Offered",
    inputs: [
      {
        name: "erc1155Addr",
        type: "address",
        indexed: true,
      },
      {
        name: "id",
        type: "uint256",
        indexed: false,
      },
      {
        name: "price",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "ERC1155Bought",
    inputs: [
      {
        name: "participant",
        type: "address",
        indexed: true,
      },
      {
        name: "erc1155Addr",
        type: "address",
        indexed: true,
      },
      {
        name: "totalCost",
        type: "uint256",
        indexed: false,
      },
      {
        name: "ids",
        type: "uint256[]",
        indexed: false,
      },
      {
        name: "counts",
        type: "uint256[]",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "ERC1155Sold",
    inputs: [
      {
        name: "participant",
        type: "address",
        indexed: true,
      },
      {
        name: "erc1155Addr",
        type: "address",
        indexed: true,
      },
      {
        name: "totalCost",
        type: "uint256",
        indexed: false,
      },
      {
        name: "ids",
        type: "uint256[]",
        indexed: false,
      },
      {
        name: "counts",
        type: "uint256[]",
        indexed: false,
      },
    ],
  },

  // From ContractMetadata.sol (via ERC7572)
  {
    type: "event",
    name: "ContractMetadataUpdated",
    inputs: [
      {
        name: "uri",
        type: "string",
        indexed: false,
      },
    ],
  },
] as const;
