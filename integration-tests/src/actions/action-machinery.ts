import { createGraphQLExecutor, GraphQLClient, GraphQLExecutor } from "@commonality/sdk";
import { createGraphQLClient } from "../../../sdk/dist/sdk/src/utils";

export type ActionTestingMachinery = {
  graphqlClient: GraphQLClient;
  graphqlExecutor: GraphQLExecutor;
};

export function createActionTestingMachinery(indexerUrl?: string): ActionTestingMachinery {
  const graphqlClient = createGraphQLClient(indexerUrl);
  const graphqlExecutor = createGraphQLExecutor(indexerUrl);

  return {
    graphqlClient,
    graphqlExecutor,
  };
}
