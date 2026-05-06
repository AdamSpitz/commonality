import { DomainLandingPage } from '../components/DomainLandingPage'

export function PubstarterLandingPage() {
  return (
    <DomainLandingPage
      title="Retroactive crowdfunding"
      heroActions={[
        { label: 'Create a project', path: '/projects/new' },
        { label: 'Browse projects', path: '/projects', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: "You won't be donating alone",
          text: 'Either the project reaches its funding goal or your pledge is refunded',
        },
        {
          label: "Don't want to gamble on which projects will pan out?",
          text: "Fund proven projects retroactively, after they've delivered, to compensate the scouts who took a risk by investing early — your contribution is still valuable to the ecosystem and appears on the list of contributors. CTA: Learn about retroactive funding",
        },
        {
          label: 'Not inclined to make each decision personally?',
          text: 'Delegate your donation decisions to anyone you trust; your name will still show up on the contributor list',
        },
      ]}
    />
  )
}
