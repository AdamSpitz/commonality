import { useMemo, useState } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom'
import { getRuntimeConfigValue, loadTrustedContentAttesters } from '../../shared'
import { useContentFundingState } from '../hooks/useContentFundingState'
import { contentChannelPath, contentItemPublicUrl } from '../selectAlignedContent'
import { CONTENT_PROPERTIES, getContentProperty } from '../properties'
import {
  applyPropertyBoardScope,
  readFollowedChannels,
  readHiddenPropertyItems,
  selectPropertyBoardItems,
  writeFollowedChannels,
  writeHiddenPropertyItems,
  type PropertyBoardScope,
} from '../propertyBoard'

function parseScope(value: string | null): PropertyBoardScope {
  if (value === 'channel' || value === 'following') return value
  return 'unwrapped'
}

export function PropertyIndexPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Content properties
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        A property is a configured content check. Its board lists posts a trusted attester has marked as having that property, including posts that are not wrapped in a contract yet. Civility is the first check.
      </Typography>
      <Stack spacing={2}>
        {CONTENT_PROPERTIES.map((property) => {
          return (
            <Paper key={property.id} sx={{ p: 2 }}>
              <Typography variant="h6">{property.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{property.summary}</Typography>
              <Button component={RouterLink} to={`/explore/${property.id}`} variant="contained">
                Open the {property.label} board
              </Button>
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}

export function PropertyBoardRoute() {
  const { propertyId = '' } = useParams()
  return <PropertyBoardPage propertyId={propertyId} />
}

export function PropertyBoardPage({ propertyId }: { propertyId: string }) {
  const property = getContentProperty(propertyId)
  const topicCid = property?.usesNoninflammatoryTopic
    ? (getRuntimeConfigValue('VITE_NONINFLAMMATORY_TOPIC_CID') || '').trim()
    : ''
  const { channels, contentAttestations, loading, error } = useContentFundingState()
  const [searchParams, setSearchParams] = useSearchParams()
  const scope = parseScope(searchParams.get('scope'))
  const channelFilter = searchParams.get('channel') ?? ''
  const [followed, setFollowed] = useState(() => readFollowedChannels(window.localStorage))
  const [hidden, setHidden] = useState(() => readHiddenPropertyItems(window.localStorage))
  const trustedAddresses = loadTrustedContentAttesters().map((entry) => entry.address)
  const items = useMemo(() => {
    if (!topicCid) return []
    const marked = selectPropertyBoardItems(channels, contentAttestations, topicCid, trustedAddresses)
    return applyPropertyBoardScope(marked, scope, {
      channelCanonicalId: channelFilter,
      followedChannels: followed,
      hidden,
    })
  }, [channels, contentAttestations, topicCid, trustedAddresses, scope, channelFilter, followed, hidden])

  if (!property) {
    return (
      <Alert severity="warning">That content property is not configured.</Alert>
    )
  }

  const setScope = (next: PropertyBoardScope) => {
    const params = new URLSearchParams(searchParams)
    params.set('scope', next)
    setSearchParams(params)
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {property.label}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
        {property.summary} This list is capped. Hide a post to keep it off your board. Posts that passed the check before anyone registered them are not listed: the attestation stores only a hash of the post id.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <Button component={RouterLink} to={`/explore/${property.id}/fund`} variant="contained">
          Put money on this property
        </Button>
        <Button component={RouterLink} to="/explore" variant="outlined">All properties</Button>
      </Stack>
      {!topicCid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This build has no noninflammatory statement configured, so the board cannot tell which posts passed the check.
        </Alert>
      )}
      {trustedAddresses.length === 0 && topicCid && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have not chosen content attesters, so every positive mark for this property is shown.
        </Alert>
      )}
      <ToggleButtonGroup
        exclusive
        value={scope}
        onChange={(_event, next: PropertyBoardScope | null) => { if (next) setScope(next) }}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="unwrapped">Not in a contract</ToggleButton>
        <ToggleButton value="channel">One channel</ToggleButton>
        <ToggleButton value="following">Channels you follow</ToggleButton>
      </ToggleButtonGroup>
      {scope === 'channel' && (
        <TextField
          label="Channel id"
          placeholder="twitter:uid:123"
          value={channelFilter}
          onChange={(event) => {
            const params = new URLSearchParams(searchParams)
            params.set('scope', 'channel')
            params.set('channel', event.target.value.trim())
            setSearchParams(params)
          }}
          fullWidth
          sx={{ mb: 2, maxWidth: 520 }}
        />
      )}
      {loading && <Typography role="status">Loading attested posts…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && topicCid && items.length === 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography>No attested posts in this scope.</Typography>
        </Paper>
      )}
      <Stack spacing={1.5}>
        {items.map((item) => {
          const publicUrl = contentItemPublicUrl(item.canonicalId)
          const channelPath = contentChannelPath(item.channelCanonicalId)
          const following = Boolean(item.channelCanonicalId && followed.has(item.channelCanonicalId))
          return (
            <Paper key={item.canonicalId} sx={{ p: 2 }}>
              <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{item.canonicalId}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {item.inOpenContract ? 'Already in a contract' : 'Not in an open contract'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {publicUrl && <Button component="a" href={publicUrl} target="_blank" rel="noreferrer" size="small">Open post</Button>}
                {channelPath && <Button component={RouterLink} to={channelPath} size="small">Channel</Button>}
                {item.contractAddress && (
                  <Button component={RouterLink} to={`/content/contracts/${item.contractAddress}`} size="small">Contract</Button>
                )}
                {item.channelCanonicalId && (
                  <Button
                    size="small"
                    onClick={() => {
                      const next = new Set(followed)
                      if (following) next.delete(item.channelCanonicalId as string)
                      else next.add(item.channelCanonicalId as string)
                      writeFollowedChannels(window.localStorage, next)
                      setFollowed(next)
                    }}
                  >
                    {following ? 'Unfollow channel' : 'Follow channel'}
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => {
                    const next = new Set(hidden)
                    next.add(item.canonicalId)
                    writeHiddenPropertyItems(window.localStorage, next)
                    setHidden(next)
                  }}
                >
                  Hide
                </Button>
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}
