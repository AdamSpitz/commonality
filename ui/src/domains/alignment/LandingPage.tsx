import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Want to donate to the cause?',
    description: 'View crowdfundable projects aligned with a cause',
  },
  {
    title: 'Want to call attention to a project?',
    description: 'Attest that this project is aligned with this cause.',
  },
  {
    title: 'Follow the project ecosystem closely?',
    description: 'Find people who trust you enough to let you make their donation decisions on their behalf.',
  },
  {
    title: 'How do projects get listed as aligned with a cause?',
    description:
      'Anyone can attest that a project is aligned with a cause — the attestation is public and on-chain. There\'s no gatekeeper. Donors decide which attesters they trust, and delegates use those attestations to guide funding decisions. Reputation does the work that central authority usually does.',
  },
]

export function AlignmentLandingPage() {
  return (
    <DomainLandingPage
      title="Browse and fund projects aligned with causes you care about"
      heroActions={[
        { label: 'Explore causes', path: '/explore' },
      ]}
      sections={sections}
    />
  )
}
