import { useEffect, useMemo, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { BeneficiaryRegistryAbi } from '@commonality/sdk/abis'
import { hashBeneficiaryId, type BeneficiaryState } from '@commonality/sdk/content-funding'
import { getRuntimeConfigValue, InfoChip } from '../../shared'
import {
  beneficiaryStateFromUint,
  WEBSITE_CLAIM_STATE_COLORS,
  WEBSITE_CLAIM_STATE_LABELS,
  WEBSITE_CLAIM_STATE_TOOLTIPS,
} from './websiteBeneficiaryClaim'

export function WebsiteBeneficiaryClaimChip({ domain }: { domain: string }) {
  const publicClient = usePublicClient()
  const [state, setState] = useState<BeneficiaryState | null>(null)
  const beneficiaryId = useMemo(() => hashBeneficiaryId('dns', domain), [domain])
  const registryAddress = getRuntimeConfigValue('VITE_BENEFICIARY_REGISTRY_ADDRESS') as `0x${string}` | undefined

  useEffect(() => {
    if (!publicClient || !registryAddress) return
    let cancelled = false
    void publicClient.readContract({
      address: registryAddress,
      abi: BeneficiaryRegistryAbi,
      functionName: 'beneficiaryState',
      args: [beneficiaryId],
    }).then((value) => {
      if (!cancelled) setState(beneficiaryStateFromUint(Number(value)))
    }).catch(() => {
      if (!cancelled) setState(null)
    })
    return () => {
      cancelled = true
    }
  }, [publicClient, registryAddress, beneficiaryId])

  if (!state) return null

  return (
    <InfoChip
      title={WEBSITE_CLAIM_STATE_TOOLTIPS[state]}
      label={WEBSITE_CLAIM_STATE_LABELS[state]}
      color={WEBSITE_CLAIM_STATE_COLORS[state]}
    />
  )
}
