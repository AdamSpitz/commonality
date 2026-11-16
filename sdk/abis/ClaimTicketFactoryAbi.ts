// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const ClaimTicketFactoryAbi = [
  {
    "inputs": [],
    "name": "InvalidTransitAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "assuranceContract",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "transitAddress",
        "type": "address"
      }
    ],
    "name": "ClaimTicketAssuranceCreated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "UNCLAIMED_PROCEEDS_WINDOW",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "transitAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "paymentToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "erc1155Addr",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "projectMetadataCid",
        "type": "string"
      }
    ],
    "name": "create",
    "outputs": [
      {
        "internalType": "contract ClaimTicketAssuranceContract",
        "name": "ac",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isDeployedPrimaryMarket",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
