import { useMemo, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, Step, StepLabel,
  Stepper, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { BeliefsAbi, MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { createAndSignStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import { createStatement } from '@commonality/sdk/displayable-documents'
import type { MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import {
  getCause, markCauseLaunched, saveCause, type CauseStatement, type MomentumLever,
  type CauseMediator, type SafetyState,
} from '../lib/causeStore'
import { atomizeCause, checkSafety, sharpenPlank } from '../lib/causeAssistClient'
import { SafetyRejectionDialog } from '../components/SafetyRejectionDialog'
import { CauseViewPreview } from '../components/CauseViewPreview'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { WalletButton } from '../components/WalletButton'

const steps = ['Issues', 'Preview', 'Launch']
const DEFAULT_LEVERS: MomentumLever[] = ['supporters', 'volunteers', 'collaborators', 'funding', 'content']

function safetyState(verdict: {
  allowed: boolean
  category: SafetyState['category']
  explanation: string
}): SafetyState {
  return { ...verdict, checkedAt: new Date().toISOString() }
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
  const [description, setDescription] = useState(existing?.description ?? existing?.goal ?? '')
  const [statements, setStatements] = useState<CauseStatement[]>(existing?.statements ?? [])
  const [draftId, setDraftId] = useState(existing?.id)
  const [busy, setBusy] = useState(false)
  const [atomizing, setAtomizing] = useState(false)
  const [sharpeningId, setSharpeningId] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [dialogSafety, setDialogSafety] = useState<SafetyState | null>(null)
  const [mediator, setMediator] = useState<CauseMediator>(existing?.mediator ?? {
    address: '', serviceUrl: '', name: '', description: '',
  })

  const planks = useMemo(
    () => statements.filter((s) => s.disposition === 'adopted' && s.text.trim()),
    [statements],
  )

  const updatePlank = (id: string, patch: Partial<CauseStatement>) => {
    setStatements((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const addPlank = () => setStatements((current) => [...current, {
    id: crypto.randomUUID(), text: '', origin: 'user', disposition: 'adopted',
  }])

  const handleAtomize = async () => {
    if (description.trim().length < 12) {
      setError('Describe the cause in a sentence or two first.')
      return
    }
    setAtomizing(true)
    setError(null)
    try {
      const result = await atomizeCause({
        description: description.trim(),
        existingPlanks: planks.map((item) => item.text.trim()),
        count: 5,
      })
      const incoming: CauseStatement[] = result.planks.map((item) => ({
        id: crypto.randomUUID(), text: item.text, rationale: item.rationale,
        origin: 'suggested', disposition: 'adopted',
      }))
      setStatements((current) => [...current.filter((item) => item.text.trim()), ...incoming])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest issues')
    } finally {
      setAtomizing(false)
    }
  }

  const handleSharpen = async (plank: CauseStatement) => {
    if (!plank.text.trim()) return
    setSharpeningId(plank.id)
    setError(null)
    try {
      const result = await sharpenPlank({ plank: plank.text.trim(), causeDescription: description.trim() })
      updatePlank(plank.id, { text: result.plank, rationale: result.rationale, safety: undefined })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sharpen this issue')
    } finally {
      setSharpeningId(undefined)
    }
  }

  const reviewAndSave = async () => {
    if (description.trim().length < 12 || planks.length === 0) {
      setError('Describe the cause and keep at least one issue before continuing.')
      return undefined
    }
    if (planks.some((item) => item.text.trim().length < 12)) {
      setError('Each issue needs enough detail for a person to understand and attest it.')
      return undefined
    }
    const mediatorValues = Object.values(mediator).map((value) => value.trim())
    const hasMediator = mediatorValues.some(Boolean)
    if (hasMediator && mediatorValues.some((value) => !value)) {
      setError('Complete all mediator fields, or leave all of them blank.')
      return undefined
    }
    if (hasMediator && !/^0x[0-9a-fA-F]{40}$/.test(mediator.address.trim())) {
      setError('Mediator address must be a 0x-prefixed Ethereum address.')
      return undefined
    }
    if (hasMediator) {
      try {
        const url = new URL(mediator.serviceUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol')
      } catch {
        setError('Mediator service URL must be a valid HTTP or HTTPS URL.')
        return undefined
      }
    }
    setBusy(true)
    setError(null)
    try {
      const items = [
        { text: description.trim(), fieldLabel: 'Cause description' },
        ...planks.map((item) => ({ text: item.text.trim(), fieldLabel: 'Issue' })),
      ]
      const review = await checkSafety(items)
      const descriptionVerdict = review.results[0]
      const next = statements.map((statement) => {
        const index = planks.findIndex((plank) => plank.id === statement.id)
        const verdict = index >= 0 ? review.results[index + 1] : undefined
        return verdict ? { ...statement, safety: safetyState(verdict) } : statement
      })
      setStatements(next)
      const blocked = review.results.find((item) => !item.allowed)
      if (blocked) {
        setDialogSafety(safetyState(blocked))
        setError('Blocked text cannot be saved. Edit the highlighted issue.')
        return undefined
      }
      const primary = next.find((item) => item.disposition === 'adopted' && item.text.trim())!
      const saved = saveCause({
        id: draftId, name: description.trim(), description: description.trim(), goal: primary.text.trim(), statements: next,
        levers: existing?.levers?.length ? existing.levers : DEFAULT_LEVERS, status: 'draft',
        goalSafety: descriptionVerdict ? safetyState(descriptionVerdict) : undefined,
        mediator: hasMediator ? {
          address: mediator.address.trim(), serviceUrl: mediator.serviceUrl.trim().replace(/\/+$/, ''),
          name: mediator.name.trim(), description: mediator.description.trim(),
        } : null,
      })
      setDraftId(saved.id)
      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Safety check failed')
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const publishOne = async (text: string) => {
    const beliefsAddress = (machinery.contractAddresses?.beliefs || getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')) as `0x${string}` | undefined
    const mutableRefAddress = (machinery.contractAddresses?.mutableRefUpdater || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')) as `0x${string}` | undefined
    const publishedDataAddress = (machinery.contractAddresses?.publishedData || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')) as `0x${string}` | undefined
    if (!writeClients) throw new Error('Wallet is not ready. Connect your wallet and try again.')
    if (!beliefsAddress || !mutableRefAddress || !publishedDataAddress) {
      throw new Error('Statement contract addresses are missing. Redeploy CauseStarter to refresh config.json.')
    }
    const beliefs: BeliefsContract = { address: beliefsAddress, abi: BeliefsAbi }
    const mutableRefUpdater: MutableRefUpdaterContract = { address: mutableRefAddress, abi: MutableRefUpdaterAbi }
    const result = await createAndSignStatement(writeClients, {
      beliefs, mutableRefUpdater,
      publishedData: { address: publishedDataAddress, abi: PublishedDataAbi },
    }, createStatement({ content: text.trim() }), { machinery, addToCreatedList: true })
    return result.cid
  }

  const handleNext = async () => {
    if (activeStep === 0) {
      const saved = await reviewAndSave()
      if (!saved) return
    }
    setActiveStep((step) => Math.min(step + 1, 2))
  }

  const handleSave = async () => {
    const saved = await reviewAndSave()
    if (saved) navigate(`/cause/${saved.id}`)
  }

  const handleLaunch = async () => {
    const saved = await reviewAndSave()
    if (!saved) return
    if (!isConnected || !address || !writeClients) {
      setError('Connect your wallet to publish. You can still save a draft.')
      return
    }
    setBusy(true)
    // Resume-safe: reuse CIDs already written on a partial previous attempt so we
    // do not re-publish the same plank as a new statement after a mid-loop failure.
    let primaryCid = saved.statementCid
    const extra: string[] = [...(saved.statementCids ?? [])]
    try {
      const currentPlanks = saved.statements.filter((item) => item.disposition === 'adopted' && item.text.trim())
      if (currentPlanks.length === 0) {
        setError('Add at least one issue before publishing.')
        return
      }
      if (!primaryCid) {
        primaryCid = await publishOne(currentPlanks[0]!.text)
        // Persist after primary so a crash mid-extras leaves a recoverable draft.
        saveCause({
          id: saved.id,
          goal: saved.goal,
          description: saved.description,
          statements: saved.statements,
          levers: saved.levers,
          status: 'draft',
          statementCid: primaryCid,
          statementCids: [],
          goalSafety: saved.goalSafety,
          mediator: saved.mediator,
        })
      }
      for (let i = 0; i < currentPlanks.length - 1; i++) {
        if (extra[i]) continue
        const plank = currentPlanks[i + 1]!
        const cid = await publishOne(plank.text)
        extra[i] = cid
        saveCause({
          id: saved.id,
          goal: saved.goal,
          description: saved.description,
          statements: saved.statements,
          levers: saved.levers,
          status: 'draft',
          statementCid: primaryCid,
          statementCids: extra.filter(Boolean),
          goalSafety: saved.goalSafety,
          mediator: saved.mediator,
        })
      }
      const launched = markCauseLaunched(saved.id, primaryCid, extra.filter(Boolean))
      navigate(`/cause/${launched?.id ?? saved.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}${primaryCid ? ' Some issues may already be on-chain; try Launch again to resume.' : ''}`
          : 'Failed to publish',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={2.5} data-testid="start-cause-page">
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>Start a cause</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Start with what your cause is about. We’ll turn it into clear issues people can support one by one.
        </Typography>
      </Box>
      <Stepper activeStep={activeStep} alternativeLabel>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {activeStep === 0 && <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>What issues bring this cause together?</Typography>
          <TextField
            label="Describe your cause in your own words"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline minRows={3} autoFocus fullWidth
            slotProps={{ htmlInput: { 'data-testid': 'start-cause-goal' } }}
            helperText="A rough description is fine. This text is not published as a statement."
          />
          <Button variant="outlined" startIcon={atomizing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />} onClick={() => void handleAtomize()} disabled={busy || atomizing} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            {atomizing ? 'Finding issues…' : planks.length ? 'Suggest more issues' : 'Suggest issues'}
          </Button>
          <Stack spacing={1.5}>
            {planks.map((plank, index) => <Paper key={plank.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2">Issue {index + 1}</Typography>
                  <Tooltip title="Remove"><IconButton size="small" onClick={() => setStatements((current) => current.filter((item) => item.id !== plank.id))}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
                <TextField
                  value={plank.text} multiline minRows={2} fullWidth
                  onChange={(event) => updatePlank(plank.id, { text: event.target.value, safety: undefined })}
                  error={Boolean(plank.safety && !plank.safety.allowed) || (plank.text.length > 0 && plank.text.trim().length < 12)}
                  helperText={plank.text.length > 0 && plank.text.trim().length < 12
                    ? 'Too vague to attest yet. Say what a supporter actually believes.'
                    : plank.rationale || 'Keep this specific, self-contained, and natural to sign.'}
                />
                <Button size="small" onClick={() => void handleSharpen(plank)} disabled={sharpeningId === plank.id} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                  {sharpeningId === plank.id ? 'Sharpening…' : 'Help make this attestable'}
                </Button>
              </Stack>
            </Paper>)}
          </Stack>
          <Button startIcon={<AddIcon />} onClick={addPlank} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>Add your own issue</Button>
        </Stack>}
        {activeStep === 1 && <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>See how your cause works</Typography>
          <Typography variant="body2" color="text.secondary">Switch between the two views. These are different ways of understanding support for the same issues—not new statements anyone has to sign.</Typography>
          <CauseViewPreview description={description} planks={planks} />
        </Stack>}
        {activeStep === 2 && <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Ready to launch</Typography>
          <Typography variant="body2" color="text.secondary">Each issue will be published as its own signable statement. You can promote a proven combination into a shared anchor later.</Typography>
          <CauseViewPreview description={description} planks={planks} />
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mediator setup (optional)</Typography>
              <Typography variant="body2" color="text.secondary">
                After deploying your generated bridge-creator artifact, attach its public identity here. Supporters will then see featured bridges and an opt-in link for this cause.
              </Typography>
              <TextField label="Mediator name" value={mediator.name} onChange={(event) => setMediator((value) => ({ ...value, name: event.target.value }))} fullWidth />
              <TextField label="Mediator description" value={mediator.description} onChange={(event) => setMediator((value) => ({ ...value, description: event.target.value }))} multiline minRows={2} fullWidth />
              <TextField label="Mediator signer address" value={mediator.address} onChange={(event) => setMediator((value) => ({ ...value, address: event.target.value }))} placeholder="0x…" fullWidth />
              <TextField label="Public mediator service URL" value={mediator.serviceUrl} onChange={(event) => setMediator((value) => ({ ...value, serviceUrl: event.target.value }))} placeholder="https://mediator.example" fullWidth />
            </Stack>
          </Paper>
          {!isConnected && <Alert severity="info" action={<WalletButton />}>Connect a wallet to publish. You can also save a draft.</Alert>}
        </Stack>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={1} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
          {activeStep > 0 && <Button onClick={() => setActiveStep((step) => step - 1)} disabled={busy}>Back</Button>}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => void handleSave()} disabled={busy} data-testid="start-cause-save-draft">{busy ? 'Checking…' : 'Save draft'}</Button>
          {activeStep < 2
            ? <Button variant="contained" onClick={() => void handleNext()} disabled={busy} data-testid="start-cause-continue">Continue</Button>
            : <Button variant="contained" onClick={() => void handleLaunch()} disabled={busy} data-testid="start-cause-publish">{busy ? 'Publishing…' : 'Publish cause'}</Button>}
        </Stack>
      </Paper>
      <SafetyRejectionDialog open={Boolean(dialogSafety)} fieldLabel="Issue" safety={dialogSafety} onClose={() => setDialogSafety(null)} />
    </Stack>
  )
}
