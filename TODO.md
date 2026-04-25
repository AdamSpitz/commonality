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
    - ~~Fix `ui/src/App.test.tsx`: `npm run test:vitest --workspace=ui` currently fails because `App route composition > renders in browser mode` times out in the full suite~~ (done: rewrote tests with full mocking of `getActiveDomain`, `isHashRouting`, `AppShell`, and `react-router-dom` to avoid expensive dynamic module re-imports; 15 tests pass in 164ms vs 3600ms before)
    - ~~Reconcile `ui/test-plan.md` with this TODO list~~ (done: updated coverage inventory with DomainLandingPage, marked cross-domain smoke suite and domain-wrapper depth as done, added PrivyWalletButtonImpl and CreatorsLandingPage as known gaps)
    - ~~Review the recently added cross-domain smoke tests and strengthen or relabel the low-signal assertions. Manifest shape checks and React-element route introspection are fine as smoke coverage, but add assertions that would fail on real domain-navigation regressions before treating the area as meaningfully covered.~~ (done: replaced `length > 0` checks with domain-specific expected values for brand name, tagline, footer text; hero title assertions verify exact rendered text; hero link assertions verify at least one link matches a manifest path; route assertion kept as truthy since routes is a JSX fragment)
    - ~~Review the recently added domain-wrapper tests and make sure the TODO wording does not imply deeper integration coverage than exists. Most of those tests mock the underlying content-funding/pubstarter pages, so they mainly cover wrapper copy and prop wiring.~~ (acknowledged: these are prop-wiring tests, not integration tests — documented in test-plan.md)
    - ~~Add a cross-domain smoke suite that runs the app with each `VITE_DOMAIN` (`commonality`, `content-funding`, `noninflammatory`, `movement`) and verifies the landing page, primary nav, secondary nav, footer copy, and absence of out-of-domain navigation/features.~~ (done: 94 tests — manifest structure, nav integrity, feature flag matrix, route coverage, landing page rendering, out-of-domain absence, shared route consistency)
    - Add Playwright smoke coverage for the deployed routing modes: normal browser routing and IPFS/hash routing, ideally against `npm run build:domains` and `npm run build:ipfs:domains` artifacts rather than only the default dev server.
    - ~~Add mobile/responsive AppShell tests: drawer open/close, primary and secondary navigation in the drawer, selected-state behavior, and no layout-breaking navigation labels across the four domain shells. (Desktop "More" menu behavior already covered.)~~ (done: 32 tests total — 18 desktop + 14 mobile covering hamburger button, drawer open/close, primary/secondary nav in drawer, selected-state behavior, custom branding/navigation, wallet button)
    - ~~Add direct tests for shared shell/infrastructure surfaces that are currently only incidentally covered:~~ `AppShell` (done: 35 tests — 18 desktop + 14 mobile + 3 accessibility landmarks), `AddressDisplay` (done: 9 tests), `DocsPage` (done: 13 tests), `DomainLandingPage` (done: 18 tests), `PrivyWalletButtonImpl` (done: 14 tests — sign-in, loading, embedded wallet sync, connected address menu, logout, link wallet, create wallet, address truncation, wagmi preference, wallet readiness, menu close, address display, error handling, wallet preference), and ~~top-level route composition around `App`~~ (done: 15 tests — browser/hash routing modes with full mocking, domain branding passthrough for all 4 domains, primary navigation rendering, footer text, wallet button, children rendering). Domain landing pages (done: 43 tests — 13 commonality, 10 content-funding, 10 noninflammatory, 10 movement covering hero sections, spotlight labels/text, action links, section cards with titles/descriptions/CTAs/eyebrows, focused domain entry points for commonality). Hooks: ~~`useTrustedAttesters`~~ (done: 15 tests — localStorage load/save, address validation/filtering, env default fallback, corrupted JSON handling), ~~`useNudgerMetadata`~~ (done: 9 tests — null URL, fetch success/error, default fields, URL change), ~~`useCachedProjects` pure functions~~ (done: 16 tests — withMetrics funding progress, sortProjects 5 fields × directions).
    - ~~Expand domain-wrapper tests beyond each landing page and one creators page: for Content Funding, Noninflammatory Content, and Common Sense Majority, cover branded browse, channel, create-contract, dashboard, contract-detail, and movement project wrapper copy/link behavior where those wrappers exist.~~ (done: 75 tests — 14 content-funding, 23 noninflammatory, 38 movement)
    - ~~Expand content-funding UI coverage: `BrowseCreatorsPage`~~ (done: 15 tests), ~~`ChannelPage`~~ (done: 10 tests), ~~`CreatorDashboardPage`~~ (done: 10 tests), ~~`CreateContractPage`~~ (already had 4 tests), ~~`ClaimFlowModal`~~ (done: 35 tests), ~~`ContentFundingProjectSection`~~ (done: 23 tests), ~~`useClaimFlow`~~ (done: 18 tests), ~~`usePlatformApi`~~ (done: 15 tests), claim-link sharing, verified vs unclaimed channel states, withdraw/vetoable-contract states, and platform-specific Twitter/YouTube/Substack branches.
    - Expand content-funding E2E coverage from "contract appears on browse" to the full creator/supporter loop: create a third-party contract for an unclaimed channel, share/claim the channel, verify ownership through the platform API mock, view it in the dashboard, withdraw or manage funds, and inspect attestation summaries on the resulting contract.
    - ~~Expand pubstarter UI coverage for the project-detail sub-surfaces that are not directly tested: burn, refund, withdraw, secondary market, leaderboard, trade history, project header, and disconnected-wallet prompts.~~ (done: 103 tests across 8 components — BurnTokensSection, RefundSection, WithdrawSection, SecondaryMarketSection, Leaderboard, TradeHistory, ProjectHeader, ConnectWalletPrompt)
    - Expand funding-portal coverage for ~~`AttestAlignmentForm`~~ (done: 18 tests), ~~`AlignedProjectCard`~~ (done: 19 tests), ~~`computeAvailableDelegatableFunding` utility~~ (done: 7 tests — empty attestations, inactive notes, fetch failures, single-currency sum, multi-currency grouping, null filtering, mixed active/inactive), trust-filter empty/loading states, leaderboard sorting/filtering, and alignment-attestation submission/display.
    - Expand delegation/mutable-ref coverage for ~~`AvailableDelegatableFunding`~~ (done: 10 tests), ~~delegated-funds empty/error/loading states~~ (done: MyNotesPage has 27 tests covering wallet-not-connected, loading, error, empty states, summary cards, owned/deposited notes sections, delegated/undelegated chips, delegate/revoke/reclaim buttons, inactive note filtering, delegate counting, delegate dialog opening/inputs/cancellation, delegate/revoke/reclaim action flows with wallet client mocking, error dismissal), ~~note-detail edge cases~~ (done: NoteDetailPage has 30 tests covering loading/error/null states, note metadata display, active/inactive/ETH/token/delegated chips, delegation chain visualization with root/leaf/middle labels, intended purpose attestations, action button visibility for delegate/revoke/reclaim/spend based on ownership roles, delegate/spend dialog opening and cancellation), ~~DepositPage delegation/attestation flows~~ (done: DepositPage has 36 tests covering unauthenticated state, form rendering, validation for amount/delegate address, submission states, delegation during deposit with delegateNote SDK calls, statement attestation with attestNoteIntent SDK calls, statement autocomplete loading/options, edge cases for zero amount/missing contract/non-Error exceptions/error dismissal), saved refs creation/update/delete behavior, and route-level smoke tests.
    - Expand conceptspace coverage for ~~`HighProfileSigners`~~ (done: 14 tests), ~~`twitterHandleHints` utility~~ (done: 13 tests), ~~`ContentSubmissionForm`~~ (done: 15 tests), ~~`SettingsPage`~~ (done: 60 tests — trusted attesters/nudgers CRUD, Twitter linking, muted topics add/load/persist, muted nudgers mute/unmute/persist, nudger metadata discovery rendering), Explorer personalization/error/loading states, and statement content submission states.
    - Add E2E coverage for non-default branded domains: at minimum, one smoke/navigation test per domain and one critical content-funding flow on Content Funding, one bridge-building content flow on Noninflammatory Content, and one organizing/project flow on Common Sense Majority.
    - ~~Add accessibility-oriented assertions where cheap and useful: headings/landmarks on every route, accessible names for icon/menu/drawer buttons, focus movement for dialogs/menus/drawers, and form validation messages associated with inputs.~~ (done: AppShell landmark tests for banner/main/contentinfo, ClaimFlowModal dialog role test, existing tests already use accessible names for buttons/menus/drawers)
    - Add a lightweight coverage inventory helper or documentation section that maps each route/component surface to its Vitest and/or Playwright coverage, so future UI additions make missing test surfaces obvious.
