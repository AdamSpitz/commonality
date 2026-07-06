export type BridgeAnchorRole = 'moderate-left' | 'moderate-right' | 'common-ground'
export type BridgeAnchorStatus = 'active' | 'retired' | 'proposed'

export interface BridgeAnchorRecord {
  id: string
  cluster_id: string
  role: string
  text: string
  tally_cid: string | null
  topic_tag: string
  rationale: string
  status: BridgeAnchorStatus
  featured: boolean
  created_at: string
  last_reviewed_at: string
}

export interface BridgeCardModel {
  id: string
  topic: string
  createdAt: string
  moderateLeft: BridgeAnchorRecord
  moderateRight: BridgeAnchorRecord
  commonGround: BridgeAnchorRecord
}

const seedBridgeAnchors: BridgeAnchorRecord[] = [
  {
    id: 'abortion-moderate-left-v1',
    cluster_id: 'abortion-v1',
    role: 'moderate-left',
    text: "Abortion should be available at least through the first trimester. After that it gets complicated and I'm open to restrictions.",
    tally_cid: null,
    topic_tag: 'abortion',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-left variant for a compromise-oriented abortion bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'abortion-moderate-right-v1',
    cluster_id: 'abortion-v1',
    role: 'moderate-right',
    text: "I'm uncomfortable with abortion, but I understand early-term situations are different. Banning it completely isn't realistic and isn't what I'd want for my own family in a crisis.",
    tally_cid: null,
    topic_tag: 'abortion',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-right variant for a compromise-oriented abortion bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'abortion-common-ground-v1',
    cluster_id: 'abortion-v1',
    role: 'common-ground',
    text: "Early-term abortion should be available. Late-term abortion should be restricted except in serious medical situations. I'd rather have a reasonable policy both sides can live with than fight forever over an absolute position neither side can win.",
    tally_cid: 'bafybeieapyat4uy4rfqmeznaafl3tn64enzgycbgaqgmlm23q4bt2r3c2q',
    topic_tag: 'abortion',
    rationale: 'Seeded from hidden-majority curated statements as the common-ground anchor for abortion.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'immigration-moderate-left-v1',
    cluster_id: 'immigration-v1',
    role: 'moderate-left',
    text: "I'm fine with enforcing immigration laws, especially against people who've committed other crimes. But ripping apart families who've been here for decades and are otherwise law-abiding seems cruel and pointless.",
    tally_cid: null,
    topic_tag: 'immigration',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-left variant for an immigration bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'immigration-moderate-right-v1',
    cluster_id: 'immigration-v1',
    role: 'moderate-right',
    text: "Illegal immigration is a real problem and we need to enforce the law. But obviously the violent criminals are the priority, and I understand that mass deportation of millions of peaceful people isn't practical or necessarily desirable.",
    tally_cid: null,
    topic_tag: 'immigration',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-right variant for an immigration bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'immigration-common-ground-v1',
    cluster_id: 'immigration-v1',
    role: 'common-ground',
    text: "Deport illegal immigrants who are also criminals. For peaceful long-term residents, find a practical solution that doesn't pretend the law doesn't exist but also doesn't destroy families for no good reason. And fix the legal immigration system so fewer people feel the need to come illegally.",
    tally_cid: 'bafybeiehim7wsgd35doqihxyzawz2zt4zegdhntbw2mmkrh7wcg2oj5c6m',
    topic_tag: 'immigration',
    rationale: 'Seeded from hidden-majority curated statements as the common-ground anchor for immigration.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'gun-policy-moderate-left-v1',
    cluster_id: 'gun-policy-v1',
    role: 'moderate-left',
    text: "I don't want to ban guns. I just want basic stuff — background checks, maybe waiting periods. I'm fine with responsible people owning firearms.",
    tally_cid: null,
    topic_tag: 'gun-policy',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-left variant for a gun-policy bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'gun-policy-moderate-right-v1',
    cluster_id: 'gun-policy-v1',
    role: 'moderate-right',
    text: "I'm a gun owner and I support the Second Amendment, but I don't think convicted violent felons should be able to buy guns at a gun show with no background check. That's just common sense.",
    tally_cid: null,
    topic_tag: 'gun-policy',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-right variant for a gun-policy bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'gun-policy-common-ground-v1',
    cluster_id: 'gun-policy-v1',
    role: 'common-ground',
    text: "Law-abiding people should be able to own guns. Universal background checks are reasonable. The debate about which specific weapons to regulate is real, but the idea that 'the other side' wants to either ban all guns or hand them to criminals is a fantasy.",
    tally_cid: 'bafybeieazweue53u6uxqsuyd6e4iwackl3d5grwpkhagv4zs3seyxhth7q',
    topic_tag: 'gun-policy',
    rationale: 'Seeded from hidden-majority curated statements as the common-ground anchor for gun policy.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'drug-policy-moderate-left-v1',
    cluster_id: 'drug-policy-v1',
    role: 'moderate-left',
    text: "Marijuana should be legal. For harder drugs, I'd rather see treatment than prison, but I don't think heroin should be sold at the corner store.",
    tally_cid: null,
    topic_tag: 'drug-policy',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-left variant for a drug-policy bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'drug-policy-moderate-right-v1',
    cluster_id: 'drug-policy-v1',
    role: 'moderate-right',
    text: "I think drug use is destructive and I don't love the idea of legalizing it all. But I can see that filling prisons with nonviolent drug offenders isn't working, and I'm open to treatment-focused approaches if they actually reduce drug use.",
    tally_cid: null,
    topic_tag: 'drug-policy',
    rationale: 'Seeded from hidden-majority curated statements as the moderate-right variant for a drug-policy bridge cluster.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
  {
    id: 'drug-policy-common-ground-v1',
    cluster_id: 'drug-policy-v1',
    role: 'common-ground',
    text: 'Marijuana should probably be legal and regulated like alcohol. For hard drugs, treatment is usually better than prison for users, but dealers and traffickers should face serious consequences. The goal is fewer people ruining their lives with drugs, and we should do what actually works toward that goal.',
    tally_cid: 'bafybeici37535ecl4byld75o7bs7u7k3dttcf2oobfeoq23zbta7ipa4sm',
    topic_tag: 'drug-policy',
    rationale: 'Seeded from hidden-majority curated statements as the common-ground anchor for drug policy.',
    status: 'active',
    featured: true,
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
  },
]

export const csmBridgeAnchors = seedBridgeAnchors.filter((anchor) => anchor.status === 'active' && anchor.featured)

export function buildCompleteBridgeCards(anchors: BridgeAnchorRecord[]): BridgeCardModel[] {
  const clusters = new Map<string, BridgeAnchorRecord[]>()
  for (const anchor of anchors) {
    const cluster = clusters.get(anchor.cluster_id) ?? []
    cluster.push(anchor)
    clusters.set(anchor.cluster_id, cluster)
  }

  return Array.from(clusters.entries()).flatMap(([clusterId, cluster]) => {
    const moderateLeft = cluster.find((anchor) => anchor.role === 'moderate-left')
    const moderateRight = cluster.find((anchor) => anchor.role === 'moderate-right')
    const commonGround = cluster.find((anchor) => anchor.role === 'common-ground')

    if (!moderateLeft || !moderateRight || !commonGround) {
      return []
    }

    return [{ id: clusterId, topic: commonGround.topic_tag, createdAt: commonGround.created_at, moderateLeft, moderateRight, commonGround }]
  }).sort((a, b) => a.topic.localeCompare(b.topic) || a.createdAt.localeCompare(b.createdAt))
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

/**
 * Featured common-ground anchors that already have a live Tally statement (a
 * real `tally_cid`), i.e. the ones we can link directly to a signable page
 * rather than a placeholder prompt.
 */
export function getSignableCommonGroundAnchors(bridges: BridgeCardModel[]): BridgeAnchorRecord[] {
  return bridges.map((bridge) => bridge.commonGround).filter((anchor) => Boolean(anchor.tally_cid))
}
