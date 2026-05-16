# Continuity notes for ephemeral AI instances

## 2026-05-16 — Beat Agent UI explanation tooltip

- Continued the beat-agent P1 auditability item in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `ui/src/content-funding/components/ContentAttestationSummary.tsx` now loads a trusted beat agent's `/status/:statementCid/:contentCanonicalId` endpoint when that trusted entry has a `serviceUrl`, fetches the returned `explanationCid` from IPFS, and displays reasoning plus compact local/ambient citation details in the attestation tooltip.
- The tooltip shows source-author count, time span, and diversity score when available; if no service URL is configured, it tells users to add one in Settings.
- Updated the beat-agents spec to mark tooltip-level explanation/citation display done while leaving full audit/detail UI and stronger thin-context surfacing as follow-ups.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentAttestationSummary.test.tsx`, `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and LSP diagnostics clean for the changed component. LSP diagnostics for the `.test.tsx` file still show the repo's known test-file JSX config issue, but `tsc` and Vitest pass.

## 2026-05-16 — Beat Agent status API existing-attestation metadata

- Added a small common-attester extension point: `registerCommonAttesterRoutes` now accepts optional `getStatus`, while preserving the existing placeholder behavior when omitted.
- Wired beat-agent `/status/:statementCid/:contentCanonicalId` to return the same existing-attestation lookup used for idempotency (JSONL local optimization, then chain). This gives callers `exists: true` and prior metadata such as `explanationCid` when available from the log.
- Added HTTP coverage in `beat-agent/test/app.test.ts`; attester-core placeholder status behavior remains covered.
- Updated `beat-agent/README.md` and the beat-agents spec to mark the status-API slice of explanation/citation surfacing as partially done. UI retrieval/rendering of explanation documents is still open.
- Checks passed: `npm run build --workspace=@commonality/attester-core`, `npm test --workspace=@commonality/attester-core` (49/49), `npm test --workspace=@commonality/beat-agent` (56/56), typecheck/lint for both packages, LSP diagnostics clean.

## 2026-05-16 — Beat Agent chain-backed idempotency partial fix

- Continued the beat-agent P0 durable-idempotency item from `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- Added on-chain `AlignmentAttestations.hasAttestation` lookup in `beat-agent/src/blockchain.ts`, exported it, and wired `createBeatAgentApp` to check JSONL first as a local optimization, then the chain before resolving/evaluating/publishing content.
- Added `beat-agent/test/blockchain.test.ts` for the exact attestation tuple: attester address, topic CID, content canonical ID hash, and statement CID.
- Updated `beat-agent/README.md` and the beat-agents spec. The P0 idempotency item is now partially done; remaining gap is safe duplicate suppression across multi-instance/concurrent deployments (transactional reservation/store or a publish path that avoids duplicate events).
- Checks passed: `npm test --workspace=@commonality/beat-agent` (55/55), `npm run typecheck --workspace=@commonality/beat-agent`, `npm run lint --workspace=@commonality/beat-agent`, LSP diagnostics clean.

## 2026-05-16 — Beat Agent full audit dialog

- Continued the beat-agent P1 auditability item in `specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md`.
- `ui/src/content-funding/components/ContentAttestationSummary.tsx` now lets users click trusted beat-agent chips to open a full audit dialog, loading the beat-agent status/explanation document and showing decision metadata, full reasoning, all local context citations, and all ambient citation details/examples.
- Kept the existing tooltip as the compact preview and added Vitest coverage for the full dialog path.
- Updated `beat-agent/README.md` and the beat-agents spec; the remaining P1 UI auditability gap is making thinly sourced ambient context visually/trust-policy distinct from well-supported context.
- Checks passed: `npm run test:vitest --workspace=ui -- src/content-funding/components/ContentAttestationSummary.test.tsx`, `npm run typecheck --workspace=ui`, `npm run lint --workspace=ui`, and LSP diagnostics clean for the changed component.
