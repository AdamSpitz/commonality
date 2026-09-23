import type { VerifiedSocialAssociationLookup } from '@commonality/sdk/machinery'

let installed: VerifiedSocialAssociationLookup | undefined

export function installVerifiedSocialAssociation(lookup: VerifiedSocialAssociationLookup) {
  installed = lookup
}

export function verifiedSocialAssociationLookup(): VerifiedSocialAssociationLookup | undefined {
  return installed
}
