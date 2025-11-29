/**
 * ABI for ERC1155SecondaryMarket contract
 * Orderbook marketplace for ERC1155 tokens
 */

export const ERC1155SecondaryMarketAbi = [
  // Events
  {
    type: "event",
    name: "ERC1155SecondaryMarketCreated",
    inputs: [
      {
        name: "erc1155",
        type: "address",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    name: "SaleListingCreated",
    inputs: [
      {
        name: "saleListingId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "seller",
        type: "address",
        indexed: true,
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: false,
      },
      {
        name: "count",
        type: "uint256",
        indexed: false,
      },
      {
        name: "pricePerToken",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "SaleListingFulfilled",
    inputs: [
      {
        name: "saleListingId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
      },
      {
        name: "count",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "SaleListingCancelled",
    inputs: [
      {
        name: "saleListingId",
        type: "uint256",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    name: "BuyOrderCreated",
    inputs: [
      {
        name: "buyOrderId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: false,
      },
      {
        name: "count",
        type: "uint256",
        indexed: false,
      },
      {
        name: "pricePerToken",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "BuyOrderFulfilled",
    inputs: [
      {
        name: "buyOrderId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "seller",
        type: "address",
        indexed: true,
      },
      {
        name: "count",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "BuyOrderCancelled",
    inputs: [
      {
        name: "buyOrderId",
        type: "uint256",
        indexed: true,
      },
    ],
  },

  // Functions
  {
    type: "function",
    name: "createSaleListing",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
      {
        name: "count",
        type: "uint256",
      },
      {
        name: "pricePerToken",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fulfillSaleListing",
    stateMutability: "payable",
    inputs: [
      {
        name: "saleListingId",
        type: "uint256",
      },
      {
        name: "count",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fulfillSaleListingTo",
    stateMutability: "payable",
    inputs: [
      {
        name: "saleListingId",
        type: "uint256",
      },
      {
        name: "count",
        type: "uint256",
      },
      {
        name: "recipient",
        type: "address",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelSaleListing",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "saleListingId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createBuyOrder",
    stateMutability: "payable",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
      {
        name: "count",
        type: "uint256",
      },
      {
        name: "pricePerToken",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fulfillBuyOrder",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "buyOrderId",
        type: "uint256",
      },
      {
        name: "count",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelBuyOrder",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "buyOrderId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
] as const;
