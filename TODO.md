# To Do

## Main list

- Address TODOs in docs/common-sense-majority/vision-and-strategy/README.md and docs/common-sense-majority/vision-and-strategy/faq.md

- Thought that I'd like to explore for Tally: some notion of private beliefs?
  - Possibly a whole privacy slider:
    - Completely private: don't put them onchain or on IPFS, just store them locally in localStorage or whatever (or in IPFS but encrypted using your Ethereum account's private key?).
    - Anonymized: record onchain but associated not with your plaintext Ethereum address but rather with an anonymized ID derived from your Ethereum address. (So now people can see that there's *someone* who holds these beliefs, but they can't see who)
    - Or just publish with your address in the open.
    - Then add the ability to link geography: "I'm roughly in this area." So now people can see that there's someone in this neighbourhood with those beliefs.
  - That's starting to be an interesting product: you put in your beliefs privately, and enter your location privately (not publishing it), and then you see that there's 100 other people in your neighbourhood that agree on these 17 of your private statements; maybe at that point you might be willing to say "sure, since there are already so many of us, go ahead and publish my beliefs, anonymized, with my neighbourhood listed," or even just make them public.

- Bridge-creator / mediator follow-up (from the mediator doc and looking at what's actually implemented):
  - **Prompts as open files.** The current implementation buries the AI prompts as inline strings inside `bridge-creator/src/nudger.ts`. The transparency layer requires that the prompts be readable without understanding the code — move them to standalone text/markdown files in `bridge-creator/prompts/` (compatibility analysis, modified-statement generation, commonality-statement generation). The code can then read them from disk.
  - **Curated statement list as open data.** The mediator doc says the curated list of anchor statements should be open and inspectable. Right now it's loaded from a comma-separated env var (`BRIDGE_CREATOR_COMMONALITY_STATEMENTS`), which is neither versioned nor readable. Move it to a committed file (e.g. `bridge-creator/data/curated-statements.txt` or `.json`) so it's in GitHub and easy to fork.
  - **CSM-specific knowledge in the prompts.** The current prompts are generic ("left" / "right" with no domain knowledge). The spec says the mediator "has ideas about what reasonable common ground might look like on each issue." The prompts should be rewritten to encode actual CSM-specific strategies: what the known bridgeable issues are, what moderate-left and moderate-right look like in practice, and what kinds of commonality statements the system is aiming for (see the abortion example in bridge-creator.md).
  - **Use popularity signals.** The mediator doc says "the mediator knows how popular each one is and can use that signal." The current implementation calls `getAllStatements({ limit: 20 })` with no support-count awareness. It should prefer popular statements (high support count on their respective side) when choosing candidates to bridge.
  - **Self-host documentation.** The nudger README promises a "self-host layer" where someone can run the nudger locally against their own LLM. There's no documentation for how to do this. Add a `bridge-creator/README.md` that explains: what the prompts are, what the curated data is, and how to point it at a local LLM for fully local operation.
  - **`/.well-known/nudger.json` endpoint.** The nudger README notes that a richer Settings "add nudger" flow — one that fetches `/.well-known/nudger.json` to display the nudger's name and description — is "still to be built." This is part of the trust-layer UX.
  - **Duplicate config functions.** `bridge-creator/src/config.ts` has two separate config loaders (`loadConfig` and `loadConfigFromEnv`) that are slightly inconsistent (different env var names). Clean this up — one loader with consistent env var names.

- Go through all nine domains. Make sure they all make sense: not too complex (trying to do too many things at once; should really split some off), but not too simple (doesn't really make sense for it to be an independent domain).

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
