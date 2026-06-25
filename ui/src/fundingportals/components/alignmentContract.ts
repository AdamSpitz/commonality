import { AlignmentAttestationsAbi } from '@commonality/sdk/abis'

export interface AlignmentContractRef {
  address: `0x${string}`
  abi: typeof AlignmentAttestationsAbi
}

export function getAlignmentContract(): AlignmentContractRef | null {
  const addr = import.meta.env.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: AlignmentAttestationsAbi }
}
