# General stuff to review every so often

I'm worried about this code base getting away from me. So let's try doing regular reviews of various components or aspects of the code base.

## Skills to use

Use the `project-wide-reviewer` skill, or whichever specific skills (mentioned inside the `project-wide-reviewer` skill) are relevant.

## Most recent reviews

### Review — 2026-03-08: Funding Portals UI

See [funding-portals-review.md](funding-portals-review.md) for full details.

**Verdict**: Functionally complete. All funding portal flows are implemented (portal page, leaderboard, aligned projects list with sort/filter, alignment attestation, delegatable notes). Four bugs fixed: DelegatableNotesSection silently swallowed errors, it showed non-ETH notes inconsistently with the metrics, AlignmentAttestationsSection list didn't refresh after successful attestation, and getAlignmentContract was duplicated. Test coverage is zero — no tests for any funding portal component.

### Review — 2026-03-07: Delegation UI

See [delegation-ui-review.md](delegation-ui-review.md) for full details.

**Verdict**: Functionally complete. All delegation flows (deposit, delegate, revoke, reclaim, spend) are implemented and integrated across 4 UI modules. One bug found (null dereference in NoteDetailPage). Test coverage is sparse — only MyNotesPage has unit tests (13 cases); NoteDetailPage, DepositPage, and the pubstarter note-funding integration have none.

### Review — 2026-02-16

**Project context**: Blockchain application with smart contracts, Ponder indexer, SDK, integration tests, UI, and AI Attester service.

**Chunks completed**: [x] Smart contracts review, [x] Indexer review, [x] SDK review, [x] Integration tests review, [x] UI review, [x] Attester review, [x] Architecture coherence, [x] Code quality patterns, [x] Documentation completeness, [x] Test coverage check, [x] Tech debt assessment, [x] Synthesis
**Chunks remaining**: []

**Commits since last review**: N/A - first review

#### Architecture Coherence
- ✅ Clean separation: contracts, indexer, SDK, integration-tests, UI, attester
- ✅ SDK properly abstracts contracts and provides GraphQL queries
- ✅ Each component has clear responsibilities
- ✅ No circular dependencies detected
- ✅ Docker Compose orchestrates multi-service setup
- Status: **Healthy**

#### Code Quality Patterns
- ✅ TypeScript throughout
- ✅ Consistent code style
- ✅ Well-organized modules by feature
- Status: **Healthy**

#### Documentation
- ✅ README.md at root with project overview
- ✅ Per-artifact READMEs (hardhat, indexer, sdk, attester, ui, integration-tests)
- ✅ Specs in specs/ directory with detailed documentation
- ✅ DEPLOYMENT.md with comprehensive deployment instructions
- ✅ AGENTS.md for AI conventions
- ✅ Good use of TODO.md files for tracking
- Status: **Excellent**

#### Test Coverage
- ✅ Unit tests in hardhat (243 passing)
- ✅ Unit tests in SDK
- ✅ Unit tests in attester
- ✅ Integration tests covering major workflows
- ✅ Unit tests in UI (vitest)
- ✅ E2E tests in UI (playwright)
- Status: **Good**

#### Tech Debt
- ⚠️ 8 TODOs found (mostly around NoteIntent attestation system - known future work)
- ⚠️ Node.js v23.5.0 not officially supported by Hardhat (warning only)
- Status: **Low** (minor TODOs, mostly known future work)

#### Specialized Domain Reviews

**Smart contracts**:
- ✅ Compilation: Passes cleanly
- ✅ Unit tests: 243 passing tests
- ✅ Using Solidity 0.8.33 (has built-in overflow checks)
- ✅ No reentrancy vulnerabilities found in core contracts
- ✅ Access control properly implemented (onlyRecipient, etc.)
- ✅ Events emitted for all important state changes
- ✅ Event schema matches indexer expectations (AlignmentAttestation, etc.)
- ✅ No TODOs/FIXMEs in contracts
- Status: **Healthy**

**Indexer**:
- ✅ Uses Ponder for indexing
- ✅ Schema defined in ponder.schema.ts with federated architecture
- ✅ ABIs stored in indexer/abis/
- ✅ ABI sync process documented (npm run sync-abis)
- ⚠️ ABIs not in .gitignore - could drift if not careful
- ✅ Event handlers implemented for all major contracts
- Status: **Healthy** (minor: add indexer/abis to .gitignore)

**SDK**:
- ✅ Build passes (npm run build)
- ✅ TypeScript compilation succeeds
- ✅ Well-documented with README and usage examples
- ✅ Clear separation: actions (writes), graphql-queries (reads)
- ⚠️ Package.json uses ./src/index.js as main but no dist output committed
- Status: **Healthy**

**Integration tests**:
- ✅ Uses Docker Compose with healthchecks for proper orchestration
- ✅ Clean containers/volumes between runs
- ✅ SDK properly used for actions and GraphQL for queries
- ✅ waitForIndexerToSyncToTxHash() used consistently after all transactions
- ✅ Account isolation via createIsolatedTestClients() - each suite gets unique accounts
- ✅ Comprehensive coverage: workflows, conceptspace, delegation, fundingportal, marketplace, pubstarter, mutable-refs
- ✅ Environment validation with clear error messages
- ✅ Test suite can run full or filtered (e.g., `./run-integration-tests.sh delegation`)
- Status: **Healthy**

**UI**:
- ✅ Build passes (tsc + vite build)
- ✅ Uses React 19, MUI, TanStack Query, Wagmi
- ✅ Form validation with clear error messages
- ✅ Markdown sanitized via rehype-sanitize
- ✅ Loading states shown during async ops
- ✅ Error states displayed with Alert component
- ✅ Organized by feature (conceptspace/, shared/)
- ✅ Uses SDK properly
- ⚠️ No Error Boundary for catching crashes
- ⚠️ URL params (statementId, address) not strictly validated before use
- Status: **Healthy** (minor: add Error Boundary and validate URL params)

**Attester**:
- ✅ Build passes (npm run build)
- ✅ Well-organized: separate modules for blockchain, config, errors, evaluator, ipfs, payment, rateLimit
- ✅ Comprehensive error handling with BlockchainError classification
- ✅ Input validation on all endpoints (required fields, batch size limits)
- ✅ x402 payment protocol with validation
- ✅ Rate limiting configured
- ✅ Health endpoint with ETH balance check
- ✅ Has tests (rateLimit, payment, errors)
- Status: **Healthy**

**Overall health**: Good

**Action items**:
- [ ] Add indexer/abis to .gitignore
- [ ] Add Error Boundary component in UI
- [ ] Validate URL params (statementId, address) in UI pages
