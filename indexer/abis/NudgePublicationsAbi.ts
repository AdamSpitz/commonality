// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const NudgePublicationsAbi = [
  {
    "inputs": [],
    "name": "InvalidBatchCid",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "nudger",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "batchCid",
        "type": "bytes32"
      }
    ],
    "name": "NudgesPublished",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "batchCid",
        "type": "bytes32"
      }
    ],
    "name": "publishNudgeBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
