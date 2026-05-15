import {
  AlignmentAttestationsAbi,
  attestAlignment,
  createTestClients,
  hashCanonicalId,
  type IpfsCidV1,
  type TestClients,
} from '@commonality/sdk';

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
  const testClients = createTestClients(
    config.ethereumPrivateKey as `0x${string}`,
    config.ethereumRpcUrl,
  );
  const alignmentAttestationsContract: AlignmentAttestationsContract = {
    address: config.alignmentAttestationsContractAddress as `0x${string}`,
    abi: AlignmentAttestationsAbi,
  };

  return { testClients, alignmentAttestationsContract };
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
  return attestAlignment(
    testClients,
    alignmentAttestationsContract,
    getSubjectIdForContentCanonicalId(contentCanonicalId),
    statementCid,
    topicStatementCid,
  );
}
