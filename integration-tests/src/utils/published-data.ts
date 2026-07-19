import { PublishedDataAbi } from '@commonality/sdk/abis';
import { createDefaultDocumentStore, type DisplayableDocument } from '@commonality/sdk/displayable-documents';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils';

export async function publishIntegrationDisplayableDocument(
  machinery: SDKMachinery,
  clients: WriteClients,
  document: DisplayableDocument,
): Promise<IpfsCidV1> {
  const store = createDefaultDocumentStore(machinery, {
    clients,
    ...(machinery.contractAddresses?.publishedData
      ? { publishedDataContract: { address: machinery.contractAddresses.publishedData, abi: PublishedDataAbi } }
      : {}),
  });
  return (await store.publish(document)).cid;
}
