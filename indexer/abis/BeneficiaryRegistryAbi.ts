// Auto-generated from hardhat/contracts - DO NOT EDIT MANUALLY
// Run `npm run sync-abis` to regenerate

export const BeneficiaryRegistryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "BeneficiaryAlreadyControlled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "BeneficiaryAlreadyVerified",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "BeneficiaryNotControlled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "BeneficiaryNotVerified",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidBeneficiaryIdentity",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidClaimant",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidNewPayoutAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidNonce",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProjectAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProofHash",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVerifierAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVerifierSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoVerifierConfigured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyOwnerOrGuardian",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyPayoutAddressCanDisavowProject",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyPayoutAddressCanReleaseControl",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyPayoutAddressCanRotate",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyPayoutAddressCanTakeControl",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "ProjectAlreadyDisavowed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "ProjectNotDisavowed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "ProjectNotForBeneficiary",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProofExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VerifierAlreadyRevoked",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "BeneficiaryControlReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "BeneficiaryControlTaken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payoutAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      }
    ],
    "name": "BeneficiaryProofAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payoutAddress",
        "type": "address"
      }
    ],
    "name": "BeneficiaryVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldGuardian",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newGuardian",
        "type": "address"
      }
    ],
    "name": "GuardianUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "namespaceHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "name": "NamespaceClaimWaitingPeriodUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldPayoutAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newPayoutAddress",
        "type": "address"
      }
    ],
    "name": "PayoutAddressRotated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ProjectDisavowalWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "project",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ProjectDisavowed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "revokedVerifier",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "revokedBy",
        "type": "address"
      }
    ],
    "name": "VerifierRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldVerifier",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newVerifier",
        "type": "address"
      }
    ],
    "name": "VerifierUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "beneficiaryState",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "claimWithdrawableAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "controlTakenAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "disavowProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "guardian",
    "outputs": [
      {
        "internalType": "address",
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
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "isBeneficiaryControlled",
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
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "isProjectDisavowed",
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
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "isVerified",
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
        "name": "namespaceHash",
        "type": "bytes32"
      }
    ],
    "name": "namespaceClaimWaitingPeriod",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
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
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "payoutAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingOwner",
    "outputs": [
      {
        "internalType": "address",
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
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "releaseBeneficiaryControl",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "revokeVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "newPayoutAddress",
        "type": "address"
      }
    ],
    "name": "rotatePayoutAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_guardian",
        "type": "address"
      }
    ],
    "name": "setGuardian",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "namespaceHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "name": "setNamespaceClaimWaitingPeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifier",
        "type": "address"
      }
    ],
    "name": "setVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      }
    ],
    "name": "takeBeneficiaryControl",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "verifier",
    "outputs": [
      {
        "internalType": "address",
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
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "claimant",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "verifierSignature",
        "type": "bytes"
      }
    ],
    "name": "verifyBeneficiary",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "namespace",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "canonicalIdentifier",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "claimant",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "proofHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "verifierSignature",
        "type": "bytes"
      }
    ],
    "name": "verifyNamespacedBeneficiary",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "beneficiaryId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "project",
        "type": "address"
      }
    ],
    "name": "withdrawProjectDisavowal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
