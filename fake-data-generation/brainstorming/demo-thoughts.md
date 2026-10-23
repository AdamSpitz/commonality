# Thinking about demoing this

First we did [initial brainstorming](./initial-brainstorming.md).

Then we did the [first draft of the campaign](./network-societies-campaign-plan.md).

I think the next step is to put a bit more attention to the details of how I'd show this to various people.


## Different kinds of demos

I think there are a few categories:
  - Demoing in person. (Targeted, and I'm in control of the demo.)
  - Sending a link to someone in particular. (Targeted, but I'm not in control.)
  - Showing the general public. (Not targeted.)

I'm not saying those are all equally important right now, I'm just trying to get this clear in my head.

### Demoing in person

I want to show this system to my friends (or other particular people) in person, in a setting where I can walk them through it.

#### Admin page

I've got the admin page to help with this.
  - We do a fake-data run (on testnet).
  - On the main admin page, there's a link to the run-specific page.
  - On the run-specific page, there are links to area-specific pages: crypto, abortion, AI-pause, whatever.
    - So when I'm talking to a person who's interested in one of those areas, I can focus in on that.
    - And the area-specific page is designed to let me see an "ecosystem-wide" view of that area: relevant statements (and bridges), relevant projects, relevant users.
    - And because it's a fake-data run, the fake users have known keys so we can log in and see the system through their eyes.

##### Idea: reify the "area"

I wonder whether it'd be possible to make a *real* page (rather than relying on this private admin interface) for this idea of an "area"? (Needs a better name. "Cause area"? I dunno.)

The notion is that whereas a cause is meant to be something that a user can agree with, an area might have multiple overlapping or conflicting statements/causes: e.g. a "blockchain-based-payments" area might contain pro-blockchain-based-payments because pro-crypto, pro-blockchain-based-payments because tired-of-paying-credit-card-companies-three-percent, anti-blockchain-based-payments, etc. The point is that it can be interesting to see that stuff all together.

Then again, maybe not? Maybe that's just not actually that useful for demos.

And to the extent that we want to see the different "constituencies" of an [organic coalition](/docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md), that's what a bridge page is for; we already have that.



### Sending a link to someone in particular

  - Send a link to particular orgs or people, so I'm not walking them through it, but I might send them particular suggestions for statements/projects/causes to start with.

### Showing the general public

#### Main website

At some point we'll publish (to mainnet) the main website for the general public to use. It needs to be usable, with guidance on how to start - but only in terms of "what can I do with this system?" (e.g. what kinds of roles you could play), NOT suggested starting statements/projects/causes. I'm [intentionally](/specs/decisions/0008-operated-surfaces-are-lenses.md) not recommending particular causes to the general public.

##### "How do I get started?"

Various ways, depending on what role you're interested in:
  - Make a project
  - Make a pledge
  - Sign a (new or existing) statement
    - Make a bridge and a nudger?

Right, note that the conceptspace stuff is non-money-related and there can be actual already-existing real content there. I can pre-create it, and others can get started, without it needing to be "let me convince you to put your money into this system." But there mostly isn't any *point* to it other than "look how many people believe X".

##### UI usability

I should be thinking about the UI, making sure it's simple for the basic use cases.


#### Demo videos for social media

Here I guess we might need some example content, but I guess we can intentionally choose very mild noncontroversial content? Those won't be compelling examples, though. Not sure what to do here.

Maybe a better idea would be to have separate orgs, even if they're both run by me initially? Like, Commonality can be neutral infrastructure, but I also have a more-opinionated org where I push particular views (including releasing demo videos - not promoting Commonality directly, but promoting some particular cause); we try to make it clear that these are separate and that the general-purpose Commonality infrastructure really is neutral.
