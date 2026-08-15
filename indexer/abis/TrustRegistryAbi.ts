// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const TrustRegistryAbi = [
  {
    "inputs": [],
    "name": "ArrayLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotTrustSelf",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidScore",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "truster",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "trustee",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "score",
        "type": "uint8"
      }
    ],
    "name": "TrustSet",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "truster",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "trustee",
        "type": "address"
      }
    ],
    "name": "getTrust",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "trustee",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "score",
        "type": "uint8"
      }
    ],
    "name": "setTrust",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "trustees",
        "type": "address[]"
      },
      {
        "internalType": "uint8[]",
        "name": "scores",
        "type": "uint8[]"
      }
    ],
    "name": "setTrustBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "trustScores",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
