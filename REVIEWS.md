# General stuff to review every so often

I'm worried about this code base getting away from me. So let's try doing regular reviews of various components or aspects of the code base.

## Skills to use

Use the `project-wide-reviewer` skill, or whichever specific skills (mentioned inside the `project-wide-reviewer` skill) are relevant.

## Most recent reviews

### Review — 2026-02-16

STILL IN PROGRESS.

**Project context**: Blockchain application with smart contracts, Ponder indexer, SDK, integration tests, UI, and AI Attester service.

**Chunks completed**: [x] Smart contracts review, [x] Indexer review, [x] SDK review
**Chunks remaining**: [ ] Integration tests review, [ ] UI review, [ ] Attester review, [ ] Architecture coherence, [ ] Code quality patterns, [ ] Documentation completeness, [ ] Test coverage check, [ ] Tech debt assessment, [ ] Synthesis

**Commits since last review**: N/A - first review

**Findings**:

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

**Integration tests**: Not yet reviewed

**UI**: Not yet reviewed

**Attester**: Not yet reviewed
