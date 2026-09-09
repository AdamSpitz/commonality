# Two-person testnet lab — what “usable” means

Adam and Sam should be able to use the deployed Base Sepolia stack as a shared lab without fighting ops.

Minimum journey:

1. Open `https://causestarter.testnet.commonality.works` over HTTPS. The shell loads. `config.json` points at deployed indexer / contracts / cause-assist / implication attester — not localhost.
2. A second client (second browser profile, second origin fetch, or a second HTTP client with no shared cache) sees the same on-chain world after a short indexer delay.
3. If you can sign with two wallets: one wallet writes something small (sign / publish / bookmark / attest), the other wallet’s session can find that write via the UI or via the indexer event cache.
4. Happy-path pages do not time out. Cause-assist suggest/atomize is a bonus if CORS allows it.

Out of scope: mainnet, mass fake activity, dummy implication attestations to green `app-config`, funding live `VERIFIER_ADDRESS`.

Existing deterministic proof: `testnet.onchain-to-indexer` and `testnet.published-data` (mutation opt-in). This check is the *human-shaped* overlay: does the live site actually feel like two people can share it?
