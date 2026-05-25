import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'This is like standard crowdfunding',
    description:
      'A creator posts a project with a funding goal. Backers pledge. If the goal is reached, the project proceeds and pledges are collected. If not, everyone gets refunded. No one donates alone.',
  },
  {
    title: 'What is retroactive funding?',
    description:
      "Some people (\"scouts\") fund unproven projects early, taking a risk. If the project succeeds, later donors can compensate those scouts retroactively — rewarding them for having good judgment. Your retroactive contribution still appears on the contributor list, and it's still genuinely valuable: it makes early-stage scouting financially sustainable.",
  },
  {
    title: "What if I don't want to pick projects myself?",
    description:
      'Delegate your funding decisions to someone you trust. They decide which projects to back; your name still appears on the contributor list; you can revoke the delegation anytime.',
  },
]

export function PubstarterLandingPage() {
  return (
    <DomainLandingPage
      title="Lazy retroactive crowdfunding"
      description="Most people don't want to take a risk donating to unproven projects.
      Most people don't want to make each individual donation decision personally."
      spotlights={[
        {
          label: "You won't be donating alone",
          text: 'Like other crowdfunding platforms, either the project reaches its funding goal or your pledge is refunded',
        },
        {
          label: "Don't want to gamble on which projects will pan out?",
          text: "Fund proven projects retroactively, after they've delivered, to compensate the scouts who took a risk by investing early — your contribution is still valuable to the ecosystem and appears on the list of contributors",
        },
        {
          label: 'Not inclined to make each decision personally?',
          text: 'Delegate your donation decisions to anyone you trust; your name will still show up on the contributor list',
        },
      ]}
      heroActions={[
        { label: 'Create a project', path: '/projects/new' },
        { label: 'Browse projects', path: '/projects', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
