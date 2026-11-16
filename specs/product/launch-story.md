# Me telling the story of what we're launching and how it could work

(Writing this in mid-November 2026.)

We're not actually ready to launch yet, but as part of the process of figuring out what remains to be done, I want to talk through what we've got and what we want to start with and how it could work. This is intentionally meant to be a very stream-of-consciousness kind of thing, not organized, not necessarily meant to make sense to anyone but me.

The main site is called Commonality. It's got a bunch of smart contracts and an indexer and some peripheral services, as well as the actual website.

The core functionality isn't actually huge: statements that people can sign, and boards of fundable projects. Also delegation and nudging and bridging and a few other features, but seriously this should be fairly simple.

There are various "vertical" sites out there, *not* affiliated with Commonality proper. Each of those is opinionated, pushing its own agenda. I (in my capacity as a person with opinions, *not* in my capacity as the guy writing Commonality) will probably launch a few to get started, because I actually believe in them: AI Risk, Civility, CSM (or more likely various individual bridges), maybe some particular political stances, maybe something about crypto.

The ideas of the various vertical sites that I personally want:
  - AI Risk: funnel for a range of various positions that all kinda boil down to "slow down capabilities and/or speed up alignment."
  - Crypto: increase adoption of blockchain-based stuff in a particular geographical area.
  - Civility: content funding for noninflammatory social media content on particular topics.
  - CSM: "common ground" positions on various political topics; the point is that most people aren't nutty extremists.
    - In particular, part of what I want from this is a bunch of little "funnel" sites, similar to the AI Risk one. "Hey, if you're a normal common-sense person, you might have one of these several positions, all of which imply some common-ground common-sense policies." See the numbers of signers and also fund people who are working to further this kind of sane agenda (including social-media content funding but also whatever other work might be useful). Like, I just want this organic alliance of normal people to be able to *see* itself and get stuff done together, rather than being buried inside the polarized left and right groups.

Each funnel site isn't actually that hard to build! I've built the AI Risk one as a first use case, and it's really a very thin site: some sort of simple UI for signing the core statements (maybe with a "statement family" to let people put together their more-specific statements that imply the core statements), and links to the cause boards. Can have some more-opinionated prose or links to social-media content (because it's an opinionated third-party site), but also links to the more-neutral pages on the Commonality site.

I suspect that a content-funding site like Civility will need some work put into the UI. So I should take a crack at that. One thought is something like: an opinionated site can have a specific trust-graph root (i.e. the site's owner just uses his own address as the root, then adds whoever he trusts). Then the site can show the actual posts that have been alignment-attested by anyone in his transitive trust graph. (Can't and shouldn't do this with Commonality proper, because that would be too opinionated.)

Some of the vertical sites might want a nudger or mediator or whatever. They can set that up.

Anyway, I make those verticals. And maybe I try to seed them with some pledges and/or projects and so on.



"Why use this?"
  - First, why not? This scales up from nothing; it can function as your own personal bookkeeping system. (If you have a project, just put it here; if you have money that you personally intend to spend on some cause, just put it here.)
  - Second, delegate to a friend, that’s value even if nobody else is there, it’s your personal delegation system.
  - Third, watch this space for the ecosystem: money or projects.
  - Fourth, reimbursement - if you want it, or if you want to watch for established projects to reimburse.
  - Fifth, about content funding, here, pledge money to noninflammatory content on these topics, it’ll just show up as being available; easy.

