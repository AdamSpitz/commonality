import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Playbook',
    title: 'Move from persuasion to organization',
    description: 'Use the organizing surface to connect hidden-majority media, explicit statements, and fundable projects without dropping into the full platform.',
    to: '/organize',
    cta: 'Open organizing playbook',
  },
  {
    eyebrow: 'Content',
    title: 'Use noninflammatory content as the wedge',
    description: 'Start with bridge-building media that reveals the positions a hidden majority already shares.',
    to: '/content',
    cta: 'Browse content',
  },
  {
    eyebrow: 'Organize',
    title: 'Fund movement projects',
    description: 'Use the shared pubstarter and portal infrastructure for organizing work, not just media funding.',
    to: '/projects',
    cta: 'Browse projects',
  },
  {
    eyebrow: 'Theory',
    title: 'Trace ideas back to statements',
    description: 'The movement framing still depends on the conceptspace underneath it, where claims and coalitions can be inspected directly.',
    to: '/statements',
    cta: 'Explore statements',
  },
]

export function MovementLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Common Sense Majority"
      title="Organize the hidden majority around positions that already have broad support."
      description="This surface layers movement framing on top of the shared conceptspace, content-funding, and project-funding infrastructure."
      spotlightLabel="Built on Noninflammatory + Commonality"
      spotlightText="The movement site is broader than a single content tool but narrower than the full platform. It uses noninflammatory content as a mechanism and Commonality as the infrastructure layer."
      heroActions={[
        { label: 'Open organizing playbook', to: '/organize' },
        { label: 'Browse content', to: '/content', variant: 'outlined' },
        { label: 'Browse projects', to: '/projects', variant: 'outlined' },
        { label: 'Browse statements', to: '/statements', variant: 'text' },
      ]}
      sections={sections}
    />
  )
}
