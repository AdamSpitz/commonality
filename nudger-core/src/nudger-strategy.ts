import type { SDKMachinery, IpfsCidV1 } from '@commonality/sdk';
import type { NudgerConfig, NudgeMessage } from './signer.js';

export interface NudgerStrategy {
  name: string;
  generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    config: NudgerConfig
  ): Promise<NudgeMessage[]>;
}
