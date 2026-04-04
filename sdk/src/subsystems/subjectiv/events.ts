import type { RawEvent } from '../events-common.js';

export interface TrustSetEvent extends RawEvent {
  truster: `0x${string}`;
  trustee: `0x${string}`;
  score: number;
}
