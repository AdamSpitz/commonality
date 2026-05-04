import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

function getSections() {
  return [
    {
      eyebrow: 'Playbook',
      title: 'Move from persuasion to organization',
      description: 'Use the organizing surface to connect hidden-majority media, Tally statement-signing, and fundable projects without dropping into the full platform.',
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
      description: 'Use the shared pubstarter and portal infrastructure for organizing work, not just media funding.',
      path: '/projects',
      cta: 'Browse projects',
    },
    {
      eyebrow: 'Tally',
      title: 'Sign movement-aligned statements',
      description: 'The movement framing depends on claims that people can sign. Tally owns that polling and statement-signing experience.',
      href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
      cta: 'Open statements on Tally',
    },
  ]
}

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Common Sense Majority"
      title="Organize the hidden majority around positions that already have broad support."
      description="This surface layers movement framing on top of Noninflammatory Content, Tally statement-signing, and Commonality project-funding infrastructure."
      spotlightLabel="Uses Noninflammatory + Tally + Commonality"
      spotlightText="The movement site is broader than a single content tool but narrower than the full platform. It uses noninflammatory content as a mechanism, Tally for movement-aligned statement signing, and Commonality for funding infrastructure."
      heroActions={[
        { label: 'Open organizing playbook', path: '/organize' },
        { label: 'Browse content', path: '/content', variant: 'outlined' },
        { label: 'Browse projects', path: '/projects', variant: 'outlined' },
        { label: 'Open statements on Tally', href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }), variant: 'text' },
      ]}
      sections={getSections()}
    />
  )
}
