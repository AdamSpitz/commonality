// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate
export const ImplicationsAbi = [
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
                "name": "fromStatementId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "toStatementId",
                "type": "bytes32"
            }
        ],
        "name": "ImplicationAttestation",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "fromStatementId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "toStatementId",
                "type": "bytes32"
            }
        ],
        "name": "attestImplication",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32[]",
                "name": "fromStatementIds",
                "type": "bytes32[]"
            },
            {
                "internalType": "bytes32[]",
                "name": "toStatementIds",
                "type": "bytes32[]"
            }
        ],
        "name": "attestImplicationsInBatch",
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
                "name": "fromStatementId",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "toStatementId",
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
