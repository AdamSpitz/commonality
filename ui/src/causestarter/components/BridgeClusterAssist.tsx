import { useState } from 'react'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import {
  applyBridgeClusterPatch,
  buildBridgeAssistBrief,
  parentTexts,
  parseBridgeClusterPatch,
} from '../lib/bridgeAssistBrief'
import {
  critiqueTriple,
  draftBridgePlank,
  draftModifiedPlank,
  draftStandInSliver,
} from '../lib/causeAssistClient'
import { implicationSourcePlanks, type BridgeDraft } from '../lib/bridgeStore'
import { newPlank } from '../lib/causeStore'

function optional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

interface Proposal {
  kind: 'modified' | 'bridge' | 'stand-in'
  parentId?: string
  plank: string
  title?: string
  summary?: string
  planks?: string[]
  rationale: string
  warnings: string[]
}

interface BridgeClusterAssistProps {
  draft: BridgeDraft
  onDraft: (next: Partial<BridgeDraft>) => void
  busy: boolean
  setBusy: (busy: boolean) => void
}

export function BridgeClusterAssist({ draft, onDraft, busy, setBusy }: BridgeClusterAssistProps) {
  const [paste, setPaste] = useState('')
  const [complaint, setComplaint] = useState('')
  const [mustNotConcede, setMustNotConcede] = useState('')
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [critique, setCritique] = useState<{ objections: string[]; leakWarnings: string[] } | null>(null)

  const copyBrief = async () => {
    const brief = buildBridgeAssistBrief(draft)
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      setStatus('Brief copied. Paste it into your usual assistant, then paste the JSON it returns below.')
    } catch {
      setStatus('Could not copy automatically. Select the brief in the box below.')
      setPaste(brief)
    }
  }

  const applyPaste = () => {
    const parsed = parseBridgeClusterPatch(paste)
    if ('error' in parsed) {
      setStatus(parsed.error)
      return
    }
    const next = applyBridgeClusterPatch(draft, parsed.patch)
    onDraft({ parents: next.parents, bridge: next.bridge })
    setStatus(parsed.patch.notes ? `Applied. Assistant note: ${parsed.patch.notes}` : 'Applied. Review the fields before you publish.')
    setPaste('')
  }

  const runStandIn = async (parentId: string) => {
    const parent = draft.parents.find((item) => item.id === parentId)
    if (!parent) return
    const sideLabel = optional(parent.title) || optional(parent.slug) || 'the other camp'
    setBusy(true)
    setStatus(null)
    try {
      const result = await draftStandInSliver({
        sideLabel,
        bullets: parent.parentPlanks.map((plank) => plank.text.trim()).filter(Boolean),
        currentDraft: {
          title: optional(parent.title),
          summary: optional(parent.summary),
          planks: parent.parentPlanks.map((plank) => plank.text.trim()).filter(Boolean),
        },
        mustNotCaricature: optional(mustNotConcede),
        complaint: optional(complaint),
      })
      setProposal({
        kind: 'stand-in',
        parentId,
        plank: result.planks.join('\n'),
        title: result.title,
        summary: result.summary,
        planks: result.planks,
        rationale: result.rationale,
        warnings: result.warnings,
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runModified = async (parentId: string) => {
    const parent = draft.parents.find((item) => item.id === parentId)
    if (!parent) return
    const parentPlanks = parentTexts(parent)
    if (parentPlanks.length === 0) {
      setStatus('Load the parent cause first so the assistant can see its planks.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const result = await draftModifiedPlank({
        parentPlanks,
        currentDraft: optional(parent.modified.planks.find((plank) => plank.text.trim())?.text ?? ''),
        sideLabel: optional(parent.title || parent.slug),
        mustNotConcede: optional(mustNotConcede),
        complaint: optional(complaint),
        intendedBridge: optional(draft.bridge.planks.find((plank) => plank.text.trim())?.text ?? ''),
      })
      setProposal({
        kind: 'modified',
        parentId,
        plank: result.plank,
        rationale: result.rationale,
        warnings: result.warnings,
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runBridge = async () => {
    const modifiedSides = draft.parents.flatMap((parent) => {
      const planks = implicationSourcePlanks(parent).map((plank) => plank.text.trim()).filter(Boolean)
      if (planks.length === 0) return []
      return [{ label: optional(parent.title || parent.slug), planks }]
    })
    if (modifiedSides.length < 2) {
      setStatus('Write stand-in or modified wording on at least two sides first.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const result = await draftBridgePlank({
        modifiedSides,
        currentDraft: optional(draft.bridge.planks.find((plank) => plank.text.trim())?.text ?? ''),
        complaint: optional(complaint),
      })
      setProposal({
        kind: 'bridge',
        plank: result.plank,
        rationale: result.rationale,
        warnings: result.warnings,
      })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runCritique = async () => {
    const modifiedPlanks = draft.parents.flatMap((parent) => (
      implicationSourcePlanks(parent).map((plank) => plank.text.trim()).filter(Boolean)
    ))
    const parentPlanks = draft.parents.flatMap((parent) => parentTexts(parent))
    const bridgePlank = draft.bridge.planks.find((plank) => plank.text.trim())?.text.trim()
    if (modifiedPlanks.length < 2 || !bridgePlank) {
      setStatus('Need at least two modified planks and one bridge plank to critique.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const result = await critiqueTriple({
        modifiedPlanks,
        bridgePlank,
        parentPlanks: parentPlanks.length > 0 ? parentPlanks : undefined,
      })
      setCritique({ objections: result.objections, leakWarnings: result.leakWarnings })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const applyProposal = () => {
    if (!proposal) return
    if (proposal.kind === 'stand-in' && proposal.parentId && proposal.planks && proposal.planks.length > 0) {
      onDraft({
        parents: draft.parents.map((parent) => {
          if (parent.id !== proposal.parentId) return parent
          return {
            ...parent,
            title: proposal.title || parent.title,
            summary: proposal.summary ?? parent.summary,
            parentPlanks: proposal.planks!.map((text) => newPlank(text, 'suggested')),
          }
        }),
      })
      setProposal(null)
      return
    }
    if (!proposal.plank.trim()) return
    if (proposal.kind === 'modified' && proposal.parentId) {
      onDraft({
        parents: draft.parents.map((parent) => {
          if (parent.id !== proposal.parentId) return parent
          const existing = parent.modified.planks.filter((plank) => plank.text.trim())
          const first = existing[0] ?? parent.modified.planks[0]
          const planks = first
            ? parent.modified.planks.map((plank) => (
              plank.id === first.id ? { ...plank, text: proposal.plank } : plank
            ))
            : [newPlank(proposal.plank, 'suggested')]
          return { ...parent, modified: { ...parent.modified, planks } }
        }),
      })
    } else {
      const first = draft.bridge.planks[0]
      onDraft({
        bridge: {
          ...draft.bridge,
          planks: first
            ? draft.bridge.planks.map((plank) => plank.id === first.id ? { ...plank, text: proposal.plank } : plank)
            : [newPlank(proposal.plank, 'suggested')],
        },
      })
    }
    setProposal(null)
  }

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} data-testid="bridge-cluster-assist">
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Wording help</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        One-shot proposals and a brief for your own assistant. We do not keep a chat.
        You still apply every change. This does not write a standing mediator policy.
      </Typography>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={() => void copyBrief()} data-testid="bridge-copy-brief">
            {copied ? 'Brief copied' : 'Copy brief for your assistant'}
          </Button>
        </Stack>
        <TextField
          label="Paste assistant JSON here"
          size="small"
          fullWidth
          multiline
          minRows={3}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          data-testid="bridge-patch-paste"
        />
        <Button sx={{ textTransform: 'none', alignSelf: 'flex-start' }} onClick={applyPaste} data-testid="bridge-apply-patch">
          Apply pasted patch
        </Button>
        <TextField
          label="Optional complaint (too mushy, sounds like converting, …)"
          size="small"
          fullWidth
          value={complaint}
          onChange={(event) => setComplaint(event.target.value)}
        />
        <TextField
          label="This camp must not be taken to have conceded (for modified drafts)"
          size="small"
          fullWidth
          value={mustNotConcede}
          onChange={(event) => setMustNotConcede(event.target.value)}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
          {draft.parents.map((parent, index) => (
            parent.kind === 'stand-in' ? (
              <Button
                key={`${parent.id}-stand-in`}
                variant="outlined"
                disabled={busy}
                sx={{ textTransform: 'none' }}
                onClick={() => void runStandIn(parent.id)}
                data-testid={`bridge-draft-stand-in-${index}`}
              >
                Propose stand-in sliver ({index + 1})
              </Button>
            ) : (
              <Button
                key={parent.id}
                variant="outlined"
                disabled={busy}
                sx={{ textTransform: 'none' }}
                onClick={() => void runModified(parent.id)}
                data-testid={`bridge-draft-modified-${index}`}
              >
                Propose modified wording ({index + 1})
              </Button>
            )
          ))}
          <Button variant="outlined" disabled={busy} sx={{ textTransform: 'none' }} onClick={() => void runBridge()} data-testid="bridge-draft-bridge">
            Propose shared plank
          </Button>
          <Button disabled={busy} sx={{ textTransform: 'none' }} onClick={() => void runCritique()} data-testid="bridge-critique-triple">
            Critique this triple
          </Button>
        </Stack>
        {proposal && (
          <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="bridge-assist-proposal">
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Proposal (not applied)</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{proposal.plank}</Typography>
            {proposal.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{proposal.rationale}</Typography>}
            {proposal.warnings.map((warning) => (
              <Typography key={warning} variant="body2">{warning}</Typography>
            ))}
            <Button size="small" sx={{ textTransform: 'none', mt: 1 }} onClick={applyProposal} data-testid="bridge-apply-proposal">
              Apply this wording
            </Button>
          </Alert>
        )}
        {critique && (
          <Alert severity={critique.leakWarnings.length ? 'warning' : 'info'} sx={{ borderRadius: 2 }} data-testid="bridge-assist-critique">
            {critique.objections.length === 0 && critique.leakWarnings.length === 0 && (
              <Typography variant="body2">No load-bearing objections. Still run Check wording before paying the attester.</Typography>
            )}
            {critique.leakWarnings.map((line) => <Typography key={line} variant="body2">{line}</Typography>)}
            {critique.objections.map((line) => <Typography key={line} variant="body2">{line}</Typography>)}
          </Alert>
        )}
        {status && <Alert severity="info" sx={{ borderRadius: 2 }}>{status}</Alert>}
      </Stack>
    </Paper>
  )
}
