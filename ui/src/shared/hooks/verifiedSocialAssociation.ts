import type { VerifiedSocialAssociationLookup } from '@commonality/sdk/machinery'
import { lookupVerifiedTwitterAssociation } from '@commonality/sdk/signer-profiles'

let installed: VerifiedSocialAssociationLookup | undefined

export function installVerifiedSocialAssociation(lookup: VerifiedSocialAssociationLookup) {
  installed = lookup
}

/** Record channel claims from BeneficiaryIdentity. Not a funding import. */
export function installIdentitySocialAssociation() {
  installVerifiedSocialAssociation(lookupVerifiedTwitterAssociation)
}

export function verifiedSocialAssociationLookup(): VerifiedSocialAssociationLookup | undefined {
  return installed
}
