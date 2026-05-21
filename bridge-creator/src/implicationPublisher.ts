import {
  ImplicationsAbi,
  attestImplication,
  createTestClients,
  type ImplicationsContract,
  type IpfsCidV1,
  type TestClients,
} from '@commonality/sdk';

export interface BridgeImplicationSubmissionConfig {
  ethereumPrivateKey: `0x${string}`;
  ethereumRpcUrl: string;
  implicationsContractAddress: `0x${string}`;
}

export interface BridgeImplicationSubmission {
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
  explanationCid?: IpfsCidV1;
}

export interface BridgeImplicationSubmitter {
  submitImplication: (submission: BridgeImplicationSubmission) => Promise<string>;
  submitImplications: (submissions: BridgeImplicationSubmission[]) => Promise<string[]>;
}

export interface BridgeImplicationPublisherDependencies {
  createTestClients: typeof createTestClients;
  attestImplication: typeof attestImplication;
}

const defaultDependencies: BridgeImplicationPublisherDependencies = {
  createTestClients,
  attestImplication,
};

export function createBridgeImplicationSubmitter(
  config: BridgeImplicationSubmissionConfig,
  dependencies: BridgeImplicationPublisherDependencies = defaultDependencies,
): BridgeImplicationSubmitter {
  const testClients = dependencies.createTestClients(config.ethereumPrivateKey, config.ethereumRpcUrl);
  const implicationsContract: ImplicationsContract = {
    address: config.implicationsContractAddress,
    abi: ImplicationsAbi,
  };

  return {
    submitImplication: (submission) =>
      submitBridgeImplication(submission, { testClients, implicationsContract }, dependencies),
    submitImplications: async (submissions) => {
      const txHashes: string[] = [];
      for (const submission of submissions) {
        txHashes.push(
          await submitBridgeImplication(submission, { testClients, implicationsContract }, dependencies),
        );
      }
      return txHashes;
    },
  };
}

export async function submitBridgeImplication(
  submission: BridgeImplicationSubmission,
  context: {
    testClients: TestClients;
    implicationsContract: ImplicationsContract;
  },
  dependencies: Pick<BridgeImplicationPublisherDependencies, 'attestImplication'> = defaultDependencies,
): Promise<string> {
  return dependencies.attestImplication(
    context.testClients,
    context.implicationsContract,
    submission.fromStatementCid,
    submission.toStatementCid,
    submission.explanationCid,
  );
}
