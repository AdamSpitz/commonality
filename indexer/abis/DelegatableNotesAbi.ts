export const DelegatableNotesAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_primaryMarketFactory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_secondaryMarketFactory",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AmountMustBeGreaterThanZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ArrayLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CallerNotInChain",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotDelegateToZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChainTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CircularDelegationDetected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ETHMustUseERC20Type",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ETHTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyChain",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidChain",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDelegationAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPaymentAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPaymentTokenForPurchase",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPurchaseShares",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ListingDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MustSendETH",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoETHForERC1155",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoETHForERC20",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotNoteOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRootNoteOrNotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoteDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoteIsNotReceiptToken",
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
    "name": "ReentrancyGuardReentrantCall",
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
    "inputs": [],
    "name": "UnauthorizedMarket",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedRecurringPledgeRegistry",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "originalLeafId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "splitLeafId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "remainderLeafId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "splitAmount",
        "type": "uint256"
      }
    ],
    "name": "ChainSplit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "erc1155Contract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "tokenIds",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "counts",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalCost",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "inputNoteIds",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "outputNoteIds",
        "type": "uint256[]"
      }
    ],
    "name": "ERC1155Purchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum DelegatableNotes.TokenType",
        "name": "tokenType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "FundsReclaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountConsumed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remainingAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "deleted",
        "type": "bool"
      }
    ],
    "name": "NoteConsumed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum DelegatableNotes.TokenType",
        "name": "tokenType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "NoteCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "parentNoteId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "childNoteId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "NoteDelegated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "revoker",
        "type": "address"
      }
    ],
    "name": "NoteRevoked",
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
        "name": "primaryMarketFactory",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "authorized",
        "type": "bool"
      }
    ],
    "name": "PrimaryMarketFactoryAuthorizationSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "registry",
        "type": "address"
      }
    ],
    "name": "RecurringPledgeRegistrySet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "primaryMarket",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "erc1155Contract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundValue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "paymentToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "inputNoteId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "outputNoteId",
        "type": "uint256"
      }
    ],
    "name": "RefundedIntoNote",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_DELEGATION_DEPTH",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "authorizedPrimaryMarketFactories",
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
        "name": "rootOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "delegateTo",
        "type": "address"
      }
    ],
    "name": "createDelegatedNoteFor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "owners",
        "type": "address[]"
      },
      {
        "internalType": "address",
        "name": "delegateTo",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountToDelegate",
        "type": "uint256"
      }
    ],
    "name": "delegate",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "delegatedNoteId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "remainderNoteId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "enum DelegatableNotes.TokenType",
        "name": "tokenType",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
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
    "name": "isAuthorizedPrimaryMarket",
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
    "name": "nextNoteId",
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
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "notes",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "chainHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "enum DelegatableNotes.TokenType",
        "name": "tokenType",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
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
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC1155BatchReceived",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
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
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC1155Received",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "nonpayable",
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
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "primaryMarketFactories",
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
    "name": "primaryMarketFactoryCount",
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
        "components": [
          {
            "internalType": "uint256",
            "name": "noteId",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "chain",
            "type": "address[]"
          },
          {
            "internalType": "uint256",
            "name": "shares",
            "type": "uint256"
          }
        ],
        "internalType": "struct DelegatableNotes.PurchaseShare[]",
        "name": "purchaseShares",
        "type": "tuple[]"
      },
      {
        "internalType": "address",
        "name": "primaryMarket",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "erc1155Contract",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "purchaseFromPrimaryMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "noteId",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "chain",
            "type": "address[]"
          },
          {
            "internalType": "uint256",
            "name": "shares",
            "type": "uint256"
          }
        ],
        "internalType": "struct DelegatableNotes.PurchaseShare[]",
        "name": "purchaseShares",
        "type": "tuple[]"
      },
      {
        "internalType": "address",
        "name": "secondaryMarket",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "saleListingId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokenCount",
        "type": "uint256"
      }
    ],
    "name": "purchaseFromSecondaryMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      }
    ],
    "name": "reclaimFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "recurringPledgeRegistry",
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
        "name": "noteId",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "chain",
        "type": "address[]"
      },
      {
        "internalType": "address",
        "name": "primaryMarket",
        "type": "address"
      }
    ],
    "name": "refundIntoNote",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "refundNoteId",
        "type": "uint256"
      }
    ],
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
        "name": "noteId",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "owners",
        "type": "address[]"
      }
    ],
    "name": "revoke",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "secondaryMarketFactory",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "primaryMarketFactory",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "authorized",
        "type": "bool"
      }
    ],
    "name": "setPrimaryMarketFactoryAuthorization",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "registry",
        "type": "address"
      }
    ],
    "name": "setRecurringPledgeRegistry",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
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
