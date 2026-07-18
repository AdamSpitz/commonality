// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const PublishedDataAbi = [
  {
    "inputs": [],
    "name": "EmptyContent",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "publisher",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "dataId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "content",
        "type": "bytes"
      }
    ],
    "name": "DataPublished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "publisher",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "dataId",
        "type": "bytes32"
      }
    ],
    "name": "DataRetracted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "publisher",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "dataId",
        "type": "bytes32"
      }
    ],
    "name": "isPublished",
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
        "name": "publisher",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "dataId",
        "type": "bytes32"
      }
    ],
    "name": "isRetracted",
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
        "internalType": "bytes",
        "name": "content",
        "type": "bytes"
      }
    ],
    "name": "publishData",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "dataId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dataId",
        "type": "bytes32"
      }
    ],
    "name": "retractData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
