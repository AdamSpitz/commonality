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
  useTrustedContentAttesters,
} from '../../shared'
import { selectAlignedContentContracts, useContentFundingState } from '../../content-funding'
import { AlignedProjectsList } from './AlignedProjectsList'
import { SuccessfulProjectsTab } from './SuccessfulProjectsTab'
import { AttestAlignmentForm } from './AttestAlignmentForm'
import type { ProjectLinkMode } from './AlignedProjectCard'
import { useKeepPaintedWhileRefreshing } from '../hooks/useKeepPaintedWhileRefreshing'
import { resolveStatementCids } from './statementCids'
import { unionAlignedFundingProjects } from './unionAlignedFundingProjects'

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
  /**
   * Extra create/action buttons rendered with “Start project” at the bottom
   * of the metrics paper (e.g. Start content contract).
   */
  actionLinks?: CauseBoardNavLink[]
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
  actionLinks,
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
  const { channels, contentAttestations } = useContentFundingState()
  const trustedContentAttesters = useTrustedContentAttesters()
  const contentTrustKey = trustedContentAttesters
    .map((entry) => entry.address.toLowerCase())
    .sort()
    .join('\0')
  const contentAttestationsKey = [...contentAttestations.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, list]) =>
      `${id}:${list.map((row) => `${row.attested ? 1 : 0}:${row.statementCid}:${row.attester.toLowerCase()}`).sort().join(',')}`,
    )
    .join('|')
  const [totalRaised, setTotalRaised] = useState<
    Awaited<ReturnType<typeof foldAlignedProjectFunding>>['totalRaisedAcrossProjects']
  >([])
  const [remainingToThreshold, setRemainingToThreshold] = useState<
    Awaited<ReturnType<typeof foldAlignedProjectFunding>>['remainingToThreshold']
  >([])
  const [totalUnreimbursed, setTotalUnreimbursed] = useState<
    Awaited<ReturnType<typeof foldAlignedProjectFunding>>['totalUnreimbursed']
  >([])
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [projectTab, setProjectTab] = useState<
    'aligned' | 'successful' | 'reimbursed' | 'failed'
  >('aligned')
  const keepPainted = useKeepPaintedWhileRefreshing()

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
      keepPainted.beginLoad(setLoading)
      setError(null)
      try {
        const cid = loadCids[0]!
        const [stmtResult, fundingMetrics] = await Promise.all([
          embedded
            ? Promise.resolve(null)
            : getStatementWithContent(machinery, cid as IpfsCidV1),
          (async () => {
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
            const contentContracts = selectAlignedContentContracts(
              channels,
              contentAttestations,
              loadCids,
              contentTrustKey ? contentTrustKey.split('\0') : undefined,
            )
            return foldAlignedProjectFunding(
              machinery,
              unionAlignedFundingProjects([...byAddress.values()], contentContracts),
            )
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
        if (!cancelled) {
          keepPainted.markResolved()
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    machinery,
    cidsKey,
    embedded,
    trustedAttestersKey,
    trustedSetKey,
    channels.length,
    contentAttestationsKey,
    contentTrustKey,
  ])

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

  const metricSx = { minWidth: 0 }

  return (
    <Box id="fundable-projects" data-testid="fundable-projects">
      <Paper
        sx={{
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
          {links.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
              {links.map((link) => (
                <NavLinkButton key={link.label} link={link} />
              ))}
            </Stack>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            {embedded ? (
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                {surfaceTitle}
              </Typography>
            ) : (
              <Box>
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main', display: 'block', lineHeight: 1.2 }}
                >
                  Statement
                </Typography>
                {displayTitle && (
                  <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 600 }}>
                    {displayTitle}
                  </Typography>
                )}
                {displaySummary && (
                  <Typography variant="body2" color="text.secondary">
                    {displaySummary}
                  </Typography>
                )}
              </Box>
            )}

            {(primaryCid || (actionLinks && actionLinks.length > 0)) && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {primaryCid && (
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
                )}
                {(actionLinks ?? []).map((link) => (
                  <NavLinkButton key={link.label} link={link} />
                ))}
              </Stack>
            )}
          </Stack>

          <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.75 }}>
            <Box sx={metricSx}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                Raised
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrencyTotals(totalRaised)}
              </Typography>
            </Box>

            <Box sx={metricSx}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                Still needed
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrencyTotals(remainingToThreshold)}
              </Typography>
            </Box>

            <Box sx={metricSx}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                Unreimbursed
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrencyTotals(totalUnreimbursed)}
              </Typography>
            </Box>

            <Box sx={metricSx}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                Monthly pledges
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrencyAmount(
                  monthlyPledged,
                  getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY,
                )}
                /mo
              </Typography>
            </Box>

            <Box sx={metricSx}>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
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
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {projectCount}
              </Typography>
            </Box>
          </Stack>

          {headerExtra}
        </Box>

        {address && trustedSetLoading && (
          <Alert severity="info" sx={{ mx: 2, mb: 1 }}>
            {trustedSet
              ? `Refreshing your trust network. This portal is currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
              : 'Refreshing your trust network. Until any trusted accounts are found, this cause board still shows all project vouches.'}
          </Alert>
        )}

        <Tabs
          value={projectTab}
          onChange={(_, value: 'aligned' | 'successful' | 'reimbursed' | 'failed') =>
            setProjectTab(value)
          }
          aria-label="Cause board project views"
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            borderTop: 1,
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, py: 0.75, textTransform: 'none' },
          }}
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

        <Box sx={{ p: 2 }}>
          {projectTab === 'aligned' && (
            <AlignedProjectsList
              statementCid={primaryCid ?? ''}
              statementCids={cids}
              trustedImplicationAttesters={activeTrustedImplicationAttesters}
              projectLinks={projectLinks}
              embedded
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
              embedded
            />
          )}
        </Box>
      </Paper>

      {cids.length === 1 && primaryCid && <AttestAlignmentForm statementCid={primaryCid} />}
    </Box>
  )
}
