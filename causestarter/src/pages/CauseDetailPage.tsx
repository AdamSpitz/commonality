import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Paper, Stack,
  ToggleButton, ToggleButtonGroup, Typography,
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
import { AlignmentTrustGate } from '../components/AlignmentTrustGate'
import { CauseViewStrip, type ViewMode } from '../components/CauseViewStrip'
import { CauseMediatorCard } from '../components/CauseMediatorCard'
import { MonthlyPledgeSignal } from '../components/MonthlyPledgeSignal'
import { StatementPicker } from '../components/StatementPicker'
import { SelectedPlankSupport } from '../components/SelectedPlankSupport'
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
  checkCoherence, checkSafety, fetchCoherenceAttesterAddress, sharpenPlank,
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
import { getDomainUrl } from '../lib/domainUrls'
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
 * Editing published rosters requires the organizer's connected wallet.
 * Unpublished local drafts can still be shaped on this device before publish.
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
  const alignmentTrustReady = !address || (
    trustSettled && !trustError && trustedAlignmentAttesters !== undefined
  )
  const alignmentTrustUnavailable = Boolean(address)
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
  /** CauseStarter operator address that authors coherence badges (for viewer trust). */
  const [coherenceOperator, setCoherenceOperator] = useState<`0x${string}` | null>(null)
  const [addedLaterByCid, setAddedLaterByCid] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [dialogSafety, setDialogSafety] = useState<SafetyState | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [slugDraft, setSlugDraft] = useState('')

  // Operator attester address for badge trust display
  useEffect(() => {
    let cancelled = false
    void fetchCoherenceAttesterAddress().then((addr) => {
      if (!cancelled) setCoherenceOperator(addr)
    })
    return () => { cancelled = true }
  }, [])

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
        if (cancelled) return
        setHistory(hist)
        // Badge loads separately: it needs the operator address, which arrives async.
        setCause(remoteCause)
        // Visitors and bookmarked copies stay read-only. Only the organizer's
        // wallet (or an unpublished local draft with no founder yet) can edit.
        const connectedOrganizer = Boolean(
          address
          && remoteCause.founderAddress
          && address.toLowerCase() === remoteCause.founderAddress.toLowerCase()
          && !routeRef.versionCid,
        )
        setRemoteReadOnly(!connectedOrganizer && Boolean(remoteCause.founderAddress || remoteCause.rosterCid))
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

  // On-chain badge for whichever roster version is on screen (visitor or organizer).
  // Re-runs once the operator address resolves; without it no badge is trustworthy.
  useEffect(() => {
    if (!cause?.rosterCid || !coherenceOperator) {
      setOnChainBadge(null)
      return
    }
    let cancelled = false
    void loadRosterCoherenceBadge(machinery, cause.rosterCid, coherenceOperator).then((badge) => {
      if (!cancelled) setOnChainBadge(badge)
    })
    return () => {
      cancelled = true
    }
  }, [cause?.rosterCid, machinery, coherenceOperator])

  /**
   * Permission to mutate this cause. Guards every handler; never gates display
   * alone — see {@link editing} for the organizer's chosen view.
   *
   * Published causes: only the connected founder. Unpublished local drafts:
   * this device, even before a wallet is connected.
   */
  const isOrganizer = Boolean(
    address
    && cause?.founderAddress
    && address.toLowerCase() === cause.founderAddress.toLowerCase(),
  )
  const isUnpublishedLocalDraft = Boolean(
    cause
    && !cause.founderAddress
    && !cause.rosterCid
    && !cause.id.startsWith('remote:'),
  )
  const canEdit = Boolean(cause)
    && !routeRef?.versionCid
    && (isOrganizer || (isUnpublishedLocalDraft && !remoteReadOnly))

  /**
   * Which view the organizer asked for, or `null` while they have not said.
   * Only an organizer ever sees the switch.
   */
  const [editing, setEditing] = useState<boolean | null>(null)
  /**
   * The default view, decided from whether the cause was already live *when it
   * loaded*: building a new cause opens in editing, arriving at a live one opens
   * in viewing. Deliberately not recomputed from current liveness — publishing
   * the first issue makes a cause live, and re-deriving would throw the
   * organizer out of editing mid-build.
   */
  const [defaultEditing, setDefaultEditing] = useState<boolean | null>(null)
  const causeKey = cause?.id ?? ''
  useEffect(() => {
    // Also clears an explicit choice when navigating between causes.
    setEditing(null)
    setDefaultEditing(cause ? !isLive(cause) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on identity, not contents
  }, [causeKey])

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
    true,
  )
  const {
    projects, totals, countByPlankCid, loading: projectsLoading, error: projectsError,
  } = useCauseProjects(
    publishedCids,
    activeTrustedImplicationAttesters,
    trustedAlignmentAttesters,
    alignmentTrustReady,
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
  /**
   * Whether to render the organizer's editing affordances. Display only: every
   * handler still checks `canEdit`, so turning this on can never grant rights
   * a visitor lacks, and turning it off can never strand an in-flight mutation.
   */
  const isEditing = canEdit && (editing ?? defaultEditing ?? !live)
  /**
   * In viewing mode an organizer is asking what a supporter sees, so the header
   * shows what is actually published rather than unsaved local edits.
   */
  const displayTitle = isEditing ? (titleDraft.trim() || causeTitle(cause)) : causeTitle(cause)
  const displaySummary = isEditing ? (summaryDraft.trim() || cause.summary) : cause.summary
  /** Drafts exist only on this device, so a supporter's view has none of them. */
  const visiblePlanks = isEditing ? cause.planks : cause.planks.filter((plank) => plank.cid)
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

  const handlePickerSelection = (selection: { text: string; cid?: string; source: 'existing' | 'drafted' }) => {
    if (mutationLocked || !canEdit) return
    setPlanks([...cause.planks, newPlank(selection.text, 'suggested', selection.cid)])
    voidCoherence()
  }

  const handleDeletePlank = (id: string) => {
    if (mutationLocked || !canEdit) return
    setPlanks(cause.planks.filter((plank) => plank.id !== id))
  }

  /**
   * Coach the organizer on this issue's wording. Do not overwrite their text —
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
      const result = await publishRoster({
        machinery,
        writeClients,
        slug,
        fields,
      })
      const marked = markRosterPublished(cause.id, {
        slug,
        founderAddress: address,
        rosterCid: result.rosterCid,
      })
      if (marked) setCause(marked)
      setCoherence(null)

      // The trusted worker observes RefUpdated and may mint asynchronously.
      // Publishing never asks a browser-reachable endpoint to spend the operator key.
      const [hist, badge] = await Promise.all([
        loadRosterHistory(machinery, address, slug),
        loadRosterCoherenceBadge(machinery, result.rosterCid, coherenceOperator),
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
    if (!window.confirm('Unbookmark this cause? It is removed from this device only. Published statements and rosters are unaffected.')) return
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
      {isOrganizer && !isFreshDraft && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={isEditing ? 'editing' : 'viewing'}
          onChange={(_, next: string | null) => next && setEditing(next === 'editing')}
          aria-label="Organizer view"
          data-testid="cause-mode-toggle"
          sx={{ alignSelf: 'flex-start' }}
        >
          <ToggleButton value="viewing" data-testid="cause-mode-viewing">
            Viewing
          </ToggleButton>
          <ToggleButton value="editing" data-testid="cause-mode-editing">
            Editing
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {isOrganizer && !isEditing && (
        <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="cause-viewing-notice">
          This is what a supporter sees. Unpublished drafts and your organizer controls are
          hidden until you switch to Editing.
        </Alert>
      )}

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
            title={`Attested by CauseStarter operator ${onChainBadge.attesters[0]}`}
            sx={{ mb: 0.75, ml: 1 }}
            data-testid="cause-coherence-badge"
            data-attester={onChainBadge.attesters[0]}
          />
        )}
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}
        >
          {isFreshDraft ? 'Start a cause' : displayTitle}
        </Typography>
        {isFreshDraft ? (
          <>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Tell CauseStarter what you want people to be able to support. It searches
              published statements first and can propose new wording when none fit.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You decide what belongs in the cause. Nothing is published until you review
              the exact statement text and CID in the page below and explicitly approve it.
            </Typography>
          </>
        ) : (
          <>
            {displaySummary?.trim() && (
              <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {displaySummary}
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
          Loading your trust network before listing projects…
        </Alert>
      )}
      {publishedCids.length > 0 && (trustError || alignmentTrustUnavailable) && (
        <AlignmentTrustGate error={trustError} />
      )}

      {publishedCids.length > 0 && (
        <MonthlyPledgeSignal statementCids={publishedCids} />
      )}

      {published.length > 0 && (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Set aside funds for an issue</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Create a one-time delegated fund or a monthly pledge earmarked for one immutable
            statement. The earmark does not follow later edits to this cause publication.
          </Typography>
          <Stack spacing={1}>
            {published.map((plank) => (
              <Stack
                key={plank.cid}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography
                  component={RouterLink}
                  to={`/statement/${plank.cid}`}
                  variant="body2"
                  sx={{
                    flex: 1,
                    color: 'text.primary',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {plank.text}
                </Typography>
                <Button
                  component="a"
                  href={getDomainUrl('lazyGiving', `/delegation/notes/new?statement=${encodeURIComponent(plank.cid!)}`)}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Earmark funds
                </Button>
                <Button
                  component="a"
                  href={getDomainUrl('lazyGiving', `/delegates/offer?statement=${encodeURIComponent(plank.cid!)}`)}
                  variant="text"
                  size="small"
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Offer to become a delegate
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {isEditing && !cause.id.startsWith('remote:') && (
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
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Issues</Typography>

        {isEditing && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} data-testid="issue-guidance">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              What counts as an issue
            </Typography>
            <Typography variant="body2" component="div">
              Describe your intent in the picker. It looks for reusable published statements
              before offering new drafts. Reject or correct any suggestion that misses your
              meaning; broad statements are fine when their proposition is clear.
            </Typography>
          </Alert>
        )}

        {visiblePlanks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isEditing
              ? 'No statements selected yet. Start with the picker; you can reject every suggestion and write one manually.'
              : 'This cause has no published issues yet.'}
          </Typography>
        )}

        {isEditing && (
          <Box sx={{ mb: 2 }}>
            <StatementPicker
              intent="cause"
              machinery={machinery}
              existingCids={publishedCids}
              existingPlankTexts={cause.planks.map((plank) => plank.text)}
              disabled={mutationLocked}
              onSelect={handlePickerSelection}
            />
          </Box>
        )}

        <Stack spacing={1.5}>
          {visiblePlanks.map((plank, index) => (
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
              mutationLocked={mutationLocked || !isEditing}
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

        {publishedCids.length > 0 && (
          <Box sx={{ mt: 2 }}>
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
              <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                Supporter counts could not be loaded: {countsError}
              </Alert>
            )}
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <SelectedPlankSupport
            planks={published.filter((plank) => plank.cid && selectedCids.includes(plank.cid)).map((plank) => ({
              cid: plank.cid!,
              text: plank.text,
            }))}
            onSupported={() => refreshCounts()}
          />
        </Box>

        {isEditing && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddPlank}
              disabled={mutationLocked}
              sx={{ textTransform: 'none' }}
              data-testid="cause-add-plank"
            >
              Write one manually
            </Button>
          </Stack>
        )}

        {drafts.length > 0 && !isConnected && isEditing && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Connect a wallet to publish issues. Unpublished issues stay on this device.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </Paper>

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

        {publishedCids.length > 0 && alignmentTrustReady && projectsLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading aligned projects…</Typography>
          </Stack>
        )}

        {projectsError && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>{projectsError}</Alert>
        )}

        {publishedCids.length > 0 && alignmentTrustReady && !projectsLoading && !projectsError && projects.length === 0 && (
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

      {tools.length > 0 && (
        <Stack spacing={1.25}>
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} compact />)}
        </Stack>
      )}

      {cause.mediator && <CauseMediatorCard mediator={cause.mediator} />}
      {isEditing && (
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

      {isEditing && !cause.id.startsWith('remote:') && (
        <>
          <Divider />
          <Stack direction="row" spacing={1}>
            <Button
              color="error"
              onClick={handleDeleteCause}
              disabled={mutationLocked}
              sx={{ textTransform: 'none' }}
            >
              Unbookmark
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
