import { Box, Button, CircularProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { presentCampaignSummary } from '@ui/shared'
import type { BridgeClusterFields } from '../lib/bridgeCluster'
import { parentToModifiedNudges } from '../lib/bridgeNudges'
import { campStories, type CampStory, type ClusterLayout } from '../lib/bridgeClusterReader'
import { stableCausePath } from '../lib/causeRoster'
import { ClusterMediatorOptIn } from './ClusterMediatorOptIn'

function FlowArrow({ kind, label }: { kind: 'nudge' | 'implication'; label: string }) {
  const color = kind === 'nudge' ? 'warning.main' : 'primary.main'
  return (
    <Stack alignItems="center" spacing={0.25} aria-hidden>
      <Box sx={{ width: kind === 'nudge' ? 0 : 2, height: 22, borderLeft: kind === 'nudge' ? '2px dashed' : 'none', borderColor: color, bgcolor: kind === 'implication' ? color : 'transparent' }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color }}>
        {label}
      </Typography>
      <Box sx={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid', borderTopColor: color }} />
    </Stack>
  )
}

function StatementCard({
  kicker,
  text,
  cid,
  caption,
}: {
  kicker: string
  text: string
  cid?: string
  caption?: string
}) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="overline" sx={{ letterSpacing: '0.08em', color: 'text.secondary' }}>{kicker}</Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>{presentCampaignSummary(text)}</Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{caption}</Typography>
      )}
      {cid && (
        <Link component={RouterLink} to={`/statement/${encodeURIComponent(cid)}`} variant="body2" sx={{ display: 'inline-block', mt: 1 }}>
          Read and sign
        </Link>
      )}
    </Paper>
  )
}

function groundOf(stories: CampStory[], bridgePlanks: Array<{ cid: string; text: string }>): { text: string; cid?: string } {
  for (const story of stories) {
    const hit = story.implications[0]
    if (hit?.toText) return { text: hit.toText, cid: hit.toCid }
  }
  const plank = bridgePlanks.find((item) => item.text)
  return { text: plank?.text || 'Common ground', cid: plank?.cid }
}

/** Every camp at once: natural above its wording, both wordings meeting on one statement. */
function Convergence({
  stories,
  ground,
}: {
  stories: CampStory[]
  ground: { text: string; cid?: string }
}) {
  const line = 'primary.main'
  return (
    <Box data-testid="bridge-convergence">
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        {stories.map((story, index) => {
          const last = index === stories.length - 1
          const pairs = story.nudges.length > 0
            ? story.nudges
            : story.natural.map((plank) => ({
              fromCid: plank.cid,
              toCid: '',
              fromText: plank.text,
              toText: '',
            }))
          return (
            <Box key={story.id} data-testid={`bridge-camp-${story.shortName}`} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', px: 0.75 }}>
              {pairs.map((pair) => (
                <Stack key={`${pair.fromCid}->${pair.toCid}`} spacing={0.25} sx={{ flex: 1 }}>
                  <StatementCard kicker={`${story.shortName} already says`} text={pair.fromText} cid={pair.fromCid} />
                  {pair.toText && (
                    <>
                      <FlowArrow kind="nudge" label="You might also sign" />
                      <StatementCard
                        kicker={`${story.shortName} wording`}
                        text={pair.toText}
                        cid={pair.toCid}
                        caption="A wording of this side. Not an official revision."
                      />
                    </>
                  )}
                </Stack>
              ))}
              <Box sx={{ width: 2, height: 14, bgcolor: line, mx: 'auto' }} />
              <Box sx={{ display: 'flex', height: 0, mx: -0.75 }}>
                <Box sx={{ flex: 1, borderTop: index === 0 ? 'none' : '2px solid', borderColor: line }} />
                <Box sx={{ flex: 1, borderTop: last ? 'none' : '2px solid', borderColor: line }} />
              </Box>
            </Box>
          )
        })}
      </Box>
      <Box sx={{ width: 2, height: 18, bgcolor: line, mx: 'auto' }} />
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontWeight: 700, color: 'primary.main', mb: 0.75 }}>
        both support
      </Typography>
      <StatementCard kicker="Common ground" text={ground.text} cid={ground.cid} />
    </Box>
  )
}

export function BridgeClusterPublished({
  fields,
  layout,
  isMediator,
  busy,
  status,
  onSubmitPairs,
  onPublishNudges,
}: {
  fields: BridgeClusterFields
  layout: ClusterLayout | null
  isMediator: boolean
  busy: boolean
  status: string | null
  onSubmitPairs: () => void
  onPublishNudges: () => void
}) {
  const stories = layout ? campStories(layout) : []
  const bridgeTitle = layout?.bridge.title.trim() || 'Shared bridge'
  const sentence = fields.mediatorNote.trim() || layout?.bridge.summary.trim() || ''
  const bridgePlanks = layout?.bridge.planks ?? []

  return (
    <Stack spacing={2.5} data-testid="bridge-cluster-page">
      <Stack spacing={0.75}>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Bridge
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          {bridgeTitle}
        </Typography>
        {sentence && (
          <Typography variant="body1" color="text.secondary">{presentCampaignSummary(sentence)}</Typography>
        )}
        <Typography variant="body2" color="text.secondary">Proposed by {fields.mediatorName}</Typography>
      </Stack>

      {!layout && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading the camps in this bridge…</Typography>
        </Stack>
      )}

      {layout && stories.length > 0 && (
        <Stack spacing={2}>
          <Typography variant="body1">
            Each side keeps its own statement. A wording of that side is something you might also sign. Both wordings support the same common ground.
          </Typography>
          <Convergence stories={stories} ground={groundOf(stories, bridgePlanks)} />
          <Typography variant="body2">
            {layout.camps.map((row) => {
              const name = stories.find((story) => story.id === `${row.parent.owner}/${row.parent.slug}`)?.shortName
              return (
              <span key={`${row.parent.owner}/${row.parent.slug}`}>
                <Link component={RouterLink} to={stableCausePath(row.parent)}>
                  {name} cause
                </Link>
                {row.modified && (
                  <>
                    {' · '}
                    <Link component={RouterLink} to={stableCausePath(row.modified)}>wording</Link>
                  </>
                )}
                {' · '}
              </span>
              )
            })}
            <Link component={RouterLink} to={stableCausePath(layout.bridge)}>Shared bridge</Link>
          </Typography>
        </Stack>
      )}

      <ClusterMediatorOptIn fields={fields} />

      {isMediator && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} data-testid="bridge-mediator-tools">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Your tools</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Submit the recorded pairs for attestation, or publish suggestions that point each camp at your wording of their side.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" disabled={busy} sx={{ textTransform: 'none' }} onClick={onSubmitPairs} data-testid="bridge-submit-pairs">
              Submit pairs to attester
            </Button>
            <Button
              variant="outlined"
              disabled={busy || parentToModifiedNudges(fields.pairs).length === 0}
              sx={{ textTransform: 'none' }}
              onClick={onPublishNudges}
              data-testid="bridge-publish-nudges"
            >
              Publish suggestions
            </Button>
          </Stack>
        </Paper>
      )}

      {status && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }} data-testid="bridge-cluster-status">
          {status}
        </Typography>
      )}
    </Stack>
  )
}
