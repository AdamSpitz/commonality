import { createGraphQLClient, createGraphQLExecutor, executeQuery, GraphQLClient, GraphQLExecutor } from "./graphql-server";

export type SDKMachinery = {
  graphqlClient: GraphQLClient;
  graphqlExecutor: GraphQLExecutor;
};

export function createSDKMachinery(indexerUrl?: string): SDKMachinery {
  const graphqlClient = createGraphQLClient(indexerUrl);
  const graphqlExecutor = createGraphQLExecutor(indexerUrl);

  return {
    graphqlClient,
    graphqlExecutor,
  };
}

export async function executeSDKQuery<T = any>(
  machinery: SDKMachinery,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  return executeQuery(machinery.graphqlExecutor, queryString, variables);
}
