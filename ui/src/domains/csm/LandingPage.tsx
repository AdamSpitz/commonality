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
      title: 'Sign movement-aligned statements',
      description: 'Use Tally to sign the claims behind the movement and see direct plus indirect support add up.',
      href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
      cta: 'Open statements on Tally',
    },
  ]
}

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Common Sense Majority"
      title="You are not alone. Make the hidden majority visible."
      description="Common Sense Majority helps politically homeless people discover how many others independently share their common-sense positions — then organize content, signatures, cause funding, and projects around that visible support."
      spotlightLabel="Why this matters"
      spotlightText="Imagine you've been feeling politically homeless — too reasonable for your own side, too alienated from it to feel welcome joining the other. You visit a page and see: two million people feel the same way. Not two million people who joined a movement — two million people who independently wrote what they believed, and the system revealed they were all saying versions of the same thing. The common ground was always there. Making it visible was the hard part."
      heroActions={[
        { label: 'Open organizing playbook', path: '/organize' },
        { label: 'About the movement', path: '/about', variant: 'outlined' },
      ]}
      sections={getSections()}
    />
  )
}
