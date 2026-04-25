// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const ContentRegistryAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "existingContract",
        "type": "address"
      }
    ],
    "name": "ContentAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      }
    ],
    "name": "ContentNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidContentId",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "assuranceContract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "canonicalId",
        "type": "string"
      }
    ],
    "name": "ContentItemRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      }
    ],
    "name": "ContentItemReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      }
    ],
    "name": "contentContract",
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
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      }
    ],
    "name": "isRegistered",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
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
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "assuranceContract",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "canonicalId",
        "type": "string"
      }
    ],
    "name": "registerContent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      }
    ],
    "name": "releaseContent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
