/**
 * Local GraphQL executor - executes GraphQL queries in-process
 * without needing a separate server
 */

import { execute, parse, GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLClient, type GraphQLClient } from '../indexer-queries/common.js';
import { typeDefs, resolvers } from './schema/index.js';

/**
 * GraphQL executor that can execute queries locally
 */
export interface GraphQLExecutor {
  schema: GraphQLSchema;
  indexerClient: GraphQLClient;
}

/**
 * Create a local GraphQL executor
 * This provides a GraphQL interface without needing to run a separate server
 */
export function createGraphQLExecutor(indexerUrl?: string): GraphQLExecutor {
  // Create underlying GraphQL client that connects to indexer
  const indexerClient = createGraphQLClient(indexerUrl);

  // Merge all resolvers including type resolvers and query resolvers
  const mergedResolvers = {
    ...resolvers,
    // Custom scalar resolvers
    BigInt: {
      serialize(value: any) {
        // When sending data to client, convert BigInt to BigInt (keep as-is)
        if (typeof value === 'string') {
          return BigInt(value);
        }
        return value;
      },
      parseValue(value: any) {
        // When receiving data from client variables
        return BigInt(value);
      },
      parseLiteral(ast: any) {
        // When parsing query literals
        if (ast.kind === 'IntValue' || ast.kind === 'StringValue') {
          return BigInt(ast.value);
        }
        return null;
      },
    },
    Address: {
      serialize(value: any) {
        return value; // Addresses are strings, pass through
      },
      parseValue(value: any) {
        return value;
      },
      parseLiteral(ast: any) {
        if (ast.kind === 'StringValue') {
          return ast.value;
        }
        return null;
      },
    },
    Query: Object.entries(resolvers.Query || {}).reduce((acc, [key, resolver]) => {
      // Wrap each resolver to provide the client context
      acc[key] = async (_: any, args: any, __: any, info: any) => {
        return (resolver as any)(_, args, { client: indexerClient }, info);
      };
      return acc;
    }, {} as Record<string, any>),
  };

  // Create executable schema with context-aware resolvers
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: mergedResolvers,
  });

  return { schema, indexerClient };
}

/**
 * Execute a GraphQL query locally (in-process)
 */
export async function executeQuery<T = any>(
  executor: GraphQLExecutor,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  const result = await execute({
    schema: executor.schema,
    document: parse(queryString),
    variableValues: variables,
    contextValue: { client: executor.indexerClient },
  });

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}
