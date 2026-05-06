import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

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
]

export function AlignmentLandingPage() {
  return (
    <DomainLandingPage
      title="Browse and fund projects aligned with causes you care about"
      heroActions={[
        { label: 'Explore causes', href: getDomainUrl('tally', '/explore', { fallbackHref: '#' }) },
      ]}
      sections={sections}
    />
  )
}
