
export interface GraphQLClient {
  url: string;
}

/**
 * Create a GraphQL client
 */
export function createGraphQLClient(url = 'http://localhost:42069/graphql'): GraphQLClient {
  return { url };
}

export async function executeUntypedGraphQLQuery<T = unknown>(
  url: string,
  queryString: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(url, {
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

  const result = await response.json() as { data?: T; errors?: unknown[] };

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}
