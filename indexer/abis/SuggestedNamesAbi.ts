// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const SuggestedNamesAbi = [
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
        "name": "accountBeingNamed",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "NameSuggested",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "accountBeingNamed",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "suggestName",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
