import {
  AlignmentAttestationsAbi,
  attestAlignment,
  createTestClients,
  hashCanonicalId,
  type IpfsCidV1,
  type TestClients,
} from '@commonality/sdk';
import { classifyBlockchainError } from '@commonality/attester-core';

export interface BeatAgentBlockchainConfig {
  ethereumPrivateKey: string;
  ethereumRpcUrl: string;
  alignmentAttestationsContractAddress: string;
}

interface AlignmentAttestationsContract {
  address: `0x${string}`;
  abi: typeof AlignmentAttestationsAbi;
}

export function getBeatAgentBlockchainClients(config: BeatAgentBlockchainConfig): {
  testClients: TestClients;
  alignmentAttestationsContract: AlignmentAttestationsContract;
} {
  try {
    const testClients = createTestClients(
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
