import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const CAMPAIGN_HEARTBEAT_VERSION = 'commonality-campaign-heartbeat-v1' as const;

export type CampaignReplayMode = 'compress' | 'realtime';

export interface CampaignHeartbeat {
  version: typeof CAMPAIGN_HEARTBEAT_VERSION;
  campaignId: string;
  replay: CampaignReplayMode;
  startedAt: string;
  updatedAt: string;
  simNow: number;
  nextDueAtSim: number | null;
  dueLagSeconds: number;
  mined: number;
  failed: number;
  submitted: number;
  planned: number;
  stopped: boolean;
  nativeCost: string;
}

export async function persistCampaignHeartbeat(heartbeatPath: string, heartbeat: CampaignHeartbeat): Promise<void> {
  await mkdir(path.dirname(heartbeatPath), { recursive: true });
  const temporaryPath = `${heartbeatPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(heartbeat, null, 2)}\n`);
  await rename(temporaryPath, heartbeatPath);
}

export function parseCampaignReplayMode(value: string | undefined): CampaignReplayMode {
  const mode = value ?? 'compress';
  if (mode !== 'compress' && mode !== 'realtime') {
    throw new Error(`campaign replay must be compress or realtime, got ${mode}`);
  }
  return mode;
}
