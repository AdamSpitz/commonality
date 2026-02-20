
export interface GraphQLClient {
  url: string;
}

/**
 * Create a GraphQL client
 */
export function createGraphQLClient(url = 'http://localhost:42069/graphql'): GraphQLClient {
  return { url };
}

/**
 * Execute a GraphQL query
 */
export async function query<T = any>(
  client: GraphQLClient,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch(client.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: queryString,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { data?: T; errors?: any[] };

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}
