# Separating Conceptspace from funding

Date: 2026-09-23. Status: analysis and recommendation, **not an approved extraction plan**. No implementation changes accompany this document.

## Recommendation

**Yes: this is a sensible boundary and a feasible extraction, but it is more than moving the directories named `conceptspace`.** The underlying statements/implications contracts are already independent of funding. The complete non-financial experience is not: UI composition, identity enrichment, publication tooling, configuration, and deployment still cross the proposed boundary.

I would create one Conceptspace repository containing a small set of packages, services, and a usable Tally application. It would own **expressing beliefs, relating statements, publishing collections of them, and helping people find wording and common ground**. Commonality would own funding mechanisms and applications that connect that substrate to money. Commonality would consume versioned Conceptspace packages; Conceptspace would not import Commonality funding packages.

The most important test of the boundary is: **can someone install, run, and use signing and mediation without deploying a funding contract, configuring a payment token, or operating the funding application?** Repository separation is valuable when the answer is yes.

This fits the existing direction in [technical UI domains](ui-domains.md#future-direction-per-vertical-repo-split-decided-2026-06-22), which already calls for independent repositories consuming published packages. That note proposes Civility first as the smallest packaging exercise. Prioritizing Conceptspace instead would be a different sequencing choice, justified by independence of the non-financial product. It is a larger first extraction. The note's assertion that the UI feature graph is nearly flat is no longer a sufficient description of the inspected code: Tally's statement and settings pages import funding features directly.

## Why it makes sense—and what it does not accomplish

There are three distinct benefits:

- **Product independence.** People could sign, explore beliefs, publish positions, and subscribe to mediators without being asked to participate in crowdfunding. This matches the audience distinction already recorded in [product UI domains](../product/ui-domains.md).
- **Technical independence.** Non-financial adopters could reuse and operate the substrate without building the assurance/delegation stack. Funding could change substantially without forcing a simultaneous Tally release.
- **Operational separation.** A non-financial deployment could have its own dependencies, credentials, services, release cadence, and operator documentation. That makes its actual scope easier to explain and inspect.

The adoption benefit is plausible, not established by user research. A separate Git repository is invisible to most users: the benefit depends on a coherent standalone site, onboarding, branding, and optional cross-links. Signing still uses blockchain identities and transactions; removing funding does not automatically remove wallet friction, gas costs, or the implications of publishing beliefs publicly. A non-blockchain implementation would be a separate project, not a prerequisite for this split.

There is also a real cost: coordinated changes become package releases across two repos, fixtures and CI need ownership, and breaking a shared publication format becomes more expensive. One developer actively changing both halves may initially move slower. This argues for establishing package boundaries here first, rather than copying the current monorepo into two tightly synchronized halves.

On legal risk, the useful engineering claim is that the standalone deployment can omit financial activities and capabilities. This document does **not** establish that it has a particular legal classification or quantify how much safer it is. For example, Canadian FINTRAC guidance describes obligations in terms of services provided, including remitting/transmitting funds and dealing in virtual currency; my inference is that changing repository ownership alone cannot answer those activity-based questions. See [FINTRAC's MSB guidance](https://fintrac-canafe.canada.ca/msb-esm/msb-eng). Canada is an illustrative source here, not an assumption about the project's entire jurisdictional scope.

Public belief profiles and mediation also retain their own privacy/content questions. The Canadian privacy regulator's [personal-information interpretation bulletin](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_02/) explains the broad concept of information about an identifiable individual. Keep content policy and retraction/display handling in the standalone product; do not market the extraction as making those concerns disappear. A later legal review should evaluate the actual operators and deployed behavior, including any paid APIs.

## Proposed ownership line

| Capability | Recommended home | Boundary/detail |
|---|---|---|
| Statements, combinators, belief states, implications, direct/indirect support | Conceptspace | Contracts, document formats, SDK folds/queries/actions, and UI. Preserve the distinction between exact signing and implication-derived support. |
| Implication attester and finder | Conceptspace | Include their reusable runtime libraries; no funding application should be needed to operate them. |
| Trust and attester selection | Conceptspace | Subjectiv trust graph and generic trust computation; funding-specific policies/defaults remain downstream. Trust in judgments is different from delegation of spending authority. |
| Identity assertions, profiles, signer counts | Conceptspace | Include `AccountAssertions` and identity/counting primitives. Social-account verification needs the adapter/refactor discussed below. |
| Nudger publications, subscriptions, suggestions, dismissal/muting/intensity | Conceptspace | Include human publishers as well as AI services; subscribing to an address must not require an HTTP service. |
| Bridge authoring and mediation | Conceptspace | Both statement triples and cause-based clusters, human and AI authoring, generic bridge display/opt-in, and the bridge-creator engine. Strategy prompts and political assumptions are application configuration. |
| Cause/publication primitives and bookmarks | Conceptspace | Ordered planks, optional anchors, versioned documents, owner/slug references, bridge links and mediator metadata. Funding panels and standing pledges are downstream composition. |
| Statement drafting/sharpening | Conceptspace | Reusable cause-assist capabilities and client interfaces; keep Commonality-specific organizer workflow/copy in Commonality. |
| Documents and publication infrastructure | Conceptspace, as lower-level packages | Displayable documents, PublishedData, retraction/display resolution, Mutable Refs, CID helpers, content policy evaluation, optional IPFS mirror. These support both halves without being financial. |
| Generic subject-to-statement attestations | Conceptspace | `AlignmentAttestations` is about arbitrary `bytes32` subjects, not just funded projects. Extract generic actions/folds; leave project discovery, funding totals and project presentation downstream. |
| Curated collections and exploration | Split engine from application | Collection publication/reading and generic curator machinery belong upstream. Current fundable-project prompts, ranking/presentation and Aligning explorer belong downstream. |
| Beat memory and source adapters | Conceptspace optional service | Discourse context is useful to mediation independently of funding. Separate generic platform identifiers from content-funding imports. |
| Tally and Conceptspace documentation site | Conceptspace | Include an independently useful consumer app as well as developer infrastructure docs. Pure primitives alone would not deliver the proposed adoption benefit. |
| CSM movement site and political presets | Application layer | Can accompany the new repo as a clearly separate app/example, or stay in Commonality initially consuming packages. Do not make CSM strategy the neutral toolkit's mandatory default. |
| Assurance contracts, receipts, reimbursement, notes, recurring pledges | Commonality | All value movement and delegated spending remain here, including `NoteIntent`, which describes financial notes. |
| Aligning and funding boards | Commonality | Consume statements, trust, and attestations; own aligned project aggregation and funding actions. |
| Content Funding, Civility funding, beneficiary escrow/claims | Commonality | Generic content identification/evaluation may be reusable; payout eligibility, escrow and funding rounds are financial application concerns. |
| Commonality organizer application | Commonality | Composes publication/mediation primitives with funding. Moving generic cause documents does not imply moving the whole founder application. |

Do not make “all non-money code” the rule: that would drag every marketing page, external API integration, and infrastructure utility upstream. The rule is **a coherent non-financial product plus what it needs to operate and be reused**. Optional services should stay optional.

## What already separates well

The inspected [Beliefs](../../hardhat/contracts/statements/Beliefs.sol), [Implications](../../hardhat/contracts/statements/Implications.sol), [TrustRegistry](../../hardhat/contracts/subjectiv/TrustRegistry.sol), [AccountAssertions](../../hardhat/contracts/subjectiv/AccountAssertions.sol), and [NudgePublications](../../hardhat/contracts/nudger/NudgePublications.sol) contracts do not import the funding mechanisms. [AlignmentAttestations](../../hardhat/contracts/alignment-attestations/AlignmentAttestations.sol) explicitly allows non-project subjects. Moving source ownership should not itself require redeploying these contracts.

The SDK already exposes subsystem entry points in [its package manifest](../../sdk/package.json), and event decoders already have subsystem files. AI services are already workspace packages. The thin event-cache architecture also makes it possible to share data access without making Conceptspace responsible for financial business logic. These are substantial advantages: this is predominantly dependency and packaging work, not a new protocol design.

## Concrete dependencies to fix first

### 1. Split SDK configuration and exports by capability

[SDKMachinery and ContractAddresses](../../sdk/src/machinery.ts) describe the whole system. Providing a contract-address object currently requires assurance factories, delegatable notes and note intent alongside beliefs and implications. Twitter configuration and settlement-token configuration also live in the shared machinery type.

Introduce a minimal transport/publication context and explicit capability-specific address/configuration types. Funding extends the base. Do not satisfy standalone builds with dummy zero addresses or make every field optional and defer errors until a user clicks something. Each action should require the capability it actually uses.

Split ABI exports and decoder imports as well. [eventDecoder.ts](../../sdk/src/utils/eventDecoder.ts) re-exports all domains, and [ABI synchronization](../../sdk/scripts/sync-abis.ts) assumes a sibling Hardhat tree containing all contracts. Published artifacts must have reproducible ABI provenance without needing the other repository's source tree. Existing subsystem exports are a head start, not independent installable packages yet.

### 2. Remove financial composition from Tally's core pages

These are real reverse dependencies in today's non-financial experience:

- [StatementPage](../../ui/src/conceptspace/pages/StatementPage.tsx) imports `FundingPortalSummary` and `ContentSubmissionForm`.
- [SettingsPage](../../ui/src/conceptspace/pages/SettingsPage.tsx) imports project discovery/alignment settings from `fundingportals`.
- [Tally's manifest](../../ui/src/domains/tally/manifest.tsx) includes funding-portal and funding-leaderboard routes.
- `ui/src/shared/` itself contains project caches and currency helpers. Its folder name does not make all its contents neutral.

Make reusable statement/profile/settings components accept optional application sections, or compose them in downstream wrapper pages. Tally gets the non-financial sections; Commonality adds funding sections. Replace cross-product route assumptions with configurable links. A hidden button or runtime feature flag is insufficient if a standalone build still imports and requires the funding implementation.

### 3. Separate social identity from payout ownership

This is one of the less obvious blockers. [Signer-profile queries](../../sdk/src/subsystems/signer-profiles/queries.ts) explicitly depend on content-funding state to verify channel ownership. [LinkedSocialAccountsSection](../../ui/src/conceptspace/components/settings/LinkedSocialAccountsSection.tsx) uses content-funding's `useClaimFlow`. Thus a useful piece of Tally currently depends back on the money-side identity infrastructure.

Define a neutral profile/verified-association interface. The existing beneficiary-registry lookup can be a downstream adapter; Conceptspace must work without it. For initial independence, verified social enrichment could be optional while address profiles, beliefs and account assertions continue to work. If verified handles are required in standalone Tally, extract the identity-proof service/storage deliberately. Do not move escrow or automatically equate a social-account proof with authorization to claim funds. Avoid redesigning identity wholesale merely to move the repo.

### 4. Extract publication and bridge models from the Commonality UI

Bridge-building is no longer contained in `services/bridge-creator`. The human path and reusable formats live in files such as [causeRoster.ts](../../ui/src/commonality/lib/causeRoster.ts), [bridgeCluster.ts](../../ui/src/commonality/lib/bridgeCluster.ts), [bridgeTriple.ts](../../ui/src/commonality/lib/bridgeTriple.ts), and [bridgeNudges.ts](../../ui/src/commonality/lib/bridgeNudges.ts). `causeRoster.ts` mixes publication work with fundingportal queries and geographic inclusion code.

Extract schema validation, version/reference resolution and publication actions into a non-UI package. Separate financial enrichment from document reading. Both the service's [cluster publisher](../../services/bridge-creator/src/clusterPublisher.ts) and browser authoring should consume the same format contract. Keep existing schema identifiers, CIDs and mutable-ref keys readable; renaming `commonality.*` document kinds is not needed to change source ownership.

Preserve the behavior in [ADR 0012](../decisions/0012-mediator-is-an-address.md): mediator identity is an address, subscriptions are opt-in, human publishing works without a service URL, and nudges go parent→modified rather than automatically signing people onto common ground. Moving only the AI service would leave half of mediation behind.

### 5. Separate generic judgments, context and discovery from funding adapters

Extract generic subject-attestation operations from the `fundingportals` SDK surface. Keep its queries that load projects, notes or assurance funding in Commonality. A generic attestation is not evidence that any financial mechanism is safe or appropriate.

The [beat-memory Twitter adapter](../../services/beat-memory/src/twitterAdapter.ts) imports canonical channel/content ID helpers from `sdk/content-funding`; those identifiers should live in a neutral content-identity module. The [explorer curator](../../services/explorer-curator/src/curator.ts) and [personalizer](../../services/explorer-curator/src/personalizer.ts) contain funding-specific prompts despite generic-looking service names. Parameterize those policies before treating the service as a standalone general explorer.

Keep generic LLM, worker and HTTP support reusable without mandating paid APIs. The bridge creator currently has x402 proposal-payment configuration; service charging is a separate optional capability from crowdfunding, but a purported payment-free standalone installation must not require it.

### 6. Establish independent runtime composition

[serviceRegistry.ts](../../service-host/src/serviceRegistry.ts) imports both families of services, while [recurringPledgeScheduler.ts](../../service-host/src/recurringPledgeScheduler.ts) executes financial work. Extract a small generic host or use separate application entry points with explicit service lists. Conceptspace must not bring a standing-pledge executor along as part of its default host.

[Ponder configuration](../../indexer/ponder.config.ts) includes both contract families; the indexer also contains project-specific API work. Separate the event-cache protocol/base implementation from contract registrations and financial endpoints. Retain a shared production feed initially if useful: two repositories need not mean two databases or duplicated indexing. But provide a Conceptspace-only configuration and prove it works. The [shared-feed topology](indexer/shared-feed-topology.md) is compatible with optional independent operation.

Deployment manifests, environment generation, Compose, CI, seeds, gateways, SDK ABI generation, and the MCP tool registry need the same composition boundary. [MCP tools](../../mcp/src/tools.ts), for example, currently mix statement operations and `get_project`. Transfer the relevant tests, fixtures and operator docs with each capability. Audit `published-data-ipfs-mirror`, `coherence-badge-worker`, and trust-bootstrap tooling by dependencies and intended consumers rather than moving or retaining them solely by name.

## A workable repository shape

Use one new repo with several packages, not a new repo per primitive. A reasonable starting shape is:

```text
conceptspace/
  contracts/          # semantic/trust/publication contracts and ABI artifacts
  sdk/                # neutral transport, documents, graph, trust, publications
  ui/                 # reusable signing, profile, publication, mediation UI
  apps/tally/         # independently useful non-financial application
  services/           # implication, nudge, mediation, optional context/drafting
  indexer/            # base event cache and Conceptspace-only composition
  docs/ + tests/ + deployment tooling

commonality/
  funding contracts, SDK extensions, services and applications
  explicit composition of published Conceptspace packages
```

Package names are illustrative, not a naming decision. Avoid a third “shared everything” repo: let reusable lower-level packages live in Conceptspace initially, with no imports back into Commonality. If some utility later has genuinely independent consumers, it can be extracted separately.

Keep data identity stable across both repos: chain IDs, deployed contract addresses, start blocks, event formats, statement CIDs, document versions, mediator addresses and trust choices. Commonality should point at the same graph by default. Source extraction is not a reason to fork people's statements or require them to sign again. Wallet identity can remain shared, but local bookmarks/settings and authentication across new origins need an explicit migration/export story; they do not automatically follow a wallet.

## Sequence and readiness test

1. **First, inside this repo:** define the package APIs and allowed dependency direction; split machinery/ABI exports; remove the concrete reverse dependencies above. Enforce imports so new funding dependencies cannot creep back into the neutral modules.
2. **Build a standalone slice:** Tally plus human mediation/publication and the required contracts/indexer. Add implication/nudger services as optional separately runnable components. Build and test this slice with all funding addresses and services absent.
3. **Prove packaging:** install packed release artifacts into an isolated temporary consumer outside workspace resolution. Run Commonality against those same artifacts. This catches relative paths, undeclared dependencies, build-order assumptions and accidental access to hoisted workspace packages.
4. **Only then extract:** move source history where practical, transfer tests/docs/CI, establish versioning and releases, and replace local dependencies in Commonality. Retain compatibility adapters for existing applications during the transition.

The standalone acceptance journey should cover publishing and signing a statement, withdrawing/changing belief, implication-derived support, trust selection, subscribing to and muting a human mediator, publishing a bridge triple/cluster, following its parent→modified nudge, and resolving/retracting versioned publications. No step should require a financial service. Run a second integration journey proving Commonality can still use those same statements and attestations to show and fund a project. Check old links/documents remain readable and unavailable optional integrations are absent or explained rather than silently broken.

Do not make complete CSM rebranding, a wallet redesign, replacing Ponder/IPFS, or generalizing every content service prerequisites. Those would turn a tractable separation into a platform rewrite.

## Effort and timing

**High feasibility; medium-to-large refactoring effort; low need for protocol redesign.** The contract source move is likely the easy part. UI/identity/publication seams and independent deployment are the work most likely to consume time. Treat this as several focused stages, not a weekend directory move.

For planning only, one developer could reasonably budget several weeks for a credible standalone extraction and consumer migration, with a broader roughly 3–8 week envelope depending on required social-identity parity, deployment polish and concurrent changes. This is an inspection-based estimate, not a measured task breakdown. A minimal package-only extraction is smaller but would not by itself satisfy the standalone-user goal.

The best preparatory work even if extraction is postponed is: **make Tally run without funding configuration, isolate verified social identity, and put cause/bridge publication formats below both the UI and services.** Those changes improve the current system and directly test the proposed boundary. Once they exist, repo separation becomes mostly a release/ownership decision.

## Evidence limits

This assessment inspected architecture/product guidance and representative contracts, SDK imports/configuration, UI composition, mediation/context services, indexer and build tooling. It is not an exhaustive transitive dependency audit, deployment rehearsal, or test of current product readiness. Implementation evidence takes precedence where older documentation describes a cleaner boundary or unfinished feature that current code has since changed. No application code, deployments or branch state were changed for this analysis.
