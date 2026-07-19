import { PublishedDataAbi } from '@commonality/sdk/abis';
import { createDefaultDocumentStore, type DisplayableDocument } from '@commonality/sdk/displayable-documents';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import type { PublishedDataContract } from '@commonality/sdk/published-data';
import { uploadToIPFS, type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';
import type { Abi } from 'viem';

export interface StatementPublisherDependencies {
  uploadToIPFS: typeof uploadToIPFS;
}

export interface BridgeStatementPublicationOptions {
  clients?: WriteClients;
  publishedDataContractAddress?: `0x${string}`;
}

const defaultDependencies: StatementPublisherDependencies = {
  uploadToIPFS,
};

function publishedDataContract(address: `0x${string}` | undefined): PublishedDataContract | undefined {
  return address ? { address, abi: PublishedDataAbi as Abi } : undefined;
}

export async function publishBridgeStatement(
  machinery: SDKMachinery,
  content: string,
  dependencies: StatementPublisherDependencies = defaultDependencies,
  options: BridgeStatementPublicationOptions = {},
): Promise<IpfsCidV1> {
  const doc: DisplayableDocument = {
    format: 'text/plain',
    content,
    assets: {},
    references: [],
    extras: {
      statement: true,
      createdBy: 'bridge-creator',
    },
  };

  const contract = publishedDataContract(options.publishedDataContractAddress);
  if (options.clients && contract) {
    const publication = await createDefaultDocumentStore(machinery, {
      clients: options.clients,
      publishedDataContract: contract,
    }).publish(doc);
    return publication.cid;
  }

  return dependencies.uploadToIPFS(machinery.ipfsConfig as any, doc);
}
