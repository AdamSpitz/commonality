# Smart Contract TODOs

## No attestation revocation
`Implications` and `AlignmentAttestations` have no way to remove an attestation once set. If an attester wants to retract, they currently can't. Add `removeAttestation()` functions (or decide this is intentional and document why).

## `topicStatementId` not stored in AlignmentAttestations mapping
The `topicStatementId` in `AlignmentAttestations` is emitted in events but not stored — the mapping only tracks `(attester, subject, statementId)`. So `hasAttestation()` can't distinguish attestations made with different topics. This is probably fine (the indexer uses events), but verify it's intentional.

## Missing NoteIntent tests
`NoteIntent.sol` has no test file. Add tests covering single attestation, batch attestation, validation errors, and the getter.

## Deploy script duplication
`scripts/deploy.js` and `scripts/deploy-local.js` have heavily duplicated logic. Consider consolidating into one script (the main difference is deploy.js saves a timestamped JSON and deploy-local.js doesn't).

## Redundant `_erc1155` getter in ERC1155SecondaryMarket
`_erc1155` is `public` (auto-generates a getter) and there's also a manual `erc1155()` view function. Remove one or the other.

## PremintingERC20 is unused outside tests
`PremintingERC20.sol` exists in utils but nothing references it in deployment scripts or factories. It's only used in DelegatableNotes tests. Either remove it or add it to the deployment if it's needed.

## FreeERC1155Factory not deployed
`FreeERC1155Factory` is defined in `Pubstarter.sol` but not deployed in either deploy script. Deploy it if needed, or remove it.

## Error naming in ERC1155SecondaryMarket
`AmountMustBeGreaterThanZero2` and `MustSendETH` (used for buy order validation) have confusing names. `MustSendETH` actually means "price must be non-zero." Rename to something clearer like `CountMustBeGreaterThanZero` and `PriceMustBeGreaterThanZero` (matching the sale listing errors).
