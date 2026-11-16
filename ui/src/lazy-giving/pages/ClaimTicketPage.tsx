import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useAccount, useChainId, usePublicClient, useSignTypedData, useWalletClient } from 'wagmi'
import { getAddress, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ClaimTicketAssuranceContractAbi, ProjectFactoryAbi } from '@commonality/sdk/abis'
import {
  claimTicketDomain,
  decodeClaimTicketCode,
  encodeRedeemCall,
  REDEEM_CLAIM_TICKET_TYPES,
  redeemClaimTicketMessage,
} from '@commonality/sdk/claim-tickets'
import { projectPathForAddress } from '../../shared'
import { Link as RouterLink } from 'react-router-dom'

const CLAIM_WARNING = 'Anyone with this code can claim this project, including its creator.'

export function ClaimTicketPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const walletClient = useWalletClient()
  const { signTypedDataAsync } = useSignTypedData()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fragment = window.location.hash.replace(/^#/, '')
    if (!fragment) return
    setCode(decodeURIComponent(fragment))
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  const redeem = async () => {
    if (!address || !publicClient || !isConnected) return
    setSubmitting(true)
    setError(null)
    setStatus(null)
    let transitKey: `0x${string}` | null = null
    try {
      const decoded = decodeClaimTicketCode(code)
      if (decoded.chainId !== BigInt(chainId)) throw new Error('This code is for a different chain.')
      transitKey = decoded.transitKey
      const transit = privateKeyToAccount(transitKey)
      const factory = import.meta.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS as `0x${string}` | undefined
      if (!factory) throw new Error('Project factory is not configured.')
      const recorded = await publicClient.readContract({
        address: factory,
        abi: ProjectFactoryAbi,
        functionName: 'ticketProjectOf',
        args: [transit.address],
      })
      const projectAddress = decoded.project === zeroAddress ? recorded : decoded.project
      if (!recorded || recorded === zeroAddress || getAddress(recorded) !== getAddress(projectAddress)) {
        throw new Error('This code does not match a registered claim ticket.')
      }
      const onChainTransit = await publicClient.readContract({
        address: projectAddress,
        abi: ClaimTicketAssuranceContractAbi,
        functionName: 'transitAddress',
      })
      if (getAddress(onChainTransit) !== transit.address) throw new Error('This code does not match the project.')
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 30)
      const message = redeemClaimTicketMessage(address, deadline)
      const domain = claimTicketDomain(decoded.chainId, projectAddress)
      const transitSignature = await transit.signTypedData({
        domain,
        types: REDEEM_CLAIM_TICKET_TYPES,
        primaryType: 'RedeemClaimTicket',
        message,
      })
      transitKey = null
      setCode('')
      const destinationSignature = await signTypedDataAsync({
        domain,
        types: REDEEM_CLAIM_TICKET_TYPES,
        primaryType: 'RedeemClaimTicket',
        message,
      })
      const body = {
        project: projectAddress,
        destination: address,
        transitAddress: transit.address,
        transitSignature,
        destinationSignature,
        deadline: deadline.toString(),
      }
      const relay = await fetch(`${import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:3001'}/claim-ticket/redeem`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await relay.json().catch(() => null) as { transactionHash?: string; payload?: { data?: `0x${string}` }; message?: string } | null
      if (relay.ok && payload?.transactionHash) {
        setProject(projectAddress)
        setStatus('The ticket is bound to this account. Accepting the work and claiming proceeds are separate steps.')
        return
      }
      const data = payload?.payload?.data ?? encodeRedeemCall({
        destination: address,
        transitSignature,
        destinationSignature,
        deadline,
      })
      if (!walletClient.data) throw new Error(payload?.message || 'The relay could not submit this claim.')
      const hash = await walletClient.data.sendTransaction({ to: projectAddress, data })
      await publicClient.waitForTransactionReceipt({ hash })
      setProject(projectAddress)
      setStatus('The ticket is bound to this account. Accepting the work and claiming proceeds are separate steps.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem this claim code.')
    } finally {
      transitKey = null
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1" gutterBottom>Claim a project</Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>{CLAIM_WARNING} This does not import a wallet key.</Alert>
      <Stack spacing={2}>
        <TextField
          label="Claim code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          multiline
          minRows={3}
          autoComplete="off"
          placeholder="ct1:..."
        />
        {!isConnected && <Alert severity="info">Create or connect the account that should receive this project, then redeem.</Alert>}
        <Button variant="contained" disabled={!isConnected || submitting || !code.trim()} onClick={() => void redeem()} sx={{ alignSelf: 'flex-start' }}>
          {submitting ? 'Redeeming...' : 'Redeem to this account'}
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
        {status && (
          <Alert severity="success">
            {status}
            {project && <Button component={RouterLink} to={projectPathForAddress(project)} size="small" sx={{ ml: 1 }}>Open project</Button>}
          </Alert>
        )}
      </Stack>
    </Box>
  )
}
