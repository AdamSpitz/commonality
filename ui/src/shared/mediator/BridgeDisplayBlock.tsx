import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'

export interface MediatorBridgeAnchor {
  id: string
  cluster_id: string
  role: string
  text: string
  tally_cid: string | null
  topic_tag: string
  rationale: string
  status: 'active' | 'retired' | 'proposed'
  featured: boolean
  created_at: string
  last_reviewed_at: string
}

export interface MediatorBridgeCard {
  id: string
  topic: string
  createdAt: string
  sideA: MediatorBridgeAnchor
  sideB: MediatorBridgeAnchor
  commonGround: MediatorBridgeAnchor
}

export interface BridgeLabels {
  sideA: string
  sideB: string
}

export async function fetchFeaturedMediatorAnchors(
  serviceUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<MediatorBridgeAnchor[]> {
  const response = await fetcher(`${serviceUrl.replace(/\/+$/, '')}/anchors?featured=true`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Mediator anchors request failed: HTTP ${response.status}`)
  const payload = await response.json() as { anchors?: unknown }
  if (!Array.isArray(payload.anchors) || !payload.anchors.every(isMediatorBridgeAnchor)) {
    throw new Error('Mediator anchors response must contain valid anchor records')
  }
  return payload.anchors
}

function isMediatorBridgeAnchor(value: unknown): value is MediatorBridgeAnchor {
  if (!value || typeof value !== 'object') return false
  const anchor = value as Record<string, unknown>
  return typeof anchor.id === 'string'
    && typeof anchor.cluster_id === 'string'
    && typeof anchor.role === 'string'
    && typeof anchor.text === 'string'
    && (anchor.tally_cid === null || typeof anchor.tally_cid === 'string')
    && typeof anchor.topic_tag === 'string'
    && typeof anchor.rationale === 'string'
    && (anchor.status === 'active' || anchor.status === 'retired' || anchor.status === 'proposed')
    && typeof anchor.featured === 'boolean'
    && typeof anchor.created_at === 'string'
    && typeof anchor.last_reviewed_at === 'string'
}

export function buildMediatorBridgeCards(anchors: MediatorBridgeAnchor[]): MediatorBridgeCard[] {
  const clusters = new Map<string, MediatorBridgeAnchor[]>()
  for (const anchor of anchors) clusters.set(anchor.cluster_id, [...(clusters.get(anchor.cluster_id) ?? []), anchor])
  return Array.from(clusters.entries()).flatMap(([id, cluster]) => {
    const sideA = cluster.find((anchor) => anchor.role === 'side-a' || anchor.role === 'moderate-left')
    const sideB = cluster.find((anchor) => anchor.role === 'side-b' || anchor.role === 'moderate-right')
    const commonGround = cluster.find((anchor) => anchor.role === 'common-ground')
    return sideA && sideB && commonGround
      ? [{ id, topic: commonGround.topic_tag, createdAt: commonGround.created_at, sideA, sideB, commonGround }]
      : []
  }).sort((a, b) => a.topic.localeCompare(b.topic) || a.createdAt.localeCompare(b.createdAt))
}

const EMPTY_ANCHORS: MediatorBridgeAnchor[] = []

export function useMediatorAnchors(options: {
  serviceUrl?: string
  fallbackAnchors?: MediatorBridgeAnchor[]
}): { anchors: MediatorBridgeAnchor[]; loading: boolean; warning?: string } {
  const { serviceUrl } = options
  const fallbackAnchors = options.fallbackAnchors ?? EMPTY_ANCHORS
  const [anchors, setAnchors] = useState(fallbackAnchors)
  const [loading, setLoading] = useState(Boolean(serviceUrl))
  const [warning, setWarning] = useState<string>()
  useEffect(() => {
    let cancelled = false
    if (!serviceUrl) {
      setAnchors(fallbackAnchors)
      setLoading(false)
      setWarning(undefined)
      return () => { cancelled = true }
    }
    setAnchors(fallbackAnchors)
    setWarning(undefined)
    setLoading(true)
    void fetchFeaturedMediatorAnchors(serviceUrl)
      .then((next) => { if (!cancelled) { setAnchors(next); setWarning(undefined) } })
      .catch(() => { if (!cancelled) { setAnchors(fallbackAnchors); setWarning('Live mediator bridges are unavailable; showing the bundled reference set.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [serviceUrl, fallbackAnchors])
  return { anchors, loading, warning }
}

function formatTopic(topic: string): string {
  return topic.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function BridgeDisplayBlock({
  serviceUrl,
  fallbackAnchors,
  labels,
  statementHref,
  title = 'Common-ground bridges',
  description,
}: {
  serviceUrl?: string
  fallbackAnchors?: MediatorBridgeAnchor[]
  labels: BridgeLabels
  statementHref: (anchor: MediatorBridgeAnchor) => string
  title?: string
  description?: string
}) {
  const { anchors, loading, warning } = useMediatorAnchors({ serviceUrl, fallbackAnchors })
  const cards = useMemo(() => buildMediatorBridgeCards(anchors), [anchors])
  const topics = useMemo(() => Array.from(new Set(cards.map((card) => card.topic))).sort(), [cards])
  const [topic, setTopic] = useState('all')
  const visible = topic === 'all' ? cards : cards.filter((card) => card.topic === topic)
  return <Box>
    <Typography variant="h4" component="h1" gutterBottom>{title}</Typography>
    {description && <Typography color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>}
    {warning && <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert>}
    {loading && cards.length === 0 && <Typography color="text.secondary">Loading featured bridges…</Typography>}
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }} aria-label="Bridge topic filters">
      <Chip label="All" clickable color={topic === 'all' ? 'primary' : 'default'} onClick={() => setTopic('all')} />
      {topics.map((value) => <Chip key={value} label={formatTopic(value)} clickable color={topic === value ? 'primary' : 'default'} onClick={() => setTopic(value)} />)}
    </Stack>
    <Stack spacing={3}>{visible.map((bridge) => <Paper key={bridge.id} sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={2}>
        <Chip label={formatTopic(bridge.topic)} size="small" sx={{ alignSelf: 'flex-start' }} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="overline">{labels.sideA} starting point</Typography><Typography>{bridge.sideA.text}</Typography></Paper>
          <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="overline">{labels.sideB} starting point</Typography><Typography>{bridge.sideB.text}</Typography></Paper>
        </Box>
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}><Typography variant="overline" color="primary.main">Common ground both can sign</Typography><Typography variant="h6">{bridge.commonGround.text}</Typography></Paper>
        <Button component="a" href={statementHref(bridge.commonGround)} variant="contained" sx={{ alignSelf: 'flex-start' }}>View and sign</Button>
      </Stack>
    </Paper>)}</Stack>
  </Box>
}
