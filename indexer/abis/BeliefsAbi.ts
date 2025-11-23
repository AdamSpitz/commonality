// ABI for Beliefs contract (from hardhat/contracts/statements/Beliefs.sol)
export const BeliefsAbi = [
  // Constants
  {
    inputs: [],
    name: "NO_OPINION",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "BELIEVES",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DISBELIEVES",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  // State
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "bytes32", name: "", type: "bytes32" },
    ],
    name: "beliefs",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "bytes32", name: "statementId", type: "bytes32" },
      { indexed: false, internalType: "uint8", name: "beliefState", type: "uint8" },
    ],
    name: "DirectSupport",
    type: "event",
  },
  // Functions
  {
    inputs: [
      { internalType: "bytes32", name: "statementId", type: "bytes32" },
      { internalType: "uint8", name: "beliefState", type: "uint8" },
    ],
    name: "setBelief",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "bytes32", name: "statementId", type: "bytes32" },
    ],
    name: "getBelief",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32[]", name: "statementIds", type: "bytes32[]" },
      { internalType: "uint8[]", name: "beliefStates", type: "uint8[]" },
    ],
    name: "setBeliefsInBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
