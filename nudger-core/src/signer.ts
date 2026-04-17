import { privateKeyToAccount } from 'viem/accounts';
import {
  createTestClients,
  uploadToIPFS,
  cidToBytes32,
  NudgePublicationsAbi,
  type IpfsCidV1,
} from '@commonality/sdk';

let account: ReturnType<typeof privateKeyToAccount> | null = null;

export interface NudgerConfig {
  nudgerPrivateKey: string;
  ethereumRpcUrl: string;
  indexerUrl: string;
  ipfsApiUrl: string;
  ipfsGatewayUrl: string;
  openRouterApiKey: string;
  openRouterModel: string;
  port: number;
  name: string;
  description: string;
  sourceType: string;
  version: string;
  nudgePublicationsContractAddress: string;
}

export function initializeSigner(config: NudgerConfig) {
  account = privateKeyToAccount(config.nudgerPrivateKey as `0x${string}`);
  return account;
}

export function getSignerAddress(): string {
  if (!account) {
    throw new Error('Signer not initialized. Call initializeSigner first.');
  }
  return account.address;
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
  nudger: string;                  // Ethereum address of the nudger
  publishedAt: number;             // Unix timestamp
  nudges: NudgeMessage[];
  revocations: NudgeRevocation[];  // per-nudge revocations of entries from previous batches
}

export async function publishNudgeBatch(
  nudges: NudgeMessage[],
  config: NudgerConfig,
  revocations: NudgeRevocation[] = []
): Promise<{ txHash: string; batchCid: IpfsCidV1 }> {
  if (!account) {
    throw new Error('Signer not initialized. Call initializeSigner first.');
  }

  const batch: NudgeBatch = {
    nudger: account.address,
    publishedAt: Math.floor(Date.now() / 1000),
    nudges,
    revocations,
  };

  const batchCid = await uploadToIPFS(
    { apiUrl: config.ipfsApiUrl, gatewayUrl: config.ipfsGatewayUrl },
    batch
  );

  const clients = createTestClients(
    config.nudgerPrivateKey as `0x${string}`,
    config.ethereumRpcUrl
  );

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
}

