import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Start here',
    title: 'Publish your first cause board',
    description: 'Choose a few statements that describe the work you want to organize, then publish a board people can sign, fund, and build around.',
    path: '/start',
    cta: 'Start organizing',
  },
  {
    eyebrow: 'Guide',
    title: 'Shape the work one role at a time',
    description: 'Money, judgment, trust, reach, and execution can come from different people. Learn how to recruit only the roles your cause needs next.',
    path: '/docs/start-a-cause',
    cta: 'Read the organizer guide',
  },
  {
    eyebrow: 'Deeper case',
    title: 'Understand why the pieces fit together',
    description: 'Read the longer argument for assurance contracts, delegation, retroactive funding, open records, and organic coalitions.',
    path: '/docs/vision-and-strategy',
    cta: 'Read the vision',
  },
]

export function CommonalityFounderPage() {
  return (
    <DomainLandingPage
      eyebrow="Founder / organizer guide"
      title="Turn a cause into work people can join."
      description="Commonality gives organizers one place to publish a cause board, gather signatures, connect fundable projects, and recruit the people who can move the work forward."
      spotlights={[
        {
          label: 'Start narrowly',
          text: 'You do not need an organization chart or a complete movement. Start with a concrete cause and the next useful piece of work; let contributors take the jobs they are actually willing to do.',
        },
      ]}
      heroActions={[
        { label: 'Start a cause board', path: '/start' },
        { label: 'Read the organizer guide', path: '/docs/start-a-cause', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
