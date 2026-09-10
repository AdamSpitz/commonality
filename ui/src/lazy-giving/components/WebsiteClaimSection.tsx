import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useAccount, usePublicClient } from 'wagmi'
import { BeneficiaryEscrowAbi, BeneficiaryRegistryAbi } from '@commonality/sdk/abis'
import { hashBeneficiaryId, type ChannelState } from '@commonality/sdk/content-funding'
import { ClaimFlowModal } from '../../content-funding'
import { getRuntimeConfigValue } from '../../shared'

type WebsiteClaimSectionProps = {
  domain: string
}

function channelStateFromUint(value: number): ChannelState {
  if (value >= 2) return 'creator-controlled'
  if (value === 1) return 'verified'
  return 'unclaimed'
}

export function WebsiteClaimSection({ domain }: WebsiteClaimSectionProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [claimOpen, setClaimOpen] = useState(false)
  const [escrowBalance, setEscrowBalance] = useState(0n)
  const [channelState, setChannelState] = useState<ChannelState>('unclaimed')
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
      const [state, balance] = await Promise.all([
        publicClient.readContract({
          address: registryAddress,
          abi: BeneficiaryRegistryAbi,
          functionName: 'channelState',
          args: [beneficiaryId],
        }) as Promise<number>,
        publicClient.readContract({
          address: escrowAddress,
          abi: BeneficiaryEscrowAbi,
          functionName: 'balance',
          args: [beneficiaryId],
        }) as Promise<bigint>,
      ])
      setChannelState(channelStateFromUint(Number(state)))
      setEscrowBalance(balance)
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

  if (!registryAddress || !escrowAddress) return null

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="overline" sx={{ letterSpacing: '0.12em', fontWeight: 700 }}>
          Claim this website
        </Typography>
        <Typography variant="h6">{domain}</Typography>
        <Typography color="text.secondary">
          Publish https://{domain}/.well-known/commonality-claim.json to bind a payout wallet.
          The first claim is publicly visible before escrow can be withdrawn.
        </Typography>
        {loadError && <Alert severity="warning">{loadError}</Alert>}
        {isConnected ? (
          <Button variant="contained" onClick={() => setClaimOpen(true)}>
            Claim {domain}
          </Button>
        ) : (
          <Alert severity="info">Connect a wallet to start the claim.</Alert>
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
          channelState={channelState}
          includeTakeControl={false}
          withdrawableAt={withdrawableAt}
          withdrawLocked={withdrawLocked}
          onSuccess={() => { void reload() }}
        />
      )}
    </Paper>
  )
}
