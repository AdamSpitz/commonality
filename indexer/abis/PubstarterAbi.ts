// ABI for Pubstarter contract (from hardhat/contracts/individual-projects/Pubstarter.sol)
// This is the main factory contract that creates ERC1155 tokens, marketplaces, and assurance contracts
export const PubstarterAbi = 
[
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
  }
] as const;
