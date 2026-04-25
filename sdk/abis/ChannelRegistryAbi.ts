// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const ChannelRegistryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "ChannelAlreadyCreatorControlled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "ChannelAlreadyVerified",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "ChannelNotCreatorControlled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "ChannelNotVerified",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "ContractNotCreatedByFactory",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "ContractNotThirdParty",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FactoryNotSet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFactoryAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidNonce",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVerifierAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVerifierSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyChannelOwnerCanTakeControl",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyChannelOwnerCanVeto",
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
    "inputs": [],
    "name": "ProofExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VetoWindowExpired",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ChannelControlTaken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ChannelVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "ContractVetoed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldFactory",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newFactory",
        "type": "address"
      }
    ],
    "name": "FactoryUpdated",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldVerifier",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newVerifier",
        "type": "address"
      }
    ],
    "name": "VerifierUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "channelOwner",
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
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "channelState",
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
    "inputs": [],
    "name": "factory",
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
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "isCreatorControlled",
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "isVerified",
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
        "name": "_factory",
        "type": "address"
      }
    ],
    "name": "setFactory",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "name": "setVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      }
    ],
    "name": "takeChannelControl",
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
  },
  {
    "inputs": [],
    "name": "verifier",
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
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "claimant",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "verifierSignature",
        "type": "bytes"
      }
    ],
    "name": "verifyChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "vetoContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vetoWindowDuration",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
