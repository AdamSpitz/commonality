import { createIPFSConfigFromTheUsualEnvVars, IPFSConfig } from "./utils/ipfs";

export interface GraphQLClient {
  url: string;
}

export function createGraphQLClient(url = 'http://localhost:42069/graphql'): GraphQLClient {
  return { url };
}

export type SDKMachinery = {
  graphqlClient: GraphQLClient;
  ipfsConfig: IPFSConfig;
};

export function createSDKMachinery(indexerUrl?: string): SDKMachinery {
  const graphqlClient = createGraphQLClient(indexerUrl);
  const ipfsConfig = createIPFSConfigFromTheUsualEnvVars();

  return {
    graphqlClient,
    ipfsConfig,
  };
}
