# TODO

## Main list

- Make sure the seed content gets into the fake universe simulation.

- Add Admin tabs to the UI.

- In general, I want to do more testing on the whole ecosystem of attesters and finders and nudgers, to make sure it all seems smooth.

- Move this repo to GitHub. Switch from this TODO.md to GitHub issues. Add a "post a GitHub issue" button in the UI.

- Get DNS names and ENS names.

- Do another smart-contract audit pass.
  - First: which smart contracts are scary? IIRC the main one that was complicated was DelegatableNotes. Is that still true?
  - 

- (Not a task for AI.) Try out the UI manually.
- (Not a task for AI.) Do a big code review myself. I don't trust it.

- Keep working on [memes](specs/product/memes.md).
- Work on the [elevator pitch](docs/common-sense-majority/vision-and-strategy/elevator-pitch.md) for Common Sense Majority.
- Have AI generate some YouTube videos and podcasts and so on. Marketing, social media presence, etc.

- Try having an AI read *only* the docs and see whether the project makes sense. Prompt: "Read BLINDFOLDED.md and whatever files it tells you to read, nothing else. Then take a look at the UI and see if you can figure out what this app is for. Does it all make sense? Could you help a new user understand what it's for, what he might want to use it for, and how to get started? How could the new-user experience be improved?"
- Point an AI at the UI and tell it "go use this."
- Similar: "Go try to break the thing. You are a really good tester. Be adversarial."
- We'll need a lot more AI underlings, with good documentation, following all the pathways, trying all the things.

- Using `cofounder` skill: Are we ready to launch?

## Out of scope for the MVP, but worth remembering

- [Bridges](specs/tech/bridges.md) to tradfi.

## Suggestions from AI

- Add a lightweight CI/developer smoke check for `render.yaml` plus the indexer’s hosted env shape, so future changes do not silently break the Render blueprint while local Docker still works.

- Improve UI test coverage across all UI surfaces. Current state: the UI already has substantial Vitest coverage for many Commonality pages/components and Playwright coverage for the main Commonality flows (wallet connection, statement creation, belief expression, profile, pubstarter, delegation, Subjectiv/funding-portal, and a content-funding creation/browse flow), plus light domain route tests for the four branded landing pages. It is not yet reasonably complete across every user-facing surface. To get there:
  - Add a cross-domain smoke suite that runs the app with each `VITE_DOMAIN` (`commonality`, `content-funding`, `noninflammatory`, `movement`) and verifies the landing page, primary nav, secondary nav, footer copy, and absence of out-of-domain navigation/features.
  - Add Playwright smoke coverage for the deployed routing modes: normal browser routing and IPFS/hash routing, ideally against `npm run build:domains` and `npm run build:ipfs:domains` artifacts rather than only the default dev server.
  - Add mobile/responsive AppShell tests: drawer open/close, primary and secondary navigation in the drawer, selected-state behavior, and no layout-breaking navigation labels across the four domain shells. (Desktop "More" menu behavior already covered.)
  - Add direct tests for shared shell/infrastructure surfaces that are currently only incidentally covered: ~~`AppShell`~~ (done: 18 tests), ~~`AddressDisplay`~~ (done: 9 tests), ~~`DocsPage`~~ (done: 15 tests), `PrivyWalletButtonImpl` / embedded-wallet mode (already has tests), and top-level route composition around `App`.
  - Expand domain-wrapper tests beyond each landing page and one creators page: for Content Funding, Noninflammatory Content, and Common Sense Majority, cover branded browse, channel, create-contract, dashboard, contract-detail, and movement project wrapper copy/link behavior where those wrappers exist.
  - ~~Expand content-funding UI coverage: `BrowseCreatorsPage`~~ (done: 15 tests), ~~`ChannelPage`~~ (done: 10 tests), ~~`CreatorDashboardPage`~~ (done: 10 tests), ~~`CreateContractPage`~~ (already had 4 tests), ~~`ClaimFlowModal`~~ (done: 35 tests), ~~`ContentFundingProjectSection`~~ (done: 23 tests), claim-link sharing, verified vs unclaimed channel states, withdraw/vetoable-contract states, and platform-specific Twitter/YouTube/Substack branches.
  - Expand content-funding E2E coverage from "contract appears on browse" to the full creator/supporter loop: create a third-party contract for an unclaimed channel, share/claim the channel, verify ownership through the platform API mock, view it in the dashboard, withdraw or manage funds, and inspect attestation summaries on the resulting contract.
  - ~~Expand pubstarter UI coverage for the project-detail sub-surfaces that are not directly tested: burn, refund, withdraw, secondary market, leaderboard, trade history, project header, and disconnected-wallet prompts.~~ (done: 100 tests across 8 components — BurnTokensSection, RefundSection, WithdrawSection, SecondaryMarketSection, Leaderboard, TradeHistory, ProjectHeader, ConnectWalletPrompt)
  - Expand funding-portal coverage for `AttestAlignmentForm`, `AlignedProjectCard`, trust-filter empty/loading states, leaderboard sorting/filtering, and alignment-attestation submission/display.
  - Expand delegation/mutable-ref coverage for ~~`AvailableDelegatableFunding`~~ (done: 10 tests), delegated-funds empty/error/loading states, note-detail edge cases, saved refs creation/update/delete behavior, and route-level smoke tests.
  - Expand conceptspace coverage for ~~`HighProfileSigners`~~ (done: 14 tests), Twitter handle hint rendering, Explorer personalization/error/loading states, Settings nudger metadata discovery failures, muted topic/nudger edge cases, and statement content submission states.
  - Add E2E coverage for non-default branded domains: at minimum, one smoke/navigation test per domain and one critical content-funding flow on Content Funding, one bridge-building content flow on Noninflammatory Content, and one organizing/project flow on Common Sense Majority.
  - Add accessibility-oriented assertions where cheap and useful: headings/landmarks on every route, accessible names for icon/menu/drawer buttons, focus movement for dialogs/menus/drawers, and form validation messages associated with inputs.
  - Add a lightweight coverage inventory helper or documentation section that maps each route/component surface to its Vitest and/or Playwright coverage, so future UI additions make missing test surfaces obvious.
