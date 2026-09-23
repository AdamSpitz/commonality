# Separating Conceptspace from funding

Date: 2026-09-23. Updated the same day. Status: **in-repo dependency direction, not an extraction.** Do not split git history. No second repository until a later, separate decision.

## Decision

Conceptspace is an underlying horizontal layer (expressing beliefs, relating statements, publishing collections, finding wording and common ground). Civility and CSM are vertical products composed on top of shared pieces. Both separations are good ideas, for different reasons. Which one matters more changes; neither requires a new repository right now.

The work now is:

- **Dependencies point one way.** Conceptspace modules do not import funding, content-funding, LazyGiving, or a vertical application. Funding and verticals may import Conceptspace. Enforce that in the workspace so the wrong direction cannot creep back.
- **Tally is a non-financial composition.** It uses shared Conceptspace components and adds only its own non-financial screens. It does not mount funding routes or funding widgets.
- **Commonality composes the same components and adds funding.** Do not put optional slots, render props, or feature flags on the Tally pages so Commonality can inject funding. Each application owns its pages and mixes in the shared pieces it wants.

The test of the boundary stays the same: a Tally build and journey that signs, mediates, and publishes with no funding contract, payment token, or funding module in the graph. A second journey shows Commonality still using those statements to fund a project. Chain identity stays shared. Source layout is not a reason to fork beliefs.

Extracting Civility or CSM as their own verticals remains a separate, later packaging choice, as in [technical UI domains](ui-domains.md#future-direction-per-vertical-repo-split-decided-2026-06-22). That note's "nearly flat feature graph" is stale. Tally no longer reaches funding by mounting Conceptspace pages that import it; keep the import rule as new code lands. A top-level `conceptspace/` folder is optional packaging after the import rule holds, not the first step. Copying this monorepo into two git histories is explicitly out of scope.

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

[SDKMachinery and ContractAddresses](../../sdk/src/machinery.ts) describe the whole system. Twitter configuration and settlement-token configuration also live on the shared machinery type.

Address types are split. `ConceptspaceContractAddresses` is the base; `FundingContractAddresses` is separate; `ContractAddresses` is both, for a deployment that funds. `SDKMachinery.contractAddresses` is `DeployedContractAddresses`, so funding fields are absent unless configured. `requireFundingContractAddresses` throws if a funding action is invoked without them. Bridge creator, the implication nudger, and the explorer curator no longer invent zero funding addresses. The implication finder only configures beliefs and implications, and its event reads require those addresses instead of assuming them. The implication nudger's retraction test no longer fills unread addresses with zero. Do not add funding zeros back.

Conceptspace address fields are all optional. `configuredAddress` drops the zero address, and `requireConceptspaceContractAddress` fails the action that needs a missing contract. The bridge creator, implication nudger, explorer curator, and MCP config omit addresses they do not have instead of filling zeros.

Twitter configuration and settlement-token addresses are optional capabilities on the same machinery object, not defaults. `createSDKMachinery` omits them unless the caller passes them (an empty settlement-token list is omitted). `requireTwitterApiConfig` throws when a social lookup runs without Twitter configuration. `requireSettlementTokenAddresses` throws when an action is specifically including settlement ERC-20s and none are configured. Soft note-intent aggregates still count native value without that list; they do not call the require helper.

ABI exports are split. `@commonality/sdk/abis` still re-exports everything. `@commonality/sdk/abis/conceptspace` and `@commonality/sdk/abis/funding` are the capability entries. Conceptspace, trust, identity, mutable-ref, and nudger queries import their own decoder modules instead of the combined [eventDecoder.ts](../../sdk/src/utils/eventDecoder.ts) barrel. That barrel remains for existing callers. [ABI synchronization](../../sdk/scripts/sync-abis.ts) still assumes a sibling Hardhat tree containing all contracts. Published artifacts must have reproducible ABI provenance without needing the other repository's source tree. Existing subsystem exports are a head start, not independent installable packages yet.

### 2. Compose Tally and Commonality from shared components

The page-level split below is implemented. Tally's manifest no longer mounts funding-portal routes. Conceptspace statement, settings, and home pages no longer import `fundingportals`, `content-funding`, or LazyGiving. `StatementSupportingContent` and `LinkedSocialAccountsSection` live in content-funding. Commonality's statement page renders supporting content and the submission form next to its own cause board. Commonality's settings page renders linked social accounts next to the shared trust sections. An ESLint rule rejects those funding imports from `ui/src/conceptspace/**` and `ui/src/domains/tally/**`.

What Tally used to pull in, before that split:

| Surface | Funding dependency |
|---|---|
| Routes `/portal/:statementCid` and `/portal/:statementCid/leaderboard` | `StatementFundingPortalPage` and `CauseLeaderboardPage` from `fundingportals` |
| [StatementPage](../../ui/src/conceptspace/pages/StatementPage.tsx) | `FundingPortalSummary` (`fundingportals`); `ContentSubmissionForm` (`content-funding`); [StatementSupportingContent](../../ui/src/content-funding/components/StatementSupportingContent.tsx), which reads `@commonality/sdk/content-funding` and renders `ContentAttestationSummary` |
| [SettingsPage](../../ui/src/conceptspace/pages/SettingsPage.tsx) | `DiscoverySlider`, `AlignmentFilterToggle`, and their hooks from `fundingportals` (project discovery and alignment filtering). [LinkedSocialAccountsSection](../../ui/src/content-funding/components/LinkedSocialAccountsSection.tsx) verifies handles through content-funding's `useClaimFlow` |
| [HomePage](../../ui/src/conceptspace/pages/HomePage.tsx), mounted at Tally `/start` | Cards that link to LazyGiving `/projects` and content-funding `/content/twitter` |

Commonality already has its own [statement page](../../ui/src/commonality/pages/StatementPage.tsx) and [settings page](../../ui/src/commonality/pages/SettingsPage.tsx). The settings page is the shape to keep: it imports `DirectTrustSettingsSection` and `NudgerSettingsSection` from Conceptspace and renders funding discovery controls itself. The statement page is not there yet; it reimplements signing instead of reusing the Conceptspace statement components, and it adds `CauseBoard`, `CauseLeaderboard`, and cause funding.

Move the funding-free pieces (statement rendering, belief controls, support metrics, suggestions, high-profile signers, trust and nudger settings sections) behind the Conceptspace public exports if they are not already. Tally's pages import those and nothing from `fundingportals`, `content-funding`, or `lazy-giving`. Commonality's pages import the same pieces and add funding sections in the Commonality file. Do not add optional slots to the shared components or to the Tally pages. Delete the funding routes from the Tally manifest. Replace Tally home cards that point at funding products with Tally's own next steps, or drop them.

`ui/src/shared/` contains project caches and currency helpers. Its folder name does not make those neutral. Conceptspace components must not import them. A hidden button or runtime flag is insufficient if Tally still imports the funding implementation.

### 3. Separate social identity from payout ownership

This is one of the less obvious blockers. [Signer-profile queries](../../sdk/src/subsystems/signer-profiles/queries.ts) explicitly depend on content-funding state to verify channel ownership. [LinkedSocialAccountsSection](../../ui/src/content-funding/components/LinkedSocialAccountsSection.tsx) uses content-funding's `useClaimFlow`. It is mounted from Commonality settings, not Tally. Verified handles still have no neutral interface, so Tally does not offer that section.

Signer profiles no longer import content-funding. `SDKMachinery.verifiedSocialAssociation` is an optional lookup. Without it, address profiles still resolve ENS text records and beliefs and account assertions are unchanged. `lookupVerifiedTwitterAssociation` is the beneficiary-registry adapter, exported from `@commonality/sdk/content-funding`. The shared browser machinery installs that adapter only when a beneficiary-registry address is configured. A match is not authorization to claim funds. If standalone Tally later needs verified handles without that registry, extract an identity-proof service deliberately. Do not move escrow.

### 4. Extract publication and bridge models from the Commonality UI

Bridge-building is no longer contained in `services/bridge-creator`. The human path and reusable formats live in files such as [causeRoster.ts](../../ui/src/commonality/lib/causeRoster.ts), [bridgeCluster.ts](../../ui/src/commonality/lib/bridgeCluster.ts), [bridgeTriple.ts](../../ui/src/commonality/lib/bridgeTriple.ts), and [bridgeNudges.ts](../../ui/src/commonality/lib/bridgeNudges.ts). `causeRoster.ts` mixes publication work with fundingportal queries and geographic inclusion code.

Extract schema validation, version/reference resolution and publication actions into a non-UI package. Separate financial enrichment from document reading. Both the service's [cluster publisher](../../services/bridge-creator/src/clusterPublisher.ts) and browser authoring should consume the same format contract. Keep existing schema identifiers, CIDs and mutable-ref keys readable; renaming `commonality.*` document kinds is not needed to change source ownership.

Preserve the behavior in [ADR 0012](../decisions/0012-mediator-is-an-address.md): mediator identity is an address, subscriptions are opt-in, human publishing works without a service URL, and nudges go parent→modified rather than automatically signing people onto common ground. Moving only the AI service would leave half of mediation behind.

### 5. Separate generic judgments, context and discovery from funding adapters

Extract generic subject-attestation operations from the `fundingportals` SDK surface. Keep its queries that load projects, notes or assurance funding in Commonality. A generic attestation is not evidence that any financial mechanism is safe or appropriate.

Canonical channel and content IDs live in `@commonality/sdk/content-identity`. The [beat-memory Twitter adapter](../../services/beat-memory/src/twitterAdapter.ts) imports them from there, not from content-funding. Content-funding re-exports the same functions so existing funding callers keep working. Beneficiary, DNS, and payout helpers stay in content-funding. `hashCanonicalId` is the neutral hash; funding-only `hashBeneficiaryId` still wraps it. The [explorer curator](../../services/explorer-curator/src/curator.ts) and [personalizer](../../services/explorer-curator/src/personalizer.ts) still default to funding-landscape prompts. `curationBrief`, `curatorSystemPrompt`, `personalizationBrief`, and `personalizerSystemPrompt` replace that wording when set (env: `EXPLORER_CURATOR_CURATION_BRIEF`, `EXPLORER_CURATOR_SYSTEM_PROMPT`, `EXPLORER_CURATOR_PERSONALIZATION_BRIEF`, `EXPLORER_CURATOR_PERSONALIZER_SYSTEM_PROMPT`). The published name, description, and `fundable-project-explorer` stream stay the Commonality deployment. A non-financial explorer is a separate config, not a rename of this one.

Keep generic LLM, worker and HTTP support reusable without mandating paid APIs. The bridge creator currently has x402 proposal-payment configuration; service charging is a separate optional capability from crowdfunding, but a purported payment-free standalone installation must not require it.

### 6. Establish independent runtime composition

[serviceRegistry.ts](../../service-host/src/serviceRegistry.ts) imports both families of services, while [recurringPledgeScheduler.ts](../../service-host/src/recurringPledgeScheduler.ts) executes financial work. Extract a small generic host or use separate application entry points with explicit service lists. Conceptspace must not bring a standing-pledge executor along as part of its default host.

[Ponder configuration](../../indexer/ponder.config.ts) includes both contract families; the indexer also contains project-specific API work. Separate the event-cache protocol/base implementation from contract registrations and financial endpoints. Retain a shared production feed initially if useful: two repositories need not mean two databases or duplicated indexing. But provide a Conceptspace-only configuration and prove it works. The [shared-feed topology](indexer/shared-feed-topology.md) is compatible with optional independent operation.

Deployment manifests, environment generation, Compose, CI, seeds, gateways, SDK ABI generation, and the MCP tool registry need the same composition boundary. [MCP tools](../../mcp/src/tools.ts), for example, currently mix statement operations and `get_project`. Transfer the relevant tests, fixtures and operator docs with each capability. Audit `published-data-ipfs-mirror`, `coherence-badge-worker`, and trust-bootstrap tooling by dependencies and intended consumers rather than moving or retaining them solely by name.

## A later repository shape

Not the current milestone. If extraction happens later, use one new repo with several packages, not a new repo per primitive. A reasonable shape then is:

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

Do this in the current repository. Do not split git history as part of it.

1. **UI composition first.** Export the shared non-financial components. Point Tally's statement, settings, and home pages at those components only. Move funding widgets and routes to Commonality pages that mix the same components with funding. This is the current priority.
2. **Enforce the direction.** A workspace lint or project-reference rule: Conceptspace UI and its SDK entry must not import funding, content-funding, LazyGiving, or an application vertical. Funding and verticals may import Conceptspace. Cover the social-verification edge (`useClaimFlow`) and `StatementSupportingContent`, not only the obvious page imports.
3. **Then the other concrete edges in this document**, still in-repo: capability-specific SDK config and ABI exports, a neutral profile interface so verified social handles are optional, publication and bridge formats below both UIs, and a Conceptspace-only indexer and service list. No dummy zero addresses.
4. **Prove the journeys** below. A second git repository, packed external installs, Civility extraction, and CSM extraction are later decisions. They become mostly release and ownership work once the import rule already holds.

The standalone acceptance journey should cover publishing and signing a statement, withdrawing/changing belief, implication-derived support, trust selection, subscribing to and muting a human mediator, publishing a bridge triple/cluster, following its parent→modified nudge, and resolving/retracting versioned publications. No step should require a financial service. Run a second integration journey proving Commonality can still use those same statements and attestations to show and fund a project. Check old links/documents remain readable and unavailable optional integrations are absent or explained rather than silently broken.

Do not make complete CSM rebranding, a wallet redesign, replacing Ponder/IPFS, or generalizing every content service prerequisites. Those would turn a tractable separation into a platform rewrite.

## Effort and timing

**High feasibility; the UI composition is the small first stage; low need for protocol redesign.** Moving contract source would be the easy part of a later extraction and is not this stage. UI composition and the import rule are the work now. Identity, publication formats, SDK machinery, and deployment composition remain real, and they stay in this repo until a later decision.

The stage that matches the current decision is: **Tally's pages omit funding by composing shared components, Commonality's pages add funding themselves, and the workspace rejects an import in the wrong direction.** Repository separation stays a later ownership choice, not a milestone of this work.

## Evidence limits

This assessment inspected architecture/product guidance and representative contracts, SDK imports/configuration, UI composition, mediation/context services, indexer and build tooling. It is not an exhaustive transitive dependency audit, deployment rehearsal, or test of current product readiness. Implementation evidence takes precedence where older documentation describes a cleaner boundary or unfinished feature that current code has since changed. No application code, deployments or branch state were changed for this analysis.
