// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const StatementImagesAbi = [
  {
    "inputs": [],
    "name": "InvalidImageId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPromptHash",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidStatementId",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      }
    ],
    "name": "ImageAdopted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      }
    ],
    "name": "ImageAdoptionRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "attester",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "promptHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "modelId",
        "type": "bytes32"
      }
    ],
    "name": "MosaicSafetyAttested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "attester",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      }
    ],
    "name": "MosaicSafetyRevoked",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      }
    ],
    "name": "adoptImage",
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
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "adoptions",
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
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "promptHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "modelId",
        "type": "bytes32"
      }
    ],
    "name": "attestMosaicSafety",
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
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "mosaicModelId",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "mosaicPromptHash",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "mosaicSafety",
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
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      }
    ],
    "name": "revokeImageAdoption",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "imageId",
        "type": "bytes32"
      }
    ],
    "name": "revokeMosaicSafety",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
