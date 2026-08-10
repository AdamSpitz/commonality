import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Paper, Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import type { RefUpdate } from '@commonality/sdk/mutable-refs'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import {
  formatCurrencyTotals,
  projectPathForAddress,
  useTrustedAttesters,
  useTrustedSet,
} from '@ui/shared'
import { getProjectStatus, STATUS_LABELS } from '@ui/lazy-giving'
import { CauseViewStrip, type ViewMode } from '../components/CauseViewStrip'
import { CauseMediatorCard } from '../components/CauseMediatorCard'
import { MediatorEditor } from '../components/MediatorEditor'
import { PlankRow, type PlankReview } from '../components/PlankRow'
import { RosterHistory } from '../components/RosterHistory'
import { RosterPublishPanel } from '../components/RosterPublishPanel'
import { SafetyRejectionDialog } from '../components/SafetyRejectionDialog'
import { ToolCard } from '../components/ToolCard'
import {
  causePath, causeTitle, deleteCause, getCause, isLive, listCauses, markPlankPublished,
  markRosterPublished, newPlank, publishedPlanks, realPlanks, unpublishedPlanks, updateCause,
  type CauseDraft, type CausePlank, type SafetyState,
} from '../lib/causeStore'
import {
  checkCoherence, checkSafety, sharpenPlank,
  type CoherenceVerdict,
} from '../lib/causeAssistClient'
import {
  formatRosterAge, loadRosterCoherenceBadge, loadRosterDocument, loadRosterHistory,
  normalizeSlug, parseCauseRouteParams, plankAddedLaterLabels, plankFirstSeenInHistory,
  previewRosterCid, publishRoster, resolveRosterCid, rosterFieldsFromCause,
  stableCausePath, validateSlug, type RosterCoherenceBadge,
} from '../lib/causeRoster'
import { publishPlank } from '../lib/publishPlank'
import { SUPPORTING_TOOLS } from '../lib/tools'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { useCauseProjects } from '../hooks/useCauseProjects'
import { useViewCounts } from '../hooks/useViewCounts'

function shortAddress(address: string): string {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function safetyState(verdict: {
  allowed: boolean
  category: SafetyState['category']
  explanation: string
}): SafetyState {
  return { ...verdict, checkedAt: new Date().toISOString() }
}

function findLocalByStable(owner: string, slug: string): CauseDraft | undefined {
  const ownerLc = owner.toLowerCase()
  return listCauses().find(
    (cause) => cause.slug === slug && cause.founderAddress?.toLowerCase() === ownerLc,
  )
}

/**
 * A cause is its planks, edited in place, with an optional published roster.
 *
 * Local drafts live at `/cause/:uuid`. Once a roster is published, the share URL
 * is `/cause/:owner/:slug` (stable) or `/cause/:owner/:slug@version` (pinned).
 * Editing is allowed when this browser holds the draft or the connected wallet
 * is the founder.
 */
export function CauseDetailPage() {
  const params = useParams<{ causeId?: string; owner?: string; slugPart?: string }>()
  const navigate = useNavigate()
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const trustedImplicationAttesters = useTrustedAttesters()
  const activeTrustedImplicationAttesters = trustedImplicationAttesters.length > 0
    ? trustedImplicationAttesters
    : undefined
  const {
    trustedSet: trustedAlignmentAttesters,
    isLoading: trustLoading,
    error: trustError,
  } = useTrustedSet(address)
  /**
   * useTrustedSet re-fetches on window focus and on a timer, flipping isLoading
   * each time. Gate counts only until the *first* settle for this wallet so
   * background refreshes do not unmount the views/projects sections (white flash).
   */
  const addressKey = address?.toLowerCase() ?? ''
  const [trustSettled, setTrustSettled] = useState(() => !address)
  useEffect(() => {
    setTrustSettled(!addressKey)
  }, [addressKey])
  useEffect(() => {
    if (!addressKey) return
    if (!trustLoading) setTrustSettled(true)
  }, [addressKey, trustLoading])
  const trustReady = !address || (
    trustSettled && !trustError && trustedAlignmentAttesters !== undefined
  )
  const trustUnavailable = Boolean(address)
    && trustSettled
    && !trustError
    && trustedAlignmentAttesters === undefined
  const showInitialTrustLoad = Boolean(address) && !trustSettled && trustLoading

  const routeRef = useMemo(
    () => parseCauseRouteParams(params.owner, params.slugPart),
    [params.owner, params.slugPart],
  )
  const localId = !routeRef ? params.causeId : undefined

  const [cause, setCause] = useState<CauseDraft | undefined>(() =>
    localId ? getCause(localId) : undefined,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingRemote, setLoadingRemote] = useState(Boolean(routeRef))
  const [remoteReadOnly, setRemoteReadOnly] = useState(false)
  const [history, setHistory] = useState<RefUpdate[]>([])
  const [mode, setMode] = useState<ViewMode>('any')
  const [deselectedCids, setDeselectedCids] = useState<Set<string>>(new Set())
  const [reviewingId, setReviewingId] = useState<string>()
  const [reviewsByPlankId, setReviewsByPlankId] = useState<Record<string, PlankReview>>({})
  const [publishingId, setPublishingId] = useState<string>()
  const [publishingRoster, setPublishingRoster] = useState(false)
  const [checkingCoherence, setCheckingCoherence] = useState(false)
  const [coherence, setCoherence] = useState<CoherenceVerdict | null>(null)
  const [onChainBadge, setOnChainBadge] = useState<RosterCoherenceBadge | null>(null)
  const [addedLaterByCid, setAddedLaterByCid] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [dialogSafety, setDialogSafety] = useState<SafetyState | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [slugDraft, setSlugDraft] = useState('')

  // Load local draft by UUID
  useEffect(() => {
    if (!localId) return
    setCause(getCause(localId))
    setRemoteReadOnly(false)
    setLoadingRemote(false)
    setLoadError(null)
  }, [localId])

  // Load published roster by stable id (and optional pin)
  useEffect(() => {
    if (!routeRef) return
    let cancelled = false

    const run = async () => {
      setLoadingRemote(true)
      setLoadError(null)
      try {
        const local = findLocalByStable(routeRef.owner, routeRef.slug)
        const tipCid = await resolveRosterCid(machinery, routeRef.owner, routeRef.slug)
        const rosterCid = routeRef.versionCid || tipCid
        if (!rosterCid) {
          if (local) {
            if (!cancelled) {
              setCause(local)
              setRemoteReadOnly(false)
            }
            return
          }
          throw new Error('No published roster found for this cause link.')
        }

        const loaded = await loadRosterDocument(machinery, rosterCid)
        if (!loaded) throw new Error('Could not load the roster document for this cause.')

        const { fields } = loaded
        const planks: CausePlank[] = []
        for (const cid of fields.plankCids) {
          let text = cid
          try {
            const result = await getStatementWithContent(machinery, cid as IpfsCidV1)
            const content = result?.content
            const body = content && typeof content.content === 'string' ? content.content.trim() : ''
            text = body || result?.statement.title || result?.statement.excerpt || cid
          } catch {
            // Keep CID as placeholder text if statement content is unavailable.
          }
          planks.push({
            id: `plank:${cid}`,
            text,
            origin: 'user',
            cid,
          })
        }

        const remoteCause: CauseDraft = {
          id: local?.id ?? `remote:${routeRef.owner}:${routeRef.slug}`,
          planks: local && !routeRef.versionCid
            ? mergeRemotePlanks(local.planks, planks)
            : planks,
          title: fields.title,
          summary: fields.summary,
          slug: routeRef.slug,
          founderAddress: routeRef.owner,
          rosterCid,
          mediator: local?.mediator,
          suggestionSeed: local?.suggestionSeed,
          createdAt: local?.createdAt ?? new Date().toISOString(),
          updatedAt: local?.updatedAt ?? new Date().toISOString(),
        }

        const hist = await loadRosterHistory(machinery, routeRef.owner, routeRef.slug)
        const badge = await loadRosterCoherenceBadge(machinery, rosterCid)
        if (cancelled) return
        setHistory(hist)
        setOnChainBadge(badge)
        setCause(remoteCause)
        // Founder with local draft can edit current tip; pinned and pure visitors are read-only.
        const isFounder = Boolean(
          address && address.toLowerCase() === routeRef.owner.toLowerCase() && local && !routeRef.versionCid,
        )
        setRemoteReadOnly(!isFounder)
      } catch (err) {
        if (!cancelled) {
          setCause(undefined)
          setLoadError(err instanceof Error ? err.message : 'Failed to load cause')
        }
      } finally {
        if (!cancelled) setLoadingRemote(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [routeRef, machinery, address])

  useEffect(() => {
    setTitleDraft(cause?.title ?? '')
    setSummaryDraft(cause?.summary ?? '')
    setSlugDraft(cause?.slug ?? '')
    setReviewsByPlankId({})
  }, [cause?.id, cause?.title, cause?.summary, cause?.slug])

  // Per-plank "added later" markers from ref history + prior roster docs.
  useEffect(() => {
    if (history.length < 2) {
      setAddedLaterByCid(new Map())
      return
    }
    let cancelled = false
    void (async () => {
      const firstSeen = await plankFirstSeenInHistory(history, async (cid) => {
        const loaded = await loadRosterDocument(machinery, cid)
        return loaded?.fields ?? null
      })
      if (cancelled) return
      setAddedLaterByCid(plankAddedLaterLabels(history, firstSeen))
    })()
    return () => {
      cancelled = true
    }
  }, [history, machinery])

  // Refresh on-chain badge when local draft already has a rosterCid (founder return).
  useEffect(() => {
    if (!cause?.rosterCid || routeRef) return
    let cancelled = false
    void loadRosterCoherenceBadge(machinery, cause.rosterCid).then((badge) => {
      if (!cancelled) setOnChainBadge(badge)
    })
    return () => {
      cancelled = true
    }
  }, [cause?.rosterCid, machinery, routeRef])

  const canEdit = Boolean(cause) && !remoteReadOnly && !routeRef?.versionCid

  const patch = useCallback((changes: Partial<CauseDraft>) => {
    if (!cause || !canEdit) return
    // Prefer local UUID storage; remote-only causes without a local draft cannot patch.
    if (cause.id.startsWith('remote:')) return
    const updated = updateCause(cause.id, changes)
    if (updated) setCause(updated)
  }, [cause, canEdit])

  const setPlanks = useCallback((planks: CausePlank[]) => patch({ planks }), [patch])
  const storePlankPatch = useCallback((id: string, changes: Partial<CausePlank>) => {
    if (!cause || !canEdit || cause.id.startsWith('remote:')) return undefined
    const latest = getCause(cause.id)
    if (!latest) return undefined
    const updated = updateCause(cause.id, {
      planks: latest.planks.map((plank) => (plank.id === id ? { ...plank, ...changes } : plank)),
    })
    if (updated) setCause(updated)
    return updated
  }, [cause, canEdit])

  const voidCoherence = useCallback(() => setCoherence(null), [])

  const published = useMemo(() => (cause ? publishedPlanks(cause) : []), [cause])
  const publishedCids = useMemo(
    () => published.map((plank) => plank.cid!).filter(Boolean),
    [published],
  )
  const selectedCids = useMemo(
    () => publishedCids.filter((cid) => !deselectedCids.has(cid)),
    [publishedCids, deselectedCids],
  )

  const rosterPreviewFields = useMemo(() => {
    if (!cause) return null
    return rosterFieldsFromCause({
      ...cause,
      title: titleDraft,
      summary: summaryDraft,
    })
  }, [cause, titleDraft, summaryDraft])

  const wouldBeCid = useMemo(
    () => (rosterPreviewFields && rosterPreviewFields.plankCids.length > 0
      ? previewRosterCid(rosterPreviewFields)
      : null),
    [rosterPreviewFields],
  )

  const {
    counts,
    perPlank,
    loading: countsLoading,
    error: countsError,
    refresh: refreshCounts,
  } = useViewCounts(
    publishedCids,
    selectedCids,
    activeTrustedImplicationAttesters,
    trustReady,
  )
  const {
    projects, totals, countByPlankCid, loading: projectsLoading, error: projectsError,
  } = useCauseProjects(
    publishedCids,
    activeTrustedImplicationAttesters,
    trustedAlignmentAttesters,
    trustReady,
  )

  const fewestDirectSignatures = useMemo(() => {
    if (selectedCids.length < 2) return undefined
    let fewest = Number.POSITIVE_INFINITY
    for (const cid of selectedCids) {
      const support = perPlank.get(cid)
      if (!support) return undefined
      fewest = Math.min(fewest, support.direct)
    }
    return fewest
  }, [selectedCids, perPlank])

  const tools = useMemo(
    () => SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate' && t.id !== 'delegation'),
    [],
  )

  // Soft revalidation (e.g. wallet address reconnect) must not blank the page
  // when we already have cause content painted.
  if (loadingRemote && !cause) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!cause) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {loadError || 'Cause not found on this device.'}
        </Alert>
        <Button component={RouterLink} to="/momentum" sx={{ textTransform: 'none' }}>
          Back to momentum
        </Button>
      </Stack>
    )
  }

  const drafts = unpublishedPlanks(cause)
  const live = isLive(cause)
  /** Brand-new local draft: show the start-a-cause coach copy instead of "Untitled". */
  const isFreshDraft = Boolean(
    canEdit
    && !live
    && !titleDraft.trim()
    && realPlanks(cause).length === 0,
  )
  const mutationLocked = Boolean(
    publishingId || reviewingId || publishingRoster || checkingCoherence,
  )
  const slugLocked = Boolean(cause.slug && cause.founderAddress && cause.rosterCid)
  const stable = cause.founderAddress && cause.slug
    ? { owner: cause.founderAddress.toLowerCase() as `0x${string}`, slug: cause.slug }
    : null
  const rosterAgeLabel = history[0]
    ? formatRosterAge(Number(history[0].timestamp) * 1000)
    : undefined

  const updatePlank = (id: string, changes: Partial<CausePlank>) => {
    if (mutationLocked || !canEdit) return
    storePlankPatch(id, changes)
  }

  const handleAddPlank = () => {
    if (mutationLocked || !canEdit) return
    setPlanks([...cause.planks, newPlank()])
  }

  const handleDeletePlank = (id: string) => {
    if (mutationLocked || !canEdit) return
    setPlanks(cause.planks.filter((plank) => plank.id !== id))
  }

  /**
   * Coach the founder on this issue's wording. Do not overwrite their text —
   * only show feedback (and an optional example rephrasing they may adopt).
   */
  const handleReviewPlank = async (plank: CausePlank) => {
    if (!plank.text.trim() || mutationLocked || !canEdit) return
    setReviewingId(plank.id)
    setError(null)
    try {
      const siblingContext = cause.planks
        .filter((other) => other.id !== plank.id && other.text.trim())
        .map((other) => other.text.trim())
        .slice(0, 8)
        .join('\n')
      const result = await sharpenPlank({
        plank: plank.text.trim(),
        causeDescription: siblingContext || undefined,
      })
      const example = result.plank.trim()
      setReviewsByPlankId((prev) => ({
        ...prev,
        [plank.id]: {
          summary: result.rationale.trim()
            || (result.warnings?.length
              ? 'This wording may be hard to attest or sign as written.'
              : 'Looks specific enough to try publishing.'),
          issues: result.warnings ?? [],
          exampleWording: example && example !== plank.text.trim() ? example : undefined,
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not review this issue')
    } finally {
      setReviewingId(undefined)
    }
  }

  const clearReview = (plankId: string) => {
    setReviewsByPlankId((prev) => {
      if (!(plankId in prev)) return prev
      const next = { ...prev }
      delete next[plankId]
      return next
    })
  }

  const handlePublishPlank = async (plank: CausePlank) => {
    if (publishingId || !canEdit) return
    const text = plank.text.trim()
    if (!text) return
    if (!isConnected || !address || !writeClients) {
      setError('Connect your wallet to publish this issue.')
      return
    }
    setPublishingId(plank.id)
    setError(null)
    try {
      const review = await checkSafety([{ text, fieldLabel: 'Issue' }])
      const verdict = review.results[0]
      if (verdict) {
        storePlankPatch(plank.id, { safety: safetyState(verdict) })
        if (!verdict.allowed) {
          setDialogSafety(safetyState(verdict))
          setError('Blocked text cannot be published. Edit this issue and try again.')
          return
        }
      }
      const cid = await publishPlank({ machinery, writeClients, text })
      const updated = markPlankPublished(cause.id, plank.id, cid, text)
      if (updated) setCause(updated)
      voidCoherence()
      refreshCounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish this issue')
    } finally {
      setPublishingId(undefined)
    }
  }

  const handleCheckCoherence = async () => {
    if (!rosterPreviewFields || !wouldBeCid) return
    setCheckingCoherence(true)
    setError(null)
    try {
      const verdict = await checkCoherence({
        rosterCid: wouldBeCid,
        title: rosterPreviewFields.title,
        summary: rosterPreviewFields.summary,
        planks: published.map((p) => p.text),
        mediatorBlurb: rosterPreviewFields.mediatorBlurb,
      })
      setCoherence(verdict)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coherence check failed')
    } finally {
      setCheckingCoherence(false)
    }
  }

  const handlePublishRoster = async () => {
    if (!canEdit || !rosterPreviewFields || cause.id.startsWith('remote:')) return
    const slug = normalizeSlug(slugDraft)
    const slugError = validateSlug(slug)
    if (slugError) {
      setError(slugError)
      return
    }
    if (!isConnected || !address || !writeClients) {
      setError('Connect your wallet to publish the cause page.')
      return
    }
    setPublishingRoster(true)
    setError(null)
    try {
      // Persist display fields onto the draft before sealing them into the document.
      const withFields = updateCause(cause.id, {
        title: titleDraft.trim() || undefined,
        summary: summaryDraft.trim() || undefined,
        slug,
      })
      if (!withFields) throw new Error('Cause draft missing on this device.')

      const fields = rosterFieldsFromCause(withFields)
      const wouldBe = previewRosterCid(fields)
      const shouldAttest = Boolean(
        coherence
        && coherence.coherent
        && coherence.rosterCid === wouldBe,
      )
      const result = await publishRoster({
        machinery,
        writeClients,
        slug,
        fields,
        attestCoherence: shouldAttest,
      })
      const marked = markRosterPublished(cause.id, {
        slug,
        founderAddress: address,
        rosterCid: result.rosterCid,
      })
      if (marked) setCause(marked)
      setCoherence(null)
      const [hist, badge] = await Promise.all([
        loadRosterHistory(machinery, address, slug),
        loadRosterCoherenceBadge(machinery, result.rosterCid),
      ])
      setHistory(hist)
      setOnChainBadge(badge)
      navigate(stableCausePath({
        owner: address.toLowerCase() as `0x${string}`,
        slug,
      }), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish roster')
    } finally {
      setPublishingRoster(false)
    }
  }

  const handleDeleteCause = () => {
    if (mutationLocked || !canEdit || cause.id.startsWith('remote:')) return
    if (!window.confirm('Remove this cause from this device? Published statements and rosters are unaffected.')) return
    deleteCause(cause.id)
    navigate('/momentum')
  }

  const toggleSelected = (cid: string, selected: boolean) => {
    setDeselectedCids((current) => {
      const next = new Set(current)
      if (selected) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  return (
    <Stack spacing={2.5} data-testid="cause-detail-page">
      <Box>
        {!live && !isFreshDraft && (
          <Chip size="small" label="Nothing published yet" sx={{ mb: 0.75 }} />
        )}
        {routeRef?.versionCid && (
          <Chip size="small" color="info" label="Pinned version" sx={{ mb: 0.75, ml: live ? 0 : 1 }} />
        )}
        {cause.rosterCid && !routeRef?.versionCid && (
          <Chip size="small" color="success" label="Roster published" sx={{ mb: 0.75, ml: live ? 1 : 0 }} />
        )}
        {onChainBadge && onChainBadge.attesters.length > 0 && (
          <Chip
            size="small"
            color="success"
            variant="filled"
            label="Coherent construction"
            sx={{ mb: 0.75, ml: 1 }}
            data-testid="cause-coherence-badge"
          />
        )}
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}
        >
          {isFreshDraft ? 'Start a cause' : (titleDraft.trim() || causeTitle(cause))}
        </Typography>
        {isFreshDraft ? (
          <>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              A cause is a set of clear issues people can support one at a time.
              You write those issues yourself — CauseStarter helps you check that
              each one is specific enough to sign and attest.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Prefer concrete claims a real supporter would sincerely sign (for example,
              a single policy position or local outcome) over slogans or broad identity labels.
            </Typography>
          </>
        ) : (
          <>
            {(summaryDraft.trim() || cause.summary?.trim()) && (
              <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {summaryDraft.trim() || cause.summary}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {live
                ? 'People sign each issue separately. The counts below combine those signatures.'
                : 'Write the issues this cause is made of. Publish each one when it is ready.'}
            </Typography>
          </>
        )}
        {stable && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Share link: {stableCausePath(stable)}
          </Typography>
        )}
      </Box>

      {stable && history.length > 0 && (
        <RosterHistory
          stable={stable}
          history={history}
          currentVersionCid={cause.rosterCid}
          pinnedVersionCid={routeRef?.versionCid}
        />
      )}

      {publishedCids.length > 0 && showInitialTrustLoad && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Loading your trust network before supporter and project counts…
        </Alert>
      )}
      {publishedCids.length > 0 && trustError && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Supporter and project counts are paused because your trust network could not be loaded: {trustError}
        </Alert>
      )}
      {publishedCids.length > 0 && trustUnavailable && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Supporter and project counts are paused until this wallet has trusted attesters.
        </Alert>
      )}

      {publishedCids.length > 0 && trustReady && (
        <>
          <CauseViewStrip
            mode={mode}
            onModeChange={setMode}
            counts={counts}
            selectedCount={selectedCids.length}
            publishedCount={publishedCids.length}
            loading={countsLoading}
            fewestDirectSignatures={fewestDirectSignatures}
          />
          {countsError && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Supporter counts could not be loaded: {countsError}
            </Alert>
          )}
        </>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Issues</Typography>

        {canEdit && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} data-testid="issue-guidance">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              What counts as an issue
            </Typography>
            <Typography variant="body2" component="div">
              Write claims you are willing to stand behind — each one should be something a real
              supporter could sincerely sign in public. Prefer specific, self-contained positions
              over slogans or broad labels. CauseStarter will not draft issues for you; use
              <strong> Check phrasing</strong> on a draft if you want feedback on whether it is
              clear enough to attest.
            </Typography>
          </Alert>
        )}

        {cause.planks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No issues yet. Add one and write it in your own words.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {cause.planks.map((plank, index) => (
            <PlankRow
              key={plank.id}
              plank={plank}
              index={index}
              selected={plank.cid ? !deselectedCids.has(plank.cid) : false}
              onSelectedChange={(selected) => plank.cid && toggleSelected(plank.cid, selected)}
              support={plank.cid ? perPlank.get(plank.cid) : undefined}
              supportLoading={countsLoading}
              projectCount={plank.cid ? countByPlankCid.get(plank.cid) ?? 0 : 0}
              onSupported={() => refreshCounts()}
              onTextChange={(text) => {
                updatePlank(plank.id, { text, safety: undefined })
                clearReview(plank.id)
                voidCoherence()
              }}
              onDelete={() => {
                clearReview(plank.id)
                handleDeletePlank(plank.id)
              }}
              onReview={() => void handleReviewPlank(plank)}
              onPublish={() => void handlePublishPlank(plank)}
              reviewing={reviewingId === plank.id}
              publishing={publishingId === plank.id}
              mutationLocked={mutationLocked || !canEdit}
              review={reviewsByPlankId[plank.id] ?? null}
              onUseExampleWording={(wording) => {
                updatePlank(plank.id, { text: wording, safety: undefined, rationale: undefined })
                clearReview(plank.id)
                voidCoherence()
              }}
              addedLaterLabel={plank.cid ? addedLaterByCid.get(plank.cid) : undefined}
            />
          ))}
        </Stack>

        {canEdit && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddPlank}
              disabled={mutationLocked}
              sx={{ textTransform: 'none' }}
              data-testid="cause-add-plank"
            >
              Add an issue
            </Button>
          </Stack>
        )}

        {drafts.length > 0 && !isConnected && canEdit && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Connect a wallet to publish issues. Unpublished issues stay on this device.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </Paper>

      {canEdit && !cause.id.startsWith('remote:') && (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <RosterPublishPanel
            title={titleDraft}
            summary={summaryDraft}
            slug={slugDraft}
            previewCid={wouldBeCid}
            coherence={coherence}
            onChainBadge={onChainBadge}
            slugLocked={slugLocked}
            canPublish={publishedCids.length > 0}
            checking={checkingCoherence}
            publishing={publishingRoster}
            disabled={mutationLocked}
            walletReady={Boolean(isConnected && address && writeClients)}
            lastPublishedCid={cause.rosterCid}
            rosterAgeLabel={rosterAgeLabel}
            onTitleChange={(value) => {
              setTitleDraft(value)
              voidCoherence()
            }}
            onSummaryChange={(value) => {
              setSummaryDraft(value)
              voidCoherence()
            }}
            onSlugChange={(value) => {
              setSlugDraft(value)
              voidCoherence()
            }}
            onCheckCoherence={() => void handleCheckCoherence()}
            onPublish={() => void handlePublishRoster()}
            onPublishAnyway={() => void handlePublishRoster()}
          />
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Projects</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Projects vouched for as advancing one of this cause's issues. Each is aligned with a
          specific statement, not with the cause as a whole.
        </Typography>

        {publishedCids.length === 0 && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Publish an issue to see projects aligned with it.
          </Alert>
        )}

        {publishedCids.length > 0 && trustReady && projectsLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading aligned projects…</Typography>
          </Stack>
        )}

        {projectsError && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>{projectsError}</Alert>
        )}

        {publishedCids.length > 0 && trustReady && !projectsLoading && !projectsError && projects.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No projects are aligned with these issues yet. Open an issue's board to vouch for work
            that advances it.
          </Typography>
        )}

        {projects.length > 0 && (
          <Stack spacing={1.25}>
            {totals && (
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ pb: 0.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Still needed (open projects)
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatCurrencyTotals(totals.remainingToThreshold)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Unreimbursed (succeeded)
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatCurrencyTotals(totals.totalUnreimbursed)}
                  </Typography>
                </Box>
              </Stack>
            )}
            {projects.map((project) => (
              <Paper
                key={project.projectAddress}
                elevation={0}
                sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                  <Box>
                    <Typography
                      component={RouterLink}
                      to={projectPathForAddress(project.projectAddress)}
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Project {shortAddress(project.projectAddress)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {STATUS_LABELS[getProjectStatus({
                        totalReceived: project.totalReceived || '0',
                        threshold: project.threshold || '0',
                        deadline: project.deadline || '0',
                      })]}
                      {' · aligned with '}
                      {project.viaPlankCids.length === 1
                        ? '1 issue'
                        : `${project.viaPlankCids.length} issues`}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={project.alignmentType}
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {cause.mediator && <CauseMediatorCard mediator={cause.mediator} />}
      {canEdit && (
        <MediatorEditor
          mediator={cause.mediator}
          onChange={(mediator) => {
            if (!mutationLocked) {
              patch({ mediator })
              voidCoherence()
            }
          }}
        />
      )}

      {tools.length > 0 && (
        <Stack spacing={1.25}>
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} compact />)}
        </Stack>
      )}

      {canEdit && !cause.id.startsWith('remote:') && (
        <>
          <Divider />
          <Stack direction="row" spacing={1}>
            <Button
              color="error"
              onClick={handleDeleteCause}
              disabled={mutationLocked}
              sx={{ textTransform: 'none' }}
            >
              Remove locally
            </Button>
            {stable && (
              <Button
                component={RouterLink}
                to={causePath(cause)}
                sx={{ textTransform: 'none' }}
              >
                Open share URL
              </Button>
            )}
          </Stack>
        </>
      )}

      <SafetyRejectionDialog
        open={Boolean(dialogSafety)}
        safety={dialogSafety}
        onClose={() => setDialogSafety(null)}
      />
    </Stack>
  )
}

/** Prefer local unpublished planks + texts; take ordered published CIDs from the roster. */
function mergeRemotePlanks(local: CausePlank[], remotePublished: CausePlank[]): CausePlank[] {
  const byCid = new Map(local.filter((p) => p.cid).map((p) => [p.cid!, p]))
  const mergedPublished = remotePublished.map((remote) => {
    const existing = byCid.get(remote.cid!)
    return existing ? { ...existing, text: existing.text || remote.text } : remote
  })
  const unpublished = local.filter((p) => !p.cid)
  return [...mergedPublished, ...unpublished]
}
