import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import {
  createWriteClients,
  uploadToIPFS,
  cidToBytes32,
  NudgePublicationsAbi,
  type IpfsCidV1,
} from '@commonality/sdk';

export interface CuratedCollectionEntry {
  cid: IpfsCidV1;
  label: string;
  topicArea: string;
  parentCid?: IpfsCidV1;
}

export interface CuratedCollectionPublication {
  kind: 'curated-collection';
  schemaVersion: 1;
  nudger: string;
  publishedAt: number;
  stream: string;
  entries: CuratedCollectionEntry[];
}

export interface NudgerConfig {
  nudgerPrivateKey: string;
  ethereumRpcUrl: string;
  indexerUrl: string;
  ipfsApiUrl: string;
  ipfsGatewayUrl: string;
  name: string;
  description: string;
  sourceType: string;
  version: string;
  nudgePublicationsContractAddress: string;
}

export interface LlmNudgerConfig extends NudgerConfig {
  openRouterApiKey: string;
  openRouterModel: string;
}

export interface NudgerSigner {
  address: `0x${string}`;
  publishNudgeBatch: (
    nudges: NudgeMessage[],
    config: NudgerConfig,
    revocations?: NudgeRevocation[],
  ) => Promise<{ txHash: string; batchCid: IpfsCidV1 }>;
  publishCuratedCollection: (
    stream: string,
    entries: CuratedCollectionEntry[],
    config: NudgerConfig,
  ) => Promise<{ txHash: string; collectionCid: IpfsCidV1 }>;
}

function createClients(config: NudgerConfig) {
  return createWriteClients(
    config.nudgerPrivateKey as `0x${string}`,
    config.ethereumRpcUrl,
  );
}

function createBatchPublisher(account: PrivateKeyAccount) {
  return async function publishBatch(
    nudges: NudgeMessage[],
    config: NudgerConfig,
    revocations: NudgeRevocation[] = [],
  ): Promise<{ txHash: string; batchCid: IpfsCidV1 }> {
    const batch = createNudgeBatch(account.address, nudges, revocations);

    const batchCid = await uploadToIPFS(
      { apiUrl: config.ipfsApiUrl, gatewayUrl: config.ipfsGatewayUrl },
      batch,
    );

    const clients = createClients(config);

    const txHash = await clients.walletClient.writeContract({
      address: config.nudgePublicationsContractAddress as `0x${string}`,
      abi: NudgePublicationsAbi,
      functionName: 'publishNudgeBatch',
      args: [cidToBytes32(batchCid)],
      chain: clients.walletClient.chain,
      account: clients.walletClient.account!,
    });

    await clients.publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash, batchCid };
  };
}

function createCollectionPublisher(account: PrivateKeyAccount) {
  return async function publishCollection(
    stream: string,
    entries: CuratedCollectionEntry[],
    config: NudgerConfig,
  ): Promise<{ txHash: string; collectionCid: IpfsCidV1 }> {
    const collection = createCuratedCollection(account.address, stream, entries);

    const collectionCid = await uploadToIPFS(
      { apiUrl: config.ipfsApiUrl, gatewayUrl: config.ipfsGatewayUrl },
      collection,
    );

    const clients = createClients(config);

    const txHash = await clients.walletClient.writeContract({
      address: config.nudgePublicationsContractAddress as `0x${string}`,
      abi: NudgePublicationsAbi,
      functionName: 'publishNudgeBatch',
      args: [cidToBytes32(collectionCid)],
      chain: clients.walletClient.chain,
      account: clients.walletClient.account!,
    });

    await clients.publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash, collectionCid };
  };
}

export function createNudgerSigner(config: NudgerConfig): NudgerSigner {
  const account = privateKeyToAccount(config.nudgerPrivateKey as `0x${string}`);

  return {
    address: account.address,
    publishNudgeBatch: createBatchPublisher(account),
    publishCuratedCollection: createCollectionPublisher(account),
  };
}

export interface NudgeMessage {
  targetStatementCid: string;
  suggestedStatementCid: string;
  reason: string;
  confidence: number;
}

export interface NudgeRevocation {
  targetStatementCid: string;
  suggestedStatementCid: string;
}

export interface NudgeBatch {
  kind: 'nudge-batch';            // Publication type discriminator
  schemaVersion: 1;               // Schema version for nudge-batch publications
  nudger: string;                  // Ethereum address of the nudger
  publishedAt: number;             // Unix timestamp
  nudges: NudgeMessage[];
  revocations: NudgeRevocation[];  // per-nudge revocations of entries from previous batches
}

export function createNudgeBatch(
  nudger: string,
  nudges: NudgeMessage[],
  revocations: NudgeRevocation[] = [],
  publishedAt: number = Math.floor(Date.now() / 1000)
): NudgeBatch {
  return {
    kind: 'nudge-batch',
    schemaVersion: 1,
    nudger,
    publishedAt,
    nudges,
    revocations,
  };
}

export async function publishNudgeBatch(
  nudges: NudgeMessage[],
  config: NudgerConfig,
  revocations: NudgeRevocation[] = []
): Promise<{ txHash: string; batchCid: IpfsCidV1 }> {
  return createNudgerSigner(config).publishNudgeBatch(nudges, config, revocations);
}

export function createCuratedCollection(
  nudger: string,
  stream: string,
  entries: CuratedCollectionEntry[],
  publishedAt: number = Math.floor(Date.now() / 1000)
): CuratedCollectionPublication {
  return {
    kind: 'curated-collection',
    schemaVersion: 1,
    nudger,
    publishedAt,
    stream,
    entries,
  };
}

export async function publishCuratedCollection(
  stream: string,
  entries: CuratedCollectionEntry[],
  config: NudgerConfig
): Promise<{ txHash: string; collectionCid: IpfsCidV1 }> {
  return createNudgerSigner(config).publishCuratedCollection(stream, entries, config);
}
