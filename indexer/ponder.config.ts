import { createConfig } from "ponder";
import { http } from "viem";

import { BeliefsAbi } from "./abis/BeliefsAbi";
import { ImplicationsAbi } from "./abis/ImplicationsAbi";

// Contract addresses - update these after deployment
const BELIEFS_ADDRESS = process.env.BELIEFS_CONTRACT_ADDRESS as `0x${string}` | undefined;
const IMPLICATIONS_ADDRESS = process.env.IMPLICATIONS_CONTRACT_ADDRESS as `0x${string}` | undefined;

// Start block - set to the block where contracts were deployed
const START_BLOCK = Number(process.env.START_BLOCK || 0);

export default createConfig({
  chains: {
    // Base Sepolia testnet (primary for development)
    baseSepolia: {
      id: 84532,
      rpc: http(process.env.PONDER_RPC_URL_84532),
    },
  },
  contracts: {
    // Beliefs contract - tracks user beliefs about statements
    Beliefs: {
      abi: BeliefsAbi,
      chain: "baseSepolia",
      address: BELIEFS_ADDRESS,
      startBlock: START_BLOCK,
    },
    // Implications contract - tracks implication attestations between statements
    Implications: {
      abi: ImplicationsAbi,
      chain: "baseSepolia",
      address: IMPLICATIONS_ADDRESS,
      startBlock: START_BLOCK,
    },
  },
});
