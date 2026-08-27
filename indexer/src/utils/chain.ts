export const INDEXER_CHAIN_IDS = {
  hardhat: 31337,
  'base-sepolia': 84532,
  mainnet: 1,
} as const;

export type IndexerChainName = keyof typeof INDEXER_CHAIN_IDS;

export function getIndexerChainName(): IndexerChainName {
  const chain = process.env.PONDER_CHAIN ?? 'hardhat';
  if (chain in INDEXER_CHAIN_IDS) {
    return chain as IndexerChainName;
  }
  throw new Error(`Unsupported PONDER_CHAIN "${chain}"`);
}

export function getIndexerChainId(): number {
  return INDEXER_CHAIN_IDS[getIndexerChainName()];
}
