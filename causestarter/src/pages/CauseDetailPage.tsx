import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Divider, IconButton, Link, Paper, Snackbar,
  Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import IosShareIcon from '@mui/icons-material/IosShare'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import type { RefUpdate } from '@commonality/sdk/mutable-refs'
import {
  InfoChip,
  useTrustedAttesters,
} from '@ui/shared'
import { CauseBoard, CauseLeaderboard } from '@ui/fundingportals'
import { AlignmentTrustGate } from '../components/AlignmentTrustGate'
import { CauseViewStrip } from '../components/CauseViewStrip'
import { CauseMediatorCard } from '../components/CauseMediatorCard'
import { CauseFundingSummary } from '../components/CauseFundingSummary'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import { StatementPicker } from '../components/StatementPicker'
import { SelectedPlankSupport } from '../components/SelectedPlankSupport'
import { MediatorEditor } from '../components/MediatorEditor'
import { PlankRow, type PlankReview } from '../components/PlankRow'
import { StarterNetworkFilterCopy } from '../components/StarterNetworkFilterNotice'
import { RosterHistory } from '../components/RosterHistory'
import { RosterPublishPanel } from '../components/RosterPublishPanel'
import { SafetyRejectionDialog } from '../components/SafetyRejectionDialog'
import {
  bookmarkCause, causeFundingPath, causeLeaderboardPath, causePath, causeTitle, findCauseByStable,
  getCause, hasPublishedRoster, isCauseBookmarked, isLive, markPlankPublished,
  markRosterPublished, newPlank, publishedPlanks, realPlanks,
  unbookmarkCause, unpublishedPlanks, updateCause,
  type CauseDraft, type CausePlank, type SafetyState,
} from '../lib/causeStore'
import {
  checkCoherence, checkSafety, fetchCoherenceAttesterAddress, sharpenPlank,
  type CoherenceVerdict,
} from '../lib/causeAssistClient'
import {
  applyPlankTexts, formatRosterAge, loadPlankTexts, loadRosterCoherenceBadge,
  loadRosterDocument, loadRosterHistory, normalizeSlug, parseCauseRouteParams,
  placeholderPlanksFromCids, plankAddedLaterLabels, plankFirstSeenInHistory,
  previewRosterCid, publishRoster, resolveRosterCid, rosterFieldsFromCause,
  stableCausePath, validateSlug, type RosterCoherenceBadge,
} from '../lib/causeRoster'
import {
  persistCauseBookmarks,
  rememberBookmarkKept,
  rememberBookmarkRemoved,
} from '../lib/causeBookmarks'
import { publishPlank } from '../lib/publishPlank'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { useAlignmentTrust } from '../hooks/useAlignmentTrust'
import { useCauseProjects } from '../hooks/useCauseProjects'
import { useViewCounts } from '../hooks/useViewCounts'

function safetyState(verdict: {
  allowed: boolean
  category: SafetyState['category']
  explanation: string
}): SafetyState {
  return { ...verdict, checkedAt: new Date().toISOString() }
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
    trustedAlignmentAttesters,
    alignmentTrustReady,
    alignmentTrustUnavailable,
    showInitialTrustLoad,
    trustError,
  } = useAlignmentTrust()

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
  const [coherenceOperatorResolved, setCoherenceOperatorResolved] = useState(false)
  const [coherenceBadgeResolved, setCoherenceBadgeResolved] = useState(false)
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
      if (cancelled) return
      setCoherenceOperator(addr)
      setCoherenceOperatorResolved(true)
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
        const local = findCauseByStable(routeRef.owner, routeRef.slug)
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
          throw new Error('No published cause found for this link.')
        }

        const loaded = await loadRosterDocument(machinery, rosterCid)
        if (!loaded) throw new Error('Could not load the published cause for this link.')

        const { fields } = loaded
        const stubPlanks = placeholderPlanksFromCids(fields.plankCids)
        const remoteCause: CauseDraft = {
          id: local?.id ?? `remote:${routeRef.owner}:${routeRef.slug}`,
          planks: local && !routeRef.versionCid
            ? mergeRemotePlanks(local.planks, stubPlanks)
            : stubPlanks,
          title: fields.title,
          summary: fields.summary,
          slug: routeRef.slug,
          founderAddress: routeRef.owner,
          rosterCid,
          // Published identity wins: a follower has no local copy to fall back on.
          mediator: fields.mediator ?? local?.mediator,
          bridgeCluster: fields.bridgeCluster ?? local?.bridgeCluster,
          suggestionSeed: local?.suggestionSeed,
          createdAt: local?.createdAt ?? new Date().toISOString(),
          updatedAt: local?.updatedAt ?? new Date().toISOString(),
        }

        if (cancelled) return
        // Paint title/summary/roster immediately; plank bodies and history fill in after.
        setCause(remoteCause)
        setLoadingRemote(false)
        const connectedOrganizer = Boolean(
          address
          && remoteCause.founderAddress
          && address.toLowerCase() === remoteCause.founderAddress.toLowerCase()
          && !routeRef.versionCid,
        )
        setRemoteReadOnly(!connectedOrganizer && Boolean(remoteCause.founderAddress || remoteCause.rosterCid))

        try {
          const [texts, hist] = await Promise.all([
            loadPlankTexts(machinery, fields.plankCids),
            loadRosterHistory(machinery, routeRef.owner, routeRef.slug),
          ])
          if (cancelled) return
          setHistory(hist)
          setCause((current) => {
            if (!current || current.id !== remoteCause.id) return current
            return { ...current, planks: applyPlankTexts(current.planks, texts) }
          })
        } catch {
          // Title/summary already painted; missing bodies or history stay as stubs.
        }
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
    if (!cause?.rosterCid) {
      setOnChainBadge(null)
      setCoherenceBadgeResolved(true)
      return
    }
    if (!coherenceOperatorResolved) {
      setCoherenceBadgeResolved(false)
      return
    }
    if (!coherenceOperator) {
      setOnChainBadge(null)
      setCoherenceBadgeResolved(true)
      return
    }
    let cancelled = false
    setCoherenceBadgeResolved(false)
    void loadRosterCoherenceBadge(machinery, cause.rosterCid, coherenceOperator).then((badge) => {
      if (cancelled) return
      setOnChainBadge(badge)
      setCoherenceBadgeResolved(true)
    })
    return () => {
      cancelled = true
    }
  }, [cause?.rosterCid, machinery, coherenceOperator, coherenceOperatorResolved])

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
  const canKeepOnDevice = Boolean(
    cause
    && cause.founderAddress
    && cause.slug
    && !isOrganizer
    && !isUnpublishedLocalDraft,
  )
  const keptOnDevice = Boolean(cause && isCauseBookmarked(cause))
  const [bookmarkUndoOpen, setBookmarkUndoOpen] = useState(false)
  const [shareCopiedOpen, setShareCopiedOpen] = useState(false)

  const persistWalletBookmarks = useCallback(async () => {
    if (!writeClients || !address) return
    try {
      await persistCauseBookmarks(machinery, address, writeClients)
    } catch (err) {
      console.warn('Could not update wallet cause bookmarks', err)
    }
  }, [writeClients, address, machinery])

  const keepThisCause = useCallback(() => {
    if (!cause || isOrganizer || !cause.founderAddress || !cause.slug) return
    const saved = bookmarkCause(cause)
    rememberBookmarkKept({ owner: saved.founderAddress!, slug: saved.slug! })
    setCause(saved)
    void persistWalletBookmarks()
    setBookmarkUndoOpen(false)
  }, [cause, isOrganizer, persistWalletBookmarks])

  const handleRemoveFromDevice = () => {
    if (!cause || isOrganizer) return
    if (cause.founderAddress && cause.slug) {
      rememberBookmarkRemoved({ owner: cause.founderAddress, slug: cause.slug })
    }
    unbookmarkCause(cause)
    setCause({ ...cause })
    void persistWalletBookmarks()
    setBookmarkUndoOpen(true)
  }

  const undoRemoveBookmark = () => {
    setBookmarkUndoOpen(false)
    keepThisCause()
  }

  /**
   * Which view the organizer asked for, or `null` while they have not said.
   * Only an organizer ever sees the switch.
   */
  const [editing, setEditing] = useState<boolean | null>(null)
  /**
   * The default view, decided from whether a roster was already published *when
   * this cause loaded*: shaping the cause page opens in editing; arriving at a
   * published roster opens in viewing. Issue publishes make the cause "live" for
   * supporters but must not hide the publish-cause panel after a reload.
   */
  const [defaultEditing, setDefaultEditing] = useState<boolean | null>(null)
  const causeKey = cause?.id ?? ''
  useEffect(() => {
    // Also clears an explicit choice when navigating between causes.
    setEditing(null)
    setDefaultEditing(cause ? !hasPublishedRoster(cause) : null)
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
  const selectedSignPlanks = useMemo(
    () => published
      .filter((plank) => plank.cid && !deselectedCids.has(plank.cid))
      .map((plank) => ({
        cid: plank.cid! as `b${string}`,
        text: plank.text,
      })),
    [published, deselectedCids],
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
    countByPlankCid,
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
        <Button component={RouterLink} to="/causes" sx={{ textTransform: 'none' }}>
          Back to causes
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
  const hasCoherenceBadge = Boolean(onChainBadge && onChainBadge.attesters.length > 0)
  const showCoherenceAbsence = Boolean(cause.rosterCid)
    && coherenceBadgeResolved
    && !hasCoherenceBadge
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
   * Coach the organizer on this statement's wording. Do not overwrite their text —
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
      setError(err instanceof Error ? err.message : 'Could not review this statement')
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
      setError('Connect your wallet to publish this statement.')
      return
    }
    setPublishingId(plank.id)
    setError(null)
    try {
      const review = await checkSafety([{ text, fieldLabel: 'Statement' }])
      const verdict = review.results[0]
      if (verdict) {
        storePlankPatch(plank.id, { safety: safetyState(verdict) })
        if (!verdict.allowed) {
          setDialogSafety(safetyState(verdict))
          setError('Blocked text cannot be published. Edit this statement and try again.')
          return
        }
      }
      const cid = await publishPlank({ machinery, writeClients, text })
      const updated = markPlankPublished(cause.id, plank.id, cid, text)
      if (updated) setCause(updated)
      voidCoherence()
      refreshCounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish this statement')
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
      setError(err instanceof Error ? err.message : 'Failed to publish this cause')
    } finally {
      setPublishingRoster(false)
    }
  }

  const handleDeleteDraft = () => {
    if (mutationLocked || !canEdit || !isUnpublishedLocalDraft) return
    if (!window.confirm('Delete this draft? Nothing has been published.')) return
    unbookmarkCause(cause)
    navigate('/causes')
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
      {canEdit && !isFreshDraft && (
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

      {canEdit && !isEditing && (
        <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="cause-viewing-notice">
          This is what a supporter sees. Unpublished drafts and your organizer controls are
          hidden until you switch to Editing.
        </Alert>
      )}

      <Box>
        {!cause.rosterCid && (
          <InfoChip
            size="small"
            label="Unpublished"
            sx={{ mb: 0.75 }}
            data-testid="cause-unpublished"
            title="This cause exists only on this device so far. Others cannot open it until you publish."
          />
        )}
        {routeRef?.versionCid && (
          <InfoChip
            size="small"
            color="info"
            label="Pinned version"
            sx={{ mb: 0.75 }}
            title="This link is pinned to one published version. Later edits to the live cause will not change what you see here."
          />
        )}
        {!isFreshDraft && (
          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main', display: 'block' }}
          >
            Cause
          </Typography>
        )}
        {cause.bridgeCluster && (
          <Alert
            severity="warning"
            sx={{ borderRadius: 2, mt: 1, mb: 1 }}
            data-testid="cause-bridge-authorship"
          >
            {cause.bridgeCluster.role === 'bridge'
              ? 'This is a mediator-authored bridge cause, not a natural parent publication.'
              : 'This is a mediator-authored wording of another cause. It is not an official revision by that cause’s founder.'}
            {' '}
            <Link
              component={RouterLink}
              to={`/bridge/${cause.bridgeCluster.clusterOwner}/${encodeURIComponent(cause.bridgeCluster.clusterSlug)}`}
            >
              Open the bridge cluster
            </Link>
            {cause.bridgeCluster.role === 'modified' && cause.bridgeCluster.parentOwner && cause.bridgeCluster.parentSlug && (
              <>
                {' · '}
                <Link
                  component={RouterLink}
                  to={`/cause/${cause.bridgeCluster.parentOwner}/${encodeURIComponent(cause.bridgeCluster.parentSlug)}`}
                >
                  Natural parent
                </Link>
              </>
            )}
          </Alert>
        )}
        <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ pr: (canKeepOnDevice || stable) ? 0.5 : 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' }, flex: 1, minWidth: 0 }}
          >
            {isFreshDraft ? 'Start a cause' : displayTitle}
          </Typography>
          {stable && (
            <Tooltip title="Copy share link">
              <IconButton
                data-testid="cause-share-link"
                onClick={() => {
                  const url = `${window.location.origin}${stableCausePath(stable)}`
                  const shareData = { title: displayTitle, url }
                  const share = navigator.share
                  if (typeof share === 'function') {
                    void share.call(navigator, shareData).catch(() => {
                      void navigator.clipboard.writeText(url).then(() => setShareCopiedOpen(true))
                    })
                    return
                  }
                  void navigator.clipboard.writeText(url).then(() => setShareCopiedOpen(true))
                }}
                aria-label="Share cause"
                sx={{ mt: 0.25, color: 'text.secondary' }}
              >
                <IosShareIcon />
              </IconButton>
            </Tooltip>
          )}
          {canKeepOnDevice && (
            <Tooltip title={keptOnDevice ? 'Saved to your causes' : 'Save to your causes'}>
              <IconButton
                data-testid={keptOnDevice ? 'cause-remove-from-device' : 'cause-keep-on-device'}
                onClick={() => {
                  if (keptOnDevice) handleRemoveFromDevice()
                  else keepThisCause()
                }}
                aria-label={keptOnDevice ? 'Remove bookmark' : 'Bookmark'}
                aria-pressed={keptOnDevice}
                sx={{ mt: 0.25, color: keptOnDevice ? 'primary.main' : 'text.secondary' }}
              >
                {keptOnDevice ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {hasCoherenceBadge && (
          <InfoChip
            title={`CauseStarter's coherence checker attested this version as coherent construction (title and description match the statements). Attested by operator ${onChainBadge!.attesters[0]}.`}
            size="small"
            color="success"
            variant="filled"
            label="Coherent construction"
            sx={{ mt: 1 }}
            data-testid="cause-coherence-badge"
            data-attester={onChainBadge!.attesters[0]}
          />
        )}
        {showCoherenceAbsence && (
          <InfoChip
            size="small"
            color="warning"
            variant="filled"
            label={coherenceOperator
              ? 'No coherence badge'
              : 'Coherence badge not confirmed'}
            sx={{ mt: 1 }}
            data-testid="cause-coherence-absent"
            title={coherenceOperator
              ? 'CauseStarter\'s coherence checker has not published a badge for this version. That is not a finding that the cause is incoherent, but it does mean that we haven\'t confirmed that the title and description match the statements, so you may want to read them especially carefully.'
              : 'Could not reach CauseStarter\'s coherence checker, so this page cannot confirm whether a badge exists.'}
          />
        )}
        {isFreshDraft ? (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }} data-testid="start-cause-help">
            Tell CauseStarter what you want people to be able to support. It searches
            published statements first and can propose new wording when none fit.
            You decide what belongs in the cause. Nothing is published until you review
            the exact statement text and CID in the page below and explicitly approve it.
          </Alert>
        ) : null}
      </Box>

      {!isFreshDraft && displaySummary?.trim() && (
        <Paper
          elevation={0}
          sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          data-testid="cause-description"
        >
          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}
          >
            Description
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {displaySummary}
          </Typography>
        </Paper>
      )}

      {routeRef?.versionCid && stable && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Viewing a pinned version.
          {' '}
          <Link component={RouterLink} to={stableCausePath(stable)} underline="hover">
            Open current
          </Link>
        </Alert>
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
        <CauseFundingSummary statementCids={publishedCids} href={causeFundingPath(cause)} />
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
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Statements</Typography>

        {!live && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} data-testid="issue-draft-help">
            Write the statements this cause is made of. Publish each one when it is ready.
          </Alert>
        )}

        {!isConnected && published.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <ConnectWalletHint>
              Connect a wallet to publicly sign a statement.
            </ConnectWalletHint>
          </Box>
        )}

        {isEditing && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} data-testid="issue-guidance">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              What counts as a statement
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
              : 'This cause has no published statements yet.'}
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

        {publishedCids.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <CauseViewStrip
              counts={counts}
              selectedCount={selectedCids.length}
              loading={countsLoading}
              fewestDirectSignatures={fewestDirectSignatures}
            />
            {countsError && (
              <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                Signer counts could not be loaded: {countsError}
              </Alert>
            )}
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
              onSupported={(info) => {
                if (info.indexed) refreshCounts()
                if (info.action === 'support') keepThisCause()
              }}
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

        <Box sx={{ mt: 2 }}>
          <SelectedPlankSupport
            machinery={machinery}
            planks={selectedSignPlanks}
            onSupported={() => {
              refreshCounts()
              keepThisCause()
            }}
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
            Connect a wallet to publish statements. Unpublished statements stay on this device.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </Paper>

      {publishedCids.length === 0 ? (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>Fundable Projects</Typography>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Publish a statement to see projects aligned with it.
          </Alert>
        </Paper>
      ) : (
        <CauseBoard
          statementCids={publishedCids}
          trustedAlignmentAttesters={trustedAlignmentAttesters}
          embedded
          surfaceTitle="Fundable Projects"
          projectLinks="local"
          actionLinks={[
            {
              label: 'Start content contract',
              to: '/content/new',
              variant: 'outlined',
            },
          ]}
          projectsHelp={
            <Stack spacing={1}>
              <Typography variant="body2">
                Union of projects vouched for as advancing any published statement of this
                cause. Alignment attaches to a statement, never to the cause as a whole.
              </Typography>
              <StarterNetworkFilterCopy />
            </Stack>
          }
        />
      )}

      {publishedCids.length > 0 && (
        <CauseLeaderboard
          statementCids={publishedCids}
          embedded
          limit={3}
          fullPageTo={causeLeaderboardPath(cause)}
        />
      )}

      {stable && history.length > 0 && (
        <RosterHistory
          stable={stable}
          history={history}
          currentVersionCid={cause.rosterCid}
          pinnedVersionCid={routeRef?.versionCid}
        />
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

      {isEditing && isUnpublishedLocalDraft && (
        <>
          <Divider />
          <Stack direction="row" spacing={1}>
            <Button
              color="error"
              onClick={handleDeleteDraft}
              disabled={mutationLocked}
              sx={{ textTransform: 'none' }}
            >
              Delete draft
            </Button>
          </Stack>
        </>
      )}
      {isEditing && stable && (
        <Button
          component={RouterLink}
          to={causePath(cause)}
          sx={{ textTransform: 'none' }}
        >
          Open share URL
        </Button>
      )}

      <Snackbar
        open={shareCopiedOpen}
        autoHideDuration={2500}
        onClose={() => setShareCopiedOpen(false)}
        message="Link copied"
        data-testid="cause-share-copied"
      />
      <Snackbar
        open={bookmarkUndoOpen}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setBookmarkUndoOpen(false)
        }}
        message="Removed from your causes"
        action={(
          <Button color="inherit" size="small" onClick={undoRemoveBookmark} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Undo
          </Button>
        )}
        data-testid="cause-bookmark-undo"
      />
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
