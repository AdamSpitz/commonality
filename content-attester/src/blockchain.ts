import {
  AlignmentAttestationsAbi,
  attestAlignment,
  createWriteClients,
  hashCanonicalId,
  type IpfsCidV1,
  type WriteClients,
} from '@commonality/sdk';
import { classifyBlockchainError } from '@commonality/attester-core';
import type { ContentAttesterConfig } from './config.js';

interface AlignmentAttestationsContract {
  address: `0x${string}`;
  abi: typeof AlignmentAttestationsAbi;
}

export function getBlockchainClients(config: ContentAttesterConfig): {
  testClients: WriteClients;
  alignmentAttestationsContract: AlignmentAttestationsContract;
} {
  try {
    const testClients = createWriteClients(
      config.ethereumPrivateKey as `0x${string}`,
      config.ethereumRpcUrl,
    );
    const alignmentAttestationsContract: AlignmentAttestationsContract = {
      address: config.alignmentAttestationsContractAddress as `0x${string}`,
      abi: AlignmentAttestationsAbi,
    };

    return { testClients, alignmentAttestationsContract };
  } catch (error) {
    throw classifyBlockchainError(error);
  }
}

export function getSubjectIdForContentCanonicalId(contentCanonicalId: string): `0x${string}` {
  return hashCanonicalId(contentCanonicalId);
}

export async function publishAttestation(
  config: ContentAttesterConfig,
  contentCanonicalId: string,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1,
): Promise<string> {
  const { testClients, alignmentAttestationsContract } = getBlockchainClients(config);

  try {
    const txHash = await attestAlignment(
      testClients,
      alignmentAttestationsContract,
      getSubjectIdForContentCanonicalId(contentCanonicalId),
      statementCid,
      topicStatementCid,
    );
    return txHash;
  } catch (error) {
    throw classifyBlockchainError(error);
  }
}

export async function checkAttesterBalance(config: ContentAttesterConfig): Promise<{
  balance: bigint;
  hasSufficientFunds: boolean;
  minimumRequired: bigint;
}> {
  const { testClients } = getBlockchainClients(config);

  try {
    const balance = await testClients.publicClient.getBalance({
      address: testClients.account,
    });

    const minimumRequired = BigInt(1e16);

    return {
      balance,
      hasSufficientFunds: balance >= minimumRequired,
      minimumRequired,
    };
  } catch (error) {
    throw classifyBlockchainError(error);
  }
}
