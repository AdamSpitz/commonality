import { Box } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { RetroFundingStory } from './RetroFundingStory'

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
    <Box>
      <DomainLandingPage
        title="Crowdfunding without the two annoying jobs"
        description="Like Kickstarter — but you don't have to gamble on unproven projects, and you don't have to vet each one yourself. Let someone else take the early risk and do the legwork. You can still put real weight behind the work you believe in."
        spotlights={[
        {
          label: "Don't want to gamble on unproven projects?",
          text: "Wait for the ones that have clearly delivered, then fund them after the fact. You already know they did good — so back them now, and pay back the early backers who took the risk so you didn't have to. There's even a satisfying, concrete goal: find a project you admire and clear out its remaining shares.",
        },
        {
          label: "Don't want to pick projects at all?",
          text: "Delegate your donation decisions to anyone you trust. They do the homework; you get the credit; you can stop the delegation anytime.",
        },
        {
          label: "Either way, you never donate alone",
          text: "Like any crowdfunding platform, a project either reaches its funding goal or your pledge is refunded. No solo gambles, whichever way you choose to give.",
        },
        {
          label: 'Runs on neutral ground',
          text: "It all runs onchain, so no company owns the ledger. Your pledges, your refunds, and the contributor list live on open infrastructure — not locked inside one platform that can change the rules on you.",
        },
      ]}
        heroActions={[
          { label: 'Browse projects', path: '/projects' },
          { label: 'Create a project', path: '/projects/new', variant: 'outlined' },
        ]}
        heroChildren={
          <Box sx={{ maxWidth: 960 }}>
            <RetroFundingStory />
          </Box>
        }
        sections={sections}
      />
    </Box>
  )
}
