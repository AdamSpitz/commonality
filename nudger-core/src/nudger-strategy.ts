import type { SDKMachinery, IpfsCidV1 } from '@commonality/sdk';
import type { NudgerConfig, NudgeMessage } from './signer.js';

export interface NudgerStrategy<TConfig extends NudgerConfig = NudgerConfig> {
  name: string;
  generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    config: TConfig
  ): Promise<NudgeMessage[]>;
}
