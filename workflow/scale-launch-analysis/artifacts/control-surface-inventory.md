# Control Surface Inventory

**Baseline:** `c6faa0a6` · Independent pass over contracts, services, UI env, and specs (cross-checked against `specs/product/legal/what-we-host-and-control.md` and `workflow/security-recoverability.md`).

## 1. Architecture layers

| Layer | Path(s) | Role | Operator control |
|-------|---------|------|------------------|
| Smart contracts | `hardhat/contracts/` (~46 `.sol`) | Funds, beliefs, markets, delegation, content funding | Partial — see §2 |
| Indexer (Ponder) | `indexer/` | Thin event cache `GET /api/events` | **High** — env list of watched addresses defines visible universe |
| SDK folds | `sdk/src/**/folds.ts`, queries | Client-side entity state | Low (code published); defaults come from UI env |
| UI domains | `ui/src/domains/` (8 manifests) | Branded front doors | **High** — sole default operator of all 8 |
| Platform API | `platform-api-service/` | Channel resolve/verify, submissions, onramp sessions | **High** — sole money-gating verifier key path |
| AI services | `*-attester`, `*-finder`, `*-nudger`, `beat-agent`, `bridge-creator`, `explorer-curator`, `service-host` | Judgment layer | **High** — monoculture today |
| Edge | `cloudflare-*-gateway/`, Render (`render.yaml`) | Public hostname, proxy | **High** |
| Content | IPFS + Pinata, `docs/end-user` | Statements, UI builds, docs | Medium–High (pinning + DNS) |

## 2. Contract control map

### Permissionless / no deployer admin (protocol-shaped)

| Contract area | Path | Notes |
|---------------|------|-------|
| Beliefs / Implications | `hardhat/contracts/statements/` | Anyone can sign/attest |
| Alignment attestations | `hardhat/contracts/alignment-attestations/AlignmentAttestations.sol` | Permissionless events |
| Trust registry | `hardhat/contracts/subjectiv/TrustRegistry.sol` | User-set trust scores |
| Secondary market | `hardhat/contracts/marketplace/ERC1155SecondaryMarket.sol` | **No Ownable**; uncapped `pricePerToken > 0` only |
| Assurance / primary market (core) | `hardhat/contracts/individual-projects/` | Project creator is local owner of project instance |
| Nudge publications | `hardhat/contracts/nudger/NudgePublications.sol` | Publish path permissionless |

### Owner / trusted-key surfaces (platform-shaped)

| Control | Path | Risk |
|---------|------|------|
| `ChannelVerifier.trustedVerifier` + `setTrustedVerifier` | `content-funding/ChannelVerifier.sol:29–60` | **Critical:** compromised owner → forge claims → drain `ChannelEscrow` |
| `ChannelEscrow` withdraw only to verified owner | `content-funding/ChannelEscrow.sol` | Holds funds for unclaimed named channels |
| Factory third-party limits | `CreatorAssuranceContractFactory.sol` `thirdPartyMinPurchase`, `thirdPartyMaxDuration`, `onlyOwner` setters | Economic gates; defaults noted as placeholders in `hardhat/README.md` |
| `DelegatableNotes` factory authorizations | `delegation/DelegatableNotes.sol` (owner sets which markets notes may spend through) | Operator decides delegation spend rails |
| `CreatorGasTank` / sponsored gas | `sponsored-gas/` | Subsidy allocation = in-kind support surface |
| Content registry ownership | Factory-owned after deploy (`security-recoverability.md`) | Protocol-internal |

**Token assumptions (repeated in market + escrow natspec):** standard ERC-20 only (no fee-on-transfer, no rebase). MVP intended for **USDC only** (`hardhat/README.md`).

## 3. Off-chain chokepoints

| Control point | Location | Effect |
|---------------|----------|--------|
| Verifier private key | Deployed service secret `VERIFIER_PRIVATE_KEY` | Signs channel claims |
| Content submission queue | `platform-api-service` + `CONTENT_SUBMISSIONS_FILE_PATH` | Server-hosted pre-moderation queue |
| Rate limits | Platform API | Access allocation |
| On-ramp session endpoint | Platform API / Coinbase spike | Gates fiat entry (Coinbase moves funds) |
| Default attesters/nudgers | `VITE_DEFAULT_*` in `deployments/*.env` | Baked trust roots in every UI build |
| Indexer contract list | `indexer/ponder.config.ts` + env | Which deployments exist for users |
| DNS `*.commonality.works` | Cloudflare UI gateway | Naming monopoly |
| AI OpenRouter keys | Service secrets | Judgment generation under operator keys |

## 4. UI domain surface (multiplies legal display surface)

From `ui/src/domains/index.ts`:

1. `commonality`  
2. `lazyGiving`  
3. `alignment`  
4. `tally`  
5. `content-funding`  
6. `civility`  
7. `common-sense-majority`  
8. `conceptspace`  

Each is a separate build artifact (`VITE_DOMAIN`) with shared code. Political-adjacent: **civility**, **common-sense-majority**.

## 5. Deploy / maturity facts

| Fact | Evidence |
|------|----------|
| Mainnet not deployed | `workflow/project-status.md`; `deployments/mainnet.env` is a template shell |
| Testnet: Base Sepolia | `deployments/base-sepolia.*` manifests present |
| MVP claimed implemented | `specs/product/mvp.md` |
| Deferred: fiat bridges, full embedded-wallet path, unique-human ID, fold accumulator storage | `mvp.md`, `specs/tech/indexer/README.md` |

## 6. Honest protocol vs platform split

| Subsystem | Characterization at launch |
|-----------|----------------------------|
| Conceptspace beliefs/implications (contracts) | Near-protocol |
| LazyGiving assurance + primary market | Near-protocol; **market + marketing** re-platformize |
| Secondary market contract | Protocol-shaped code; **operator UI + profit narrative** = exchange optics |
| Delegation (minus factory auth keys) | Mostly protocol |
| Content funding + channel verify | **Platform** |
| Civility / CSM judgment layer | **Editorial platform / movement** |
| Eight default UIs + indexer + AI | **Platform** |

## 7. Remediation levers (control, not product)

1. Ship ≥1 trustless channel verifier path before mainnet (`specs/tech/subsystems/content-funding/channel-claiming.md` trajectory).  
2. Finish owner-key triage: cold admin / multisig / eliminate cheap levers (`workflow/security-recoverability.md`).  
3. Feature-flag or redesign secondary market before enabling community UIs with trading.  
4. Publish alternative-provider docs; recruit second real operator.  
5. Subjectiv first-run: do not show unfiltered attestations.  
6. Move submission queue ownership model to explicit UI-operator layer.
