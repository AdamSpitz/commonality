import { useState, type ReactNode } from 'react'
import {
  Alert,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { CauseCard } from '../components/CauseCard'
import { SupportButton } from '../components/SupportButton'
import { SupportAllGoals } from '../components/SupportAllGoals'
import {
  addCauseToAggregate,
  aggregateGoalSupportTargets,
  aggregateReadiness,
  deleteAggregate,
  getAggregate,
  getCause,
  listCauses,
  primaryGoal,
  publishedGoalSupportTargets,
  removeCauseFromAggregate,
  saveAggregate,
} from '../lib/causeModel'
import type { IpfsCidV1 } from '@commonality/sdk/utils'

export function AggregateDetailPage() {
  const { aggregateId } = useParams<{ aggregateId: string }>()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  void tick
  const agg = aggregateId ? getAggregate(aggregateId) : null
  const allCauses = listCauses()
  const [pick, setPick] = useState('')

  if (!agg) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Aggregate not found</Typography>
        <Button component={RouterLink} to="/aggregates" sx={{ textTransform: 'none' }}>
          Back
        </Button>
      </Stack>
    )
  }

  const members = agg.causeIds.map((id) => getCause(id)).filter(Boolean)
  const readiness = aggregateReadiness(agg)
  const supportTargets = aggregateGoalSupportTargets(agg)
  const currentGoals = supportTargets.filter((t) => t.isCurrent)
  const previousGoals = supportTargets.filter((t) => !t.isCurrent)
  const currentLabels = currentGoals.map((t) => t.text)
  const allLabels = supportTargets.map((t) =>
    t.isCurrent ? t.text : `[previous] ${t.text}`,
  )

  return (
    <Stack spacing={2.5} data-testid="aggregate-detail-page">
      <TextField
        fullWidth
        value={agg.title}
        onChange={(e) => {
          saveAggregate({ ...agg, title: e.target.value })
          refresh()
        }}
        variant="standard"
        inputProps={{ style: { fontWeight: 800, fontSize: '1.5rem' } }}
      />
      <TextField
        fullWidth
        multiline
        minRows={2}
        value={agg.summary}
        onChange={(e) => {
          saveAggregate({ ...agg, summary: e.target.value })
          refresh()
        }}
        placeholder="What does this tranche of causes cover?"
        size="small"
      />

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`${readiness.causeCount} causes`} />
        <Chip
          size="small"
          color={readiness.goalsPublished > 0 ? 'success' : 'default'}
          variant="outlined"
          label={`${readiness.goalsPublished}/${readiness.goalsTotal} current goals published`}
        />
        {readiness.previousVersionCount > 0 && (
          <Chip
            size="small"
            variant="outlined"
            label={`${readiness.previousVersionCount} previous wording${readiness.previousVersionCount === 1 ? '' : 's'}`}
          />
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Support in aggregate means standing with the goals of the causes in this bundle —
        tranche-style backing. Previous published wordings stay supportable even after a revise.
      </Typography>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Support current goals
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Stand with each cause&apos;s latest published goal tip.
        </Typography>
        <SupportAllGoals
          goalCids={readiness.publishedGoalCids}
          labels={currentLabels}
        />
      </Paper>

      {supportTargets.length > 1 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Support all published wordings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
            Includes previous goal CIDs from history ({readiness.allSupportableGoalCids.length} total).
          </Typography>
          <SupportAllGoals
            goalCids={readiness.allSupportableGoalCids}
            labels={allLabels}
          />
        </Paper>
      )}

      {currentGoals.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
            Current goals
          </Typography>
          <Stack spacing={2}>
            {currentGoals.map((t) => (
              <Stack key={t.cid} spacing={0.75}>
                <Typography variant="caption" color="text.secondary">{t.causeTitle}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.text}</Typography>
                <SupportButton statementCid={t.cid as IpfsCidV1} subject="goal" />
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {previousGoals.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Previous goal versions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
            Older published wordings remain on-chain. You can still support them — useful when a cause
            revised its goal but you stood with the earlier statement.
          </Typography>
          <Stack spacing={2}>
            {previousGoals.map((t) => (
              <Stack key={t.cid} spacing={0.75} data-testid="previous-goal-version">
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label="Previous" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">{t.causeTitle}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.text}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {t.cid}
                </Typography>
                <SupportButton statementCid={t.cid as IpfsCidV1} subject="goal" label="Support this previous wording" />
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {readiness.goalsTotal > readiness.goalsPublished && (
        <Alert severity="info">
          {readiness.goalsTotal - readiness.goalsPublished} goal
          {readiness.goalsTotal - readiness.goalsPublished === 1 ? '' : 's'} still draft —
          open the cause pages below to publish them.
        </Alert>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700 }}>Causes in this aggregate</Typography>
      {members.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No causes linked yet.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {members.map((c) => {
            if (!c) return null
            const goal = primaryGoal(c)
            const prevCount = publishedGoalSupportTargets(c).filter((t) => !t.isCurrent).length
            const goalLive = Boolean(c?.goal.cid)
            const goalDraft = Boolean(c?.goal.text?.trim() && !c.goal.cid)
            return (
              <Stack key={c.id} direction="row" spacing={1} alignItems="flex-start">
                <BoxGrow>
                  <CauseCard cause={c} />
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, ml: 0.5 }} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={goalLive ? 'Goal live' : goalDraft || goal?.text ? 'Goal draft' : 'No goal'}
                      color={goalLive ? 'success' : 'default'}
                      variant="outlined"
                    />
                    {prevCount > 0 && (
                      <Chip size="small" label={`${prevCount} previous`} variant="outlined" />
                    )}
                  </Stack>
                </BoxGrow>
                <IconButton
                  aria-label={`Remove ${c.title} from aggregate`}
                  onClick={() => {
                    removeCauseFromAggregate(agg.id, c.id)
                    refresh()
                  }}
                  size="small"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            )
          })}
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          select
          fullWidth
          size="small"
          label="Add a cause"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        >
          <MenuItem value="">Select…</MenuItem>
          {allCauses
            .filter((c) => !agg.causeIds.includes(c.id))
            .map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>
            ))}
        </TextField>
        <Button
          variant="outlined"
          disabled={!pick}
          onClick={() => {
            addCauseToAggregate(agg.id, pick)
            setPick('')
            refresh()
          }}
          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
        >
          Add
        </Button>
      </Stack>

      <Button
        color="error"
        variant="text"
        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
        onClick={() => {
          if (window.confirm('Delete this aggregate? Causes themselves stay intact.')) {
            deleteAggregate(agg.id)
            navigate('/aggregates')
          }
        }}
      >
        Delete aggregate
      </Button>
    </Stack>
  )
}

function BoxGrow({ children }: { children: ReactNode }) {
  return <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
}
