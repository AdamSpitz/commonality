import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { BeliefsAbi, MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { createAndSignStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import { createStatement } from '@commonality/sdk/displayable-documents'
import type { MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import {
  adoptedStatements,
  getCause,
  hasBlockingImplication,
  hasBlockingSafety,
  markCauseLaunched,
  saveCause,
  type CauseStatement,
  type ImplicationState,
  type MomentumLever,
  type SafetyState,
} from '../lib/causeStore'
import { checkImplications, checkSafety, suggestStatements } from '../lib/causeAssistClient'
import { StatementWorkbench } from '../components/StatementWorkbench'
import { SafetyRejectionDialog } from '../components/SafetyRejectionDialog'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { WalletButton } from '../components/WalletButton'

const steps = ['Main statement', 'Supporting', 'Launch']
/** All growth surfaces are always on the cause page; wizard no longer picks levers. */
const DEFAULT_LEVERS: MomentumLever[] = [
  'supporters',
  'volunteers',
  'collaborators',
  'funding',
  'content',
]

function toSafetyState(verdict: {
  allowed: boolean
  category: SafetyState['category']
  explanation: string
}): SafetyState {
  return {
    allowed: verdict.allowed,
    category: verdict.category,
    explanation: verdict.explanation,
    checkedAt: new Date().toISOString(),
  }
}

export function StartCausePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const existingId = searchParams.get('id') ?? undefined
  const existing = existingId ? getCause(existingId) : undefined

  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()

  const [activeStep, setActiveStep] = useState(0)
  const [goal, setGoal] = useState(existing?.goal ?? '')
  const [goalSafety, setGoalSafety] = useState<SafetyState | undefined>(existing?.goalSafety)
  const [statements, setStatements] = useState<CauseStatement[]>(existing?.statements ?? [])
  const [levers] = useState<MomentumLever[]>(
    existing?.levers?.length ? existing.levers : DEFAULT_LEVERS,
  )
  const [draftId, setDraftId] = useState<string | undefined>(existing?.id)
  const [busy, setBusy] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [checkingSafety, setCheckingSafety] = useState(false)
  const [checkingImplications, setCheckingImplications] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLabel, setDialogLabel] = useState<string | undefined>()
  const [dialogSafety, setDialogSafety] = useState<SafetyState | null>(null)

  const adopted = useMemo(
    () => statements.filter((s) => s.disposition === 'adopted' && s.text.trim()),
    [statements],
  )

  const showSafety = (label: string, safety: SafetyState) => {
    setDialogLabel(label)
    setDialogSafety(safety)
    setDialogOpen(true)
  }

  const persistDraft = (status: 'draft' | 'launched' = 'draft') => {
    const saved = saveCause({
      id: draftId,
      goal: goal.trim(),
      statements,
      levers,
      status,
      goalSafety,
    })
    setDraftId(saved.id)
    return saved
  }

  type SafetyReviewResult = {
    ok: boolean
    goalSafety?: SafetyState
    statements: CauseStatement[]
  }

  const applyImplicationResults = (
    current: CauseStatement[],
    main: string,
  ): Promise<CauseStatement[]> => {
    const targets = current.filter(
      (s) => s.disposition !== 'rejected' && s.text.trim() && s.text.trim() !== main.trim(),
    )
    if (!main.trim() || targets.length === 0) {
      return Promise.resolve(current.map((s) => ({ ...s, implication: undefined })))
    }
    setCheckingImplications(true)
    return checkImplications({
      mainStatement: main.trim(),
      supportingStatements: targets.map((s) => s.text.trim()),
    })
      .then((response) => {
        const byText = new Map(
          response.results.map((r) => [r.supportingStatement.trim(), r] as const),
        )
        const checkedAt = new Date().toISOString()
        return current.map((s) => {
          if (s.disposition === 'rejected' || !s.text.trim()) {
            return { ...s, implication: undefined }
          }
          if (s.text.trim() === main.trim()) {
            return {
              ...s,
              implication: {
                implies: true,
                confidence: 'high' as const,
                reasoning: 'Same wording as the main statement.',
                checkedAt,
              },
            }
          }
          const verdict = byText.get(s.text.trim())
          if (!verdict) return { ...s, implication: undefined }
          const implication: ImplicationState = {
            implies: verdict.implies,
            confidence: verdict.confidence,
            reasoning: verdict.reasoning,
            keyDifference: verdict.keyDifference,
            checkedAt,
          }
          return { ...s, implication }
        })
      })
      .catch(() => current)
      .finally(() => setCheckingImplications(false))
  }

  const runSafetyReview = async (
    checkSupportingImplications = true,
  ): Promise<SafetyReviewResult> => {
    setCheckingSafety(true)
    setError(null)
    try {
      // Only goal + adopted statements can block progression. Pending suggestions
      // are still scanned so cards can show "Blocked", but they won't trap Continue.
      const items: Array<{ text: string; fieldLabel: string; key: string }> = []
      if (goal.trim()) {
        items.push({ text: goal.trim(), fieldLabel: 'Main statement', key: 'goal' })
      }
      for (const statement of statements) {
        if (statement.disposition === 'rejected') continue
        if (!statement.text.trim()) continue
        items.push({
          text: statement.text.trim(),
          fieldLabel: statement.disposition === 'pending' ? 'Suggested statement' : 'Statement',
          key: statement.id,
        })
      }

      if (items.length === 0) {
        return { ok: true, goalSafety: undefined, statements }
      }

      const response = await checkSafety(items.map(({ text, fieldLabel }) => ({ text, fieldLabel })))
      let goalNext: SafetyState | undefined
      let nextStatements: CauseStatement[] = statements.map((s) => ({ ...s, safety: undefined }))

      response.results.forEach((verdict, index) => {
        const meta = items[index]
        if (!meta) return
        const safety = toSafetyState(verdict)
        if (meta.key === 'goal') {
          goalNext = safety
          return
        }
        const stmtIndex = nextStatements.findIndex((s) => s.id === meta.key)
        if (stmtIndex >= 0) {
          nextStatements[stmtIndex] = { ...nextStatements[stmtIndex]!, safety }
        }
      })

      // Step 0 precedes the supporting-statement editor, so implication checks begin
      // only when leaving that editor (and are repeated before launch).
      if (checkSupportingImplications) {
        nextStatements = await applyImplicationResults(nextStatements, goal)
      }

      setGoalSafety(goalNext)
      setStatements(nextStatements)

      const blocking = hasBlockingSafety({
        goal,
        goalSafety: goalNext,
        statements: nextStatements,
      })
      if (blocking) {
        const firstBlocked =
          (goalNext && !goalNext.allowed
            ? { fieldLabel: 'Main statement', safety: goalNext }
            : null)
          ?? nextStatements
            .filter((s) => s.disposition === 'adopted' && s.safety && !s.safety.allowed)
            .map((s) => ({ fieldLabel: 'Statement', safety: s.safety! }))[0]
        if (firstBlocked) {
          showSafety(firstBlocked.fieldLabel, firstBlocked.safety)
        }
        return { ok: false, goalSafety: goalNext, statements: nextStatements }
      }
      if (checkSupportingImplications && hasBlockingImplication(nextStatements)) {
        setError(
          'A supporting statement is not clearly implied by the main statement. '
          + 'Edit it so it only restates or narrows what the main claim already says, or remove it.',
        )
        return { ok: false, goalSafety: goalNext, statements: nextStatements }
      }
      return { ok: true, goalSafety: goalNext, statements: nextStatements }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Safety check failed')
      return { ok: false, goalSafety, statements }
    } finally {
      setCheckingSafety(false)
    }
  }

  const handleRequestSuggestions = async () => {
    if (!goal.trim()) {
      setError('Write a main statement first so we can suggest supporting statements.')
      return
    }
    setSuggesting(true)
    setError(null)
    try {
      const existingTexts = statements.map((s) => s.text).filter(Boolean)
      const result = await suggestStatements({
        goal: goal.trim(),
        existingStatements: existingTexts,
        count: 4,
      })

      // Safety-scan suggestions before showing as pending.
      let safetyByText = new Map<string, SafetyState>()
      try {
        const safety = await checkSafety(
          result.suggestions.map((s) => ({ text: s.text, fieldLabel: 'Suggested statement' })),
        )
        safety.results.forEach((verdict) => {
          safetyByText.set(verdict.text.trim(), toSafetyState(verdict))
        })
      } catch {
        safetyByText = new Map()
      }

      const checkedAt = new Date().toISOString()
      const incoming: CauseStatement[] = result.suggestions.map((s) => ({
        id: crypto.randomUUID(),
        text: s.text,
        origin: 'suggested' as const,
        disposition: 'pending' as const,
        rationale: s.rationale,
        role: s.role,
        safety: safetyByText.get(s.text.trim()),
        implication: s.implication
          ? {
              implies: s.implication.implies,
              confidence: s.implication.confidence,
              reasoning: s.implication.reasoning,
              keyDifference: s.implication.keyDifference,
              checkedAt,
            }
          : undefined,
      }))

      // Drop previous pending suggestions; keep adopted/rejected.
      setStatements((current) => [
        ...current.filter((s) => s.disposition !== 'pending'),
        ...incoming,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load suggestions')
    } finally {
      setSuggesting(false)
    }
  }

  const canAdvance = () => {
    if (activeStep === 0) return goal.trim().length >= 12
    if (activeStep === 1) return true // 0–n statements allowed
    return true
  }

  const handleNext = async () => {
    setError(null)
    if (!canAdvance()) {
      setError(
        activeStep === 0
          ? 'Write a clear main statement in a full sentence or two.'
          : 'Fill in this step before continuing.',
      )
      return
    }
    if (activeStep === 0 || activeStep === 1) {
      const review = await runSafetyReview(activeStep === 1)
      if (!review.ok) {
        setError('Blocked text cannot be saved. Edit or remove highlighted fields.')
        return
      }
      // Persist using fresh safety results (React state may not have flushed yet).
      const saved = saveCause({
        id: draftId,
        goal: goal.trim(),
        statements: review.statements,
        levers,
        status: 'draft',
        goalSafety: review.goalSafety,
      })
      setDraftId(saved.id)
      setActiveStep((step) => Math.min(step + 1, steps.length - 1))
      return
    }
    persistDraft()
    setActiveStep((step) => Math.min(step + 1, steps.length - 1))
  }

  const handleBack = () => {
    setError(null)
    setActiveStep((step) => Math.max(step - 1, 0))
  }

  const handleSaveDraftOnly = async () => {
    setError(null)
    const review = await runSafetyReview(activeStep >= 1)
    if (!review.ok) {
      setError('Blocked text cannot be saved. Edit or remove highlighted fields.')
      return
    }
    const saved = saveCause({
      id: draftId,
      goal: goal.trim(),
      statements: review.statements,
      levers,
      status: 'draft',
      goalSafety: review.goalSafety,
    })
    setDraftId(saved.id)
    navigate(`/cause/${saved.id}`)
  }

  const publishOne = async (text: string) => {
    // Prefer runtime config.json (Docker/local deploy); fall back to build-time env.
    const beliefsAddress = (
      machinery.contractAddresses?.beliefs
      || getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')
    ) as `0x${string}` | undefined
    const mutableRefAddress = (
      machinery.contractAddresses?.mutableRefUpdater
      || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')
    ) as `0x${string}` | undefined
    const publishedDataAddress = (
      machinery.contractAddresses?.publishedData
      || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')
    ) as `0x${string}` | undefined

    if (!writeClients) {
      throw new Error('Wallet is not ready. Connect your wallet and try again.')
    }
    if (!beliefsAddress || !mutableRefAddress) {
      throw new Error(
        'Contract addresses are missing from runtime config. '
        + 'Redeploy after hardhat-deploy (./scripts/deploy-causestarter.sh) so config.json includes them.',
      )
    }
    if (!publishedDataAddress) {
      throw new Error(
        'PublishedData contract address is missing (VITE_PUBLISHED_DATA_CONTRACT_ADDRESS). '
        + 'Statement launch uses on-chain PublishedData, not browser IPFS upload. '
        + 'Redeploy after hardhat-deploy (./scripts/deploy-causestarter.sh) so config.json includes it.',
      )
    }

    const statementData = createStatement({ content: text.trim() })
    const beliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }
    const mutableRefContract: MutableRefUpdaterContract = {
      address: mutableRefAddress,
      abi: MutableRefUpdaterAbi,
    }

    const result = await createAndSignStatement(
      writeClients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefContract,
        publishedData: { address: publishedDataAddress, abi: PublishedDataAbi },
      },
      statementData,
      { machinery, addToCreatedList: true },
    )
    return result.cid
  }

  const handleLaunch = async () => {
    setError(null)
    const review = await runSafetyReview()
    if (!review.ok) {
      setError('Blocked text cannot be published. Edit or remove highlighted fields.')
      return
    }

    const draft = saveCause({
      id: draftId,
      goal: goal.trim(),
      statements: review.statements,
      levers,
      status: 'draft',
      goalSafety: review.goalSafety,
    })
    setDraftId(draft.id)
    if (!isConnected || !address || !writeClients) {
      setError('Connect your wallet to publish. You can still save a draft.')
      return
    }

    setBusy(true)
    try {
      const primaryCid = await publishOne(goal.trim())
      const extra: string[] = []
      for (const statement of adoptedStatements(draft)) {
        if (statement.text.trim() === goal.trim()) continue
        extra.push(await publishOne(statement.text))
      }
      const launched = markCauseLaunched(draft.id, primaryCid, extra)
      navigate(`/cause/${launched?.id ?? draft.id}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={2.5} data-testid="start-cause-page">
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Start a cause
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          A cause is built from statements people can sincerely say “yes, I believe this” to.
          Start with one clear main statement, then optional supporting ones that it already
          implies — nothing vague, and nothing that sneaks in a new claim.
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ px: 0 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {activeStep === 0 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Main statement</Typography>
            <Typography variant="body2" color="text.secondary">
              Write the claim a supporter of this cause would be willing to stand behind in public —
              something they can answer “yes, I believe this.” Be specific and self-contained: avoid
              slogans, tribe markers, or wording that needs unstated background to interpret. This is
              permanent once published — no private contact details.
            </Typography>
            <TextField
              label="Main statement"
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value)
                setGoalSafety(undefined)
              }}
              fullWidth
              multiline
              minRows={4}
              autoFocus
              slotProps={{ htmlInput: { 'data-testid': 'start-cause-goal' } }}
              error={Boolean(goalSafety && !goalSafety.allowed)}
              helperText={
                goalSafety && !goalSafety.allowed
                  ? 'Blocked by safety review — tap “Why blocked?”'
                  : 'Example: Night walks on Oak Street should feel safe within a year through better lighting, neighborhood watches, and civic follow-through.'
              }
              sx={
                goalSafety && !goalSafety.allowed
                  ? {
                      '& .MuiOutlinedInput-root': {
                        bgcolor: (t) => t.palette.mode === 'light' ? 'rgba(211,47,47,0.06)' : 'rgba(244,67,54,0.12)',
                      },
                    }
                  : undefined
              }
            />
            {goalSafety && !goalSafety.allowed && (
              <Button
                size="small"
                color="error"
                onClick={() => showSafety('Main statement', goalSafety)}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                Why blocked?
              </Button>
            )}
          </Stack>
        )}

        {activeStep === 1 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Supporting statements</Typography>
            <Typography variant="body2" color="text.secondary">
              Optional extras someone can also believe. Each one must be clearly and unambiguously
              implied by your main statement — a subset, rephrasing, or safe generalization of what
              the main claim already says. Do not add new policy, beneficiaries, urgency, or framing
              the main statement does not already commit a signer to. About 1–5 is a good range.
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">Main statement</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{goal || '—'}</Typography>
            </Paper>
            <StatementWorkbench
              statements={statements}
              onChange={setStatements}
              onRequestSuggestions={() => void handleRequestSuggestions()}
              suggesting={suggesting}
              onShowSafety={showSafety}
              disabled={busy}
            />
          </Stack>
        )}

        {activeStep === 2 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Launch checklist</Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Main statement</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 1.5 }}>{goal}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Supporting statements ({adopted.length})
              </Typography>
              {adopted.length === 0 ? (
                <Typography variant="body2" color="text.secondary">None — goal only.</Typography>
              ) : (
                <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
                  {adopted.map((s) => (
                    <Typography key={s.id} component="li" variant="body2">
                      {s.text}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Paper>

            {!isConnected && (
              <Alert severity="info" sx={{ borderRadius: 2 }} action={<WalletButton />}>
                Connect a wallet to publish. You can also save a draft.
              </Alert>
            )}
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}

        <Stack direction="row" spacing={1} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
          {activeStep > 0 && (
            <Button
              onClick={handleBack}
              disabled={busy || checkingSafety || checkingImplications}
              sx={{ textTransform: 'none' }}
            >
              Back
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={() => void handleSaveDraftOnly()}
            disabled={busy || checkingSafety || checkingImplications}
            data-testid="start-cause-save-draft"
            sx={{ textTransform: 'none' }}
          >
            {checkingSafety || checkingImplications ? 'Checking…' : 'Save draft'}
          </Button>
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => void handleNext()}
              disabled={busy || checkingSafety || checkingImplications}
              data-testid="start-cause-continue"
              startIcon={
                checkingSafety || checkingImplications
                  ? <CircularProgress size={18} color="inherit" />
                  : undefined
              }
              sx={{ minHeight: 44, borderRadius: 999, textTransform: 'none', fontWeight: 700, px: 2.5 }}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => void handleLaunch()}
              disabled={busy || checkingSafety || checkingImplications}
              data-testid="start-cause-publish"
              startIcon={
                busy || checkingSafety || checkingImplications
                  ? <CircularProgress size={18} color="inherit" />
                  : undefined
              }
              sx={{ minHeight: 44, borderRadius: 999, textTransform: 'none', fontWeight: 700, px: 2.5 }}
            >
              {busy ? 'Publishing…' : 'Publish cause'}
            </Button>
          )}
        </Stack>
      </Paper>

      <SafetyRejectionDialog
        open={dialogOpen}
        fieldLabel={dialogLabel}
        safety={dialogSafety}
        onClose={() => setDialogOpen(false)}
      />
    </Stack>
  )
}
