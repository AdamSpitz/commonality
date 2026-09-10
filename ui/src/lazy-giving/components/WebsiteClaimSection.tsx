import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useAccount, usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import { BeneficiaryEscrowAbi, BeneficiaryRegistryAbi } from '@commonality/sdk/abis'
import { hashBeneficiaryId, rotatePayoutAddress, type BeneficiaryState } from '@commonality/sdk/content-funding'
import { ClaimFlowModal } from '../../content-funding'
import { getRuntimeConfigValue, humanizeTxError, useWriteClients } from '../../shared'

type WebsiteClaimSectionProps = {
  domain: string
}

function beneficiaryStateFromUint(value: number): BeneficiaryState {
  if (value >= 2) return 'beneficiary-controlled'
  if (value === 1) return 'verified'
  return 'unclaimed'
}

export function WebsiteClaimSection({ domain }: WebsiteClaimSectionProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const writeClients = useWriteClients(address)
  const [claimOpen, setClaimOpen] = useState(false)
  const [escrowBalance, setEscrowBalance] = useState(0n)
  const [beneficiaryState, setBeneficiaryState] = useState<BeneficiaryState>('unclaimed')
  const [payoutAddress, setPayoutAddress] = useState<string | null>(null)
  const [newPayoutAddress, setNewPayoutAddress] = useState('')
  const [rotating, setRotating] = useState(false)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [rotateSuccess, setRotateSuccess] = useState<string | null>(null)
  const [withdrawableAt, setWithdrawableAt] = useState<number | undefined>(undefined)
  const [withdrawLocked, setWithdrawLocked] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const beneficiaryId = useMemo(() => hashBeneficiaryId('dns', domain), [domain])
  const registryAddress = getRuntimeConfigValue('VITE_BENEFICIARY_REGISTRY_ADDRESS') as `0x${string}` | undefined
  const escrowAddress = getRuntimeConfigValue('VITE_BENEFICIARY_ESCROW_ADDRESS') as `0x${string}` | undefined

  const reload = async () => {
    if (!publicClient || !registryAddress || !escrowAddress) return
    try {
      setLoadError(null)
      const [state, balance, payout] = await Promise.all([
        publicClient.readContract({
          address: registryAddress,
          abi: BeneficiaryRegistryAbi,
          functionName: 'beneficiaryState',
          args: [beneficiaryId],
        }) as Promise<number>,
        publicClient.readContract({
          address: escrowAddress,
          abi: BeneficiaryEscrowAbi,
          functionName: 'balance',
          args: [beneficiaryId],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: registryAddress,
          abi: BeneficiaryRegistryAbi,
          functionName: 'payoutAddress',
          args: [beneficiaryId],
        }) as Promise<string>,
      ])
      setBeneficiaryState(beneficiaryStateFromUint(Number(state)))
      setEscrowBalance(balance)
      setPayoutAddress(Number(state) > 0 ? payout : null)
      if (Number(state) > 0) {
        const at = await publicClient.readContract({
          address: registryAddress,
          abi: BeneficiaryRegistryAbi,
          functionName: 'claimWithdrawableAt',
          args: [beneficiaryId],
        }) as bigint
        const atNumber = Number(at)
        setWithdrawableAt(atNumber)
        setWithdrawLocked(atNumber * 1000 > Date.now())
      } else {
        setWithdrawableAt(undefined)
        setWithdrawLocked(false)
        setPayoutAddress(null)
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load beneficiary claim state')
    }
  }

  useEffect(() => {
    void reload()
    // Reload on identity/client change; reload closes over those values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, registryAddress, escrowAddress, beneficiaryId])

  const canRotate = Boolean(
    address
    && payoutAddress
    && address.toLowerCase() === payoutAddress.toLowerCase()
    && beneficiaryState !== 'unclaimed'
    && writeClients
    && registryAddress,
  )

  const handleRotate = async () => {
    if (!writeClients || !registryAddress) return
    const next = newPayoutAddress.trim()
    if (!isAddress(next)) {
      setRotateError('Enter a valid Ethereum address')
      return
    }
    try {
      setRotating(true)
      setRotateError(null)
      setRotateSuccess(null)
      await rotatePayoutAddress(
        writeClients,
        { address: registryAddress, abi: BeneficiaryRegistryAbi },
        beneficiaryId,
        next,
      )
      setRotateSuccess(`Payout address updated to ${next}`)
      setNewPayoutAddress('')
      await reload()
    } catch (err) {
      setRotateError(humanizeTxError(err, 'Could not rotate payout address'))
    } finally {
      setRotating(false)
    }
  }

  if (!registryAddress || !escrowAddress) return null

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
          Claim this website
        </Typography>
        <Typography variant="h6">{domain}</Typography>
        <Typography color="text.secondary">
          Publish https://{domain}/.well-known/commonality-claim.json, or the same JSON as a TXT
          record at _commonality.{domain}, to bind a payout wallet. The first claim is publicly
          visible before escrow can be withdrawn.
        </Typography>
        {loadError && <Alert severity="warning">{loadError}</Alert>}
        {payoutAddress && (
          <Typography color="text.secondary">
            Current payout wallet: {payoutAddress}
          </Typography>
        )}
        {isConnected ? (
          <Button variant="contained" onClick={() => setClaimOpen(true)}>
            Claim {domain}
          </Button>
        ) : (
          <Alert severity="info">Connect a wallet to start the claim.</Alert>
        )}
        {canRotate && (
          <Stack spacing={1}>
            <Typography variant="subtitle2">Rotate payout address</Typography>
            <Typography variant="body2" color="text.secondary">
              Only this wallet can authorize a replacement. A new website proof
              cannot redirect established funds by itself.
            </Typography>
            <TextField
              label="New payout address"
              value={newPayoutAddress}
              onChange={(event) => setNewPayoutAddress(event.target.value)}
              size="small"
            />
            <Button
              variant="outlined"
              onClick={() => { void handleRotate() }}
              disabled={rotating}
            >
              {rotating ? 'Updating…' : 'Update payout address'}
            </Button>
            {rotateError && <Alert severity="error">{rotateError}</Alert>}
            {rotateSuccess && <Alert severity="success">{rotateSuccess}</Alert>}
          </Stack>
        )}
      </Stack>
      {address && (
        <ClaimFlowModal
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          channelDisplayName={domain}
          channelId={`dns:${domain}`}
          platform="dns"
          handle={domain}
          claimantAddress={address}
          escrowBalance={escrowBalance}
          channelState={beneficiaryState}
          includeTakeControl={false}
          withdrawableAt={withdrawableAt}
          withdrawLocked={withdrawLocked}
          onSuccess={() => { void reload() }}
        />
      )}
    </Paper>
  )
}
