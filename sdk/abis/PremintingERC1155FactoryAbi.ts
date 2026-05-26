// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const PremintingERC1155FactoryAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "erc1155",
        "type": "address"
      }
    ],
    "name": "LazyGivingERC1155ContractCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contractURI",
        "type": "string"
      }
    ],
    "name": "createPremintingERC1155",
    "outputs": [
      {
        "internalType": "contract PremintingERC1155",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
