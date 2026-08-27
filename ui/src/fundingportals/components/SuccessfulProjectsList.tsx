import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import {
  getFullyReimbursedProjectsForCause,
  getSuccessfulProjectsForCause,
  type SuccessfulProjectForCause,
} from '@commonality/sdk/fundingportals'
import { getProject } from '@commonality/sdk/lazy-giving'
import { type IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { formatCurrencyAmount } from '../../shared'
import { projectPathForAddress } from '../../shared'
import { resolveProjectNav, type ProjectLinkMode, type ProjectMetadata } from './AlignedProjectCard'
import { readProjectMetadata } from './projectMetadata'
import { resolveStatementCids } from './statementCids'
import { useKeepPaintedWhileRefreshing } from '../hooks/useKeepPaintedWhileRefreshing'
import { projectMatchesBoardRules, type BoardInclusionRules } from './geographicInclusion'

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function successTypeExplanation(successType: 'direct' | 'indirect') {
  return successType === 'direct'
    ? 'A trusted attester directly vouched that this project delivered this cause.'
    : 'Connected to this cause through implication links — review the evidence before treating it as delivered.'
}

export function SuccessfulProjectsList({
  statementCid,
  statementCids,
  trustedImplicationAttesters,
  trustedSuccessAttesters,
  trustWeights,
  projectLinks = 'lazyGiving',
  reimbursement = 'outstanding',
  inclusionRules,
}: {
  statementCid: string
  statementCids?: string[]
  trustedImplicationAttesters?: Iterable<string>
  trustedSuccessAttesters?: Iterable<string>
  trustWeights?: Map<string, number>
  projectLinks?: ProjectLinkMode
  /** outstanding = close-the-loop queue; reimbursed = loop already closed. */
  reimbursement?: 'outstanding' | 'reimbursed'
  inclusionRules?: BoardInclusionRules
}) {
  const cids = resolveStatementCids(statementCid, statementCids)
  const cidsKey = cids.join('\0')
  const machinery = useMachinery()
  const [projects, setProjects] = useState<SuccessfulProjectForCause[]>([])
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const keepPainted = useKeepPaintedWhileRefreshing()

  useEffect(() => {
    let cancelled = false

    async function load() {
      keepPainted.beginLoad(setLoading)
      setError(null)
      try {
        const loader = reimbursement === 'reimbursed'
          ? getFullyReimbursedProjectsForCause
          : getSuccessfulProjectsForCause
        const loadCids = cidsKey ? cidsKey.split('\0') : []
        const perPlank = await Promise.all(
          loadCids.map((cid) =>
            loader(
              machinery,
              cid as IpfsCidV1,
              trustedImplicationAttesters,
              trustedSuccessAttesters,
              trustWeights,
            ),
          ),
        )
        const byAddress = new Map<string, (typeof perPlank)[number][number]>()
        for (const list of perPlank) {
          for (const project of list) {
            const key = project.projectAddress.toLowerCase()
            if (!byAddress.has(key)) byAddress.set(key, project)
          }
        }
        const successful = [...byAddress.values()]
        if (cancelled) return
        setProjects(successful)

        const entries = await Promise.all(successful.map(async (project) => {
          const fullProject = await getProject(machinery, project.projectAddress).catch(() => null)
          if (!fullProject?.metadataCid) return [project.projectAddress, null] as const
          const data = await readProjectMetadata(machinery, fullProject.metadataCid as IpfsCidV1).catch(() => null)
          return [project.projectAddress, data] as const
        }))
        if (cancelled) return
        const nextMetadata: Record<string, ProjectMetadata> = {}
        for (const [address, data] of entries) {
          if (data) nextMetadata[address] = data
        }
        setMetadata(nextMetadata)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading successful projects:', err)
          setError(err instanceof Error ? err.message : 'Failed to load successful projects')
        }
      } finally {
        if (!cancelled) {
          keepPainted.markResolved()
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [machinery, cidsKey, trustedImplicationAttesters, trustedSuccessAttesters, trustWeights, reimbursement])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
  }

  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {reimbursement === 'reimbursed' ? 'Fully reimbursed projects' : 'Successful Projects'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {reimbursement === 'reimbursed'
          ? 'These projects have a trusted success vouch for this cause, and early contributors have been made whole. Receipt tokens remain as a permanent record; there is no outstanding reimbursement left to close.'
          : 'Projects shown here have trusted success attestations for this cause and still have early contributors waiting to be reimbursed. Donate to close the loop: refill scouts up to what they originally contributed so they can fund the next project.'}
      </Typography>

      {projects.filter((project) => projectMatchesBoardRules(metadata[project.projectAddress]?.relevantAreas, inclusionRules)).length === 0 ? (
        <Alert severity="info">
          {reimbursement === 'reimbursed'
            ? 'No success-vouched projects have been fully reimbursed yet.'
            : 'No successful projects with outstanding receipts yet.'}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {projects.filter((project) => projectMatchesBoardRules(metadata[project.projectAddress]?.relevantAreas, inclusionRules)).map((project) => {
            const projectPath = projectPathForAddress(project.projectAddress)
            // Prefer search over document-hash for local hosts: HashRouter already
            // owns window.location.hash, so `#close-the-loop` is not a reliable fragment.
            const closeLoopPath = projectLinks === 'local'
              ? `${projectPath}?closeTheLoop=1`
              : `${projectPath}#close-the-loop`
            const projectNav = resolveProjectNav(projectPath, projectLinks)
            const closeLoopNav = resolveProjectNav(closeLoopPath, projectLinks)
            const suggestedDelegates = project.scoutRecords.slice().sort((a, b) => {
              const outstandingA = BigInt(a.outstandingAmount)
              const outstandingB = BigInt(b.outstandingAmount)
              if (outstandingA > outstandingB) return -1
              if (outstandingA < outstandingB) return 1
              return a.scout.localeCompare(b.scout)
            }).slice(0, 3)
            return (
              <Card key={project.projectAddress}>
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {metadata[project.projectAddress]?.name || `Project ${project.projectAddress.slice(0, 8)}…`}
                    </Typography>
                    <Chip
                      label={project.successType === 'direct' ? 'Direct success' : 'Indirect success'}
                      size="small"
                      color={project.successType === 'direct' ? 'success' : 'default'}
                      aria-label={successTypeExplanation(project.successType)}
                    />
                    <Chip
                      label={
                        reimbursement === 'reimbursed'
                          ? 'Fully reimbursed'
                          : `${formatCurrencyAmount(BigInt(project.outstandingUnreimbursedAmount), project.fundingCurrency)} outstanding`
                      }
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {successTypeExplanation(project.successType)}
                  </Typography>

                  {metadata[project.projectAddress]?.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {metadata[project.projectAddress].description}
                    </Typography>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Funding received</Typography>
                      <Typography variant="body2">{formatCurrencyAmount(BigInt(project.totalReceived), project.fundingCurrency)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Outstanding receipts</Typography>
                      <Typography variant="body2">{project.outstandingReceipts}</Typography>
                    </Box>
                    <Box>
                      <Tooltip title={project.successConfidenceBasis === 'trust-weighted'
                        ? 'How confidently your trust network considers this project a success for this cause. Each vouch is scaled by how strongly you transitively trust that attester, and direct vouches count more than implication-derived ones. Higher is more confident.'
                        : 'How confidently this project is considered a success for this cause, combining how many trusted attesters vouched and how directly they are connected. Sign in and build a trust network to weight vouches by your trust graph. Higher is more confident.'} placement="top">
                        <Typography variant="caption" color="text.secondary">Success confidence</Typography>
                      </Tooltip>
                      <Typography variant="body2">{project.successConfidenceScore} point{project.successConfidenceScore === '1' ? '' : 's'}</Typography>
                    </Box>
                    <Box>
                      <Tooltip title="Wallets that vouched this project delivered the cause. Choose which attesters you trust in Tally trust settings." placement="top">
                        <Typography variant="caption" color="text.secondary">Success vouches</Typography>
                      </Tooltip>
                      <Typography variant="body2">{project.successAttesters.map(shortAddress).join(', ')}</Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Scout reimbursement records</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Raw per-scout history only: scouted, reimbursed, and still outstanding. These are not payout projections.
                    </Typography>
                    <Stack spacing={0.5}>
                      {project.scoutRecords.map(record => (
                        <Typography key={record.scout} variant="body2">
                          {shortAddress(record.scout)}: scouted {formatCurrencyAmount(BigInt(record.scoutedAmount), project.fundingCurrency)}, reimbursed {formatCurrencyAmount(BigInt(record.reimbursedAmount), project.fundingCurrency)}, outstanding {formatCurrencyAmount(BigInt(record.outstandingAmount), project.fundingCurrency)}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>

                  {suggestedDelegates.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Suggested delegates</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        UI-only suggestions ranked by visible scout work and reimbursement history. Delegation is discretionary; this is never a protocol mechanic or donor payout promise.
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {suggestedDelegates.map(record => <Chip key={record.scout} label={shortAddress(record.scout)} size="small" variant="outlined" />)}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  {reimbursement === 'outstanding' && (closeLoopNav.kind === 'route' ? (
                    <Button component={RouterLink} to={closeLoopNav.to} variant="contained">
                      Donate to close the loop
                    </Button>
                  ) : (
                    <Button component="a" href={closeLoopNav.href} variant="contained">
                      Donate to close the loop
                    </Button>
                  ))}
                  {projectNav.kind === 'route' ? (
                    <Button component={RouterLink} to={projectNav.to} variant="outlined">
                      Open project
                    </Button>
                  ) : (
                    <Button component="a" href={projectNav.href} variant="outlined">
                      Open project
                    </Button>
                  )}
                </CardActions>
              </Card>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
