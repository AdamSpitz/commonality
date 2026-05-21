import { createNudgerSigner, type NudgeMessage, type NudgeRevocation, type NudgerConfig } from '@commonality/nudger-core';
import type { IpfsCidV1 } from '@commonality/sdk';

export interface BridgePublicationResult {
  txHash: string;
  batchCid: IpfsCidV1;
}

export interface BridgeNudgePublisher {
  publishNudgeBatch: (
    nudges: NudgeMessage[],
    config: NudgerConfig,
    revocations?: NudgeRevocation[],
  ) => Promise<BridgePublicationResult>;
}

export function createBridgeNudgePublisher(config: NudgerConfig): BridgeNudgePublisher {
  const signer = createNudgerSigner(config);
  return {
    publishNudgeBatch: (nudges, publishConfig, revocations = []) =>
      signer.publishNudgeBatch(nudges, publishConfig, revocations),
  };
}

export async function publishBridgeNudgeBatch(
  nudges: NudgeMessage[],
  config: NudgerConfig,
  revocations: NudgeRevocation[] = [],
): Promise<BridgePublicationResult> {
  return createBridgeNudgePublisher(config).publishNudgeBatch(nudges, config, revocations);
}
