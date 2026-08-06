import type { RawEvent } from '../events-common.js';

export interface ContentItemRegisteredEvent extends RawEvent {
  type: 'ContentItemRegistered';
  contentId: bigint;
  assuranceContract: `0x${string}`;
  canonicalId: string;
}

export interface ContentItemReleasedEvent extends RawEvent {
  type: 'ContentItemReleased';
  contentId: bigint;
}

export interface ChannelVerifiedEvent extends RawEvent {
  type: 'ChannelVerified';
  channelId: string;
  owner: `0x${string}`;
}

export interface ChannelControlTakenEvent extends RawEvent {
  type: 'ChannelControlTaken';
  channelId: string;
  owner: `0x${string}`;
}

export interface ContractVetoedEvent extends RawEvent {
  type: 'ContractVetoed';
  channelId: string;
  contractAddress: `0x${string}`;
}

export interface DepositedEvent extends RawEvent {
  type: 'Deposited';
  channelId: string;
  from: `0x${string}`;
  amount: bigint;
}

export interface WithdrawnEvent extends RawEvent {
  type: 'Withdrawn';
  channelId: string;
  to: `0x${string}`;
  amount: bigint;
}

export interface CreatorContractCreatedEvent extends RawEvent {
  type: 'CreatorContractCreated';
  contractAddress: `0x${string}`;
  channelId: string;
  creator: `0x${string}`;
  isThirdParty: boolean;
}

export interface ProspectiveRoundCreatedEvent extends RawEvent {
  type: 'ProspectiveRoundCreated'; round: `0x${string}`; channelId: string;
  receiptToken: `0x${string}`; receiptTokenId: bigint; condition: `0x${string}`;
}
export interface ProspectiveRoundMaterializedEvent extends RawEvent {
  type: 'ProspectiveRoundMaterialized'; round: `0x${string}`; tokenContract: `0x${string}`;
}
export interface ContentMaterializedEvent extends RawEvent {
  type: 'ContentMaterialized'; contentId: bigint; canonicalId: string;
}
export interface ContentTokenClaimedEvent extends RawEvent {
  type: 'ContentTokenClaimed'; account: `0x${string}`; contentId: bigint; amount: bigint;
}

export type ProspectiveContentEvent =
  | ProspectiveRoundCreatedEvent
  | ProspectiveRoundMaterializedEvent
  | ContentMaterializedEvent
  | ContentTokenClaimedEvent;

export type ContentFundingEvent =
  | ContentItemRegisteredEvent
  | ContentItemReleasedEvent
  | ChannelVerifiedEvent
  | ChannelControlTakenEvent
  | ContractVetoedEvent
  | DepositedEvent
  | WithdrawnEvent
  | CreatorContractCreatedEvent
  | ProspectiveRoundCreatedEvent
  | ProspectiveRoundMaterializedEvent
  | ContentMaterializedEvent
  | ContentTokenClaimedEvent;

export type ContentFundingEventNames =
  | 'ContentItemRegistered'
  | 'ContentItemReleased'
  | 'ChannelVerified'
  | 'ChannelControlTaken'
  | 'ContractVetoed'
  | 'Deposited'
  | 'Withdrawn'
  | 'CreatorContractCreated'
  | 'ProspectiveRoundCreated'
  | 'ProspectiveRoundMaterialized'
  | 'ContentMaterialized'
  | 'ContentTokenClaimed';