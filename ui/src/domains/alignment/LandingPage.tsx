import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Browse a portal for a cause',
    description:
      "Pick a cause and you get a page full of projects that people you trust have vouched are aligned with it. That's the whole product. If your trust network is healthy, the portal is most of what you'll ever use.",
    path: '/explore',
    cta: 'Explore causes',
  },
  {
    title: 'Vouch that a project fits a cause',
    description:
      "Projects live on LazyGiving. Alignment is where you say \"this project belongs in the portal for this cause.\" Your vouches show up on the portals of everyone who trusts you — directly or transitively.",
    path: '/docs/alignment/help-connect-things',
    cta: 'How vouching works',
  },
  {
    title: "Pick who you trust — once, lightly",
    description:
      "Name a handful of people whose judgment you respect. Their vouches (and the vouches of people they trust) populate your portals. You don't need to curate constantly; a small trust graph goes a long way.",
    path: '/docs/alignment/how-alignment-works',
    cta: 'How the trust graph works',
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
      description="Alignment is the discovery surface for cause-aligned crowdfunding. Projects are created and funded on LazyGiving; Alignment is where you see them grouped by cause, filtered through people whose judgment you trust."
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
        { label: 'How it works', path: '/docs/alignment/how-alignment-works', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
