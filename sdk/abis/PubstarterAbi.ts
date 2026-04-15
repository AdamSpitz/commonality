// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const PubstarterAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "erc1155Factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "marketplaceFactory",
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
        "internalType": "contract EthThresholdConditionFactory",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_marketplaceFactory",
    "outputs": [
      {
        "internalType": "contract MarketplaceFactory",
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
    "name": "createERC1155AndMarketplaceAndAssuranceContract",
    "outputs": [
      {
        "internalType": "contract IERC1155",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "contract ERC1155SecondaryMarket",
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
    "name": "createERC1155AndMarketplaceAndAssuranceContractWithCondition",
    "outputs": [
      {
        "internalType": "contract IERC1155",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "contract ERC1155SecondaryMarket",
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
