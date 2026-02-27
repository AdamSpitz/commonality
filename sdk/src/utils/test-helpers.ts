import { bytes32ToCid } from './cid-types.js';
import type { IpfsCidV1 } from './cid-types.js';

/**
 * Generate a deterministic but syntactically valid CIDv1 from an arbitrary string.
 *
 * For use in tests and fake-data generation only — not for production code.
 */
export function fakeIpfsCidV1(meaninglessValue: string): IpfsCidV1 {
  // Uses a simple FNV-1a-inspired hash (browser-compatible, no Node crypto needed).
  const encoded = new TextEncoder().encode(meaninglessValue);
  const out = new Uint8Array(32);
  for (let j = 0; j < 32; j++) {
    let h = (0x811c9dc5 ^ (j * 0x01000193)) >>> 0;
    for (const byte of encoded) {
      h = (Math.imul(h ^ byte, 0x01000193)) >>> 0;
    }
    out[j] = h & 0xff;
  }
  const digestHex = Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
  return bytes32ToCid(`0x${digestHex}`);
}
