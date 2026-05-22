# To Do

## Main list


- Bridge-creator / CSM mediator: see [specs/product/bridge-creator.md](specs/product/bridge-creator.md). Bridge-creator package is complete; remaining work is CSM beat-agent stand-up, Civility-agent context source adapter, feeding signing outcomes into anchor reflection, and end-to-end rehearsal.

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary?

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. (I've just done a fresh local-deployment using `./scripts/data.sh --seed=demo`, so no need to do that again.) Put the notes in `workflow/reviews/before-testnet.md`.

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- DNS / ENS / IPNS setup for testnet UIs. Pipeline is now: pin to IPFS via Pinata → publish a stable per-UI IPNS name via w3name → ENS contenthash and DNSLink TXT both reference that IPNS name (set once, never change). Per-deploy work is `./scripts/deploy-testnet.sh` — free, no gas, no DNS change. See [workflow/deployment.md](workflow/deployment.md) for the full setup. Remaining one-time chores:
  - Create ENS subdomain tree under `testnet.commonality.eth` on mainnet L1 (each subdomain needs the public resolver set).
  - Run `./scripts/setup-ipns-key.sh` once per UI, store the keys in `.env.secrets`.
  - Set ENS contenthashes via `./scripts/update-ens.sh`.
  - Configure CNAMEs + DNSLink TXT records on `commonality.works` subdomains.
  - Bake `VITE_*_URL` vars into the testnet build pointing at the `*.testnet.commonality.works` subdomains.

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
