import { createGraphQLClient, createGraphQLExecutor, GraphQLClient, GraphQLExecutor } from "./graphql-server";

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
