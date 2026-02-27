import { request, RequestDocument } from "graphql-request";
import { SDKMachinery } from "../machinery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTypedGraphQLQuery<T = any, V extends Record<string, unknown> = Record<string, any>>(
  machinery: SDKMachinery,
  document: RequestDocument,
  variables?: V
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return request(machinery.indexerUrl, document, variables as any) as Promise<T>;
}
