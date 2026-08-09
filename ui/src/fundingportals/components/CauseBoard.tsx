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
} from '@mui/material'
import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import { getMonthlyPledgedByCause } from '@commonality/sdk/delegation'
import { getTotalFundingForCause } from '@commonality/sdk/fundingportals'
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
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectsList } from './AlignedProjectsList'
import { SuccessfulProjectsTab } from './SuccessfulProjectsTab'
import { AttestAlignmentForm } from './AttestAlignmentForm'
import { DelegatableNotesSection } from './DelegatableNotesSection'
import type { ProjectLinkMode } from './AlignedProjectCard'

/** In-app router link or external href for cause-board chrome. */
export type CauseBoardNavLink =
  | { label: string; to: string; variant?: 'text' | 'outlined' | 'contained' }
  | { label: string; href: string; variant?: 'text' | 'outlined' | 'contained' }

export interface CauseBoardProps {
  statementCid: string
  /** Prefer this title over the statement document title (e.g. local cause name). */
  preferredTitle?: string
  /** Prefer this summary over the statement excerpt. */
  preferredSummary?: string
  /**
   * Header navigation. When omitted, uses Aligning defaults
   * (back to Tally statement + leaderboard under `/portal/...`).
   */
  navLinks?: CauseBoardNavLink[]
  /** Optional extra content under the header metrics (host chrome). */
  headerExtra?: ReactNode
  /**
   * Where aligned/successful project detail links resolve.
   * CauseStarter hosts project detail locally; Aligning deep-links to LazyGiving.
   */
  projectLinks?: ProjectLinkMode
  /**
   * Optional same-app path for the earmarked-funds summary card (CauseStarter hosts
   * `/cause/:id/earmarked`). When omitted the card is not a link.
   */
  earmarkedFundsTo?: string
}

function defaultNavLinks(statementCid: string): CauseBoardNavLink[] {
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
 * vouch form, delegatable notes). Shared by Aligning and CauseStarter.
 */
export function CauseBoard({
  statementCid,
  preferredTitle,
  preferredSummary,
  navLinks,
  headerExtra,
  projectLinks = 'lazyGiving',
  earmarkedFundsTo,
}: CauseBoardProps) {
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
  const [availableDelegatable, setAvailableDelegatable] = useState<
    Awaited<ReturnType<typeof computeAvailableDelegatableFunding>>
  >([])
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [projectTab, setProjectTab] = useState<'aligned' | 'successful'>('aligned')

  useEffect(() => {
    const cid = statementCid
    let cancelled = false
    const trustedSetForLoad: Set<string> | undefined = trustedSetKey
      ? new Set(trustedSetKey.split(','))
      : undefined
    const attestersForLoad = trustedAttestersKey
      ? trustedAttestersKey.split(',')
      : undefined

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [stmtResult, fundingMetrics] = await Promise.all([
          getStatementWithContent(machinery, cid as IpfsCidV1),
          getTotalFundingForCause(
            machinery,
            cid as IpfsCidV1,
            attestersForLoad,
            trustedSetForLoad,
          ),
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

        const [total, monthlyTotals] = await Promise.all([
          computeAvailableDelegatableFunding(machinery, cid),
          machinery.contractAddresses?.recurringPledges
            ? getMonthlyPledgedByCause(machinery)
            : Promise.resolve(new Map<string, bigint>()),
        ])
        if (cancelled) return
        setAvailableDelegatable(total)
        setMonthlyPledged(monthlyTotals.get(cid) ?? 0n)
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
  }, [machinery, statementCid, trustedAttestersKey, trustedSetKey])

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
  const links = navLinks ?? defaultNavLinks(statementCid)

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        {links.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {links.map((link) => (
              <NavLinkButton key={link.label} link={link} />
            ))}
          </Stack>
        )}

        <Typography variant="h4" component="h1" gutterBottom>
          Cause Board
        </Typography>

        {displayTitle && (
          <Typography variant="h5" gutterBottom>
            {displayTitle}
          </Typography>
        )}

        {displaySummary && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {displaySummary}
          </Typography>
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
              Still Needed (Open Projects)
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(remainingToThreshold)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Unreimbursed (Succeeded)
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
            <Typography variant="caption" color="text.secondary" display="block">
              Funds from Delegates
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(availableDelegatable)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Projects
            </Typography>
            <Typography variant="h6">{projectCount}</Typography>
          </Box>
        </Stack>

        {headerExtra}
      </Paper>

      {address && trustedSetLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {trustedSet
            ? `Refreshing your trust network. This portal is currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
            : 'Refreshing your trust network. Until any trusted accounts are found, this portal still shows all project endorsements.'}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={projectTab}
          onChange={(_, value: 'aligned' | 'successful') => setProjectTab(value)}
          aria-label="Cause board project views"
        >
          <Tab value="aligned" label="Aligned" />
          <Tab value="successful" label="Successful" />
        </Tabs>
      </Paper>

      {projectTab === 'aligned' ? (
        <AlignedProjectsList
          statementCid={statementCid}
          trustedImplicationAttesters={activeTrustedImplicationAttesters}
          projectLinks={projectLinks}
        />
      ) : (
        <SuccessfulProjectsTab
          statementCid={statementCid}
          trustedImplicationAttesters={activeTrustedImplicationAttesters}
          projectLinks={projectLinks}
        />
      )}

      <AttestAlignmentForm statementCid={statementCid} />

      <DelegatableNotesSection statementCid={statementCid} to={earmarkedFundsTo} />
    </Box>
  )
}
