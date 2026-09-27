// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const FixedControllerFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "registry",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidRegistry",
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
      }
    ],
    "name": "FixedControllerAssuranceCreated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "beneficiaryRegistry",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
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
        "name": "recipient",
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
      },
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "registry",
        "type": "address"
      }
    ],
    "name": "create",
    "outputs": [
      {
        "internalType": "contract FixedControllerAssuranceContract",
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
