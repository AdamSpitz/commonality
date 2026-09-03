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

## Base Sepolia operations

The Render worker `commonality-alignment-trust-bootstrap` mounts its persistent
disk at `/data`. Generate its dedicated wallet with
`node scripts/generate-wallets.mjs`, fund `ALIGNMENT_TRUST_BOOTSTRAP_ADDRESS`
with the normal `scripts/fund-base-sepolia-wallets.mjs` distribution, and paste
the worker block printed by `node scripts/generate-render-secrets.mjs` into its
Render Environment tab. Never substitute the checked-in Hardhat #8 key.

Use the Render Shell for the worker's controls:

```sh
touch /data/PAUSED
# Keep ALIGNMENT_TRUST_DENYLISTED_ADDRESS from deployments/operator-addresses.env
# in this one-address-per-line file. Comments are allowed.
vi /data/denylist.txt
rm /data/PAUSED
```

Pause first during an attack, inspect the wallet balance and recent
`TrustSet`/`AlignmentAttestation` events, then edit the denylist. No scanning or
denylist reconciliation occurs while paused. A listed wallet is written to 0
on the next poll after resuming and cannot be automatically re-admitted.
Removing it permits a later observed vouch to re-admit it; removal does not
immediately write 100. Back up the denylist before replacing the Render disk.

After installing the key, run `./scripts/setup-env.sh base-sepolia`. The public
address generated into `deployments/operator-addresses.env` becomes
`VITE_DEFAULT_ALIGNMENT_TRUST_ROOT` in both `ui/.env` and
`causestarter/.env`. Then run `./scripts/verifier-testnet.sh --mutation`;
`testnet.alignment-trust` publishes a vouch and proves the root assigns its
attester 100 while the denylist canary remains at 0.
