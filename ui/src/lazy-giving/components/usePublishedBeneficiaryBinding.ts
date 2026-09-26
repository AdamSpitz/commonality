import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { hashBeneficiaryId } from '@commonality/sdk/content-funding'

const beneficiaryIdAbi = [
  {
    type: 'function',
    name: 'beneficiaryId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const

export type PublishedBeneficiary = {
  namespace?: string
  canonicalIdentifier?: string
}

/** Whether the published DNS name is the beneficiary id stored on this project. */
export type PublishedBeneficiaryBinding =
  | { status: 'none' }
  | { status: 'checking'; domain: string }
  | { status: 'verified'; domain: string }
  | { status: 'mismatch'; domain: string }
  | { status: 'unavailable'; domain: string }

/**
 * Compare project metadata's `dns:` name with `beneficiaryId()` on the assurance contract.
 * A match means the published string hashes to the id the contract reserves funds for.
 * Contracts that are not beneficiary projects, and metadata that names a different id, are mismatches.
 */
export function usePublishedBeneficiaryBinding(
  projectAddress: string | undefined,
  beneficiary: PublishedBeneficiary | undefined,
): PublishedBeneficiaryBinding {
  const publicClient = usePublicClient()
  const domain = beneficiary?.namespace === 'dns'
    ? beneficiary.canonicalIdentifier?.trim() || undefined
    : undefined
  const [binding, setBinding] = useState<PublishedBeneficiaryBinding>(
    domain ? { status: 'checking', domain } : { status: 'none' },
  )

  useEffect(() => {
    if (!domain) {
      setBinding({ status: 'none' })
      return
    }
    if (!publicClient || !projectAddress || !/^0x[0-9a-fA-F]{40}$/.test(projectAddress)) {
      setBinding({ status: 'checking', domain })
      return
    }

    let cancelled = false
    setBinding({ status: 'checking', domain })
    const expected = hashBeneficiaryId('dns', domain).toLowerCase()
    void publicClient.readContract({
      address: projectAddress as `0x${string}`,
      abi: beneficiaryIdAbi,
      functionName: 'beneficiaryId',
    }).then((onchainId) => {
      if (cancelled) return
      const matches = String(onchainId).toLowerCase() === expected
      setBinding(matches ? { status: 'verified', domain } : { status: 'mismatch', domain })
    }).catch((err: unknown) => {
      if (cancelled) return
      const message = err instanceof Error ? err.message : String(err)
      const notABeneficiaryContract = /revert|returned no data|function selector|does not have the function/i.test(message)
      setBinding(notABeneficiaryContract
        ? { status: 'mismatch', domain }
        : { status: 'unavailable', domain })
    })

    return () => {
      cancelled = true
    }
  }, [publicClient, projectAddress, domain])

  return binding
}
