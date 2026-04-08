import {
  AlignmentAttestationsAbi,
  attestAlignment,
  createTestClients,
  hashCanonicalId,
  type IpfsCidV1,
  type TestClients,
} from '@commonality/sdk';
import { classifyBlockchainError } from '@commonality/attester-core';
import { loadConfig } from './config.js';

interface AlignmentAttestationsContract {
  address: `0x${string}`;
  abi: typeof AlignmentAttestationsAbi;
}

let testClients: TestClients | null = null;
let alignmentAttestationsContract: AlignmentAttestationsContract | null = null;

export function getBlockchainClients() {
  if (testClients && alignmentAttestationsContract) {
    return { testClients, alignmentAttestationsContract };
  }

  const config = loadConfig();

  try {
    testClients = createTestClients(
      config.ethereumPrivateKey as `0x${string}`,
      config.ethereumRpcUrl,
    );
  } catch (error) {
    throw classifyBlockchainError(error);
  }

  alignmentAttestationsContract = {
    address: config.alignmentAttestationsContractAddress as `0x${string}`,
    abi: AlignmentAttestationsAbi,
  };

  return { testClients, alignmentAttestationsContract };
}

export function getSubjectIdForContentCanonicalId(contentCanonicalId: string): `0x${string}` {
  return hashCanonicalId(contentCanonicalId);
}

export async function publishAttestation(
  contentCanonicalId: string,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1,
): Promise<string> {
  const { testClients, alignmentAttestationsContract } = getBlockchainClients();

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

export async function checkAttesterBalance(): Promise<{
  balance: bigint;
  hasSufficientFunds: boolean;
  minimumRequired: bigint;
}> {
  const { testClients } = getBlockchainClients();

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
