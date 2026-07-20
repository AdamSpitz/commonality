// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const CreatorAssuranceContractFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_contentRegistry",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_channelRegistry",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_channelEscrow",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_erc1155Factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_marketplaceFactory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_conditionFactory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_paymentToken",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_contentIdSeparator",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ArrayLengthMismatch",
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
        "internalType": "bytes32",
        "name": "canonicalChannelIdHash",
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
    "name": "ChannelCreatorControlled",
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
    "name": "ChannelNotVerifiedOrControlled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConditionNotFailed",
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
    "name": "ContentAlreadyRegisteredForContract",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "EmptyContentSuffix",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientThirdPartyPurchase",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidChannelId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidContentIdSeparator",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currentTimestamp",
        "type": "uint256"
      }
    ],
    "name": "InvalidFundingDeadline",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFundingThreshold",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "InvalidInitialPurchaseIndex",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPaymentTokenAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidThirdPartyMaxDuration",
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
    "name": "NotCreatorContract",
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
    "name": "OnlyChannelOwnerCanCreateCreatorContract",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxDeadline",
        "type": "uint256"
      }
    ],
    "name": "ThirdPartyDeadlineTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ThresholdMustExceedInitialPurchase",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "contractAddress",
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
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isThirdParty",
        "type": "bool"
      }
    ],
    "name": "CreatorContractCreated",
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
    "name": "OwnershipTransferStarted",
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
        "indexed": false,
        "internalType": "uint256",
        "name": "oldValue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newValue",
        "type": "uint256"
      }
    ],
    "name": "ThirdPartyMaxDurationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldValue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newValue",
        "type": "uint256"
      }
    ],
    "name": "ThirdPartyMinPurchaseUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "channelEscrow",
    "outputs": [
      {
        "internalType": "contract ChannelEscrow",
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
    "name": "channelIdByContract",
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
    "name": "contentIdSeparator",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "contractCondition",
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
    "name": "contractERC1155",
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
            "internalType": "string[]",
            "name": "contentSuffixes",
            "type": "string[]"
          },
          {
            "internalType": "uint256[]",
            "name": "supplies",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "prices",
            "type": "uint256[]"
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
            "name": "erc1155MetadataUri",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "erc1155ContractUri",
            "type": "string"
          },
          {
            "internalType": "uint256[]",
            "name": "initialPurchaseIndices",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "initialPurchaseCounts",
            "type": "uint256[]"
          }
        ],
        "internalType": "struct CreatorAssuranceContractFactory.CreateContractParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createCreatorContract",
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
            "internalType": "string[]",
            "name": "contentSuffixes",
            "type": "string[]"
          },
          {
            "internalType": "uint256[]",
            "name": "supplies",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "prices",
            "type": "uint256[]"
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
            "name": "erc1155MetadataUri",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "erc1155ContractUri",
            "type": "string"
          },
          {
            "internalType": "uint256[]",
            "name": "initialPurchaseIndices",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "initialPurchaseCounts",
            "type": "uint256[]"
          }
        ],
        "internalType": "struct CreatorAssuranceContractFactory.CreateContractParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "createThirdPartyContract",
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
    "inputs": [],
    "name": "erc1155Factory",
    "outputs": [
      {
        "internalType": "contract PremintingERC1155Factory",
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
        "name": "primaryMarket",
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
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isThirdPartyCreated",
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
    "name": "marketplaceFactory",
    "outputs": [
      {
        "internalType": "contract MarketplaceFactory",
        "name": "",
        "type": "address"
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
    "inputs": [],
    "name": "pendingOwner",
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
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "releaseContentOnFailure",
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
        "internalType": "uint256",
        "name": "_maxDuration",
        "type": "uint256"
      }
    ],
    "name": "setThirdPartyMaxDuration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_minPurchase",
        "type": "uint256"
      }
    ],
    "name": "setThirdPartyMinPurchase",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "thirdPartyMaxDuration",
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
    "name": "thirdPartyMinPurchase",
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
