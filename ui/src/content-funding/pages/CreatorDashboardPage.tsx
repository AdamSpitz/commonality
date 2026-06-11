import { useState, useMemo } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material'
import WithdrawIcon from '@mui/icons-material/AccountBalanceWallet'
import ControlPointIcon from '@mui/icons-material/ControlPoint'
import GavelIcon from '@mui/icons-material/Gavel'
import { formatCurrencyAmount } from '../../shared/currency'
import {
  getAllChannelOverviews,
  getVetoableContracts,
  hashCanonicalId,
  ETH_CURRENCY,
  type ChannelWithCanonicalId,
  type ChannelState,
  type Currency,
} from '@commonality/sdk'
import { ChannelRegistryAbi, ChannelEscrowAbi, withdrawFromEscrow, takeChannelControl, vetoContract } from '@commonality/sdk'
import { getChannelDisplayLabels, type ChannelDisplayMetadata } from '../channelDisplay'
import { useContentFundingState } from '../hooks/useContentFundingState'

const STATE_LABELS: Record<ChannelState, string> = {
  unclaimed: 'Unclaimed',
  verified: 'Verified',
  'creator-controlled': 'Creator-Controlled',
}

const STATE_COLORS: Record<ChannelState, 'default' | 'warning' | 'success'> = {
  unclaimed: 'default',
  verified: 'warning',
  'creator-controlled': 'success',
}

function getTotalFunding(channel: ChannelWithCanonicalId): bigint {
  let total = 0n
  for (const contract of channel.contracts) {
    if (contract.project) {
      total += BigInt(contract.project.totalReceived)
    }
  }
  return total
}

function getChannelFundingCurrency(channel: ChannelWithCanonicalId): Currency {
  return channel.contracts.find(contract => contract.project)?.project?.fundingCurrency ?? ETH_CURRENCY
}

interface ChannelCardProps {
  channel: ChannelWithCanonicalId
  state: ReturnType<typeof useContentFundingState>['state']
  projects: ReturnType<typeof useContentFundingState>['projects']
  onWithdraw: () => void
  onTakeControl: () => void
  onVeto: (contractAddress: string) => void
  withdrawing: boolean
  takingControl: boolean
  vetoing: string | null
  displayMetadata?: ChannelDisplayMetadata
}

function ChannelCard({ channel, state, projects, onWithdraw, onTakeControl, onVeto, withdrawing, takingControl, vetoing, displayMetadata }: ChannelCardProps) {
  const canonicalId = channel.canonicalChannelId
  const displayLabels = getChannelDisplayLabels(canonicalId, displayMetadata)
  const channelIdBytes32 = canonicalId ? hashCanonicalId(canonicalId) : channel.channel.channelId
  const now = BigInt(Math.floor(Date.now() / 1000))
  const vetoableContracts = state ? getVetoableContracts(state, channelIdBytes32, { now, projects }) : []
  const totalFunding = getTotalFunding(channel)
  const fundingCurrency = getChannelFundingCurrency(channel)
  const hasEscrowBalance = channel.escrow.balance > 0n

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="h2">
              {displayLabels.primary}
            </Typography>
            {displayLabels.secondary && (
              <Typography variant="caption" color="text.secondary">
                {displayLabels.secondary}
              </Typography>
            )}
          </Box>
          <Chip
            label={STATE_LABELS[channel.channel.state]}
            color={STATE_COLORS[channel.channel.state]}
            size="small"
          />
        </Box>

        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Funding
            </Typography>
            <Typography variant="body1">
              {formatCurrencyAmount(totalFunding, fundingCurrency)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Escrowed Balance
            </Typography>
            <Typography variant="body1" color={hasEscrowBalance ? 'warning.main' : 'text.secondary'}>
              {formatCurrencyAmount(channel.escrow.balance, fundingCurrency)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Contracts
            </Typography>
            <Typography variant="body1">
              {channel.contracts.length}
            </Typography>
          </Box>
        </Stack>

        {channel.channel.state === 'verified' && channel.channel.owner && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<ControlPointIcon />}
              onClick={onTakeControl}
              disabled={takingControl}
              size="small"
            >
              {takingControl ? 'Taking Control...' : 'Take Control'}
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Take control to manage contracts and withdraw funds.
            </Typography>
          </Box>
        )}

        {(channel.channel.state === 'verified' || channel.channel.state === 'creator-controlled') && hasEscrowBalance && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<WithdrawIcon />}
              onClick={onWithdraw}
              disabled={withdrawing}
              size="small"
            >
              {withdrawing ? 'Withdrawing...' : `Withdraw ${formatCurrencyAmount(channel.escrow.balance, fundingCurrency)}`}
            </Button>
          </Box>
        )}

        {vetoableContracts.length > 0 && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Vetoable Contracts ({vetoableContracts.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              These fan-created contracts are within the 7-day veto window.
            </Typography>
            <Stack spacing={1}>
              {vetoableContracts.map((contract) => (
                <Paper key={contract.contractAddress} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {contract.contractAddress.slice(0, 6)}...{contract.contractAddress.slice(-4)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contract.contentItems.length} content item{contract.contentItems.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<GavelIcon />}
                      onClick={() => onVeto(contract.contractAddress)}
                      disabled={vetoing === contract.contractAddress}
                      color="error"
                      variant="outlined"
                    >
                      {vetoing === contract.contractAddress ? 'Vetoing...' : 'Veto'}
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {channel.contracts.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              All Contracts
            </Typography>
            <Stack spacing={1}>
              {channel.contracts.slice(0, 5).map((contract) => {
                const progress = contract.fundingProgress
                return (
                  <Paper key={contract.contractAddress} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {contract.contractAddress.slice(0, 6)}...{contract.contractAddress.slice(-4)}
                      </Typography>
                      <Chip
                        label={contract.status}
                        size="small"
                        color={contract.status === 'successful' ? 'success' : contract.status === 'active' ? 'primary' : contract.status === 'vetoed' ? 'warning' : 'default'}
                      />
                    </Box>
                    {progress !== null && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress * 100, 100)}
                        sx={{ height: 3 }}
                        color={contract.status === 'successful' ? 'success' : 'primary'}
                      />
                    )}
                  </Paper>
                )
              })}
              {channel.contracts.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  +{channel.contracts.length - 5} more contracts
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

interface CreatorDashboardPageProps {
  title?: string
  description?: string
  connectPrompt?: string
  emptyState?: string
}

export function CreatorDashboardPage({
  title = 'Creator Dashboard',
  description = 'Manage your verified channels, withdraw escrowed funds, and veto fan-created contracts during the 7-day window.',
  connectPrompt = 'Connect your wallet to manage your channels.',
  emptyState = 'You don\'t have any channels yet. Verify a channel to get started.',
}: CreatorDashboardPageProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { state, projects, loading, error: stateError, channelDisplayMetadata = new Map() } = useContentFundingState()

  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [takingControl, setTakingControl] = useState(false)
  const [takeControlError, setTakeControlError] = useState<string | null>(null)
  const [vetoing, setVetoing] = useState<string | null>(null)
  const [vetoError, setVetoError] = useState<string | null>(null)

  const myChannels = useMemo(() => {
    if (!state || !address) return []

    const now = BigInt(Math.floor(Date.now() / 1000))
    const options = { projects, now }
    const allChannels = getAllChannelOverviews(state, options)

    return allChannels.filter(ch => {
      if (ch.channel.owner?.toLowerCase() === address.toLowerCase()) {
        return true
      }
      // Also include verified channels where the connected wallet is the owner (can take control)
      if (ch.channel.state === 'verified' && ch.channel.owner?.toLowerCase() === address.toLowerCase()) {
        return true
      }
      return false
    })
  }, [state, address, projects])

  const handleWithdraw = async (channel: ChannelWithCanonicalId) => {
    if (!walletClient || !publicClient || !address || !channel.canonicalChannelId) return

    const escrowAddress = import.meta.env.VITE_CHANNEL_ESCROW_ADDRESS
    const channelId = channel.canonicalChannelId

    if (!escrowAddress) {
      setWithdrawError('Channel escrow not configured')
      return
    }

    try {
      setWithdrawing(true)
      setWithdrawError(null)

      const clients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      const escrowContract = {
        address: escrowAddress as `0x${string}`,
        abi: ChannelEscrowAbi,
      }

      await withdrawFromEscrow(clients, escrowContract, hashCanonicalId(channelId))
      window.location.reload()
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Failed to withdraw')
    } finally {
      setWithdrawing(false)
    }
  }

  const handleTakeControl = async (channel: ChannelWithCanonicalId) => {
    if (!walletClient || !publicClient || !address || !channel.canonicalChannelId) return

    const registryAddress = import.meta.env.VITE_CHANNEL_REGISTRY_ADDRESS

    if (!registryAddress) {
      setTakeControlError('Channel registry not configured')
      return
    }

    try {
      setTakingControl(true)
      setTakeControlError(null)

      const clients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      const registryContract = {
        address: registryAddress as `0x${string}`,
        abi: ChannelRegistryAbi,
      }

      await takeChannelControl(clients, registryContract, hashCanonicalId(channel.canonicalChannelId))
      window.location.reload()
    } catch (err) {
      setTakeControlError(err instanceof Error ? err.message : 'Failed to take control')
    } finally {
      setTakingControl(false)
    }
  }

  const handleVeto = async (channel: ChannelWithCanonicalId, contractAddress: string) => {
    if (!walletClient || !publicClient || !address || !channel.canonicalChannelId) return

    const registryAddress = import.meta.env.VITE_CHANNEL_REGISTRY_ADDRESS

    if (!registryAddress) {
      setVetoError('Channel registry not configured')
      return
    }

    try {
      setVetoing(contractAddress)
      setVetoError(null)

      const clients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      const registryContract = {
        address: registryAddress as `0x${string}`,
        abi: ChannelRegistryAbi,
      }

      await vetoContract(clients, registryContract, contractAddress as `0x${string}`)
      window.location.reload()
    } catch (err) {
      setVetoError(err instanceof Error ? err.message : 'Failed to veto contract')
    } finally {
      setVetoing(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (stateError) {
    return <Alert severity="error">{stateError}</Alert>
  }

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Alert severity="info">{connectPrompt}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      {(withdrawError || takeControlError || vetoError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {withdrawError || takeControlError || vetoError}
        </Alert>
      )}

      {myChannels.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="body1" color="text.secondary">
              {emptyState}
            </Typography>
            <Button component="a" href="/content/new" variant="contained">
              Verify or claim a channel
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {myChannels.map((channel) => (
            <ChannelCard
              key={channel.channel.channelId}
              channel={channel}
              state={state}
              projects={projects}
              onWithdraw={() => handleWithdraw(channel)}
              onTakeControl={() => handleTakeControl(channel)}
              onVeto={(contractAddress) => handleVeto(channel, contractAddress)}
              withdrawing={withdrawing}
              takingControl={takingControl}
              vetoing={vetoing}
              displayMetadata={channel.canonicalChannelId ? channelDisplayMetadata.get(channel.canonicalChannelId) : undefined}
            />
          ))}
        </Stack>
      )}
    </Box>
  )
}
