# Civility policy surface inventory

Status: executable inventory for the starter-profile stopping gate (Aug 2026).

This inventory bounds the claim that Civility has no known policy bypass. It covers content subjects exposed by Civility's operator-controlled public routes. Static editorial pages, documentation, contract writes, claims, payouts, and gas sponsorship are outside the content-only policy-list scope. The neutral pointer/event index remains readable; it contains identifiers rather than PublishedData bytes and is not an operator content-serving surface.

The machine-readable companion is [`/verifier/coverage/civility-policy-surfaces.json`](/verifier/coverage/civility-policy-surfaces.json). `functionality.civility-policy-surfaces` checks that the route and enforcement markers below remain present, and that every Civility route is classified here.

| Public surface | Content operation | Required policy action / boundary | Current enforcement | Focused coverage |
|---|---|---|---|---|
| `/content` | Channel discovery and cards | `suppress`; metadata preflight | Shared content-funding loader builds a render-filtered topology before metadata or attestation retrieval | `contentPolicy.test.ts`, `displayDenylist.test.ts` |
| `/content/:platform` | Browse cards, totals, activity ranking | `suppress` and independently `exclude-aggregation` | Render and aggregation topologies are filtered separately | `contentPolicy.test.ts`, browse page tests |
| `/content/:platform/:channelId` | Channel, contracts, content items, totals | `suppress` and independently `exclude-aggregation`; metadata preflight | The channel page consumes only the two filtered topologies; auxiliary reads enumerate visible contracts | `contentPolicy.test.ts`, `ChannelPage.test.tsx` |
| `/content/dashboard` | Creator contracts and balances | `suppress` for displayed content | Dashboard consumes the render-filtered topology | `CreatorDashboardPage.test.tsx` |
| `/content/contracts/:projectAddress` | Direct project deep link, project/token metadata | `suppress` before mounting a generic metadata reader | Civility wrapper requires the address to survive the render-filtered topology; all CID reads use the policy gateway | `domains/civility/ContentPages.test.tsx`, `lazy-giving/metadata.test.ts` |
| `/content/:platform/:channelId/new` | Contract creation | No policy screening of writes or money; existing channel context comes from the filtered topology | Deliberately outside action enforcement for submitted/written data | `CreateContractPage.test.tsx` |
| Platform API `/policy-content/:cid` | CID byte serving for all Civility readers | `refuse-serve`, fail closed on cold start, digest/status headers | Generic serving adapter evaluates one activated snapshot before upstream retrieval | `platform-api-service/src/app.test.ts`, `sdk/src/policy-lists/serving.test.ts` |
| Platform API `/resolve/channel` | Third-party channel display metadata | No PublishedData/CID bytes; response is an operator-mediated identity lookup | Only called after the complete channel/project identity survives `suppress`; it is not an alternate CID gateway | `useContentFundingState.test.ts`, platform API resolver tests |
| Shared Ponder GraphQL/events | Pointer and funding state | Not a byte-serving endpoint; pointers are filtered before Civility display and aggregation | Neutral shared feed stays readable by design | `contentPolicy.test.ts`, SDK content-funding tests |

The remaining operational gate is to publish the resolved bundle, configure the same bundle URL for the Civility UI and platform API, deploy them, and prove their reported digests agree. This inventory does not turn local/source coverage into a deployed-enforcement claim.
