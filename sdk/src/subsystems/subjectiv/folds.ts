import type { TrustSetEvent } from './events.js';
import type { DirectTrustMapping } from './types.js';

/**
 * Fold TrustSet events into a truster's current direct trust mapping.
 * Last-write-wins per trustee. Zero-score entries are treated as revocations.
 */
export function foldDirectTrustMapping(events: TrustSetEvent[]): DirectTrustMapping {
  const latestByTrustee = new Map<string, number>();

  for (const event of events) {
    latestByTrustee.set(event.trustee.toLowerCase(), event.score);
  }

  const trustMapping: DirectTrustMapping = new Map();
  for (const [trustee, score] of latestByTrustee.entries()) {
    if (score > 0) {
      trustMapping.set(trustee, score);
    }
  }

  return trustMapping;
}
