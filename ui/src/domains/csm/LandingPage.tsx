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
      title: 'Use noninflammatory content as the wedge',
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
      description="Common Sense Majority helps politically homeless people discover how many others independently share their common-sense positions — then organize content, signatures, and projects around that visible support."
      spotlightLabel="Hidden-majority thesis"
      spotlightText="The common ground was always there. The missing piece was trusted infrastructure for counting people who used different words, signed different statements, and refused to pretend the loudest factions spoke for them."
      heroActions={[
        { label: 'Open organizing playbook', path: '/organize' },
        { label: 'About the movement', path: '/about', variant: 'outlined' },
        { label: 'See a walkthrough', href: getDomainUrl('commonality', '/docs/use-case-walkthroughs/common-sense-majority', { fallbackHref: '#' }), variant: 'outlined' },
        { label: 'Browse content', path: '/content', variant: 'outlined' },
        { label: 'Browse projects', path: '/projects', variant: 'outlined' },
        { label: 'Open statements on Tally', href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }), variant: 'text' },
      ]}
      sections={getSections()}
    />
  )
}
