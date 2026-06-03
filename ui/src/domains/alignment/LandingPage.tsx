import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Browse a portal for a cause',
    description:
      "Start with Explore Causes, open a cause statement, then use its funding portal to see projects aligned with that cause. Project cards take you to LazyGiving project pages, where the actual pledge/refund/withdraw actions live.",
    path: '/explore',
    cta: 'Explore causes',
  },
  {
    title: 'Vouch that a project fits a cause',
    description:
      "Open a LazyGiving project page and use Project Endorsements → Vouch for This Project to attach it to a cause statement. Alignment then uses those vouches to populate cause portals for people who trust you — directly or transitively.",
    domain: 'lazyGiving',
    path: '/projects',
    cta: 'Browse projects to vouch',
  },
  {
    title: "Pick who you trust — once, lightly",
    description:
      "Name a handful of people whose judgment you respect. Their vouches (and the vouches of people they trust) populate your portals. You don't need to curate constantly; a small trust graph goes a long way.",
    path: '/docs/alignment/how-alignment-works',
    cta: 'How the trust graph works',
  },
  {
    title: 'Delegate funding on LazyGiving',
    description:
      'Alignment helps you discover cause portals; LazyGiving holds the actual funding and delegation tools. The delegation link intentionally hands you to LazyGiving so you can create or manage reusable funding notes before returning to an Alignment portal.',
    domain: 'lazyGiving',
    path: '/delegation/notes/new',
    cta: 'Set up delegation on LazyGiving',
  },
  {
    title: "Causes don't need exact wording",
    description:
      "A cause is just a Conceptspace statement. The implication graph connects statements that mean similar things — so a portal pulls in projects vouched against any cause that implies yours, even when phrased differently. Organic coalitions, no coordination required.",
    path: '/docs/key-ideas/statements-and-implication-graph',
    cta: 'More on implication',
  },
]

export function AlignmentLandingPage() {
  return (
    <DomainLandingPage
      title="A page full of projects aligned with the causes you care about"
      description="Alignment is the discovery surface for cause-aligned crowdfunding. The workflow is: explore a cause here, open its funding portal, choose a project, then fund or vouch for that project on LazyGiving. Delegation is optional and also lives on LazyGiving."
      spotlights={[
        {
          label: 'The portal is the product',
          text: "Open a cause, get a list of projects vouched for by people in your trust network. Fund the ones you like — directly, or through a delegate.",
        },
        {
          label: 'Vouches do the curation',
          text: "Anyone can vouch that a project belongs in a cause's portal. There's no gatekeeper. Your trust settings decide whose vouches you actually see.",
        },
        {
          label: 'Different wording, same coalition',
          text: "Two people stating the same cause in different words still end up on each other's portals, because the implication graph connects related statements automatically.",
        },
      ]}
      heroActions={[
        { label: 'Explore causes', path: '/explore' },
        { label: 'Set up delegation on LazyGiving', domain: 'lazyGiving', path: '/delegation/notes/new', variant: 'outlined' },
        { label: 'How it works', path: '/docs/alignment/how-alignment-works', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
