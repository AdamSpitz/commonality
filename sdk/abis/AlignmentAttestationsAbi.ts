// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const AlignmentAttestationsAbi = [
  {
    "inputs": [],
    "name": "ArrayLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidStatementId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSubjectId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTopicStatementId",
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
        "internalType": "bytes32",
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "AlignmentAttestation",
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
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "AlignmentRevoked",
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
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "SuccessAttestation",
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
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "SuccessRevoked",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "attestAlignment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "subjectIds",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes32[]",
        "name": "statementIds",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes32[]",
        "name": "topicStatementIds",
        "type": "bytes32[]"
      }
    ],
    "name": "attestAlignmentsInBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "attestSuccess",
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
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "attestations",
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
        "name": "attester",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      }
    ],
    "name": "hasAttestation",
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
        "name": "attester",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      }
    ],
    "name": "hasSuccessAttestation",
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
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "removeAttestation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "subjectId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "statementId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "topicStatementId",
        "type": "bytes32"
      }
    ],
    "name": "removeSuccessAttestation",
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
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "successAttestations",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
