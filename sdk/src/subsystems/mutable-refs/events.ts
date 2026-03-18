import type { RawEvent } from '../events-common.js';

export interface RefUpdatedEvent extends RawEvent {
  owner: `0x${string}`;
  name: string;
  currentRefValue: string;
}
