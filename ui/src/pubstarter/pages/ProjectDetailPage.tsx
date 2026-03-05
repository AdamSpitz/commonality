import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  LinearProgress,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createSDKMachinery,
  getProject,
  getProjectTokens,
  getProjectContributions,
  getProjectRefunds,
  buyProjectTokens,
  refundProjectTokens,
  withdrawProjectFunds,
  fetchFromIPFS,
  AssuranceContractAbi,
  type Project,
  type ProjectToken,
  type Contribution,
  type Refund,
  type AssuranceContract,
  type TestClients,
} from '@commonality/sdk'
import { formatEther } from 'viem'

type ProjectMetadata = { name?: string; description?: string }

function getProjectStatus(project: Project): 'active' | 'succeeded' | 'refunding' {
  const now = Math.floor(Date.now() / 1000)
  const deadline = Number(project.deadline)
  const thresholdMet = BigInt(project.totalReceived) >= BigInt(project.threshold)

  if (thresholdMet) return 'succeeded'
  if (deadline < now) return 'refunding'
  return 'active'
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'info'> = {
  active: 'info',
  succeeded: 'success',
  refunding: 'warning',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Funding',
  succeeded: 'Succeeded',
  refunding: 'Refunding',
}

function formatDeadlineCountdown(deadlineStr: string): string {
  const deadline = Number(deadlineStr)
  const now = Math.floor(Date.now() / 1000)
  const diff = deadline - now

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function ProjectDetailPage() {
  const { projectAddress } = useParams<{ projectAddress: string }>()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [project, setProject] = useState<Project | null>(null)
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null)
  const [tokens, setTokens] = useState<ProjectToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contributions, setContributions] = useState<Contribution[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])

  // Buy tokens state: map of tokenId -> quantity string
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [buySuccess, setBuySuccess] = useState<string | null>(null)

  // Refund state
  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null)

  // Withdraw state
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null)

  const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'

  useEffect(() => {
    if (!projectAddress) return

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const machinery = createSDKMachinery(GRAPHQL_URL)

        const [proj, projTokens, projContributions, projRefunds] = await Promise.all([
          getProject(machinery, projectAddress),
          getProjectTokens(machinery, projectAddress),
          getProjectContributions(machinery, projectAddress),
          getProjectRefunds(machinery, projectAddress),
        ])

        if (!proj) {
          setError('Project not found')
          return
        }

        setProject(proj)
        setTokens(projTokens)
        setContributions(projContributions)
        setRefunds(projRefunds)

        // Fetch IPFS metadata
        if (proj.metadataCid) {
          const ipfsConfig = { gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY }
          const data = await fetchFromIPFS(ipfsConfig, proj.metadataCid)
          if (data) setMetadata(data as ProjectMetadata)
        }
      } catch (err) {
        console.error('Error loading project:', err)
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [projectAddress])

  const handleQuantityChange = (tokenId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [tokenId]: value }))
  }

  const handleBuy = async () => {
    if (!project || !walletClient || !publicClient || !address) return

    const tokenIds: bigint[] = []
    const tokenCounts: bigint[] = []
    let totalCost = 0n

    for (const token of tokens) {
      const qty = parseInt(quantities[token.tokenId] || '0', 10)
      if (qty > 0) {
        tokenIds.push(BigInt(token.tokenId))
        tokenCounts.push(BigInt(qty))
        totalCost += BigInt(qty) * BigInt(token.price)
      }
    }

    if (tokenIds.length === 0) {
      setBuyError('Please enter a quantity for at least one token')
      return
    }

    try {
      setBuying(true)
      setBuyError(null)
      setBuySuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      await buyProjectTokens(clients, assuranceContract, {
        buyer: address,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds,
        tokenCounts,
        totalCost,
      })

      setBuySuccess('Tokens purchased successfully!')
      setQuantities({})

      // Refresh project data
      const machinery = createSDKMachinery(GRAPHQL_URL)
      const updated = await getProject(machinery, projectAddress!)
      if (updated) setProject(updated)
    } catch (err) {
      console.error('Error buying tokens:', err)
      setBuyError(err instanceof Error ? err.message : 'Failed to buy tokens')
    } finally {
      setBuying(false)
    }
  }

  // Compute the connected user's refundable tokens: contributed minus already refunded
  const userRefundableTokens = (() => {
    if (!address) return []
    const userAddr = address.toLowerCase()

    // Sum up tokens contributed by this user to this project
    const contributed = new Map<string, bigint>()
    for (const c of contributions) {
      if (c.participant.toLowerCase() !== userAddr) continue
      const ids: string[] = JSON.parse(c.tokenIds)
      const counts: string[] = JSON.parse(c.tokenCounts)
      for (let i = 0; i < ids.length; i++) {
        const prev = contributed.get(ids[i]) ?? 0n
        contributed.set(ids[i], prev + BigInt(counts[i]))
      }
    }

    // Subtract tokens already refunded by this user
    for (const r of refunds) {
      if (r.participant.toLowerCase() !== userAddr) continue
      const ids: string[] = JSON.parse(r.tokenIds)
      const counts: string[] = JSON.parse(r.tokenCounts)
      for (let i = 0; i < ids.length; i++) {
        const prev = contributed.get(ids[i]) ?? 0n
        contributed.set(ids[i], prev - BigInt(counts[i]))
      }
    }

    return Array.from(contributed.entries())
      .filter(([, count]) => count > 0n)
      .map(([tokenId, count]) => ({ tokenId, count }))
  })()

  const handleRefund = async () => {
    if (!project || !walletClient || !publicClient || !address) return
    if (userRefundableTokens.length === 0) return

    try {
      setRefunding(true)
      setRefundError(null)
      setRefundSuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      await refundProjectTokens(clients, assuranceContract, {
        holder: address,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds: userRefundableTokens.map(t => BigInt(t.tokenId)),
        tokenCounts: userRefundableTokens.map(t => t.count),
      })

      setRefundSuccess('Tokens refunded successfully!')

      // Refresh data
      const machinery = createSDKMachinery(GRAPHQL_URL)
      const [updated, updatedContributions, updatedRefunds] = await Promise.all([
        getProject(machinery, projectAddress!),
        getProjectContributions(machinery, projectAddress!),
        getProjectRefunds(machinery, projectAddress!),
      ])
      if (updated) setProject(updated)
      setContributions(updatedContributions)
      setRefunds(updatedRefunds)
    } catch (err) {
      console.error('Error refunding tokens:', err)
      setRefundError(err instanceof Error ? err.message : 'Failed to refund tokens')
    } finally {
      setRefunding(false)
    }
  }

  const handleWithdraw = async () => {
    if (!project || !walletClient || !publicClient || !address) return

    try {
      setWithdrawing(true)
      setWithdrawError(null)
      setWithdrawSuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address,
      }

      await withdrawProjectFunds(clients, assuranceContract)

      setWithdrawSuccess('Funds withdrawn successfully!')

      // Refresh project data
      const machinery = createSDKMachinery(GRAPHQL_URL)
      const updated = await getProject(machinery, projectAddress!)
      if (updated) setProject(updated)
    } catch (err) {
      console.error('Error withdrawing funds:', err)
      setWithdrawError(err instanceof Error ? err.message : 'Failed to withdraw funds')
    } finally {
      setWithdrawing(false)
    }
  }

  // Build contributor leaderboard: net contribution per address
  const leaderboard = (() => {
    const stats = new Map<string, { contributed: bigint; refunded: bigint }>()

    for (const c of contributions) {
      const addr = c.participant.toLowerCase()
      const entry = stats.get(addr) ?? { contributed: 0n, refunded: 0n }
      entry.contributed += BigInt(c.totalCost)
      stats.set(addr, entry)
    }

    for (const r of refunds) {
      const addr = r.participant.toLowerCase()
      const entry = stats.get(addr) ?? { contributed: 0n, refunded: 0n }
      entry.refunded += BigInt(r.totalRefund)
      stats.set(addr, entry)
    }

    return Array.from(stats.entries())
      .map(([address, { contributed, refunded }]) => ({
        address,
        contributed,
        refunded,
        net: contributed - refunded,
      }))
      .filter(e => e.net > 0n)
      .sort((a, b) => (b.net > a.net ? 1 : b.net < a.net ? -1 : 0))
  })()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!project) {
    return <Alert severity="error">Project not found</Alert>
  }

  const status = getProjectStatus(project)
  const progressPercent = BigInt(project.threshold) > 0n
    ? Math.min(Number(BigInt(project.totalReceived) * 100n / BigInt(project.threshold)), 100)
    : 0

  return (
    <Box>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {metadata?.name || `Project ${project.id.slice(0, 10)}...`}
            </Typography>
            {metadata?.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {metadata.description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Recipient: {project.recipient}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              label={STATUS_LABELS[status]}
              color={STATUS_COLORS[status]}
            />
            <Chip
              label={formatDeadlineCountdown(project.deadline)}
              variant="outlined"
            />
          </Stack>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body1">
              {formatEther(BigInt(project.totalReceived))} of {formatEther(BigInt(project.threshold))} ETH raised
            </Typography>
            <Typography variant="body1">
              {progressPercent}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      </Paper>

      {/* Buy Tokens Section */}
      {isConnected && status === 'active' && tokens.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Buy Tokens
          </Typography>

          <Stack spacing={2}>
            {tokens.map((token) => (
              <Box key={token.tokenId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ minWidth: 120 }}>
                  Token #{token.tokenId}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                  {formatEther(BigInt(token.price))} ETH each
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  label="Quantity"
                  value={quantities[token.tokenId] || ''}
                  onChange={(e) => handleQuantityChange(token.tokenId, e.target.value)}
                  inputProps={{ min: 0 }}
                  sx={{ width: 120 }}
                />
              </Box>
            ))}

            <Button
              variant="contained"
              onClick={handleBuy}
              disabled={buying}
              sx={{ alignSelf: 'flex-start' }}
            >
              {buying ? 'Buying...' : 'Buy'}
            </Button>

            {buyError && <Alert severity="error">{buyError}</Alert>}
            {buySuccess && <Alert severity="success">{buySuccess}</Alert>}
          </Stack>
        </Paper>
      )}

      {/* Show message when wallet not connected */}
      {!isConnected && status === 'active' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="body1" color="text.secondary">
            Connect your wallet to buy tokens.
          </Typography>
        </Paper>
      )}

      {/* Refund Section */}
      {isConnected && status === 'refunding' && userRefundableTokens.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Refund Tokens
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The funding deadline has passed and the threshold was not met. You can refund your tokens.
          </Typography>

          <Stack spacing={1} sx={{ mb: 2 }}>
            {userRefundableTokens.map(({ tokenId, count }) => (
              <Typography key={tokenId} variant="body1">
                Token #{tokenId}: {count.toString()} refundable
              </Typography>
            ))}
          </Stack>

          <Button
            variant="contained"
            color="warning"
            onClick={handleRefund}
            disabled={refunding}
            sx={{ alignSelf: 'flex-start' }}
          >
            {refunding ? 'Refunding...' : 'Refund All'}
          </Button>

          {refundError && <Alert severity="error" sx={{ mt: 2 }}>{refundError}</Alert>}
          {refundSuccess && <Alert severity="success" sx={{ mt: 2 }}>{refundSuccess}</Alert>}
        </Paper>
      )}

      {/* Withdraw Section (recipient only) */}
      {isConnected && status === 'succeeded' && address?.toLowerCase() === project.recipient.toLowerCase() && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Withdraw Funds
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The funding threshold has been met. You can withdraw the raised funds.
          </Typography>

          <Button
            variant="contained"
            color="success"
            onClick={handleWithdraw}
            disabled={withdrawing}
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw Funds'}
          </Button>

          {withdrawError && <Alert severity="error" sx={{ mt: 2 }}>{withdrawError}</Alert>}
          {withdrawSuccess && <Alert severity="success" sx={{ mt: 2 }}>{withdrawSuccess}</Alert>}
        </Paper>
      )}

      {/* Contributor Leaderboard */}
      {leaderboard.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Contributor Leaderboard
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell align="right">Contributed</TableCell>
                  <TableCell align="right">Refunded</TableCell>
                  <TableCell align="right">Net</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.map((entry, i) => (
                  <TableRow key={entry.address}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                    </TableCell>
                    <TableCell align="right">{formatEther(entry.contributed)} ETH</TableCell>
                    <TableCell align="right">{formatEther(entry.refunded)} ETH</TableCell>
                    <TableCell align="right">{formatEther(entry.net)} ETH</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}
