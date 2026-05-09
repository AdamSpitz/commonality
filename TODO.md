# To Do

## Main list

- Thought that I'd like to explore for Tally: some notion of private beliefs?
  - Possibly a whole privacy slider:
    - Completely private: don't put them onchain or on IPFS, just store them locally in localStorage or whatever (or in IPFS but encrypted using your Ethereum account's private key?).
    - Anonymized: record onchain but associated not with your plaintext Ethereum address but rather with an anonymized ID derived from your Ethereum address. (So now people can see that there's *someone* who holds these beliefs, but they can't see who)
    - Or just publish with your address in the open.
    - Then add the ability to link geography: "I'm roughly in this area." So now people can see that there's someone in this neighbourhood with those beliefs.
  - That's starting to be an interesting product: you put in your beliefs privately, and enter your location privately (not publishing it), and then you see that there's 100 other people in your neighbourhood that agree on these 17 of your private statements; maybe at that point you might be willing to say "sure, since there are already so many of us, go ahead and publish my beliefs, anonymized, with my neighbourhood listed," or even just make them public.

- In general, I want to think through the kinds of AI services we have (attesters, finders, nudgers, explorers?), especially in terms of what kinds of trust they require, and who runs them and how. We already have lots of docs/specs on this, but is there a specific file in the docs or specs that's specifically about that?
  - The specific thought in my head (that want to think through, or add, or make sure it's there, or something), is something like:
    - The list of the particular nudgers/explorers you trust doesn't need to be onchain info; it isn't like the implication attesters where you're *not* necessarily vetting and approving each individual implication... although come to think of it I did have that idea and it's not a bad idea, in the sense that the implication nudger nudges you to sign better/more-popular statements that are implied by the statements you've signed... but still, many won't bother to do that and it's still useful to see "here's the number of people who indirectly support S (assuming you trust this set of implication attesters that you trust)"... still, yeah, it wouldn't be the worst idea to give you a way to affirm (just attest yourself) those implications, although honestly maybe that's not a great idea.
      - Anyway, yeah, the nudgers are ephemeral; they make suggestions but then you sign some of the statements it suggests and that's what matters, it doesn't matter where the suggestion came from.
      - So, among other things, the thing where you configure which nudgers you want to hear from... that doesn't need to be any sort of onchain/open data (although that can be an option, because others might be interested to know that you're listening to that nudger). You could just point your openclaw or claude at the nudger's prompt/skill and say "make some suggestions to me", all completely offline and private.
    - The CSM nudger/explorer is going to have some idea of how it's trying to bring the two sides together and what statements it's steering them towards. (Which can be evolving over time, both in terms of static strategies and in terms of dynamic content; this doesn't need to be immutable, and it shouldn't be, because (a) my initial ideas of the strategies will be flawed and incomplete, and (b) the opinion landscape will be evolving.) So it's got some static strategies and also a list of statements (with CIDs, though that's not really relevant except as a concise pointer; it's essentially a list of text statements, except that the fact that they're on Tally means we can look up how popular each one is). It's basically a peacemaker/mediator/negotiator, with particular ideas about how it's going to bring the two sides together. Nobody needs to listen to it at all, and even the people who are listening to it don't need to take its particular suggestions. But a user can decide, "Sure, I'm willing to listen to that one; I think of myself as a reasonable person, and if you're telling me that the other side has a lot of reasonable people too then I'd like to believe that and I'm willing to listen... maybe not to them, I doubt I'll be able to stomach listening to them, but I'll listen to this peacemaker who knows what they think and knows what I think and can find potential areas of common ground and can suggest noninflammatory content that I'll be able to read without getting pissed off."
      - So maybe what I'm trying to get at is that the user has an interesting mix of motivations:
        - He wants peace, civility, sanity. That's why he's engaging with this system at all.
        - He's (probably grudgingly) willing to listen to the other side's POV, as long as it's presented in a way that won't piss him off. (He'll listen to his AI agent who understands his POV and also the other side's POV; he'll read content that's been deemed noninflammatory by an agent along those lines; he's not going to just go dive into the depths of the other side's bullshit. "My agent will talk to your agent.")
        - He wants his POV to be seen by the other side. (His listening to the nudger doesn't directly affect whether the other side sees his POV - it's not like the nudger is telling Alice "Bob's POV is statement S." But the nudger is looking at the space of statements in this area, and part of what it's trying to do is find the popular sane/moderate/reasonable/sensible statements on each side and look for ways in which they overlap or at least can be nudged into overlap. So if Bob has a take on this issue that's sane/moderate/reasonable/sensible, he has an incentive to get that written up and popularized on his side, so that it'll be shown to the other side. If it's not sane enough the nudger won't be able to find common ground and so it won't bother; if it's not popular enough the nudger probably won't bother because it's trying to build numbers.)

- Do another smart-contract audit pass (with AI assistance, but I do want to look at the stuff myself).
  - First: which smart contracts are scary?

- skills: cofounder, noninteractive-assistant: Do a big high-level test of the whole project. (I've just done a fresh local-deployment using `./scripts/data.sh --seed=demo`, so no need to do that again.) Put the notes in `workflow/reviews/before-testnet.md`.

- A way of using the CSM nudger that I think might be useful: "Here's me, here's my friend, nudge us both towards common ground." (The point is that this might be something more people are interested in than simply "nudge me towards Abstract Moderate Left-Wing Average".) The nudger will probably still do this with the understanding that the common [patterns of finding common ground](specs/tech/subsystems/conceptspace/content-patterns/hidden-majority.md) still apply and the widely-held common-ground beliefs are still probably good ones to aim for; unless these two people are very idiosyncratic, the normal patterns will probably work for them. But I doubt that most people are as interested in "nudge me towards the other side" as they are in "help me repair my relationship with my friend."


- Implement [beat agents](specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md).

- Add Admin tabs to the UI. (What goes in it? And how do we get the UI to know that an admin is looking at it?)

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Register a single domain name (e.g. `commonality.xyz`) and set up subdomain-per-UI static hosting for testnet (e.g. `alignment.testnet.commonality.xyz`, `pubstarter.testnet.commonality.xyz`, etc.). No IPFS or ENS needed for testnet — just deploy the nine `dist/` directories to a static host (Render static sites, Netlify, etc.), configure DNS subdomains, and bake the `VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, `VITE_ALIGNMENT_URL`, `VITE_DELEGATION_URL`, `VITE_TALLY_URL`, `VITE_CONTENT_FUNDING_URL`, `VITE_NONINFLAMMATORY_URL`, `VITE_CSM_URL`, and `VITE_CONCEPTSPACE_URL` env vars into the testnet build so cross-domain links resolve correctly. (For mainnet, register separate ENS names per domain so they're more independent.)

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read workflow/BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Using `cofounder` skill: Are we ready to launch?

## Before testnet

Manual setup and non-code decisions before the first public/shared testnet deployment:

- Accounts, keys, and funds
  - [ ] Create separate wallets/private keys for each role that submits transactions: deployer, implication attester, content attester, worker/nudger roles (`IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY`, `BRIDGE_CREATOR_PRIVATE_KEY`, `EXPLORER_CURATOR_PRIVATE_KEY`), platform/channel verifier, and any payment-recipient/service-owner addresses. Store them in a password manager; do not reuse a personal wallet key in Render.
  - [ ] Get enough testnet ETH from faucets for every transaction-sending wallet, especially the deployer and service wallets. If using Base Sepolia, bridge/get Base Sepolia ETH rather than Ethereum Sepolia ETH.
  - [x] Decide whether the testnet deployment needs a test USDC/settlement token for content funding. **Decision: use USDZZZ (FreeERC20), already deployed by `deploy.js` alongside all other contracts. Address persisted in `deployments/base-sepolia.env` after first deploy.**

- External services and secrets
  - [ ] Move/connect the repo to GitHub so Render Blueprint deploys can be connected to it.
  - [ ] Create/configure a Render account for the testnet blueprint and decide service names/URLs (indexer, attester host, worker host, platform API).
  - [ ] Create an RPC provider account/API key (Alchemy, Infura, etc.) for the chosen chain; public RPC may be too flaky for the indexer.
  - [ ] Create an OpenRouter API key for AI services.
  - [ ] Create a WalletConnect Cloud project and record `VITE_WALLETCONNECT_PROJECT_ID`.
  - [x] Decide whether to enable Privy embedded-wallet onboarding for testnet. **Decision: no — wallet-only (ConnectKit/WalletConnect) for testnet. Privy can be added for mainnet.**
  - [x] Decide which platform integrations are enabled for first testnet. **Decision: Twitter/X and YouTube verification disabled for testnet. No `X_API_BEARER_TOKEN` or `YOUTUBE_API_KEY` needed.**
  - [ ] IPFS pinning required for app content (statements, project metadata). **Decision: yes, use Pinata. Create a Pinata account and JWT — needed before testnet launch.**

- Names, hosting, and public URLs
  - [ ] Choose and register a domain for testnet. Common options like `commonality.xyz/app/org/works` are all taken — need to find an available variant. Then decide subdomain scheme (e.g. `alignment.testnet.<domain>`, `pubstarter.testnet.<domain>`, etc.).
  - [x] Decide testnet UI hosting strategy. **Decision: IPFS for UI content (same as mainnet), with a Render web service acting as reverse proxy (stable subdomain URLs → Pinata-pinned CIDs). No ENS needed for testnet — proxy holds the stable URLs. Based on `scripts/local-ui-gateway.mjs`; needs a testnet variant that reads CIDs from a config/Pinata and proxies to a public IPFS gateway.**
  - [ ] Build testnet UI gateway: adapt `scripts/local-ui-gateway.mjs` into a Render web service that proxies `<domain>.testnet.commonality.xyz` → Pinata-pinned CIDs via a public IPFS gateway. CIDs stored in a committed config file (updated on each UI deploy).
  - [ ] Decide final public URLs for each service and UI domain, then bake/configure cross-domain UI URLs (`VITE_COMMONALITY_URL`, `VITE_PUBSTARTER_URL`, etc.), `EVENT_CACHE_URL`, `VITE_PLATFORM_API_URL`, `CLAIM_PAGE_BASE_URL`, and `CORS_ALLOWED_ORIGINS`.

- Deployment-time operational decisions
  - [x] Decide whether Render `autoDeploy: true` is acceptable for first testnet. **Decision: yes, autoDeploy is fine for testnet.**
  - [ ] Decide and configure initial content-attester policy: `ALIGNMENT_TOPIC_STATEMENT_CID`, `CONTENT_ATTESTER_NAME`, and `CONTENT_ATTESTER_PROMPT_TEMPLATE`. (Requires knowing what statement you want the attester to evaluate alignment against.)
  - [ ] Generate/share finder trust secrets (`*_TRUSTED_FINDER_KEY` and matching finder keys) between worker and attester services.
  - [x] Decide initial content-funding economics. **Decision: settlement token = USDZZZ, `thirdPartyMinPurchase` = 10 USDZZZ (10_000_000 in 6-decimal units), `thirdPartyMaxDuration` = 7 days (default).**
  - [x] Decide whether the platform API should submit on-chain channel-verification transactions on testnet. **Decision: yes, `SUBMIT_VERIFICATION_TX=true`. Deployer wallet is already set as trusted verifier by `deploy.js`. Dormant in practice since Twitter/YouTube integrations are disabled for testnet.**
  - [x] Decide minimal monitoring for testnet. **Decision: Render logs only. No Sentry for testnet.**

## After MVP

- Read [mvp.md](specs/product/mvp.md) and do the stuff that comes after.
