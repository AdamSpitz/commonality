import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Button,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import { getMonthlyPledgedByCause } from '@commonality/sdk/delegation'
import {
  foldAlignedProjectFunding,
  getAllAlignedProjectsForCause,
  getTotalFundingForCause,
} from '@commonality/sdk/fundingportals'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import {
  DEFAULT_PAYMENT_CURRENCY,
  formatCurrencyAmount,
  formatCurrencyTotals,
  getConfiguredPaymentCurrency,
  getDomainUrl,
  useTrustedSet,
  useTrustedAttesters,
} from '../../shared'
import { AlignedProjectsList } from './AlignedProjectsList'
import { SuccessfulProjectsTab } from './SuccessfulProjectsTab'
import { AttestAlignmentForm } from './AttestAlignmentForm'
import type { ProjectLinkMode } from './AlignedProjectCard'
import { resolveStatementCids } from './statementCids'

/** In-app router link or external href for cause-board chrome. */
export type CauseBoardNavLink =
  | { label: string; to: string; variant?: 'text' | 'outlined' | 'contained' }
  | { label: string; href: string; variant?: 'text' | 'outlined' | 'contained' }

export interface CauseBoardProps {
  statementCid?: string
  /** Union several statements (a cause's published planks). Deduped by project. */
  statementCids?: string[]
  /** Prefer this title over the statement document title (e.g. local cause name). */
  preferredTitle?: string
  /** Prefer this summary over the statement excerpt. */
  preferredSummary?: string
  /**
   * Drop standalone page chrome (statement title, default nav) and use
   * {@link surfaceTitle} as the section heading — for inlining on a cause
   * or statement page.
   */
  embedded?: boolean
  /** Section heading when {@link embedded} is true. */
  surfaceTitle?: string
  /**
   * Header navigation. When omitted, uses Aligning defaults
   * (back to Tally statement + leaderboard under `/portal/...`).
   */
  navLinks?: CauseBoardNavLink[]
  /** Optional extra content under the header metrics (host chrome). */
  headerExtra?: ReactNode
  /** Tooltip on the Projects metric — host-specific explanation of what the count means. */
  projectsHelp?: ReactNode
  /**
   * Where aligned/successful project detail links resolve.
   * CauseStarter hosts project detail locally; Aligning deep-links to LazyGiving.
   */
  projectLinks?: ProjectLinkMode
}

function defaultNavLinks(statementCid: string | undefined): CauseBoardNavLink[] {
  if (!statementCid) return []
  return [
    {
      label: '← Back to Statement on Tally',
      href: getDomainUrl('tally', `/statement/${statementCid}`, {
        fallbackHref: `/statement/${statementCid}`,
      }),
    },
    {
      label: 'View Leaderboard',
      to: `/portal/${statementCid}/leaderboard`,
      variant: 'outlined',
    },
  ]
}

function NavLinkButton({ link }: { link: CauseBoardNavLink }) {
  const variant = link.variant ?? 'text'
  if ('href' in link) {
    return (
      <Button component="a" href={link.href} size="small" variant={variant}>
        {link.label}
      </Button>
    )
  }
  return (
    <Button component={RouterLink} to={link.to} size="small" variant={variant}>
      {link.label}
    </Button>
  )
}

/**
 * Full cause board surface (funding metrics, aligned/successful projects,
 * and vouch form). Shared by Aligning and CauseStarter.
 */
export function CauseBoard({
  statementCid,
  statementCids,
  preferredTitle,
  preferredSummary,
  embedded = false,
  surfaceTitle = 'Fundable Projects',
  navLinks,
  headerExtra,
  projectsHelp,
  projectLinks = 'lazyGiving',
}: CauseBoardProps) {
  const cids = useMemo(
    () => resolveStatementCids(statementCid, statementCids),
    [statementCid, statementCids],
  )
  const cidsKey = cids.join('\0')
  const primaryCid = cids[0]
  const machinery = useMachinery()
  const { address } = useAccount()
  const trustedImplicationAttesters = useTrustedAttesters()
  const activeTrustedImplicationAttesters =
    trustedImplicationAttesters.length > 0 ? trustedImplicationAttesters : undefined
  const { trustedSet, isLoading: trustedSetLoading } = useTrustedSet(address)

  // Stabilize effect deps: useTrustedSet replaces the Set on progressive updates.
  // Membership serialization avoids full board reloads when only the Set identity changes.
  const trustedSetKey = useMemo(() => {
    if (!trustedSet || trustedSet.size === 0) return ''
    return Array.from(trustedSet)
      .map((a) => a.toLowerCase())
      .sort()
      .join(',')
  }, [trustedSet])
  const trustedAttestersKey = useMemo(
    () =>
      (activeTrustedImplicationAttesters ?? [])
        .map((a) => a.toLowerCase())
        .sort()
        .join(','),
    [activeTrustedImplicationAttesters],
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [totalRaised, setTotalRaised] = useState<
    Awaited<ReturnType<typeof getTotalFundingForCause>>['totalRaisedAcrossProjects']
  >([])
  const [remainingToThreshold, setRemainingToThreshold] = useState<
    Awaited<ReturnType<typeof getTotalFundingForCause>>['remainingToThreshold']
  >([])
  const [totalUnreimbursed, setTotalUnreimbursed] = useState<
    Awaited<ReturnType<typeof getTotalFundingForCause>>['totalUnreimbursed']
  >([])
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [projectTab, setProjectTab] = useState<
    'aligned' | 'successful' | 'reimbursed' | 'failed'
  >('aligned')

  useEffect(() => {
    const loadCids = cidsKey ? cidsKey.split('\0') : []
    let cancelled = false
    const trustedSetForLoad: Set<string> | undefined = trustedSetKey
      ? new Set(trustedSetKey.split(','))
      : undefined
    const attestersForLoad = trustedAttestersKey
      ? trustedAttestersKey.split(',')
      : undefined

    async function load() {
      if (loadCids.length === 0) {
        setLoading(false)
        setError('No statement specified.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const cid = loadCids[0]!
        const [stmtResult, fundingMetrics] = await Promise.all([
          embedded
            ? Promise.resolve(null)
            : getStatementWithContent(machinery, cid as IpfsCidV1),
          loadCids.length === 1
            ? getTotalFundingForCause(
                machinery,
                cid as IpfsCidV1,
                attestersForLoad,
                trustedSetForLoad,
              )
            : (async () => {
                const perPlank = await Promise.all(
                  loadCids.map((plankCid) =>
                    getAllAlignedProjectsForCause(
                      machinery,
                      plankCid as IpfsCidV1,
                      attestersForLoad,
                      trustedSetForLoad,
                    ),
                  ),
                )
                const byAddress = new Map<string, (typeof perPlank)[number][number]>()
                for (const aligned of perPlank) {
                  for (const project of aligned) {
                    const existing = byAddress.get(project.projectAddress.toLowerCase())
                    if (!existing || (existing.alignmentType === 'indirect' && project.alignmentType === 'direct')) {
                      byAddress.set(project.projectAddress.toLowerCase(), project)
                    }
                  }
                }
                return foldAlignedProjectFunding(machinery, [...byAddress.values()])
              })(),
        ])

        if (cancelled) return

        if (stmtResult) {
          const t =
            stmtResult.statement.title ??
            (stmtResult.content?.content
              ? stmtResult.content.content.split('\n')[0].replace(/^#+\s*/, '').trim()
              : null) ??
            `Statement ${cid.slice(0, 12)}...`
          setTitle(t)
          setSummary(stmtResult.statement.excerpt ?? null)
        }

        setTotalRaised(fundingMetrics.totalRaisedAcrossProjects)
        setRemainingToThreshold(fundingMetrics.remainingToThreshold)
        setTotalUnreimbursed(fundingMetrics.totalUnreimbursed)
        setProjectCount(fundingMetrics.projectCount)

        const monthlyTotals = machinery.contractAddresses?.recurringPledges
          ? await getMonthlyPledgedByCause(machinery)
          : new Map<string, bigint>()
        if (cancelled) return
        let monthly = 0n
        for (const plankCid of loadCids) {
          monthly += monthlyTotals.get(plankCid) ?? 0n
        }
        setMonthlyPledged(monthly)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading cause board:', err)
          setError(err instanceof Error ? err.message : 'Failed to load cause board')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [machinery, cidsKey, embedded, trustedAttestersKey, trustedSetKey])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  const displayTitle = preferredTitle?.trim() || title
  const displaySummary = preferredSummary?.trim() || summary
  const links = navLinks ?? (embedded ? [] : defaultNavLinks(primaryCid))

  return (
    <Box id="fundable-projects" data-testid="fundable-projects">
      <Paper sx={{ p: 3, mb: 3 }}>
        {links.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {links.map((link) => (
              <NavLinkButton key={link.label} link={link} />
            ))}
          </Stack>
        )}

        {embedded ? (
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }} gutterBottom>
            {surfaceTitle}
          </Typography>
        ) : (
          <>
            <Typography
              variant="overline"
              sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main', display: 'block' }}
            >
              Statement
            </Typography>

            {displayTitle && (
              <Typography variant="body1" component="h1" gutterBottom sx={{ fontWeight: 500 }}>
                {displayTitle}
              </Typography>
            )}

            {displaySummary && (
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {displaySummary}
              </Typography>
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Funding Raised
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(totalRaised)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Still needed (needs initial funding)
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(remainingToThreshold)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Unreimbursed (needs reimbursement)
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(totalUnreimbursed)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Ongoing Monthly Pledges
            </Typography>
            <Typography variant="h6">
              {formatCurrencyAmount(
                monthlyPledged,
                getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY,
              )}
              /month
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                Projects
              </Typography>
              {projectsHelp && (
                <Tooltip
                  title={projectsHelp}
                  slotProps={{ tooltip: { sx: { maxWidth: 360 } } }}
                >
                  <IconButton
                    size="small"
                    aria-label="About projects on this board"
                    data-testid="projects-help"
                    sx={{ p: 0.25, color: 'text.secondary' }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            <Typography variant="h6">{projectCount}</Typography>
          </Box>
        </Stack>

        {primaryCid && (
        <Box sx={{ mt: 2 }}>
          <NavLinkButton
            link={
              projectLinks === 'local'
                ? {
                    label: 'Start project',
                    to: `/projects/new?statement=${encodeURIComponent(primaryCid)}`,
                    variant: 'contained',
                  }
                : {
                    label: 'Start project',
                    href: getDomainUrl('lazyGiving', `/projects/new?statement=${encodeURIComponent(primaryCid)}`, {
                      fallbackHref: `/projects/new?statement=${encodeURIComponent(primaryCid)}`,
                    }),
                    variant: 'contained',
                  }
            }
          />
        </Box>
        )}

        {headerExtra}
      </Paper>

      {address && trustedSetLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {trustedSet
            ? `Refreshing your trust network. This portal is currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
            : 'Refreshing your trust network. Until any trusted accounts are found, this cause board still shows all project vouches.'}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={projectTab}
          onChange={(_, value: 'aligned' | 'successful' | 'reimbursed' | 'failed') =>
            setProjectTab(value)
          }
          aria-label="Cause board project views"
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab
            value="aligned"
            label="Not yet funded"
            id="cause-board-tab-aligned"
          />
          <Tab
            value="successful"
            label="Not yet reimbursed"
            id="cause-board-tab-successful"
          />
          <Tab
            value="reimbursed"
            label="Fully reimbursed"
            id="cause-board-tab-reimbursed"
          />
          <Tab
            value="failed"
            label="Failed"
            id="cause-board-tab-failed"
            sx={{ opacity: 0.75 }}
          />
        </Tabs>
      </Paper>

      {projectTab === 'aligned' && (
        <AlignedProjectsList
          statementCid={primaryCid ?? ''}
          statementCids={cids}
          trustedImplicationAttesters={activeTrustedImplicationAttesters}
          projectLinks={projectLinks}
          statusFilterLock="active"
        />
      )}
      {projectTab === 'successful' && (
        <SuccessfulProjectsTab
          statementCid={primaryCid ?? ''}
          statementCids={cids}
          trustedImplicationAttesters={activeTrustedImplicationAttesters}
          projectLinks={projectLinks}
        />
      )}
      {projectTab === 'reimbursed' && (
        <SuccessfulProjectsTab
          statementCid={primaryCid ?? ''}
          statementCids={cids}
          trustedImplicationAttesters={activeTrustedImplicationAttesters}
          projectLinks={projectLinks}
          reimbursement="reimbursed"
        />
      )}
      {projectTab === 'failed' && (
        <AlignedProjectsList
          statementCid={primaryCid ?? ''}
          statementCids={cids}
          trustedImplicationAttesters={activeTrustedImplicationAttesters}
          projectLinks={projectLinks}
          statusFilterLock="refunding"
        />
      )}

      {primaryCid && <AttestAlignmentForm statementCid={primaryCid} />}
    </Box>
  )
}
