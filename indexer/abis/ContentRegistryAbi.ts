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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      }
    ],
    "name": "DuplicateWorkId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyWorkBatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidContentId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidWorkId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidWorkRegistration",
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
        "internalType": "uint256",
        "name": "contentId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "currentProject",
        "type": "address"
      }
    ],
    "name": "StaleWorkRelease",
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
    "name": "UnauthorizedContentRegistrar",
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
    "name": "WorkNotFailed",
    "type": "error"
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
        "name": "project",
        "type": "address"
      }
    ],
    "name": "WorkPermanentlyFunded",
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
        "name": "registrar",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "ContentRegistrarSet",
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
        "internalType": "bytes32",
        "name": "workIdHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "workId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "WorkItemRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "workIdHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "WorkItemReleased",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_WORK_ID_BYTES",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "isRegistrar",
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
        "internalType": "bytes32",
        "name": "workIdHash",
        "type": "bytes32"
      }
    ],
    "name": "projectFor",
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
        "internalType": "string[]",
        "name": "workIds",
        "type": "string[]"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "condition",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "registerBeneficiaryWorks",
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
        "internalType": "string[]",
        "name": "workIds",
        "type": "string[]"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "condition",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "registerWorks",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "workIds",
        "type": "string[]"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "releaseBeneficiaryWorks",
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
    "inputs": [
      {
        "internalType": "string[]",
        "name": "workIds",
        "type": "string[]"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "releaseWorks",
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
        "name": "registrar",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "setRegistrar",
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
