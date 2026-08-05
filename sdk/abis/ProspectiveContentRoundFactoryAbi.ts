// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const ProspectiveContentRoundFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "channels",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "contents",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "conditions",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "settlementToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "authority",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "roundHelper",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "materializedHelper",
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
      },
      {
        "internalType": "bytes32",
        "name": "canonicalHash",
        "type": "bytes32"
      }
    ],
    "name": "ChannelCanonicalIdMismatch",
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
    "inputs": [],
    "name": "InvalidChannelId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFundingTerms",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReceiptTerms",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "round",
        "type": "address"
      }
    ],
    "name": "MaterializedCollectionAlreadyCreated",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "round",
        "type": "address"
      }
    ],
    "name": "NotProspectiveRound",
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
    "name": "OnlyCurrentChannelOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "round",
        "type": "address"
      }
    ],
    "name": "ProspectiveRoundNotSuccessful",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "canonicalId",
        "type": "string"
      }
    ],
    "name": "UnsupportedChannelCanonicalId",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "round",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "channelId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiptToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "receiptTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "condition",
        "type": "address"
      }
    ],
    "name": "ProspectiveRoundCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "round",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenContract",
        "type": "address"
      }
    ],
    "name": "ProspectiveRoundMaterialized",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "channelIdByRound",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "channelRegistry",
    "outputs": [
      {
        "internalType": "contract ChannelRegistry",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "conditionByRound",
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
    "name": "conditionFactory",
    "outputs": [
      {
        "internalType": "contract ValueThresholdConditionFactory",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contentRegistry",
    "outputs": [
      {
        "internalType": "contract ContentRegistry",
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
        "name": "round",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "metadataUri",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contractUri",
        "type": "string"
      }
    ],
    "name": "createMaterializedContentTokens",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "channelId",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "channelCanonicalId",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "supply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "threshold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "metadataCid",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "receiptMetadataUri",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "receiptContractUri",
            "type": "string"
          }
        ],
        "internalType": "struct ProspectiveContentRoundFactory.CreateRoundParams",
        "name": "p",
        "type": "tuple"
      }
    ],
    "name": "createProspectiveRound",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
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
    "name": "isProspectiveRound",
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
    "name": "materializedDeploymentHelper",
    "outputs": [
      {
        "internalType": "contract MaterializedContentDeploymentHelper",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "materializedTokenByRound",
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
    "name": "paymentToken",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "receiptTokenByRound",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "receiptTokenIdByRound",
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
    "inputs": [],
    "name": "registrarAuthority",
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
    "name": "roundDeploymentHelper",
    "outputs": [
      {
        "internalType": "contract ProspectiveRoundDeploymentHelper",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
