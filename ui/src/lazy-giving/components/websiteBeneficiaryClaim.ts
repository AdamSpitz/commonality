import { hashBeneficiaryId, type BeneficiaryState } from '@commonality/sdk/content-funding'

export function beneficiaryStateFromUint(value: number): BeneficiaryState {
  if (value >= 2) return 'beneficiary-controlled'
  if (value === 1) return 'verified'
  return 'unclaimed'
}

export const WEBSITE_CLAIM_STATE_LABELS: Record<BeneficiaryState, string> = {
  unclaimed: 'Unclaimed',
  verified: 'Domain-controlled',
  'beneficiary-controlled': 'Beneficiary-controlled',
}

export const WEBSITE_CLAIM_STATE_COLORS: Record<BeneficiaryState, 'default' | 'warning' | 'success'> = {
  unclaimed: 'default',
  verified: 'warning',
  'beneficiary-controlled': 'success',
}

export const WEBSITE_CLAIM_STATE_TOOLTIPS: Record<BeneficiaryState, string> = {
  unclaimed:
    'Nobody has proven control of this website yet. Successful funds stay in protocol escrow until the controller claims them. This project is not affiliated with the site.',
  verified:
    'Someone proved they can write this domain and bound a payout address. Escrow enforces domain control — not charity status, legal-entity identity, or tax deductibility.',
  'beneficiary-controlled':
    'The verified domain controller has taken exclusive control of this identity. New projects about it can only be created by that payout wallet.',
}

/** Unclaimed identities have no registry events, so missing map entries are unclaimed. */
export function claimStateForDnsDomain(
  channels: Map<string, { state: BeneficiaryState }> | undefined,
  domain: string | undefined,
): BeneficiaryState {
  if (!domain) return 'unclaimed'
  const id = hashBeneficiaryId('dns', domain)
  return channels?.get(id)?.state ?? channels?.get(id.toLowerCase())?.state ?? 'unclaimed'
}
