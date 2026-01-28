// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate
export const ProjectAlignmentAbi = [
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
        "name": "projectAddress",
        "type": "address"
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
    "name": "ProjectAlignmentAttestation",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "projectAddress",
        "type": "address"
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
        "internalType": "address[]",
        "name": "projectAddresses",
        "type": "address[]"
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
        "internalType": "address",
        "name": "projectAddress",
        "type": "address"
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
  }
];
