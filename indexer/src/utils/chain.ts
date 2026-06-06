const SUPPORTED_CHAIN_IDS = {
  hardhat: 31337,
  'base-sepolia': 84532,
  mainnet: 1,
} as const;

type SupportedChainName = keyof typeof SUPPORTED_CHAIN_IDS;

export function getIndexerChainName(): SupportedChainName {
  const chain = process.env.PONDER_CHAIN ?? 'hardhat';
  if (chain in SUPPORTED_CHAIN_IDS) {
    return chain as SupportedChainName;
  }
  throw new Error(`Unsupported PONDER_CHAIN "${chain}"`);
}

export function getIndexerChainId(): number {
  return SUPPORTED_CHAIN_IDS[getIndexerChainName()];
}
