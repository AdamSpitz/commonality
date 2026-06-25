import type { RawEvent } from '../events-common.js';

export interface NudgesPublishedEvent extends RawEvent {
  nudger: `0x${string}`;
  publicationCid: string;  // CIDv1
}
