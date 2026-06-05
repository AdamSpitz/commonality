import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Crowdfunding, the part you already know',
    description:
      "A creator posts a project with a funding goal. Backers pledge. If the goal is reached, the project proceeds and pledges are collected. If not, everyone gets refunded. No one donates alone, and nobody's money is at risk on a project that doesn't happen.",
    path: '/docs/lazyGiving/assurance-contracts',
    cta: 'How assurance contracts work',
  },
  {
    title: "Lazy way #1: don't predict winners — wait for them",
    description:
      "Picking promising projects from a pile of pitches is real work, and most of us aren't great at it. With retroactive funding, you don't have to be. Wait until a project has actually delivered, then buy out the people who funded it early — at the going market price. If the project clearly delivered, demand pushes the price above what scouts originally paid, so the scouts who picked well make a profit. The rest of us get to support proven work, and the scouts who *are* good at picking winners stay in business.",
    path: '/docs/lazyGiving/retroactive-funding',
    cta: 'More on retroactive funding',
  },
  {
    title: "Lazy way #2: don't pick at all — let someone else do it",
    description:
      "Even reading a project page takes effort. If you'd rather not, delegate your funding decisions to someone whose taste you trust. They pick; your money still flows to good work; your name still appears on the contributor list; you can stop the delegation anytime.",
    path: '/docs/key-ideas/delegation',
    cta: 'More on delegation',
  },
]

export function LazyGivingLandingPage() {
  return (
    <DomainLandingPage
      title="Crowdfunding without the two annoying jobs"
      description="Like Kickstarter — but you don't have to predict which projects will succeed, and you don't have to pick each one yourself. Specialists handle those parts; you just fund the work."
      spotlights={[
        {
          label: "You won't be donating alone",
          text: "Like other crowdfunding platforms, either the project reaches its funding goal or your pledge is refunded. No solo gambles.",
        },
        {
          label: "Don't want to bet on unproven projects?",
          text: "Fund proven projects retroactively, after they've delivered. You buy out the scouts who took the early risk, at the going market price. Your contribution shows up on the contributor list, and scouts with good judgment make a profit — so they can keep doing it.",
        },
        {
          label: "Don't want to pick projects at all?",
          text: "Delegate your donation decisions to anyone you trust. They do the homework; you get the credit; you can stop the delegation anytime.",
        },
      ]}
      heroActions={[
        { label: 'Browse projects', path: '/projects' },
        { label: 'Create a project', path: '/projects/new', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
