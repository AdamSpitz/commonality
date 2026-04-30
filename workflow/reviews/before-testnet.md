# Big review before deploying to testnet

(Late April 2026.)

The goal here is to do a giant test run in which we review of all the user-facing surfaces of the project, using the `intelligent-tester` skill and the `cofounder` skill.

For now, let's also use the `interactive-assistant` skill; I want to watch this step-by-step and get a feel for how well the ecosystem of skills is working.

## How to use this file

This single file holds the **To Do**, **Continuity** notes, and accumulated **Findings** for the whole review. Each subtask LLM should:

  - Read the most recent few continuity notes before starting.
  - Append findings to "Findings" as it goes (organized by domain — see template).
  - Update the to-do checkbox + write a continuity note when finishing.

Each subtask LLM is also doing a `subtask-doer` role and should apply both lenses while reviewing:

  - **`intelligent-tester` lens:** does it actually work? Click through it. Are there blatantly broken pages, console errors, missing data, dead links, confusing flows?
  - **`cofounder` lens:** does this surface actually accomplish what it's *supposed* to accomplish for the project? What's missing entirely? What doesn't quite make sense given what we're trying to build?

Subtask LLMs should also use `interactive-assistant` so the human can watch step by step.

---

## To Do

- [x] Run full automated test suite (test:fast + full E2E)
- [x] Review project structure, specs, and implementation status
- [x] Assess AI service ecosystem (attesters, finders, nudgers, explorer)
- [x] Review SDK completeness
- [x] Review smart contract structure
- [x] Review UI surfaces (pages, domains, routing)
- [x] Review deployment configuration
- [x] Check for stale documentation vs. actual implementation
- [x] Assess overall readiness for testnet

---

## Continuity

**2026-04-29 — High-level test completed.**

Comprehensive review of the entire project was performed by a single LLM instance (cofounder + noninteractive-assistant + intelligent-tester). Key actions taken:

1. Read project README, specs, CONTINUITY.md, TODO.md
2. Ran `npm run test:fast` — all 1567 tests across 85 files passed
3. Ran `npm run test` (full E2E suite) — all 25/25 Playwright tests passed (~2.8 min)
4. Ran `npm run build` — all 18 tasks successful
5. Reviewed all subsystem README files (attesters, finders, nudgers, explorer, SDK, hardhat, UI)
6. Reviewed key specs (MVP, new-user-experience, explorer, nudge-ux)
7. Audited source code for TODOs/FIXMEs, console logs, debug artifacts
8. Inspected docker-compose.yml for service configuration
9. Reviewed UI pages, env configuration, deployment setup

Findings recorded below. No code changes were made — this was a read-only review.

---

## Findings

### Overall Test Results

**Status: All automated tests pass.**

- `npm run test:fast`: 1567 tests, 85 files — ALL PASS
- `npm run test` (full E2E with Docker): 25/25 Playwright tests — ALL PASS
  - belief-expression, browse-statements, content-funding-flow, delegation-flow, negative-paths, pubstarter-flow, statement-creation (form + flow), subjectiv-flow, user-profile, wallet-connection
- `npm run build`: All 18 tasks successful

The project is in good automated-test health. No blatantly broken code paths detected by the test suite.

---

### Finding 1: AI Worker Services DISABLED by Default in Local Dev

**Severity: Medium-High**
**Domain: AI Service Ecosystem / Docker Configuration**

In `docker-compose.yml`, the `service-host-workers` bundle has ALL worker services disabled:

```
IMPLICATION_FINDER_ENABLED=false
CONTENT_FINDER_ENABLED=false
IMPLICATION_GRAPH_NUDGER_ENABLED=false
BRIDGE_CREATOR_ENABLED=false
EXPLORER_CURATOR_ENABLED=false
```

Only the attester bundle (`service-host-attesters`) is enabled by default. This means:
- **Implication Finder** (discovers statement pairs for attestation) — OFF
- **Content Finder** (processes content submission queue) — OFF
- **Implication Graph Nudger** (suggests statements based on implication graph) — OFF
- **Bridge Creator** (synthesizes common-ground statements) — OFF
- **Explorer Curator** (maintains curated collection for explorer) — OFF

**Impact:** A developer running `./scripts/services.sh --start` gets a partially-functional AI ecosystem. The attesters work (can evaluate implications on demand), but the proactive discovery and suggestion services don't run. The Explorer page will show "No curated collection available" because the explorer-curator isn't running.

**Cofounder assessment:** This is probably intentional for local dev (no need to burn OpenRouter API credits on background processes). But it means the *actual* first-run experience for a new developer doesn't show the full system working. The "no curated collection" empty state in Explorer is the default experience, not the intended experience.

**Recommendation:** Add clear documentation that workers are disabled by default and how to enable them. Consider whether the `--seed` script should also spin up a minimal worker cycle to populate some initial data.

HUMAN'S NOTE: Discussed. Plan: extend the existing pre-generated-evaluations pattern to cover explorer curator, nudgers, and implication finder outputs. Pre-generate against the seed statements (stable CIDs), store as checked-in JSON, replay on-chain during seeding — no live LLM calls needed. See `specs/dev/testing/pregenerated-worker-outputs.md` and TODO.md.

---

### Finding 2: Documentation Stale — Explorer Page IS Implemented

**Severity: Low**
**Domain: Documentation**

`specs/product/new-user-experience.md` states:

| Component | Status |
|---|---|
| Explorer implementation | Not built |

But `ui/src/conceptspace/pages/ExplorerPage.tsx` is a fully implemented page that:
- Fetches curated collections from explorer nudger publications
- Calls the explorer-curator's `/suggest` endpoint for per-user personalization
- Displays statements grouped by topic area with supporter counts
- Provides Sign, Navigate, and Funding Portal actions
- Handles empty state gracefully with link to Browse Statements

Similarly, `mvp.md` says "Mutable Refs UI — The SDK is done; the UI is deferred" but `ui/src/mutablerefs/MyRefsPage.tsx` is a comprehensive CRUD page with IPFS inspection, history viewing, ref lookup, and delete confirmation.

**Impact:** Confusing for new developers. The project looks less complete on paper than it actually is.

**Recommendation:** Update `new-user-experience.md` and `mvp.md` to reflect actual implementation status.

HUMAN'S NOTE: Yes, fix this, please.

---

### Finding 3: Testnet Deployment Blocker — IPFS-Baked Event Cache URL

**Severity: High**
**Domain: Deployment**

From CONTINUITY.md: `VITE_EVENT_CACHE_URL` is baked in at IPFS build time. Currently `.env.ipfs` uses `http://localhost:42069` (local only). For testnet/mainnet, this needs to point to the deployed indexer URL.

The IPFS build (`npm run build:ipfs`) produces a static bundle with hash routing and the indexer URL hardcoded. There's no runtime mechanism to change it after publishing to IPFS.

**Impact:** Cannot deploy to testnet without changing this. The current build process produces localhost-only artifacts.

**Recommendation:** This needs a plan. Options:
- Build-time environment variable injection during deployment (CI/CD pipeline sets correct URL)
- Runtime configuration file loaded from a known URL/IPFS location
- DNS-based service discovery

This is explicitly called out in existing continuity notes and needs to be resolved before testnet.

HUMAN'S NOTE: Right, interesting point. Because we're doing deployment to IPFS rather than to a server, we can't just provide different config files on each server. Okay, here's a question: is it possible to create an IPFS bundle that *contains* the static bundle that's produced by `npm run build:ipfs`, as well as containing an IPFS JSON document containing config values? Can we produce three of those (one whose config says "local dev", one whose config says "testnet", one whose config says "mainnet")?

---

### Finding 4: Console Debug Logging in Production UI Code

**Severity: Low**
**Domain: UI Polish**

Several `console.log` statements exist in production UI code (not test files):

- `ui/src/conceptspace/components/CreateStatementForm.tsx`: 5 console.log statements (lines 99, 102, 105, 110)
- `ui/src/conceptspace/pages/StatementPage.tsx`: 1 console.log (line 67)

No `alert()`, `prompt()`, or `confirm()` calls were found — good, proper UI modals are used instead.

**Impact:** Minor — console.log is invisible to end users but adds noise in browser dev tools.

**Recommendation:** Remove or convert to proper logging utility that can be disabled in production.

HUMAN'S NOTE: Remove if unimportant, convert to proper logging if important.

---

### Finding 5: Large Bundle Sizes

**Severity: Low**
**Domain: UI Performance**

Build produces several chunks larger than 500KB:
- `core-nkfR76_M.js`: 572KB
- `index-uSH7ttNE.js`: 667KB
- `PrivyAppProvider-b6OB-zgT.js`: 756KB
- `index-D5nlVbo1.js`: 2,506KB (2.5MB!)

Rollup warns: "Some chunks are larger than 500 kB after minification."

**Impact:** Initial page load for a first-time visitor will be slow, especially on mobile. The 2.5MB chunk is particularly concerning.

**Cofounder assessment:** For an MVP/testnet launch, this is acceptable but should be on the backlog. The Privy wallet SDK is likely a major contributor to the large chunks.

**Recommendation:** Prioritize code-splitting the largest chunks. Consider lazy-loading wallet onboarding (Privy is already lazy-loaded when not in use, but the chunk is still large when it is needed).

HUMAN'S NOTE: I need you to talk me through what this means. What kind of "code-splitting" are we talking about?

---

### Finding 6: Only 2 TODOs in Source Code

**Severity: Info (positive)**
**Domain: Code Quality**

Only 2 TODOs exist in non-test source code:
- `sdk/src/config-node.ts:12` — `DEBUG_IPFS` env var (benign)
- `sdk/src/utils/twitter.ts:105` — ENS verification status check

**Assessment:** The codebase is remarkably clean of deferred work items in source code. This suggests the implementation is genuinely close to complete.

HUMAN'S NOTE: I don't even see that first one; was it removed? Doesn't matter, these are no big deal.

---

### Finding 7: MVP Scope Assessment (Cofounder Lens)

**Severity: Info**
**Domain: Product Strategy**

From the MVP spec, all seven subsystems are implemented:
1. ✅ **Conceptspace** — Statements, beliefs, implications, seed content
2. ✅ **Pubstarter** — Assurance contracts, ERC-1155 tokens, secondary market
3. ✅ **Delegation** — DelegatableNotes, NoteIntent, revocable chains
4. ✅ **Funding Portals** — Per-statement portals, leaderboards, trust filtering
5. ✅ **Content Funding** — Twitter/YouTube/Substack verification, creator contracts
6. ✅ **Subjectiv** — Trust-graph filtering, Web Worker computation, IndexedDB
7. ✅ **Mutable Refs** — SDK complete, UI also complete (contrary to spec)

Deliberately deferred items:
- Fiat bridges (credit card onramp)
- Embedded wallet provisioning (partially addressed via Privy integration)
- Unique-human verification (Worldcoin, BrightID)
- Mutable Refs UI (actually implemented — see Finding 2)
- Explorer AI (actually implemented — see Finding 2)
- Per-contract token choice
- Generative testing
- Bridge finder / bridge creator (bridge creator is implemented, bridge finder is not)
- AI skills (formal SKILL.md files for assistant roles)

**Cofounder assessment:** The MVP is genuinely close to shippable. The core loop works: create statements → sign them → create projects → fund them → delegate → verify content. The main gaps are in the *onboarding* experience (new user guidance, seed content) and *proactive* AI services (finders, nudgers disabled by default).

HUMAN'S NOTE: Great!

---

### Finding 8: Seed Content Coverage

**Severity: Medium**
**Domain: First-Run Experience**

The TODO.md notes: "Make sure the seed content gets into the fake universe simulation."

From the continuity notes, fake-data generation seeds 10 users and 3 rounds of data. However:
- The Explorer's curated collection requires the explorer-curator to run (disabled by default — Finding 1)
- Without seed content in the explorer's collection, the Explorer page shows empty state
- Without finders running, no implication pairs are discovered for nudging

**Impact:** A developer or tester running the default local setup gets a sparse experience — statements exist but the AI-driven discovery and suggestion layers are empty.

**Recommendation:** Consider running a one-shot seed cycle that populates initial curated collections and implication pairs, even if the continuous workers are disabled.

HUMAN'S NOTE: Yes.

---

### Finding 9: Service Bundling Architecture

**Severity: Info (positive)**
**Domain: Architecture**

The project uses a clean service-bundling pattern:
- `service-host-attesters` runs implication + content attesters together
- `service-host-workers` runs finders + nudgers together
- Individual services can be enabled/disabled via environment variables
- Same Docker image for both bundles

**Assessment:** This is well-architected for production deployment. The ability to reorganize which services run in which process via config is good.

HUMAN'S NOTE: Great!

---

### Finding 10: Four UI Domains from One Codebase

**Severity: Info (positive)**
**Domain: Architecture**

The UI builds four branded surfaces from one codebase:
- **Commonality** — Full platform
- **Content Funding** — Creator/fan site
- **Noninflammatory** — Content funding with quality criteria
- **Movement (Common Sense Majority)** — Organizing/advocacy

Each is a separate build artifact with domain-specific routing and branding.

**Assessment:** Clean architecture. The domain system allows focused user experiences while sharing the underlying code.

HUMAN'S NOTE: Good.

---

### Finding 11: Smart Contracts — No Audit Since Last Changes

**Severity: Medium-High**
**Domain: Smart Contracts**

TODO.md lists: "Do another smart-contract audit pass."

The project has never been deployed to mainnet. The smart contracts include:
- 28 Solidity files across 6 domains
- Complex delegation logic (DelegatableNotes, NoteIntent)
- ERC-1155 primary + secondary markets
- Content funding with channel verification

**Cofounder assessment:** Before testnet deployment, at minimum a fresh review of the most complex contracts (DelegatableNotes, AssuranceContract, ChannelEscrow) is warranted. The TODO.md notes this is "(Not a task for AI)" — the founder wants to do this personally.

**Recommendation:** Don't deploy to testnet without at least a targeted review of the high-risk contracts.

HUMAN'S NOTE: Yes, I do want to do this. I'm not too worried about testnet because it's testnet, but yes, let's do our best to satisfy ourselves that it's not just broken before we ship it even to testnet.

---

### Finding 12: Overall Readiness Assessment

**Can this project ship to testnet?**

**Yes, with caveats.** The automated tests all pass, the build succeeds, and all seven MVP subsystems are implemented. The main blockers for a confident testnet launch are:

1. **IPFS build-time URL** (Finding 3) — Must be resolved before any deployment
2. **Smart contract audit** (Finding 11) — Should be done before testnet
3. **Seed content into explorer** (Finding 8) — Needed for a good first-run experience
4. **Documentation updates** (Finding 2) — Important for developer onboarding

The project is genuinely close. The code is clean, tests pass, architecture is coherent. The founder's concern ("I'm out of touch with the code and I've never used much of the UI") is the biggest risk — human testing of the live UI is still needed.

HUMAN'S NOTE: Okay, cool.

---

### Finding 13: Channel Metadata Lookup Disabled by Default

**Severity: Low**
**Domain: UI / Platform API**

Per CONTINUITY.md, `VITE_ENABLE_CHANNEL_METADATA_LOOKUP` defaults to false. The platform API `/resolve/channel` endpoint returns 503 without real Twitter/YouTube credentials, which previously caused browser console errors in E2E tests.

The fix was to make channel metadata lookup opt-in. The UI falls back to canonical IDs/IPFS metadata.

**Assessment:** This is a reasonable local-dev default. For production, this would need to be enabled with proper API credentials. Not a blocker for testnet if the feature is gated properly.

HUMAN'S NOTE: Let's make sure we get some sort of error message if we don't set this up for testnet or mainnet. After we implement that config thing so that we know whether we're on local or testnet or mainnet, can we make this only be disabled if we're on local, and throw an error otherwise if not set up?
