// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const NoteIntentAbi = [
  {
    "inputs": [],
    "name": "ArrayLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidNoteContractAddress",
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
        "name": "attester",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "noteContract",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "intendedStatementId",
        "type": "bytes32"
      }
    ],
    "name": "NoteIntentAttested",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "noteContract",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "intendedStatementId",
        "type": "bytes32"
      }
    ],
    "name": "attestNoteIntent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "noteContract",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "noteIds",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes32[]",
        "name": "intendedStatementIds",
        "type": "bytes32[]"
      }
    ],
    "name": "attestNoteIntentsInBatch",
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
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "attestations",
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
        "name": "attester",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "noteContract",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      }
    ],
    "name": "getAttestation",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
