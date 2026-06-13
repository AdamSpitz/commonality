import { useState, useEffect } from 'react'
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
import {
  getAllProjects,
  attestAlignment,
  PROJECT_ALIGNMENT_TOPIC,
  toSubjectId,
  type IpfsCidV1,
  type Project,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useWriteClients } from '../../shared/hooks/useWriteClients'
import { truncateAddress } from '../../delegation/utils'
import { getAlignmentContract } from './alignmentContract'
import { NetworkSwitchPrompt, useIsWrongChain } from '../../shared/components/NetworkSwitchPrompt'

interface Props {
  statementCid: string
}

export function AttestAlignmentForm({ statementCid }: Props) {
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()
  const wrongChain = useIsWrongChain()

  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedValue, setSelectedValue] = useState<Project | string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return
    setProjectsLoading(true)
    getAllProjects(machinery)
      .then(setProjects)
      .catch(err => console.warn('Failed to load projects:', err))
      .finally(() => setProjectsLoading(false))
  }, [open, machinery])

  if (!address) return null

  const projectAddress =
    typeof selectedValue === 'string' ? selectedValue : selectedValue?.id ?? ''

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
      setSuccess(true)
      setSelectedValue(null)
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
              <Autocomplete<Project, false, false, true>
                freeSolo
                options={projects}
                loading={projectsLoading}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.id
                }
                value={selectedValue}
                onChange={(_, newValue) => setSelectedValue(newValue)}
                disabled={submitting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Project address"
                    placeholder="0x... or select from known projects"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {projectsLoading ? (
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
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {option.id}
                        </Typography>
                        {option.recipient && (
                          <Typography variant="caption" color="text.secondary">
                            Recipient: {truncateAddress(option.recipient)}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )
                }}
                isOptionEqualToValue={(option, value) =>
                  typeof value === 'string' ? option.id === value : option.id === value.id
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
