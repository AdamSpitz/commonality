# Alignment trust bootstrap

This operator service gives CauseStarter a useful, spam-revocable trust root while
the organic Subjectiv graph is young. It watches `AlignmentAttestation` events and
sets direct trust to 100 for each new attester. CauseStarter uses only this wallet's
direct trustees as its shipped fallback; a viewer with any personal direct-trust
declaration continues to use their own transitive graph.

## Moderation and controls

`DENYLIST_FILE` may be a JSON array or a line-oriented list of wallet addresses
(`#` comments are allowed). It is reloaded every poll. A listed wallet is revoked
on-chain with score 0 and cannot be automatically re-admitted. Create `PAUSE_FILE`
to stop scanning and writing without stopping the container. Denylist reconciliation
also stops while paused.

The service batches writes and limits the number of observed events processed per
poll. These are operational circuit breakers, not Sybil resistance. Monitor the
wallet balance and new-admission rate; pause the service during an attack.

Required configuration: `RPC_URL`, `CHAIN_ID`, `ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS`,
`TRUST_REGISTRY_ADDRESS`, `ALIGNMENT_TRUST_BOOTSTRAP_PRIVATE_KEY`, and `START_BLOCK`.
The public address belonging to the key is shipped to CauseStarter as
`VITE_DEFAULT_ALIGNMENT_TRUST_ROOT`.

For local development the Compose service uses Hardhat account #8. Edit
`data/alignment-trust-bootstrap/denylist.txt` to test revocation, or create
`data/alignment-trust-bootstrap/PAUSED` to pause it.
