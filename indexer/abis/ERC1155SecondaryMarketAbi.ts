/**
 * ABI for ERC1155SecondaryMarket contract
 * Orderbook marketplace for ERC1155 tokens
 */

export const ERC1155SecondaryMarketAbi = [
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
] as const;
