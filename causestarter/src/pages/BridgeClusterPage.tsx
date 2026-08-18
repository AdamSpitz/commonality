import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel,
  Link, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { checkImplications } from '../lib/causeAssistClient'
import {
  attestablePairs,
  loadClusterDocument,
  nudgeTargets,
  parseClusterRouteParams,
  publishCluster,
  resolveClusterCid,
  type BridgeClusterFields,
} from '../lib/bridgeCluster'
import { parentToModifiedNudges, publishParentToModifiedNudges } from '../lib/bridgeNudges'
import { formatPairSummary, submitPairsToAttester } from '../lib/implicationAttesterClient'
import {
  loadPlankTexts,
  loadRosterDocument,
  normalizeSlug,
  publishRoster,
  resolveRosterCid,
  rosterFieldsFromCause,
  stableCausePath,
  validateSlug,
} from '../lib/causeRoster'
import {
  createBridge,
  emptyParent,
  findBridgeByStable,
  getBridge,
  markClusterPublished,
  plankById,
  updateBridge,
  type BridgeDraft,
  type BridgeParentDraft,
} from '../lib/bridgeStore'
import {
  createCause,
  listCauses,
  markPlankPublished,
  markRosterPublished,
  newPlank,
  updateCause,
  type CausePlank,
} from '../lib/causeStore'
import { publishPlank } from '../lib/publishPlank'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { ConnectWalletHint } from '../components/ConnectWalletHint'

function slugOrEmpty(raw: string): string {
  return raw.trim() ? normalizeSlug(raw) : ''
}

function parentSlotUsed(parent: BridgeParentDraft): boolean {
  return Boolean(
    parent.owner.trim()
    || parent.slug.trim()
    || parent.title.trim()
    || parent.modified.title.trim()
    || parent.modified.slug.trim()
    || parent.modified.planks.some((plank) => plank.text.trim())
  )
}

export function BridgeClusterPage() {
  const params = useParams<{ draftId?: string; owner?: string; slugPart?: string }>()
  const navigate = useNavigate()
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)

  const routeRef = parseClusterRouteParams(params.owner, params.slugPart)
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

  useEffect(() => {
    if (routeRef) return
    if (!localDraftId) return
    const existing = getBridge(localDraftId)
    if (existing) {
      setDraft(existing)
      return
    }
    const created = createBridge()
    navigate(`/bridge/${created.id}`, { replace: true })
    setDraft(created)
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
        if (!cancelled) setPublished(loaded.fields)
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [machinery, routeRef])

  const patch = useCallback((next: Partial<BridgeDraft>) => {
    if (!draft) return
    const updated = updateBridge(draft.id, next)
    if (updated) setDraft(updated)
  }, [draft])

  const localCauses = useMemo(() => listCauses().filter((c) => c.founderAddress && c.slug), [])

  const loadParentRoster = async (parent: BridgeParentDraft) => {
    if (!parent.owner.trim() || !parent.slug.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const cid = await resolveRosterCid(machinery, parent.owner.trim(), normalizeSlug(parent.slug))
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
              owner: parent.owner.trim().toLowerCase(),
              slug: normalizeSlug(parent.slug),
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

  const runPairCheck = async () => {
    if (!draft) return
    const pairs = draft.pairs.filter((pair) => pair.role === 'modified-to-bridge')
    if (pairs.length === 0) {
      setPairCheck('Add at least one modified→bridge pair. The attester judges statements, not causes.')
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
    const clusterSlug = slugOrEmpty(draft.slug || draft.mediatorName || 'bridge')
    const slugError = validateSlug(clusterSlug)
    if (slugError) {
      setStatus(slugError)
      return
    }
    if (!draft.mediatorName.trim()) {
      setStatus('Name the mediator. Authorship has to be loud.')
      return
    }

    setBusy(true)
    setStatus('Publishing planks and causes…')
    try {
      const publishedParents = []
      const publishedModified = []

      const parentsToPublish = draft.parents.filter(parentSlotUsed)
      if (parentsToPublish.length === 0) {
        throw new Error('Add at least one published parent cause.')
      }

      for (const parent of parentsToPublish) {
        if (!parent.owner.trim() || !parent.slug.trim()) {
          throw new Error('Every used parent needs a published owner and slug.')
        }
        const parentOwner = parent.owner.trim().toLowerCase() as `0x${string}`
        const parentSlug = normalizeSlug(parent.slug)
        publishedParents.push({ owner: parentOwner, slug: parentSlug })

        const modifiedSlug = slugOrEmpty(parent.modified.slug || `${parentSlug}-modified`)
        if (validateSlug(modifiedSlug)) throw new Error(`Modified slug: ${validateSlug(modifiedSlug)}`)

        const local = createCause()
        const causeId = local.id
        updateCause(causeId, {
          title: parent.modified.title.trim() || `Modified ${parent.title || parentSlug}`,
          summary: parent.modified.summary,
          slug: modifiedSlug,
          planks: parent.modified.planks.filter((p) => p.text.trim()),
          bridgeCluster: {
            clusterOwner: address.toLowerCase() as `0x${string}`,
            clusterSlug,
            role: 'modified',
            parentOwner,
            parentSlug,
          },
        })

        const nextPlanks = []
        for (const plank of parent.modified.planks.filter((p) => p.text.trim())) {
          if (plank.cid) {
            nextPlanks.push(plank)
            continue
          }
          const cid = await publishPlank({ machinery, writeClients, text: plank.text })
          markPlankPublished(causeId, plank.id, cid, plank.text)
          nextPlanks.push({ ...plank, cid })
        }
        const forRoster = updateCause(causeId, { planks: nextPlanks })
        if (!forRoster) throw new Error('Lost the modified cause while publishing.')
        const roster = await publishRoster({
          machinery,
          writeClients,
          slug: modifiedSlug,
          fields: rosterFieldsFromCause(forRoster),
        })
        markRosterPublished(causeId, {
          slug: modifiedSlug,
          founderAddress: address,
          rosterCid: roster.rosterCid,
        })
        publishedModified.push({
          owner: address.toLowerCase() as `0x${string}`,
          slug: modifiedSlug,
          parentOwner,
          parentSlug,
          planks: nextPlanks,
        })
      }

      const bridgeSlug = slugOrEmpty(draft.bridge.slug || `${clusterSlug}-cause`)
      if (validateSlug(bridgeSlug)) throw new Error(`Bridge slug: ${validateSlug(bridgeSlug)}`)
      const bridgeLocal = createCause()
      updateCause(bridgeLocal.id, {
        title: draft.bridge.title.trim() || draft.mediatorName.trim(),
        summary: draft.bridge.summary,
        slug: bridgeSlug,
        planks: draft.bridge.planks.filter((p) => p.text.trim()),
        bridgeCluster: {
          clusterOwner: address.toLowerCase() as `0x${string}`,
          clusterSlug,
          role: 'bridge',
        },
      })
      const bridgePlanks: CausePlank[] = []
      for (const plank of draft.bridge.planks.filter((p) => p.text.trim())) {
        if (plank.cid) {
          bridgePlanks.push(plank)
          continue
        }
        const cid = await publishPlank({ machinery, writeClients, text: plank.text })
        markPlankPublished(bridgeLocal.id, plank.id, cid, plank.text)
        bridgePlanks.push({ ...plank, cid })
      }
      const bridgeCause = updateCause(bridgeLocal.id, { planks: bridgePlanks })
      if (!bridgeCause) throw new Error('Lost the bridge cause while publishing.')
      const bridgeRoster = await publishRoster({
        machinery,
        writeClients,
        slug: bridgeSlug,
        fields: rosterFieldsFromCause(bridgeCause),
      })
      markRosterPublished(bridgeLocal.id, {
        slug: bridgeSlug,
        founderAddress: address,
        rosterCid: bridgeRoster.rosterCid,
      })

      const idToCid = new Map<string, string>()
      for (const parent of draft.parents) {
        for (const plank of parent.parentPlanks) if (plank.cid) idToCid.set(plank.id, plank.cid)
        const publishedMod = publishedModified.find((m) => m.parentSlug === normalizeSlug(parent.slug))
        publishedMod?.planks.forEach((plank, index) => {
          const original = parent.modified.planks.filter((p) => p.text.trim())[index]
          if (original && plank.cid) idToCid.set(original.id, plank.cid)
        })
      }
      draft.bridge.planks.filter((p) => p.text.trim()).forEach((plank, index) => {
        const publishedPlank = bridgePlanks[index]
        if (publishedPlank?.cid) idToCid.set(plank.id, publishedPlank.cid)
      })

      const pairs = draft.pairs.flatMap((pair) => {
        const fromCid = idToCid.get(pair.fromPlankId)
        const toCid = idToCid.get(pair.toPlankId)
        return fromCid && toCid ? [{ fromCid, toCid, role: pair.role }] : []
      })

      const fields: BridgeClusterFields = {
        mediatorName: draft.mediatorName.trim(),
        mediatorNote: draft.mediatorNote.trim(),
        mediatorAddress: address.toLowerCase() as `0x${string}`,
        parents: publishedParents,
        modified: publishedModified.map(({ owner, slug, parentOwner, parentSlug }) => ({
          owner, slug, parentOwner, parentSlug,
        })),
        bridge: { owner: address.toLowerCase() as `0x${string}`, slug: bridgeSlug },
        pairs,
      }

      setStatus('Sealing the cluster document…')
      const result = await publishCluster({
        machinery,
        writeClients,
        slug: clusterSlug,
        fields,
      })
      markClusterPublished(draft.id, {
        slug: clusterSlug,
        founderAddress: address,
        clusterCid: result.clusterCid,
      })
      patch({
        slug: clusterSlug,
        founderAddress: address.toLowerCase(),
        clusterCid: result.clusterCid,
        bridge: { ...draft.bridge, slug: bridgeSlug, rosterCid: bridgeRoster.rosterCid, founderAddress: address },
      })
      setPublished(fields)
      navigate(`/bridge/${address.toLowerCase()}/${encodeURIComponent(clusterSlug)}`)

      const followUps: string[] = ['Published the cluster.']
      if (submitPairs) {
        setStatus('Paying the implication attester for recorded pairs…')
        const submitted = await submitPairsToAttester({
          writeClients,
          pairs: attestablePairs(fields),
        })
        followUps.push(formatPairSummary(submitted.results))
      }
      if (publishNudges) {
        setStatus('Publishing parent→modified nudge batch…')
        const batch = await publishParentToModifiedNudges({
          writeClients,
          mediatorAddress: address,
          fields,
        })
        followUps.push(`Published parent→modified nudges (${batch.batchCid.slice(0, 12)}…).`)
      }
      if (!submitPairs && !publishNudges) {
        followUps.push('Pairs are recorded as intended arrows. Submit them to the attester when you are ready; they are not invented automatically.')
      }
      setStatus(followUps.join('\n'))
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
    return <Alert severity="error">{loadError}</Alert>
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
          {' '}({published.mediatorAddress.slice(0, 6)}…{published.mediatorAddress.slice(-4)}).
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
            <Typography key={`${pair.fromCid}-${pair.toCid}-${pair.role}`} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
              {pair.role}: {pair.fromCid.slice(0, 12)}… → {pair.toCid.slice(0, 12)}…
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

  const addPair = (role: 'modified-to-bridge' | 'modified-to-parent') => {
    const usedParents = draft.parents.filter(parentSlotUsed)
    const pairedFrom = new Set(draft.pairs.filter((pair) => pair.role === role).map((pair) => pair.fromPlankId))
    const parent = usedParents.find((item) => item.modified.planks.some((plank) => plank.text.trim() && !pairedFrom.has(plank.id)))
      ?? usedParents.find((item) => item.modified.planks.some((plank) => plank.text.trim()))
      ?? draft.parents[0]
    const from = parent?.modified.planks.find((p) => p.text.trim() && !pairedFrom.has(p.id))
      ?? parent?.modified.planks.find((p) => p.text.trim())
    const to = role === 'modified-to-bridge'
      ? draft.bridge.planks.find((p) => p.text.trim())
      : parent?.parentPlanks.find((p) => p.text.trim()) ?? parent?.parentPlanks[0]
    if (!from || !to) {
      setStatus('Write the modified and target planks before pairing them.')
      return
    }
    patch({
      pairs: [...draft.pairs, {
        id: crypto.randomUUID(),
        fromPlankId: from.id,
        toPlankId: to.id,
        role,
      }],
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
          Point at existing causes, draft a thinner modified wording for each side, draft the
          shared bridge, and record plank-to-plank pairs. After publish you can pay the
          implication attester for those pairs and optionally publish parent→modified nudges.
          You remain the publisher. This does not replace the in-cause mediator.
        </Typography>
      </Box>

      {!isConnected && (
        <ConnectWalletHint>
          Connect the mediator wallet. Modified causes and the bridge publish under your key.
        </ConnectWalletHint>
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
              Natural parent {index + 1}
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
            The founder already published this cause. You do not own it.
          </Typography>
          <Stack spacing={1.5}>
            {localCauses.length > 0 && (
              <TextField
                select
                size="small"
                label="Use a cause from this device"
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
            {parent.title && <Typography variant="body2">Loaded: {parent.title}</Typography>}

            <Divider />
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
          Shared platform. Each modified cause independently implies these planks.
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
              label="From (modified plank)"
              sx={{ flex: 1 }}
              value={pair.fromPlankId}
              onChange={(event) => patch({
                pairs: draft.pairs.map((item) => item.id === pair.id ? { ...item, fromPlankId: event.target.value } : item),
              })}
            >
              {draft.parents.flatMap((parent) => parent.modified.planks.filter((p) => p.text.trim()).map((plank) => (
                <MenuItem key={plank.id} value={plank.id}>{plank.text.slice(0, 72)}</MenuItem>
              )))}
            </TextField>
            <TextField
              select
              size="small"
              label={pair.role === 'modified-to-bridge' ? 'To (bridge plank)' : 'To (parent plank)'}
              sx={{ flex: 1 }}
              value={pair.toPlankId}
              onChange={(event) => patch({
                pairs: draft.pairs.map((item) => item.id === pair.id ? { ...item, toPlankId: event.target.value } : item),
              })}
            >
              {(pair.role === 'modified-to-bridge'
                ? draft.bridge.planks
                : draft.parents.flatMap((parent) => parent.parentPlanks)
              ).filter((p) => p.text.trim()).map((plank) => (
                <MenuItem key={plank.id} value={plank.id}>{plank.text.slice(0, 72)}</MenuItem>
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
