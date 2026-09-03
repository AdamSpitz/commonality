import { AlignmentAttestationsAbi } from '../../abis.js';
import { bytes32ToCid } from '../cid-types.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

type AlignmentLike = {
  attester: `0x${string}`;
  subjectId: `0x${string}`;
  statementId: string;
  topicStatementId?: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
};

function decodeAlignmentLike(
  rawEvent: RawEventFromCache,
  eventName: string,
): AlignmentLike | null {
  if (rawEvent.eventName !== eventName) return null;
  const args = decodeRawEventArgs(rawEvent, AlignmentAttestationsAbi);
  if (!args) return null;
  return {
    attester: args.attester as `0x${string}`,
    subjectId: args.subjectId as `0x${string}`,
    statementId: bytes32ToCid(args.statementId as `0x${string}`),
    topicStatementId: args.topicStatementId
      ? bytes32ToCid(args.topicStatementId as `0x${string}`)
      : undefined,
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeAlignmentAttestationEvent(rawEvent: RawEventFromCache): AlignmentLike | null {
  return decodeAlignmentLike(rawEvent, 'AlignmentAttestation');
}

export function decodeAlignmentRevokedEvent(
  rawEvent: RawEventFromCache,
): (AlignmentLike & { revoked: true }) | null {
  const decoded = decodeAlignmentLike(rawEvent, 'AlignmentRevoked');
  if (!decoded) return null;
  return { ...decoded, revoked: true };
}

export function decodeSuccessAttestationEvent(rawEvent: RawEventFromCache): AlignmentLike | null {
  return decodeAlignmentLike(rawEvent, 'SuccessAttestation');
}

export function decodeSuccessRevokedEvent(
  rawEvent: RawEventFromCache,
): (AlignmentLike & { revoked: true }) | null {
  const decoded = decodeAlignmentLike(rawEvent, 'SuccessRevoked');
  if (!decoded) return null;
  return { ...decoded, revoked: true };
}
