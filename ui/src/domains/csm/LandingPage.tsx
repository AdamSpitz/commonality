import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

function getSections() {
  return [
    {
      eyebrow: 'Playbook',
      title: 'Move from persuasion to organization',
      description: 'Turn “I thought I was the only one” into visible numbers, useful media, and concrete projects people can back.',
      path: '/organize',
      cta: 'Open organizing playbook',
    },
    {
      eyebrow: 'Content',
      title: 'Use Civility as the wedge',
      description: 'Start with bridge-building media that reveals the positions a hidden majority already shares.',
      path: '/content',
      cta: 'Browse content',
    },
    {
      eyebrow: 'Organize',
      title: 'Fund movement projects',
      description: 'Back canvassing, research, coalition-building, advocacy, and other work that helps a visible majority act.',
      path: '/projects',
      cta: 'Browse projects',
    },
    {
      eyebrow: 'Tally',
      title: 'Tally supporters and funding to demonstrate the size of the movement',
      description: 'Use Tally to sign the claims behind the movement and see direct plus indirect support add up.',
      href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
      cta: 'Open statements on Tally',
    },
    {
      eyebrow: 'Trust',
      title: 'The infrastructure is verifiably neutral, not capturable by either side',
      description: 'Transparent, verifiable supporter counts and funding flows. No single coalition controls the platform.',
      path: '/about',
      cta: 'About the infrastructure',
    },
  ]
}

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="Giving the quiet middle majority a voice."
      description="On most issues, the loud extremes dominate — but a quiet supermajority holds common-sense positions that never get heard."
      spotlights={[
        {
          label: 'Build bridges',
          text: 'Sign statements in your own words; the other side does the same; AI helps find overlap; noninflammatory content nudges people toward common ground.',
        },
      ]}
      heroActions={[
        { label: 'Open organizing playbook', path: '/organize' },
        { label: 'About the movement', path: '/about', variant: 'outlined' },
      ]}
      sections={getSections()}
    />
  )
}
