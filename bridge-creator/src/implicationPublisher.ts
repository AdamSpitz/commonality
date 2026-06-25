import { ImplicationsAbi } from '@commonality/sdk/abis';
import { attestImplication, type ImplicationsContract } from '@commonality/sdk/conceptspace';
import { createWriteClients, type IpfsCidV1, type WriteClients } from '@commonality/sdk/utils';

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
  createWriteClients: typeof createWriteClients;
  attestImplication: typeof attestImplication;
}

const defaultDependencies: BridgeImplicationPublisherDependencies = {
  createWriteClients,
  attestImplication,
};

export function createBridgeImplicationSubmitter(
  config: BridgeImplicationSubmissionConfig,
  dependencies: BridgeImplicationPublisherDependencies = defaultDependencies,
): BridgeImplicationSubmitter {
  const testClients = dependencies.createWriteClients(config.ethereumPrivateKey, config.ethereumRpcUrl);
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
    testClients: WriteClients;
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
