import type { SDKMachinery } from '@commonality/sdk/machinery';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import type { NudgerConfig, NudgeMessage } from './signer.js';

export interface NudgerStrategy<TConfig extends NudgerConfig = NudgerConfig> {
  name: string;
  generateNudges(
    machinery: SDKMachinery,
    targetStatementCid: IpfsCidV1,
    config: TConfig
  ): Promise<NudgeMessage[]>;
}
