import { AlignmentAttestationsAbi } from '@commonality/sdk/abis';
import { hashCanonicalId } from '@commonality/sdk/content-funding';
import { attestAlignment } from '@commonality/sdk/fundingportals';
import { cidToBytes32, createWriteClients, type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';
import { classifyBlockchainError } from '@commonality/attester-core';
import type { BeatAgentExistingAttestation } from './attester.js';

export interface BeatAgentBlockchainConfig {
  ethereumPrivateKey: string;
  ethereumRpcUrl: string;
  alignmentAttestationsContractAddress: string;
}

interface AlignmentAttestationsContract {
  address: `0x${string}`;
  abi: typeof AlignmentAttestationsAbi;
}

interface BeatAgentAttestationReadClient {
  readContract: (params: {
    address: `0x${string}`;
    abi: typeof AlignmentAttestationsAbi;
    functionName: 'hasAttestation';
    args: [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`];
  }) => Promise<unknown>;
}

export interface HasBeatAgentAttestationParams {
  publicClient: BeatAgentAttestationReadClient;
  alignmentAttestationsContract: AlignmentAttestationsContract;
  attesterAddress: `0x${string}`;
  contentCanonicalId: string;
  statementCid: IpfsCidV1;
  topicStatementCid: IpfsCidV1;
}

export function getBeatAgentBlockchainClients(config: BeatAgentBlockchainConfig): {
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

export async function hasBeatAgentAttestation(params: HasBeatAgentAttestationParams): Promise<boolean> {
  const hasAttestation = await params.publicClient.readContract({
    address: params.alignmentAttestationsContract.address,
    abi: params.alignmentAttestationsContract.abi,
    functionName: 'hasAttestation',
    args: [
      params.attesterAddress,
      cidToBytes32(params.topicStatementCid),
      getSubjectIdForContentCanonicalId(params.contentCanonicalId),
      cidToBytes32(params.statementCid),
    ],
  });

  return hasAttestation === true;
}

export function findExistingBeatAgentAttestationOnChain(config: BeatAgentBlockchainConfig, topicStatementCid: IpfsCidV1) {
  return async (contentCanonicalId: string, statementCid: IpfsCidV1): Promise<BeatAgentExistingAttestation | null> => {
    const { testClients, alignmentAttestationsContract } = getBeatAgentBlockchainClients(config);
    try {
      const exists = await hasBeatAgentAttestation({
        publicClient: testClients.publicClient,
        alignmentAttestationsContract,
        attesterAddress: testClients.account,
        contentCanonicalId,
        statementCid,
        topicStatementCid,
      });

      if (!exists) {
        return null;
      }

      return {
        decision: 'positive',
        confidence: 'high',
        reasoning: 'A prior positive on-chain attestation already exists for this content and statement.',
        subjectId: getSubjectIdForContentCanonicalId(contentCanonicalId),
        explanationCid: null,
        transactionHash: null,
      };
    } catch (error) {
      throw classifyBlockchainError(error);
    }
  };
}

export async function publishBeatAgentAttestation(
  config: BeatAgentBlockchainConfig,
  contentCanonicalId: string,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1,
): Promise<string> {
  const { testClients, alignmentAttestationsContract } = getBeatAgentBlockchainClients(config);
  try {
    return await attestAlignment(
      testClients,
      alignmentAttestationsContract,
      getSubjectIdForContentCanonicalId(contentCanonicalId),
      statementCid,
      topicStatementCid,
    );
  } catch (error) {
    throw classifyBlockchainError(error);
  }
}

export async function checkBeatAgentBalance(config: BeatAgentBlockchainConfig): Promise<{
  balance: bigint;
  hasSufficientFunds: boolean;
  minimumRequired: bigint;
}> {
  const { testClients } = getBeatAgentBlockchainClients(config);
  try {
    const balance = await testClients.publicClient.getBalance({ address: testClients.account });
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
