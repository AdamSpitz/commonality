export interface GraphQLClient {
  url: string;
}

export function createGraphQLClient(url = 'http://localhost:42069/graphql'): GraphQLClient {
  return { url };
}

export type SDKMachinery = {
  graphqlClient: GraphQLClient;
};

export function createSDKMachinery(indexerUrl?: string): SDKMachinery {
  const graphqlClient = createGraphQLClient(indexerUrl);

  return {
    graphqlClient,
  };
}
