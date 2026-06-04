export const RecurringPledgesAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegatableNotesAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AmountMustBeGreaterThanZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPledgeOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PeriodMustBeGreaterThanZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PledgeDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PledgeInactive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PledgeNotDue",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SelfDelegationNotAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "rootOwner",
        "type": "address"
      }
    ],
    "name": "StandingPledgeCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "rootOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegateTo",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountPerPeriod",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "causeRef",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "enum RecurringPledges.BackingType",
        "name": "backingType",
        "type": "uint8"
      }
    ],
    "name": "StandingPledgeCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "executedAt",
        "type": "uint256"
      }
    ],
    "name": "StandingPledgeExecuted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      }
    ],
    "name": "cancelStandingPledge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegateTo",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountPerPeriod",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "causeRef",
        "type": "string"
      }
    ],
    "name": "createStandingPledge",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "firstNoteId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "delegatableNotes",
    "outputs": [
      {
        "internalType": "contract IDelegatableNotesForRecurringPledges",
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
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      }
    ],
    "name": "executeDue",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "noteId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      }
    ],
    "name": "isDue",
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
        "internalType": "uint256",
        "name": "pledgeId",
        "type": "uint256"
      }
    ],
    "name": "isFundable",
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
    "inputs": [],
    "name": "nextPledgeId",
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
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "pledges",
    "outputs": [
      {
        "internalType": "address",
        "name": "rootOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "delegateTo",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountPerPeriod",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "causeRef",
        "type": "string"
      },
      {
        "internalType": "enum RecurringPledges.BackingType",
        "name": "backingType",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "lastExecuted",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
