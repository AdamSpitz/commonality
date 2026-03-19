/**
 * ABI for MultiERC1155AssuranceContract
 * Combines events and functions from AssuranceContract, ERC1155PrimaryMarket, and ContractMetadata
 */
export const AssuranceContractAbi = [
    // Custom Errors
    // From ERC1155PrimaryMarket.sol
    {
        type: "error",
        name: "IncorrectAmountOfETHSent",
        inputs: [],
    },
    {
        type: "error",
        name: "ETHRefundFailed",
        inputs: [],
    },
    // From AssuranceContract.sol
    {
        type: "error",
        name: "OnlyRecipientCanWithdraw",
        inputs: [],
    },
    {
        type: "error",
        name: "ETHTransferFailed",
        inputs: [],
    },
    {
        type: "error",
        name: "ConditionNotMet",
        inputs: [],
    },
    {
        type: "error",
        name: "ConditionNotFailed",
        inputs: [],
    },
    {
        type: "error",
        name: "ConditionAlreadySet",
        inputs: [],
    },
    {
        type: "error",
        name: "ConditionNotSet",
        inputs: [],
    },
    // From AssuranceContracts.sol
    {
        type: "error",
        name: "ArrayLengthMismatch",
        inputs: [],
    },
    {
        type: "error",
        name: "PriceAlreadySet",
        inputs: [],
    },

    // Events
    // From AssuranceContract.sol
    {
        type: "event",
        name: "AssuranceContractInitialized",
        inputs: [
            {
                name: "recipient",
                type: "address",
                indexed: true,
            },
            {
                name: "condition",
                type: "address",
                indexed: true,
            },
        ],
    },
    {
        type: "event",
        name: "AssuranceContractWithdrawal",
        inputs: [
            {
                name: "recipient",
                type: "address",
                indexed: true,
            },
            {
                name: "value",
                type: "uint256",
                indexed: false,
            },
        ],
    },
    // From ERC1155PrimaryMarket.sol
    {
        type: "event",
        name: "ERC1155Offered",
        inputs: [
            {
                name: "erc1155Addr",
                type: "address",
                indexed: true,
            },
            {
                name: "id",
                type: "uint256",
                indexed: false,
            },
            {
                name: "price",
                type: "uint256",
                indexed: false,
            },
        ],
    },
    {
        type: "event",
        name: "ERC1155Bought",
        inputs: [
            {
                name: "participant",
                type: "address",
                indexed: true,
            },
            {
                name: "erc1155Addr",
                type: "address",
                indexed: true,
            },
            {
                name: "totalCost",
                type: "uint256",
                indexed: false,
            },
            {
                name: "ids",
                type: "uint256[]",
                indexed: false,
            },
            {
                name: "counts",
                type: "uint256[]",
                indexed: false,
            },
        ],
    },
    {
        type: "event",
        name: "ERC1155Sold",
        inputs: [
            {
                name: "participant",
                type: "address",
                indexed: true,
            },
            {
                name: "erc1155Addr",
                type: "address",
                indexed: true,
            },
            {
                name: "totalCost",
                type: "uint256",
                indexed: false,
            },
            {
                name: "ids",
                type: "uint256[]",
                indexed: false,
            },
            {
                name: "counts",
                type: "uint256[]",
                indexed: false,
            },
        ],
    },
    // From ContractMetadata.sol (via ERC7572)
    {
        type: "event",
        name: "ContractMetadataUpdated",
        inputs: [
            {
                name: "metadata",
                type: "string",
                indexed: false,
            },
        ],
    },
    // Functions
    // From ERC1155PrimaryMarket.sol
    {
        type: "function",
        name: "buyERC1155",
        stateMutability: "payable",
        inputs: [
            {
                name: "buyer",
                type: "address",
            },
            {
                name: "erc1155Addr",
                type: "address",
            },
            {
                name: "ids",
                type: "uint256[]",
            },
            {
                name: "counts",
                type: "uint256[]",
            },
            {
                name: "data",
                type: "bytes",
            },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "refundERC1155",
        stateMutability: "nonpayable",
        inputs: [
            {
                name: "holder",
                type: "address",
            },
            {
                name: "erc1155Addr",
                type: "address",
            },
            {
                name: "ids",
                type: "uint256[]",
            },
            {
                name: "counts",
                type: "uint256[]",
            },
            {
                name: "data",
                type: "bytes",
            },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "setPricesERC1155",
        stateMutability: "nonpayable",
        inputs: [
            {
                name: "erc1155Addr",
                type: "address",
            },
            {
                name: "ids",
                type: "uint256[]",
            },
            {
                name: "prices",
                type: "uint256[]",
            },
        ],
        outputs: [],
    },
    // From AssuranceContract.sol (via MultiERC1155AssuranceContract)
    {
        type: "function",
        name: "setCondition",
        stateMutability: "nonpayable",
        inputs: [
            {
                name: "condition",
                type: "address",
            },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "withdraw",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        type: "function",
        name: "getAssuranceContractProgress",
        stateMutability: "view",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
            },
        ],
    },
    // From Ownable
    {
        type: "function",
        name: "owner",
        stateMutability: "view",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
            },
        ],
    },
];
