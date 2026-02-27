import { request, RequestDocument } from "graphql-request";
import { SDKMachinery } from "../machinery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTypedGraphQLQuery<T = any, V extends Record<string, unknown> = Record<string, any>>(
  machinery: SDKMachinery,
  document: RequestDocument,
  variables?: V
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request(machinery.graphqlClient.url, document, variables as any) as Promise<T>;
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

