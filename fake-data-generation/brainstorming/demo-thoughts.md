# Thinking about demoing this

First we did [initial brainstorming](./initial-brainstorming.md).

Then we did the [first draft of the campaign](./network-societies-campaign-plan.md).

I think the next step is to put a bit more attention to the details of how I'd show this to various people.


## Who is doing the demoing?

Commonality-the-org is [intentionally](/specs/decisions/0008-operated-surfaces-are-lenses.md) not recommending particular causes to the general public; it's meant to be neutral infrastructure. (The point isn't "Adam has no opinions", but "Adam has built Commonality in such a way that it doesn't play favourites - you can use it for whatever you want (as long as it's legal)".) But in my capacity as an individual (or some sort of separate org), I can demo or send a link to someone in particular, or post videos, or generally use the system in more-opinionated ways.

In that capacity I'm probably not so much promoting Commonality directly, but rather promoting some particular cause. We try to make it clear that these are separate and that the general-purpose Commonality infrastructure really is neutral.

So there are two kinds of activities here:
  - Commonality improving the site in a generic way
  - Adam (or whatever this separate org is, I should really give it a name) making content
    - But, importantly, it may be that I'll need to use this org (rather than Commonality) to make videos intended for the general public. Although I guess for basic docs I can just make very mild noncontroversial content; for that purpose, it doesn't really matter if the examples aren't particularly compelling.

## Different kinds of demos

I think there are a few categories:
  - Demoing in person. (Targeted, and I'm in control of the demo.)
  - Sending a link to someone in particular. (Targeted, but I'm not in control.)
  - Showing scripted videos to the general public. (I'm in control of the video; it's not targeted at a particular person, but still need to use compelling content, which probably means opinionated content.)
  - Making the site more usable to the general public. (Not targeted, not in control.)

I'm not saying those are all equally important right now, I'm just trying to get this clear in my head.

### Demoing in person

I want to show this system to my friends (or other particular people) in person, in a setting where I can walk them through it.

#### Admin page

I've got the admin page to help with this.
  - We do a fake-data run (on testnet).
  - On the main admin page, there's a link to the run-specific page.
  - On the run-specific page, there are links to various pages (users, projects, statements, bridges) relevant to each area (crypto, abortion, AI-pause, whatever).
    - So when I'm talking to a person who's interested in one of those areas, I can focus in on that.
    - And the area-specific list of stuff is designed to let me see an "ecosystem-wide" view of that area: relevant statements (and bridges), relevant projects, relevant users.
    - And because it's a fake-data run, the fake users have known keys so we can log in and see the system through their eyes.

I'll have to actually try it myself (running through demoing an area to someone to cares about it), but this seems like it could work okay, as long as the content is compelling and the fake-users illustrate different roles.

### Sending a link to someone in particular

Here the idea is that I might send a link to particular orgs or people: "Hey, here's this system that might be useful for some cause that you care about. It's been pre-populated with some statements and bridges that I think might be what you want; for fundable projects, I haven't pre-populated it, but here are some example ideas."

So I'm not walking them through it, but the page itself can be designed so that it offers guidance on how to use the system.

### Showing the general public

#### Main website

At some point we'll publish (to mainnet) the main website for the general public to use. It needs to be usable, with guidance on how to start - but only in terms of "what can I do with this system?" (e.g. what kinds of roles you could play), NOT suggested starting statements/projects/causes. I'm [intentionally](/specs/decisions/0008-operated-surfaces-are-lenses.md) not recommending particular causes to the general public.

##### "How do I get started?"

Various ways, depending on what role you're interested in:
  - Make a project
  - Make a pledge
  - Sign a (new or existing) statement
    - Make a bridge and a nudger?

Right, note that the conceptspace stuff is non-money-related and there can be actual already-existing real content there. I can pre-create it, and others can get started, without it needing to be "let me convince you to put your money into this system." But there mostly isn't any *point* to it other than "look how many people believe X", although I guess it's also useful as "here's a statement to centre your cause board around."

But if I'm gonna be starting (as an individual or as a separate org) a few "network societies" that I personally believe in, I can make that content, both for tallying signers and for alignment-attesting projects.

##### UI usability

I should be thinking about the UI, making sure it's simple for the basic use cases.


#### Demo videos for social media

Here I guess we might need some example content, but I guess we can intentionally choose very mild noncontroversial content? Those won't be compelling examples, though. Not sure what to do here.

But remember that I want to have separate orgs, even if they're both run by me initially. Like, Commonality can be neutral infrastructure, but I also have a more-opinionated org where I push particular views (including releasing demo videos - not promoting Commonality directly, but promoting some particular cause); we try to make it clear that these are separate and that the general-purpose Commonality infrastructure really is neutral.
