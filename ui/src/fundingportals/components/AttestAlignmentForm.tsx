import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Button,
  TextField,
  Collapse,
  Alert,
  Autocomplete,
  Typography,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import { attestAlignment, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals'
import { getAllProjects, type Project } from '@commonality/sdk/lazy-giving'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { useWriteClients } from '../../shared'
import { truncateAddress } from '../../shared'
import { addContact, getContacts, useResolvedAddress, type SavedContact } from '../../shared'
import { getAlignmentContract } from './alignmentContract'
import { NetworkSwitchPrompt, useIsWrongChain } from '../../shared'

interface Props {
  statementCid: string
}

/**
 * One row in the project picker, from either source: a project the indexer
 * knows about, or one this browser has vouched for before.
 */
interface ProjectOption {
  address: `0x${string}`
  /** What to show in the input once chosen. */
  label: string
  /** Dimmer second line in the dropdown. */
  secondary?: string
  saved: boolean
}

function toOptions(projects: Project[], saved: SavedContact[]): ProjectOption[] {
  const options: ProjectOption[] = saved.map((contact) => ({
    address: contact.address,
    label: contact.label,
    secondary: truncateAddress(contact.address),
    saved: true,
  }))
  const seen = new Set(options.map((option) => option.address.toLowerCase()))

  for (const project of projects) {
    if (seen.has(project.id.toLowerCase())) continue
    options.push({
      address: project.id as `0x${string}`,
      label: project.id,
      secondary: project.recipient ? `Recipient: ${truncateAddress(project.recipient)}` : undefined,
      saved: false,
    })
  }

  return options
}

export function AttestAlignmentForm({ statementCid }: Props) {
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()
  const wrongChain = useIsWrongChain()

  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [savedProjects, setSavedProjects] = useState<SavedContact[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedValue, setSelectedValue] = useState<ProjectOption | string | null>(null)
  const [typedValue, setTypedValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return
    setProjectsLoading(true)
    Promise.all([
      getAllProjects(machinery).catch(err => {
        console.warn('Failed to load projects:', err)
        return [] as Project[]
      }),
      getContacts('project').catch(() => [] as SavedContact[]),
    ])
      .then(([loadedProjects, loadedContacts]) => {
        setProjects(loadedProjects)
        setSavedProjects(loadedContacts)
      })
      .finally(() => setProjectsLoading(false))
  }, [open, machinery])

  // Resolve whatever is typed, so `name.eth` works as well as a pasted address.
  // Only meaningful while the user is typing rather than sitting on a choice.
  const resolution = useResolvedAddress(typedValue, {
    enabled: typeof selectedValue !== 'object' || selectedValue === null,
  })

  // Stable identity matters: a fresh array on every keystroke makes the
  // Autocomplete re-filter the whole option list as the user types.
  const options = useMemo(() => toOptions(projects, savedProjects), [projects, savedProjects])

  if (!address) return null

  const projectAddress =
    selectedValue && typeof selectedValue === 'object'
      ? selectedValue.address
      : resolution.address ?? ''

  const getClients = () => writeClients

  const handleToggle = () => {
    setOpen(o => !o)
    setSuccess(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clients = getClients()
    const contract = getAlignmentContract()

    if (wrongChain) {
      setError('Wrong network. Switch your wallet to the supported network before submitting.')
      return
    }

    if (!clients || !contract) {
      setError('Wallet not connected or contract not configured (VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS)')
      return
    }

    if (!projectAddress || !isAddress(projectAddress)) {
      setError('Please enter a valid project address')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await attestAlignment(
        clients,
        contract,
        toSubjectId(projectAddress as `0x${string}`),
        statementCid as IpfsCidV1,
        PROJECT_ALIGNMENT_TOPIC,
      )
      // Remember it so the next vouch can pick it by name instead of by hex.
      const savedLabel =
        selectedValue && typeof selectedValue === 'object'
          ? selectedValue.label
          : resolution.ensName ?? projectAddress
      await addContact(projectAddress as `0x${string}`, savedLabel, 'project').catch(() => {})

      setSuccess(true)
      setSelectedValue(null)
      setTypedValue('')
    } catch (err) {
      console.error('Attestation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to attest alignment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Button variant="outlined" onClick={handleToggle}>
        {open ? 'Cancel' : 'Vouch for a Project'}
      </Button>

      <Collapse in={open}>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Vouch for a Project
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vouch that a project serves this cause.
          </Typography>

          <NetworkSwitchPrompt />

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Vouch submitted successfully!
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Autocomplete<ProjectOption, false, false, true>
                freeSolo
                options={options}
                loading={projectsLoading}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label
                }
                groupBy={(option) => (option.saved ? 'Vouched for before' : 'Known projects')}
                value={selectedValue}
                inputValue={typedValue}
                onInputChange={(_, newInput) => setTypedValue(newInput)}
                onChange={(_, newValue) => setSelectedValue(newValue)}
                disabled={submitting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Project"
                    placeholder="Pick a project, or enter an address or ENS name"
                    error={!!resolution.error && !resolution.resolving}
                    helperText={
                      resolution.resolving
                        ? 'Looking up that name…'
                        : resolution.error && !projectAddress
                          ? resolution.error
                          : resolution.ensName
                            ? `${resolution.ensName} resolves to ${resolution.address}`
                            : undefined
                    }
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {projectsLoading || resolution.resolving ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...rest } = props
                  return (
                    <li key={key} {...rest}>
                      <Box>
                        <Typography variant="body2" sx={{ fontFamily: option.saved ? undefined : 'monospace' }}>
                          {option.label}
                        </Typography>
                        {option.secondary && (
                          <Typography variant="caption" color="text.secondary">
                            {option.secondary}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )
                }}
                isOptionEqualToValue={(option, value) =>
                  typeof value === 'string'
                    ? option.address === value
                    : option.address === value.address
                }
              />

              <Button
                type="submit"
                variant="contained"
                disabled={
                  submitting || wrongChain || !projectAddress || !isAddress(projectAddress)
                }
              >
                {submitting ? 'Submitting...' : 'Submit Vouch'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Collapse>
    </Box>
  )
}
