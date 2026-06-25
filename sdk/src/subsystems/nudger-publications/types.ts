import { IpfsCidV1 } from "../../utils/cid-types.js";

export interface NudgeMessage {
  targetStatementCid: IpfsCidV1;
  suggestedStatementCid: IpfsCidV1;
  reason: string;
  confidence: number;
}

export interface NudgeRevocation {
  targetStatementCid: IpfsCidV1;
  suggestedStatementCid: IpfsCidV1;
}

export interface NudgerPublicationBase {
  kind: string;
  schemaVersion: 1;
  nudger: `0x${string}`;
  publishedAt: number;
  publicationCid: IpfsCidV1;
}

export interface NudgeBatchPublication extends NudgerPublicationBase {
  kind: 'nudge-batch';
  nudges: NudgeMessage[];
  revocations: NudgeRevocation[];
}

export interface CuratedCollectionEntry {
  cid: IpfsCidV1;
  label: string;
  topicArea: string;
  parentCid?: IpfsCidV1;
}

export interface CuratedCollectionPublication extends NudgerPublicationBase {
  kind: 'curated-collection';
  stream: string;
  entries: CuratedCollectionEntry[];
}

export type NudgerPublication =
  | NudgeBatchPublication
  | CuratedCollectionPublication;

export interface FoldedNudge extends NudgeMessage {
  nudger: `0x${string}`;
  publishedAt: number;
  publicationCid: IpfsCidV1;
}

export interface FoldedCuratedCollection {
  nudger: `0x${string}`;
  stream: string;
  publishedAt: number;
  publicationCid: IpfsCidV1;
  entries: CuratedCollectionEntry[];
}
