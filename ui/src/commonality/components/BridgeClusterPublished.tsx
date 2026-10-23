import { Box, Button, CircularProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { InfoLabel, presentCampaignSummary } from '@ui/shared'
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
  hint,
  text,
  cid,
  caption,
  causePath,
}: {
  kicker: string
  hint: string
  text: string
  cid?: string
  caption?: string
  causePath?: string
}) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="overline" component="div" sx={{ letterSpacing: '0.08em', color: 'text.secondary' }}>
        <InfoLabel title={hint}>{kicker}</InfoLabel>
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>{presentCampaignSummary(text)}</Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{caption}</Typography>
      )}
      {(cid || causePath) && (
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          {cid && (
            <Link component={RouterLink} to={`/statement/${encodeURIComponent(cid)}`} variant="body2">
              Open statement
            </Link>
          )}
          {causePath && (
            <Link component={RouterLink} to={causePath} variant="body2">
              Open cause board
            </Link>
          )}
        </Stack>
      )}
    </Paper>
  )
}

function groundOf(stories: CampStory[], bridgePlanks: Array<{ cid: string; text: string }>, bridgeCausePath: string): { text: string; cid?: string; causePath: string } {
  for (const story of stories) {
    const hit = story.implications[0]
    if (hit?.toText) return { text: hit.toText, cid: hit.toCid, causePath: bridgeCausePath }
  }
  const plank = bridgePlanks.find((item) => item.text)
  return { text: plank?.text || 'Common ground', cid: plank?.cid, causePath: bridgeCausePath }
}

/** Every camp at once: natural above its wording, both wordings meeting on one statement. */
function Convergence({
  stories,
  ground,
}: {
  stories: CampStory[]
  ground: { text: string; cid?: string; causePath: string }
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
                  <StatementCard
                    kicker={`${story.shortName}: natural wording`}
                    hint={`This is a statement that someone in the ${story.shortName} camp might naturally sign.`}
                    text={pair.fromText}
                    cid={pair.fromCid}
                    causePath={story.parentCausePath}
                  />
                  {pair.toText && (
                    <>
                      <FlowArrow kind="nudge" label="You might also sign" />
                      <StatementCard
                        kicker={`${story.shortName}: suggested modification`}
                        hint={`This is a statement that the bridge-creator is suggesting that someone in the ${story.shortName} camp might also be willing to sign. Signing this implies that the signer also believes the common-ground statement below.`}
                        text={pair.toText}
                        cid={pair.toCid}
                        causePath={story.modifiedCausePath ?? undefined}
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
      <Stack alignItems="center" spacing={0.25}>
        <Box sx={{ width: 2, height: 18, bgcolor: line }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
          both support
        </Typography>
        <Box sx={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid', borderTopColor: 'primary.main' }} />
      </Stack>
      <StatementCard
        kicker="Common ground"
        hint="This is a statement that the bridge-creator thinks both sides might believe."
        text={ground.text}
        cid={ground.cid}
        causePath={ground.causePath}
      />
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
  const bridgeCausePath = layout ? stableCausePath(layout.bridge) : null

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
        <Typography variant="body2" color="text.secondary">
          Proposed by <Link component={RouterLink} to={`/mediator/${fields.mediatorAddress}`} sx={{ fontWeight: 600 }}>{fields.mediatorName}</Link>
        </Typography>
      </Stack>

      {!layout && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading the camps in this bridge…</Typography>
        </Stack>
      )}

      {layout && bridgeCausePath && stories.length > 0 && (
        <Stack spacing={2}>
          <Convergence stories={stories} ground={groundOf(stories, bridgePlanks, bridgeCausePath)} />
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
