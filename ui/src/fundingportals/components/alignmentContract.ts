import { AlignmentAttestationsAbi } from '@commonality/sdk/abis'
import { getRuntimeConfigValue } from '../../shared'

export interface AlignmentContractRef {
  address: `0x${string}`
  abi: typeof AlignmentAttestationsAbi
}

export function getAlignmentContract(): AlignmentContractRef | null {
  const addr =
    getRuntimeConfigValue('VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS')
    || import.meta.env.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: AlignmentAttestationsAbi }
}
