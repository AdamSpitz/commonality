import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel,
  Link, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { AddressDisplay } from '@ui/shared'
import { useAccount } from 'wagmi'
import { checkImplications } from '../lib/causeAssistClient'
import {
  attestablePairs,
  loadClusterDocument,
  nudgeTargets,
  parseClusterRouteParams,
  resolveClusterCid,
  type BridgeClusterFields,
} from '../lib/bridgeCluster'
import { parentToModifiedNudges, publishParentToModifiedNudges } from '../lib/bridgeNudges'
import { formatPairSummary, submitPairsToAttester } from '../lib/implicationAttesterClient'
import {
  loadPlankTexts,
  loadRosterDocument,
  normalizeSlug,
  parseCauseLink,
  resolveRosterCid,
  stableCausePath,
} from '../lib/causeRoster'
import {
  emptyParent,
  findBridgeByStable,
  implicationSourcePlanks,
  getBridge,
  markClusterPublished,
  rememberPublishedCluster,
  plankByCid,
  plankById,
  updateBridge,
  STAND_IN_CAUSE_NOTICE,
  type BridgeDraft,
  type BridgeParentDraft,
} from '../lib/bridgeStore'
import { rankNearDuplicates } from '../lib/nearDuplicatePlanks'
import {
  listCauses,
  newPlank,
} from '../lib/causeStore'
import { nextImplicationPair, sideLabel, truncate } from '../lib/bridgeClusterPageHelpers'
import { publishBridgeClusterDraft } from '../lib/publishBridgeCluster'
import { useMachinery, useWriteClients } from '../../shared'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import { BridgeClusterAssist } from '../components/BridgeClusterAssist'
import { ClusterMediatorOptIn } from '../components/ClusterMediatorOptIn'

export function BridgeClusterPage() {
  const params = useParams<{ draftId?: string; owner?: string; slugPart?: string }>()
  const navigate = useNavigate()
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)

  const routeRef = useMemo(
    () => parseClusterRouteParams(params.owner, params.slugPart),
    [params.owner, params.slugPart],
  )
  const localDraftId = params.draftId && !params.owner ? params.draftId : undefined

  const [draft, setDraft] = useState<BridgeDraft | null>(null)
  const [published, setPublished] = useState<BridgeClusterFields | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(routeRef))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [pairCheck, setPairCheck] = useState<string | null>(null)
  const [submitPairs, setSubmitPairs] = useState(true)
  const [publishNudges, setPublishNudges] = useState(false)
  /** Pasted cause links, keyed by parent slot. Not part of the saved draft. */
  const [parentLinks, setParentLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    if (routeRef) return
    if (!localDraftId) return
    const existing = getBridge(localDraftId)
    if (existing) {
      setDraft(existing)
      setLoadError(null)
      return
    }
    // Do not mint a blank draft under this URL — that is how a prefilled
    // parent from /bridge/new?parentOwner=… used to vanish on reload.
    setLoadError('This draft is not on this device. Start again from a cause’s Create a bridge button.')
  }, [localDraftId, navigate, routeRef])

  useEffect(() => {
    if (!routeRef) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const local = findBridgeByStable(routeRef.owner, routeRef.slug)
        if (local && !cancelled) setDraft(local)
        const cid = routeRef.versionCid ?? await resolveClusterCid(machinery, routeRef.owner, routeRef.slug)
        if (!cid) throw new Error('No published cluster at this link.')
        const loaded = await loadClusterDocument(machinery, cid)
        if (!loaded) throw new Error('Could not load this bridge cluster.')
        if (!cancelled) {
          setPublished(loaded.fields)
          rememberPublishedCluster({
            owner: routeRef.owner,
            slug: routeRef.slug,
            clusterCid: cid,
            mediatorName: loaded.fields.mediatorName,
            mediatorNote: loaded.fields.mediatorNote,
            parents: loaded.fields.parents,
          })
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [machinery, routeRef])

  /** Parent slots we already tried to auto-load, so a failure is not retried forever. */
  const autoLoaded = useRef(new Set<string>())

  const patch = useCallback((next: Partial<BridgeDraft>) => {
    if (!draft) return
    const updated = updateBridge(draft.id, next)
    if (updated) setDraft(updated)
  }, [draft])

  const localCauses = useMemo(() => listCauses().filter((c) => c.founderAddress && c.slug), [])

  const loadParentRoster = async (
    parent: BridgeParentDraft,
    ref: { owner: string; slug: string } = parent,
  ) => {
    const owner = ref.owner.trim()
    const slug = ref.slug.trim()
    if (!owner || !slug) return
    setBusy(true)
    setStatus(null)
    try {
      const cid = await resolveRosterCid(machinery, owner, normalizeSlug(slug))
      if (!cid) throw new Error('That parent cause is not published.')
      const loaded = await loadRosterDocument(machinery, cid)
      if (!loaded) throw new Error('Could not read the parent roster.')
      const texts = await loadPlankTexts(machinery, loaded.fields.plankCids)
      const parentPlanks = loaded.fields.plankCids.map((plankCid) => (
        newPlank(texts.get(plankCid) ?? plankCid, 'user', plankCid)
      ))
      patch({
        parents: draft!.parents.map((item) => (
          item.id === parent.id
            ? {
              ...item,
              owner: owner.toLowerCase(),
              slug: normalizeSlug(slug),
              title: loaded.fields.title,
              parentPlanks,
            }
            : item
        )),
      })
      setStatus(`Loaded “${loaded.fields.title}”.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  /**
   * A parent prefilled from the cause page arrives with an owner and slug but no
   * planks, and the assist verbs refuse to run without them. Pull the roster once
   * so the mediator does not have to press "Load parent" for a cause they just
   * came from. Hand-typed slots are left alone until they press the button.
   */
  useEffect(() => {
    if (!draft || busy) return
    const pending = draft.parents.find((parent) => (
      parent.kind !== 'stand-in'
      && parent.owner.trim()
      && parent.slug.trim()
      && parent.parentPlanks.length === 0
      && !autoLoaded.current.has(`${parent.owner.trim().toLowerCase()}/${parent.slug.trim()}`)
    ))
    if (!pending) return
    autoLoaded.current.add(`${pending.owner.trim().toLowerCase()}/${pending.slug.trim()}`)
    void loadParentRoster(pending)
    // loadParentRoster closes over draft, which the guard above already tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, busy])

  /** Fill a parent slot from a pasted link, then load its published roster. */
  const applyParentLink = (parent: BridgeParentDraft) => {
    const ref = parseCauseLink(parentLinks[parent.id] ?? '')
    if (!ref) {
      setStatus('That does not look like a cause link. Expected something like /cause/0x…/their-slug.')
      return
    }
    patch({
      parents: draft!.parents.map((item) => (
        item.id === parent.id ? { ...item, owner: ref.owner, slug: ref.slug } : item
      )),
    })
    void loadParentRoster(parent, { owner: ref.owner, slug: ref.slug })
  }

  const runPairCheck = async () => {
    if (!draft) return
    const pairs = draft.pairs.filter((pair) => (
      pair.role === 'modified-to-bridge' || pair.role === 'parent-to-bridge'
    ))
    if (pairs.length === 0) {
      setPairCheck('Add at least one pair into the bridge. The attester judges statements, not causes.')
      return
    }
    setBusy(true)
    setPairCheck(null)
    try {
      const lines: string[] = []
      for (const pair of pairs) {
        const from = plankById(draft, pair.fromPlankId)
        const to = plankById(draft, pair.toPlankId)
        if (!from?.text.trim() || !to?.text.trim()) continue
        const result = await checkImplications({
          mainStatement: to.text.trim(),
          supportingStatements: [from.text.trim()],
        })
        const first = result.results[0]
        if (!first) continue
        lines.push(
          `${first.implies ? 'Likely implies' : 'May not imply'} (${first.confidence}): ${first.reasoning}`,
        )
      }
      setPairCheck(lines.join('\n') || 'No pair texts to check.')
    } catch (error) {
      setPairCheck(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const publishAll = async () => {
    if (!draft || !address || !writeClients) {
      setStatus('Connect the mediator wallet first.')
      return
    }
    setBusy(true)
    try {
      const publishedResult = await publishBridgeClusterDraft({
        draft,
        address,
        machinery,
        writeClients,
        submitPairs,
        publishNudges,
        onStatus: setStatus,
      })
      markClusterPublished(draft.id, {
        slug: publishedResult.clusterSlug,
        founderAddress: address,
        clusterCid: publishedResult.clusterCid,
      })
      patch({
        slug: publishedResult.clusterSlug,
        founderAddress: address.toLowerCase(),
        clusterCid: publishedResult.clusterCid,
        bridge: {
          ...draft.bridge,
          slug: publishedResult.bridgeSlug,
          rosterCid: publishedResult.bridgeRosterCid,
          founderAddress: address,
        },
      })
      setPublished(publishedResult.fields)
      navigate(`/bridge/${address.toLowerCase()}/${encodeURIComponent(publishedResult.clusterSlug)}`)
      setStatus(publishedResult.followUps.join('\n'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (loadError && !published) {
    return (
      <Stack spacing={2} data-testid="bridge-draft-missing">
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to="/bridge/new" sx={{ textTransform: 'none', alignSelf: 'flex-start' }}>
          Create a bridge
        </Button>
      </Stack>
    )
  }

  const runSubmitPairs = async (fields: BridgeClusterFields) => {
    if (!writeClients) {
      setStatus('Connect the mediator wallet first.')
      return
    }
    setBusy(true)
    setStatus('Paying the implication attester for recorded pairs…')
    try {
      const submitted = await submitPairsToAttester({
        writeClients,
        pairs: attestablePairs(fields),
      })
      setStatus(formatPairSummary(submitted.results))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runPublishNudges = async (fields: BridgeClusterFields) => {
    if (!writeClients || !address) {
      setStatus('Connect the mediator wallet first.')
      return
    }
    setBusy(true)
    setStatus('Publishing parent→modified nudge batch…')
    try {
      const batch = await publishParentToModifiedNudges({
        writeClients,
        mediatorAddress: address,
        fields,
      })
      setStatus(`Published parent→modified nudges (${batch.batchCid.slice(0, 12)}…).`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  if (published && routeRef) {
    const nudges = nudgeTargets(published)
    return (
      <Stack spacing={2.5} data-testid="bridge-cluster-page">
        <Alert severity="warning" sx={{ borderRadius: 2 }} data-testid="bridge-authorship">
          This cluster is authored by <strong>{published.mediatorName}</strong>
          {' '}(<AddressDisplay address={published.mediatorAddress} variant="body2" />).
          The modified causes and the bridge are <strong>not</strong> official revisions of the
          natural parents.
        </Alert>
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
            Bridge cluster
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
            {published.mediatorName}
          </Typography>
          {published.mediatorNote && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>{published.mediatorNote}</Typography>
          )}
        </Box>

        <ClusterMediatorOptIn fields={published} />

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Nudge path: parent → modified</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
            Do not send parent-signers straight to the bridge wording. Offer the mediator’s
            wording of their own side first; implication carries support to the bridge.
          </Typography>
          <Stack spacing={1}>
            {nudges.map((nudge) => (
              <Typography key={`${nudge.from.slug}->${nudge.to.slug}`} variant="body2">
                <Link component={RouterLink} to={stableCausePath(nudge.from)}>{nudge.from.slug}</Link>
                {' → '}
                <Link component={RouterLink} to={stableCausePath(nudge.to)}>{nudge.to.slug}</Link>
              </Typography>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Natural parents</Typography>
          {published.parents.map((parent) => (
            <Typography key={`${parent.owner}/${parent.slug}`} variant="body2" sx={{ mt: 0.5 }}>
              <Link component={RouterLink} to={stableCausePath(parent)}>{parent.slug}</Link>
            </Typography>
          ))}
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Modified causes</Typography>
          {published.modified.map((modified) => (
            <Typography key={modified.slug} variant="body2" sx={{ mt: 0.5 }}>
              <Link component={RouterLink} to={stableCausePath(modified)}>{modified.slug}</Link>
              {' '}for{' '}
              <Link component={RouterLink} to={stableCausePath({ owner: modified.parentOwner, slug: modified.parentSlug })}>
                {modified.parentSlug}
              </Link>
            </Typography>
          ))}
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Bridge cause</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <Link component={RouterLink} to={stableCausePath(published.bridge)}>{published.bridge.slug}</Link>
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Intended plank pairs</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Recorded by the mediator. These are not cause-to-cause implications, and they are
            not attested until the implication attester blesses each pair.
          </Typography>
          {published.pairs.map((pair) => (
            <Typography key={`${pair.fromCid}-${pair.toCid}-${pair.role}`} variant="body2">
              {pair.role.replace(/-/g, ' ')}:{' '}
              {(draft && plankByCid(draft, pair.fromCid)?.text.trim()) || `${pair.fromCid.slice(0, 12)}…`}
              {' → '}
              {(draft && plankByCid(draft, pair.toCid)?.text.trim()) || `${pair.toCid.slice(0, 12)}…`}
            </Typography>
          ))}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
            <Button
              variant="contained"
              disabled={busy}
              sx={{ textTransform: 'none' }}
              onClick={() => void runSubmitPairs(published)}
              data-testid="bridge-submit-pairs"
            >
              Submit pairs to attester
            </Button>
            <Button
              variant="outlined"
              disabled={busy || parentToModifiedNudges(published.pairs).length === 0}
              sx={{ textTransform: 'none' }}
              onClick={() => void runPublishNudges(published)}
              data-testid="bridge-publish-nudges"
            >
              Publish parent→modified nudges
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Attestation is paid per batch and may refuse a pair. Nudges only exist when you recorded modified→parent pairs.
          </Typography>
        </Paper>
        {status && <Alert severity="info" sx={{ borderRadius: 2, whiteSpace: 'pre-wrap' }}>{status}</Alert>}
      </Stack>
    )
  }

  if (!draft) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const addPair = (role: 'modified-to-bridge' | 'modified-to-parent' | 'parent-to-bridge') => {
    const next = nextImplicationPair(draft, role)
    if (!next) {
      setStatus('Write the source and target planks before pairing them.')
      return
    }
    patch({
      pairs: [...draft.pairs, { id: crypto.randomUUID(), ...next }],
    })
  }

  return (
    <Stack spacing={2.5} data-testid="bridge-cluster-editor">
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Create a bridge
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          Write the cluster yourself
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
          Point at existing causes, or write a thin stand-in if the other camp has no cause
          yet. Draft a thinner modified wording when there is a real parent; a stand-in may
          skip that hop. Draft the shared bridge and record plank-to-plank pairs. You remain
          the publisher. This does not replace the in-cause mediator.
          {' '}If the sides are not causes,{' '}
          <RouterLink to="/bridge/triple">write a statement-level triple</RouterLink> instead.
        </Typography>
      </Box>

      {!isConnected && (
        <ConnectWalletHint>
          Connect the mediator wallet. Modified causes and the bridge publish under your key.
        </ConnectWalletHint>
      )}
      {address && draft.parents.some((parent) => (
        parent.kind === 'published'
        && parent.owner.trim().toLowerCase() === address.toLowerCase()
      )) && (
        <Alert severity="warning" sx={{ borderRadius: 2 }} data-testid="bridge-key-coaching">
          The connected wallet also owns a parent cause. Publishing from that key makes
          the modified wording look like an official revision. Use a different mediator
          wallet if you want authorship to stay loud.
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mediator</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          The modified causes and the bridge publish under your key. Label that loudly.
        </Typography>
        <Stack spacing={1.5}>
          <TextField
            label="Mediator name"
            size="small"
            fullWidth
            value={draft.mediatorName}
            onChange={(event) => patch({ mediatorName: event.target.value })}
          />
          <TextField
            label="Public note"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={draft.mediatorNote}
            onChange={(event) => patch({ mediatorNote: event.target.value })}
          />
          <TextField
            label="Cluster URL slug"
            size="small"
            fullWidth
            value={draft.slug ?? ''}
            onChange={(event) => patch({ slug: event.target.value })}
            helperText="Published at /bridge/you/slug. Leave blank to derive from the mediator name."
          />
        </Stack>
      </Paper>

      {draft.parents.map((parent, index) => (
        <Paper key={parent.id} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {parent.kind === 'stand-in' ? `Stand-in parent ${index + 1}` : `Natural parent ${index + 1}`}
            </Typography>
            {draft.parents.length > 1 && (
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => {
                patch({ parents: draft.parents.filter((item) => item.id !== parent.id) })
              }}>
                Remove
              </Button>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {parent.kind === 'stand-in'
              ? 'You write a thin roster for a camp that has no published cause. It publishes under your key and must say so.'
              : 'The founder already published this cause. You do not own it.'}
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                size="small"
                variant={parent.kind === 'published' ? 'contained' : 'outlined'}
                sx={{ textTransform: 'none' }}
                onClick={() => patch({
                  parents: draft.parents.map((item) => item.id === parent.id
                    ? { ...item, kind: 'published', skipModified: false }
                    : item),
                })}
              >
                Published cause
              </Button>
              <Button
                size="small"
                variant={parent.kind === 'stand-in' ? 'contained' : 'outlined'}
                sx={{ textTransform: 'none' }}
                onClick={() => patch({
                  parents: draft.parents.map((item) => item.id === parent.id
                    ? {
                      ...item,
                      kind: 'stand-in',
                      skipModified: true,
                      owner: '',
                      parentPlanks: item.parentPlanks.length > 0 ? item.parentPlanks : [newPlank()],
                    }
                    : item),
                })}
                data-testid={`bridge-parent-stand-in-${index}`}
              >
                No cause yet — start a thin sliver I will own
              </Button>
            </Stack>
            {parent.kind === 'published' && (
            <>
            {/* There is no directory to search (ADR 0008): the organizer's own
                link is how this cause is found, so accept it as pasted. */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Paste the cause link"
                size="small"
                fullWidth
                placeholder="https://…/cause/0x…/their-slug"
                value={parentLinks[parent.id] ?? ''}
                data-testid={`bridge-parent-link-${index}`}
                helperText="A link the other organizer circulated. Fills in the owner and slug below."
                onChange={(event) => setParentLinks((current) => ({
                  ...current, [parent.id]: event.target.value,
                }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyParentLink(parent)
                  }
                }}
              />
              <Button
                onClick={() => applyParentLink(parent)}
                disabled={busy || !(parentLinks[parent.id] ?? '').trim()}
                data-testid={`bridge-parent-link-load-${index}`}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                Use link
              </Button>
            </Stack>
            {localCauses.length > 0 && (
              <TextField
                select
                size="small"
                label="Use a cause board from this device"
                value=""
                onChange={(event) => {
                  const [owner, slug] = event.target.value.split('|')
                  const match = localCauses.find((c) => c.founderAddress === owner && c.slug === slug)
                  patch({
                    parents: draft.parents.map((item) => item.id === parent.id
                      ? {
                        ...item,
                        owner: owner ?? '',
                        slug: slug ?? '',
                        title: match?.title ?? '',
                        parentPlanks: match?.planks.filter((p) => p.cid) ?? [],
                      }
                      : item),
                  })
                }}
              >
                <MenuItem value="" disabled>Select…</MenuItem>
                {localCauses.map((cause) => (
                  <MenuItem key={`${cause.founderAddress}/${cause.slug}`} value={`${cause.founderAddress}|${cause.slug}`}>
                    {cause.title || cause.slug}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Owner address"
                size="small"
                fullWidth
                value={parent.owner}
                onChange={(event) => patch({
                  parents: draft.parents.map((item) => item.id === parent.id ? { ...item, owner: event.target.value } : item),
                })}
              />
              <TextField
                label="Cause slug"
                size="small"
                fullWidth
                value={parent.slug}
                onChange={(event) => patch({
                  parents: draft.parents.map((item) => item.id === parent.id ? { ...item, slug: event.target.value } : item),
                })}
              />
              <Button onClick={() => void loadParentRoster(parent)} disabled={busy} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                Load parent
              </Button>
            </Stack>
            {/* The title can arrive from the cause page we were started from, so it
                is not on its own evidence that the roster came down. Say "loaded"
                only once there are planks to show. */}
            {parent.title && (
              <Typography variant="body2">
                {parent.parentPlanks.length > 0
                  ? `Loaded: ${parent.title}`
                  : `${parent.title} — roster not loaded yet.`}
              </Typography>
            )}
            {parent.parentPlanks.filter((plank) => plank.text.trim()).length > 0 && (
              <Stack spacing={0.5} data-testid={`bridge-parent-planks-${index}`}>
                <Typography variant="caption" color="text.secondary">Parent planks (read-only)</Typography>
                {parent.parentPlanks.filter((plank) => plank.text.trim()).map((plank) => (
                  <Typography key={plank.id} variant="body2">{plank.text}</Typography>
                ))}
              </Stack>
            )}
            </>
            )}

            {parent.kind === 'stand-in' && (
              <>
                <TextField
                  label="Stand-in title"
                  size="small"
                  fullWidth
                  value={parent.title}
                  onChange={(event) => patch({
                    parents: draft.parents.map((item) => item.id === parent.id ? { ...item, title: event.target.value } : item),
                  })}
                  data-testid={`bridge-stand-in-title-${index}`}
                />
                <TextField
                  label="Stand-in summary"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  helperText={STAND_IN_CAUSE_NOTICE}
                  value={parent.summary}
                  onChange={(event) => patch({
                    parents: draft.parents.map((item) => item.id === parent.id ? { ...item, summary: event.target.value } : item),
                  })}
                />
                <TextField
                  label="Stand-in slug"
                  size="small"
                  fullWidth
                  value={parent.slug}
                  onChange={(event) => patch({
                    parents: draft.parents.map((item) => item.id === parent.id ? { ...item, slug: event.target.value } : item),
                  })}
                  helperText="Published under your key at /cause/you/slug."
                />
                {parent.parentPlanks.map((plank) => (
                  <TextField
                    key={plank.id}
                    label="Stand-in plank"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={plank.text}
                    onChange={(event) => patch({
                      parents: draft.parents.map((item) => item.id === parent.id
                        ? {
                          ...item,
                          parentPlanks: item.parentPlanks.map((row) => (
                            row.id === plank.id ? { ...row, text: event.target.value } : row
                          )),
                        }
                        : item),
                    })}
                  />
                ))}
                <Button
                  size="small"
                  sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                  onClick={() => patch({
                    parents: draft.parents.map((item) => item.id === parent.id
                      ? { ...item, parentPlanks: [...item.parentPlanks, newPlank()] }
                      : item),
                  })}
                >
                  Add stand-in plank
                </Button>
                {parent.parentPlanks.some((plank) => plank.text.trim()) && (
                  <Stack spacing={0.5} data-testid={`bridge-stand-in-duplicates-${index}`}>
                    {parent.parentPlanks.flatMap((plank) => {
                      if (!plank.text.trim()) return []
                      const candidates = localCauses.flatMap((cause) => (
                        cause.planks.filter((row) => row.text.trim()).map((row) => ({
                          text: row.text,
                          cid: row.cid,
                          source: cause.title || cause.slug || 'this device',
                        }))
                      ))
                      return rankNearDuplicates(plank.text, candidates).map((hit) => (
                        <Typography key={`${plank.id}-${hit.text}`} variant="caption" color="text.secondary">
                          Similar on this device ({hit.source}): {hit.text}
                          {hit.cid ? ` (${hit.cid.slice(0, 12)}…)` : ''}
                        </Typography>
                      ))
                    })}
                  </Stack>
                )}
              </>
            )}

            {parent.kind === 'stand-in' && (
              <>
            <Divider />
            <FormControlLabel
              control={(
                <Checkbox
                  checked={parent.skipModified}
                  onChange={(event) => patch({
                    parents: draft.parents.map((item) => item.id === parent.id
                      ? { ...item, skipModified: event.target.checked }
                      : item),
                  })}
                />
              )}
              label="Skip modified cause (this stand-in is already thin enough to imply the bridge)"
            />
              </>
            )}
            {!parent.skipModified && (
              <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Modified cause (your wording of this side)</Typography>
            <TextField
              label="Modified title"
              size="small"
              fullWidth
              value={parent.modified.title}
              onChange={(event) => patch({
                parents: draft.parents.map((item) => item.id === parent.id
                  ? { ...item, modified: { ...item.modified, title: event.target.value } }
                  : item),
              })}
            />
            <TextField
              label="Modified summary"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={parent.modified.summary}
              onChange={(event) => patch({
                parents: draft.parents.map((item) => item.id === parent.id
                  ? { ...item, modified: { ...item.modified, summary: event.target.value } }
                  : item),
              })}
            />
            <TextField
              label="Modified slug"
              size="small"
              fullWidth
              value={parent.modified.slug}
              onChange={(event) => patch({
                parents: draft.parents.map((item) => item.id === parent.id
                  ? { ...item, modified: { ...item.modified, slug: event.target.value } }
                  : item),
              })}
            />
            {parent.modified.planks.map((plank) => (
              <TextField
                key={plank.id}
                label="Modified plank"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={plank.text}
                onChange={(event) => patch({
                  parents: draft.parents.map((item) => item.id === parent.id
                    ? {
                      ...item,
                      modified: {
                        ...item.modified,
                        planks: item.modified.planks.map((row) => row.id === plank.id ? { ...row, text: event.target.value } : row),
                      },
                    }
                    : item),
                })}
              />
            ))}
            <Button
              size="small"
              sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
              onClick={() => patch({
                parents: draft.parents.map((item) => item.id === parent.id
                  ? { ...item, modified: { ...item.modified, planks: [...item.modified.planks, newPlank()] } }
                  : item),
              })}
            >
              Add modified plank
            </Button>
              </>
            )}
          </Stack>
        </Paper>
      ))}

      <Button
        variant="outlined"
        sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
        onClick={() => patch({ parents: [...draft.parents, emptyParent()] })}
      >
        Add another parent
      </Button>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Bridge cause</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Shared platform. Each modified (or skipped stand-in) independently implies these planks.
        </Typography>
        <Stack spacing={1.5}>
          <TextField
            label="Bridge title"
            size="small"
            fullWidth
            value={draft.bridge.title}
            onChange={(event) => patch({ bridge: { ...draft.bridge, title: event.target.value } })}
          />
          <TextField
            label="Bridge summary"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={draft.bridge.summary}
            onChange={(event) => patch({ bridge: { ...draft.bridge, summary: event.target.value } })}
          />
          <TextField
            label="Bridge slug"
            size="small"
            fullWidth
            value={draft.bridge.slug}
            onChange={(event) => patch({ bridge: { ...draft.bridge, slug: event.target.value } })}
          />
          {draft.bridge.planks.map((plank) => (
            <TextField
              key={plank.id}
              label="Bridge plank"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={plank.text}
              onChange={(event) => patch({
                bridge: {
                  ...draft.bridge,
                  planks: draft.bridge.planks.map((row) => row.id === plank.id ? { ...row, text: event.target.value } : row),
                },
              })}
            />
          ))}
          <Button
            size="small"
            sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
            onClick={() => patch({ bridge: { ...draft.bridge, planks: [...draft.bridge.planks, newPlank()] } })}
          >
            Add bridge plank
          </Button>
        </Stack>
      </Paper>

      <BridgeClusterAssist draft={draft} onDraft={patch} busy={busy} setBusy={setBusy} />

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Intended implication pairs</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Statement-level only. Checking wording does not attest an arrow.
          Submit blessed pairs to the implication attester after they are published.
        </Typography>
        {draft.pairs.map((pair) => (
          <Stack key={pair.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
            <TextField
              select
              size="small"
              label="From plank"
              sx={{ flex: 1 }}
              value={pair.fromPlankId}
              onChange={(event) => patch({
                pairs: draft.pairs.map((item) => item.id === pair.id ? { ...item, fromPlankId: event.target.value } : item),
              })}
            >
              {draft.parents.flatMap((parent, parentIndex) => (
                implicationSourcePlanks(parent).concat(
                  parent.parentPlanks.filter((plank) => !implicationSourcePlanks(parent).some((row) => row.id === plank.id)),
                ).filter((p) => p.text.trim()).map((plank) => (
                  <MenuItem key={plank.id} value={plank.id}>
                    {`${sideLabel(parent, parentIndex)}: ${truncate(plank.text)}`}
                  </MenuItem>
                ))
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={pair.role === 'modified-to-parent' ? 'To (parent plank)' : 'To (bridge plank)'}
              sx={{ flex: 1 }}
              value={pair.toPlankId}
              onChange={(event) => patch({
                pairs: draft.pairs.map((item) => item.id === pair.id ? { ...item, toPlankId: event.target.value } : item),
              })}
            >
              {(pair.role === 'modified-to-parent'
                ? draft.parents.flatMap((parent, parentIndex) => (
                  parent.parentPlanks
                    .filter((p) => p.text.trim())
                    .map((plank) => ({ plank, label: sideLabel(parent, parentIndex) }))
                ))
                : draft.bridge.planks
                  .filter((p) => p.text.trim())
                  .map((plank) => ({ plank, label: 'Bridge' }))
              ).map(({ plank, label }) => (
                <MenuItem key={plank.id} value={plank.id}>
                  {`${label}: ${truncate(plank.text)}`}
                </MenuItem>
              ))}
            </TextField>
            <Button size="small" sx={{ textTransform: 'none' }} onClick={() => {
              patch({ pairs: draft.pairs.filter((item) => item.id !== pair.id) })
            }}>
              Remove
            </Button>
          </Stack>
        ))}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={() => addPair('modified-to-bridge')}>
            Add modified → bridge pair
          </Button>
          <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={() => addPair('modified-to-parent')}>
            Add modified → parent pair
          </Button>
          <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={() => addPair('parent-to-bridge')}>
            Add parent → bridge pair
          </Button>
          <Button sx={{ textTransform: 'none' }} disabled={busy} onClick={() => void runPairCheck()}>
            Check wording
          </Button>
        </Stack>
        {pairCheck && (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2, whiteSpace: 'pre-wrap' }}>{pairCheck}</Alert>
        )}
      </Paper>

      {status && <Alert severity="info" sx={{ borderRadius: 2, whiteSpace: 'pre-wrap' }}>{status}</Alert>}

      <Stack spacing={0.5}>
        <FormControlLabel
          control={<Checkbox checked={submitPairs} onChange={(event) => setSubmitPairs(event.target.checked)} />}
          label="After publish, pay the implication attester for recorded pairs"
        />
        <FormControlLabel
          control={<Checkbox checked={publishNudges} onChange={(event) => setPublishNudges(event.target.checked)} />}
          label="After publish, also publish parent→modified nudges (needs modified→parent pairs)"
        />
      </Stack>

      <Button
        variant="contained"
        size="large"
        disabled={busy}
        onClick={() => void publishAll()}
        sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
      >
        {busy ? 'Working…' : 'Publish cluster'}
      </Button>
    </Stack>
  )
}
