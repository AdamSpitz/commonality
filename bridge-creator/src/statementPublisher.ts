import type { DisplayableDocument } from '@commonality/sdk/displayable-documents';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { uploadToIPFS, type IpfsCidV1 } from '@commonality/sdk/utils';

export interface StatementPublisherDependencies {
  uploadToIPFS: typeof uploadToIPFS;
}

const defaultDependencies: StatementPublisherDependencies = {
  uploadToIPFS,
};

export async function publishBridgeStatement(
  machinery: SDKMachinery,
  content: string,
  dependencies: StatementPublisherDependencies = defaultDependencies,
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

  return dependencies.uploadToIPFS(machinery.ipfsConfig as any, doc);
}
