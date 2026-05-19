# To Do

## Main list

- Consider [volunteer-discovery](specs/product/volunteer-discovery.md): linking out to existing volunteer/activity platforms (Discord, Meetup, GitHub, Open Collective, etc.) as a "where's the energy?" navigational signal at the cause+location level. Not committed — just a sketch of how we might address the "who's gonna actually work on these projects?" gap without building a volunteer subsystem.

- Idea to incorporate into the docs (for CSM?): two kinds of "reclaiming the commons": credible neutrality (infrastructure is apolitical, it just verifiably works) and quiet middle majority (political, we're forming a new sane group in the middle).


- Thought that I'd like to explore for Tally: some notion of private beliefs?
  - Possibly a whole privacy slider:
    - Completely private: don't put them onchain or on IPFS, just store them locally in localStorage or whatever (or in IPFS but encrypted using your Ethereum account's private key?).
    - Anonymized: record onchain but associated not with your plaintext Ethereum address but rather with an anonymized ID derived from your Ethereum address. (So now people can see that there's *someone* who holds these beliefs, but they can't see who)
    - Or just publish with your address in the open.
    - Then add the ability to link geography: "I'm roughly in this area." So now people can see that there's someone in this neighbourhood with those beliefs.
  - That's starting to be an interesting product: you put in your beliefs privately, and enter your location privately (not publishing it), and then you see that there's 100 other people in your neighbourhood that agree on these 17 of your private statements; maybe at that point you might be willing to say "sure, since there are already so many of us, go ahead and publish my beliefs, anonymized, with my neighbourhood listed," or even just make them public.

- Bridge-creator / CSM mediator redesign: see [specs/product/bridge-creator-redesign.md](specs/product/bridge-creator-redesign.md). Substantial chunk of work — replaces what was a list of patches with a redesign around a CSM beat agent that consumes a Civility beat agent's summary, an LLM-managed live anchor set, and a thin synthesizer-only bridge-creator.

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary?

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. (I've just done a fresh local-deployment using `./scripts/data.sh --seed=demo`, so no need to do that again.) Put the notes in `workflow/reviews/before-testnet.md`.

- A way of using the CSM nudger that I think might be useful: "Here's me, here's my friend, nudge us both towards common ground." (The point is that this might be something more people are interested in than simply "nudge me towards Abstract Moderate Left-Wing Average".) The nudger will probably still do this with the understanding that the common [patterns of finding common ground](specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md) still apply and the widely-held common-ground beliefs are still probably good ones to aim for; unless these two people are very idiosyncratic, the normal patterns will probably work for them. But I doubt that most people are as interested in "nudge me towards the other side" as they are in "help me repair my relationship with my friend."


- [x] Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md). ✅ All 10 implementation-plan steps complete: service boundary, schemas, platform local-context, beat ingestion, context memory, attester mode, finder mode, service-host integration, UI/settings (trusted attester identities with beat-agent vs content-attester distinction, coverage-gap indicators, trusted-only filtering), overlapping-docs reconciliation, and first-pass adversarial hardening (prompt boundaries, source-diversity/time-span weighting, citation metadata).

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- We've registered a DNS name `commonality.works`, as well as an ENS name `commonality.eth`. Next: set up subdomain-per-UI static hosting for testnet (e.g. `alignment.testnet.commonality.works`, `pubstarter.testnet.commonality.works`, etc.). No IPFS or ENS needed for testnet (although we could if we wanted to, and I'm kinda tempted to) — just deploy the nine `dist/` directories to a static host (Render static sites, Netlify, etc.), configure DNS subdomains, and bake the `VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, `VITE_ALIGNMENT_URL`, `VITE_DELEGATION_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, and `VITE_CONCEPTSPACE_URL` env vars into the testnet build so cross-domain links resolve correctly. (For mainnet, register separate ENS names per domain so they're more independent.)

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Act as an end user, take a look at the UI, and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Using `cofounder` skill: Are we ready to launch?

## Before testnet

See [testnet-prep.md](./testnet-prep.md).

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
