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


- Improve UI test coverage across all UI surfaces, and if you find bugs along the way, either fix them (if easy) or note them with a FIXME. Current state: the UI already has substantial Vitest coverage for many Commonality pages/components and Playwright coverage for the main Commonality flows (wallet connection, statement creation, belief expression, profile, pubstarter, delegation, Subjectiv/funding-portal, and a content-funding creation/browse flow), plus light domain route tests for the four branded landing pages. It is not yet reasonably complete across every user-facing surface. To get there:
  - First, here are some general instructions for future AI UI-test work:
    - Before adding tests, read the component and one nearby existing test file. Match local patterns, but do not copy weak assertions just because they pass.
    - Every test should fail for a meaningful regression. If deleting the important line of component logic would not fail the test, the test is probably too weak.
    - Avoid conditional assertions. A test that can pass without exercising the thing named in its title should be rewritten.
    - Prefer Testing Library queries by role/name/label over DOM selectors. Use `querySelector` only when no accessible query can express the behavior.
    - Keep mocks realistic enough to protect contracts: assert important SDK calls, route targets, payloads, error paths, and loading/success states, not just rendered text.
    - When a test exposes an existing bug, do not encode the bug as expected behavior. Note the bug, fix it if in scope, or leave an explicit TODO instead of marking the surface complete.
    - When marking TODO items done, check whether the original gap is genuinely covered. Do not mark a broad area complete after only covering the easiest branch.
    - Before marking broad UI-test work done, run the relevant targeted tests and also the full `npm run test:vitest --workspace=ui` suite. A test that only passes in isolation but times out or flakes in the full suite is not done.
    - Keep `TODO.md` and `ui/test-plan.md` consistent in the same commit. If one says a coverage gap is done and the other still lists it as a known gap, the task is not finished.
    - Do not count shallow smoke assertions as deep coverage. Tests like "renders a main element", "has non-empty routes", or "brand text length > 0" can be useful smoke checks, but they should not justify crossing off workflow or integration coverage.
    - When using heavy mocks around wrapper pages, describe the coverage honestly as prop/wiring/copy coverage. It does not prove the underlying user flow works.
  - Second, here's a list of remaining work to do:
    - Fix `ui/src/App.test.tsx`: `npm run test:vitest --workspace=ui` currently fails because `App route composition > renders in browser mode` times out in the full suite, even though the App tests pass when run in a smaller targeted set. Make the App routing tests cheaper and deterministic, or split the expensive integration-ish checks into a better harness.
    - Reconcile `ui/test-plan.md` with this TODO list. It still lists the cross-domain smoke suite and domain-wrapper depth as known gaps even though this TODO marks them done. Update the inventory to say what is actually covered, and keep any remaining limitations explicit.
    - Review the recently added cross-domain smoke tests and strengthen or relabel the low-signal assertions. Manifest shape checks and React-element route introspection are fine as smoke coverage, but add assertions that would fail on real domain-navigation regressions before treating the area as meaningfully covered.
    - Review the recently added domain-wrapper tests and make sure the TODO wording does not imply deeper integration coverage than exists. Most of those tests mock the underlying content-funding/pubstarter pages, so they mainly cover wrapper copy and prop wiring.
    - ~~Add a cross-domain smoke suite that runs the app with each `VITE_DOMAIN` (`commonality`, `content-funding`, `noninflammatory`, `movement`) and verifies the landing page, primary nav, secondary nav, footer copy, and absence of out-of-domain navigation/features.~~ (done: 94 tests — manifest structure, nav integrity, feature flag matrix, route coverage, landing page rendering, out-of-domain absence, shared route consistency)
    - Add Playwright smoke coverage for the deployed routing modes: normal browser routing and IPFS/hash routing, ideally against `npm run build:domains` and `npm run build:ipfs:domains` artifacts rather than only the default dev server.
    - ~~Add mobile/responsive AppShell tests: drawer open/close, primary and secondary navigation in the drawer, selected-state behavior, and no layout-breaking navigation labels across the four domain shells. (Desktop "More" menu behavior already covered.)~~ (done: 32 tests total — 18 desktop + 14 mobile covering hamburger button, drawer open/close, primary/secondary nav in drawer, selected-state behavior, custom branding/navigation, wallet button)
    - ~~Add direct tests for shared shell/infrastructure surfaces that are currently only incidentally covered:~~ `AppShell` (done: 18 tests), `AddressDisplay` (done: 9 tests), `DocsPage` (done: 13 tests), `PrivyWalletButtonImpl` / embedded-wallet mode (already has tests), and ~~top-level route composition around `App`~~ (done: 16 tests — browser/hash/ipfs routing modes, domain branding passthrough for all 4 domains, primary navigation rendering, footer text, wallet button, children rendering).
    - ~~Expand domain-wrapper tests beyond each landing page and one creators page: for Content Funding, Noninflammatory Content, and Common Sense Majority, cover branded browse, channel, create-contract, dashboard, contract-detail, and movement project wrapper copy/link behavior where those wrappers exist.~~ (done: 75 tests — 14 content-funding, 23 noninflammatory, 38 movement)
    - ~~Expand content-funding UI coverage: `BrowseCreatorsPage`~~ (done: 15 tests), ~~`ChannelPage`~~ (done: 10 tests), ~~`CreatorDashboardPage`~~ (done: 10 tests), ~~`CreateContractPage`~~ (already had 4 tests), ~~`ClaimFlowModal`~~ (done: 35 tests), ~~`ContentFundingProjectSection`~~ (done: 23 tests), claim-link sharing, verified vs unclaimed channel states, withdraw/vetoable-contract states, and platform-specific Twitter/YouTube/Substack branches.
    - Expand content-funding E2E coverage from "contract appears on browse" to the full creator/supporter loop: create a third-party contract for an unclaimed channel, share/claim the channel, verify ownership through the platform API mock, view it in the dashboard, withdraw or manage funds, and inspect attestation summaries on the resulting contract.
    - ~~Expand pubstarter UI coverage for the project-detail sub-surfaces that are not directly tested: burn, refund, withdraw, secondary market, leaderboard, trade history, project header, and disconnected-wallet prompts.~~ (done: 100 tests across 8 components — BurnTokensSection, RefundSection, WithdrawSection, SecondaryMarketSection, Leaderboard, TradeHistory, ProjectHeader, ConnectWalletPrompt)
    - Expand funding-portal coverage for ~~`AttestAlignmentForm`~~ (done: 18 tests), ~~`AlignedProjectCard`~~ (done: 19 tests), trust-filter empty/loading states, leaderboard sorting/filtering, and alignment-attestation submission/display.
    - Expand delegation/mutable-ref coverage for ~~`AvailableDelegatableFunding`~~ (done: 10 tests), delegated-funds empty/error/loading states, note-detail edge cases, saved refs creation/update/delete behavior, and route-level smoke tests.
    - Expand conceptspace coverage for ~~`HighProfileSigners`~~ (done: 14 tests), Twitter handle hint rendering, Explorer personalization/error/loading states, Settings nudger metadata discovery failures, muted topic/nudger edge cases, and statement content submission states.
    - Add E2E coverage for non-default branded domains: at minimum, one smoke/navigation test per domain and one critical content-funding flow on Content Funding, one bridge-building content flow on Noninflammatory Content, and one organizing/project flow on Common Sense Majority.
    - Add accessibility-oriented assertions where cheap and useful: headings/landmarks on every route, accessible names for icon/menu/drawer buttons, focus movement for dialogs/menus/drawers, and form validation messages associated with inputs.
    - Add a lightweight coverage inventory helper or documentation section that maps each route/component surface to its Vitest and/or Playwright coverage, so future UI additions make missing test surfaces obvious.
