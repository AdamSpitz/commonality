import { lookupVerifiedTwitterAssociation } from '@commonality/sdk/content-funding'
import { installVerifiedSocialAssociation } from '../hooks/verifiedSocialAssociation'

export function installFundingSocialAssociation() {
  installVerifiedSocialAssociation(lookupVerifiedTwitterAssociation)
}
