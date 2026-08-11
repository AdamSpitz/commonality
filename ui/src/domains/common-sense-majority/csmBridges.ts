import {
  buildMediatorBridgeCards,
  fetchFeaturedMediatorAnchors,
  type MediatorBridgeAnchor,
  type MediatorBridgeCard,
} from '../../shared'
import { csmFallbackAnchors } from './csmFallbackAnchors'

export type BridgeAnchorRole = 'side-a' | 'side-b' | 'common-ground'
export type BridgeAnchorStatus = 'active' | 'retired' | 'proposed'
export type BridgeAnchorRecord = MediatorBridgeAnchor
export type BridgeCardModel = MediatorBridgeCard & {
  moderateLeft: MediatorBridgeAnchor
  moderateRight: MediatorBridgeAnchor
}

/** CSM compatibility export; live pages replace this set when a service URL is configured. */
export const csmBridgeAnchors = csmFallbackAnchors
export const fetchFeaturedBridgeAnchors = fetchFeaturedMediatorAnchors

export function buildCompleteBridgeCards(anchors: BridgeAnchorRecord[]): BridgeCardModel[] {
  return buildMediatorBridgeCards(anchors).map((card) => ({
    ...card,
    moderateLeft: card.sideA,
    moderateRight: card.sideB,
  }))
}
export function getBridgeTopics(bridges: BridgeCardModel[]): string[] {
  return Array.from(new Set(bridges.map((bridge) => bridge.topic))).sort((a, b) => a.localeCompare(b))
}
export function formatBridgeTopic(topic: string): string {
  return topic.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
export function getBridgeAnchorTallyPath(anchor: Pick<BridgeAnchorRecord, 'tally_cid'>): string {
  return anchor.tally_cid ? `/statement/${encodeURIComponent(anchor.tally_cid)}` : '/statements'
}
export function getSignableCommonGroundAnchors(bridges: BridgeCardModel[]): BridgeAnchorRecord[] {
  return bridges.map((bridge) => bridge.commonGround).filter((anchor) => Boolean(anchor.tally_cid))
}
