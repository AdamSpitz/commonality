// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const ProjectFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "erc1155Factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "assuranceFactory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "conditionFactory",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "EmptyTokenList",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDeadline",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFactoryAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidOwnerAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRecipientAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidThreshold",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenArrayLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroPrice",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "assuranceContract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "condition",
        "type": "address"
      }
    ],
    "name": "ProjectCreated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "_assuranceFactory",
    "outputs": [
      {
        "internalType": "contract AssuranceContractFactory",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_conditionFactory",
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
    "name": "_premintingERC1155Factory",
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
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contractURI",
        "type": "string"
      },
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
        "name": "projectMetadataCid",
        "type": "string"
      },
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "counts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "prices",
        "type": "uint256[]"
      }
    ],
    "name": "createERC1155AndAssuranceContract",
    "outputs": [
      {
        "internalType": "contract IERC1155",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "contract AssuranceContract",
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
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contractURI",
        "type": "string"
      },
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
        "internalType": "contract IAssuranceCondition",
        "name": "condition",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "projectMetadataCid",
        "type": "string"
      },
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "counts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "prices",
        "type": "uint256[]"
      }
    ],
    "name": "createERC1155AndAssuranceContractWithCondition",
    "outputs": [
      {
        "internalType": "contract IERC1155",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "contract AssuranceContract",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
