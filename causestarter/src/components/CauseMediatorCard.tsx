import { useEffect, useState } from 'react'
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import type { CauseMediator } from '../lib/causeStore'
import { getDomainUrl } from '../lib/domainUrls'

interface FeaturedAnchor { id: string; role: string; text: string; topic_tag: string }

export function causeMediatorOptInPath(mediator: CauseMediator): string {
  const params = new URLSearchParams({
    addNudger: mediator.address,
    nudgerName: mediator.name,
    nudgerDescription: mediator.description,
    nudgerServiceUrl: mediator.serviceUrl,
    nudgerSourceType: 'bridge-creator',
  })
  return `/settings?${params.toString()}`
}

export function CauseMediatorCard({ mediator }: { mediator: CauseMediator }) {
  const [anchors, setAnchors] = useState<FeaturedAnchor[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    let cancelled = false
    setAnchors([])
    setError(false)
    void fetch(`${mediator.serviceUrl.replace(/\/+$/, '')}/anchors?featured=true`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json() as { anchors?: FeaturedAnchor[] }
        if (!cancelled) setAnchors((body.anchors ?? []).filter((anchor) => anchor.role === 'common-ground'))
      })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [mediator.serviceUrl])

  return <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
    <Stack spacing={1.5}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{mediator.name}</Typography>
      <Typography variant="body2" color="text.secondary">{mediator.description}</Typography>
      {error && <Alert severity="warning">The mediator service is currently unavailable.</Alert>}
      {anchors.slice(0, 3).map((anchor) => <Stack key={anchor.id} direction="row" spacing={1} alignItems="flex-start">
        <Chip size="small" label={anchor.topic_tag} />
        <Typography variant="body2">{anchor.text}</Typography>
      </Stack>)}
      <Button component="a" href={getDomainUrl('tally', causeMediatorOptInPath(mediator), '#')} target="_blank" rel="noreferrer" variant="contained" sx={{ alignSelf: 'flex-start' }}>
        Opt in to this mediator on Tally
      </Button>
    </Stack>
  </Paper>
}
