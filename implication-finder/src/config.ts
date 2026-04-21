export interface FinderConfig {
  eventCacheUrl: string;
  attesterUrl: string;
  attesterFinderKey: string;
  beliefsContractAddress: `0x${string}`;
  implicationsContractAddress: `0x${string}`;
  ipfsGatewayUrl: string;
  pollIntervalMs: number;
  topNStatements: number;
  minBelieverThreshold: number;
  stateFilePath: string;
}

export function loadConfig(): FinderConfig {
  const required = (name: string, value: string | undefined): string => {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  return {
    eventCacheUrl: required('EVENT_CACHE_URL', process.env.EVENT_CACHE_URL),
    attesterUrl: required('ATTESTER_URL', process.env.ATTESTER_URL),
    attesterFinderKey: required('ATTESTER_FINDER_KEY', process.env.ATTESTER_FINDER_KEY),
    beliefsContractAddress: required('BELIEFS_CONTRACT_ADDRESS', process.env.BELIEFS_CONTRACT_ADDRESS) as `0x${string}`,
    implicationsContractAddress: required('IMPLICATIONS_CONTRACT_ADDRESS', process.env.IMPLICATIONS_CONTRACT_ADDRESS) as `0x${string}`,
    ipfsGatewayUrl: required('IPFS_GATEWAY_URL', process.env.IPFS_GATEWAY_URL),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
    topNStatements: parseInt(process.env.TOP_N_STATEMENTS || '20', 10),
    minBelieverThreshold: parseInt(process.env.MIN_BELIEVER_THRESHOLD || '2', 10),
    stateFilePath: process.env.STATE_FILE_PATH || './finder-state.json',
  };
}
