import { BeliefsAbi, ImplicationsAbi } from '../../abis.js';
import { bytes32ToCid } from '../cid-types.js';
import type { RawEventFromCache } from '../eventCacheClient.js';
import { decodeRawEventArgs, decodedLogMeta } from '../decodeRawEvent.js';

export interface DecodedDirectSupportEvent {
  chainId?: number;
  user: `0x${string}`;
  statementId: string;
  beliefState: number;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export interface DecodedImplicationAttestationEvent {
  chainId?: number;
  attester: `0x${string}`;
  fromStatementCid: string;
  toStatementCid: string;
  explanationCid: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export interface DecodedImplicationRevokedEvent {
  chainId?: number;
  attester: `0x${string}`;
  fromStatementCid: string;
  toStatementCid: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  revoked: true;
}

export function decodeDirectSupportEvent(rawEvent: RawEventFromCache): DecodedDirectSupportEvent | null {
  if (rawEvent.eventName !== 'DirectSupport') return null;
  const args = decodeRawEventArgs(rawEvent, BeliefsAbi);
  if (!args) return null;
  return {
    chainId: rawEvent.chainId,
    user: args.user as `0x${string}`,
    statementId: bytes32ToCid(args.statementId as `0x${string}`),
    beliefState: Number(args.beliefState),
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeImplicationAttestationEvent(
  rawEvent: RawEventFromCache,
): DecodedImplicationAttestationEvent | null {
  if (rawEvent.eventName !== 'ImplicationAttestation') return null;
  const args = decodeRawEventArgs(rawEvent, ImplicationsAbi);
  if (!args) return null;
  return {
    chainId: rawEvent.chainId,
    attester: args.attester as `0x${string}`,
    fromStatementCid: bytes32ToCid(args.fromStatementCid as `0x${string}`),
    toStatementCid: bytes32ToCid(args.toStatementCid as `0x${string}`),
    explanationCid: args.explanationCid ? bytes32ToCid(args.explanationCid as `0x${string}`) : '',
    ...decodedLogMeta(rawEvent),
  };
}

export function decodeImplicationRevokedEvent(
  rawEvent: RawEventFromCache,
): DecodedImplicationRevokedEvent | null {
  if (rawEvent.eventName !== 'ImplicationRevoked') return null;
  const args = decodeRawEventArgs(rawEvent, ImplicationsAbi);
  if (!args) return null;
  return {
    chainId: rawEvent.chainId,
    attester: args.attester as `0x${string}`,
    fromStatementCid: bytes32ToCid(args.fromStatementCid as `0x${string}`),
    toStatementCid: bytes32ToCid(args.toStatementCid as `0x${string}`),
    ...decodedLogMeta(rawEvent),
    revoked: true,
  };
}
