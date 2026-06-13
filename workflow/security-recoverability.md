# Security & recoverability for an LLM-operated project

Adam runs this project largely through LLMs. This doc records the threat
analysis (June 2026) of what an LLM — confused, prompt-injected, or malicious —
could do that we *couldn't recover from*, and the to-do list for closing those
gaps. The goal is **not** to lock LLMs out; it's to make every plausible
mistake recoverable, so LLMs can keep doing as much as possible.

Companion: [deployment.md](./deployment.md) (what deploys where),
[task-tiers.md](./task-tiers.md) (Ask/Tell/Trust autonomy vocabulary used in
the to-do list below).

## Threat model — what actually matters

Ordered by "how screwed are we, and can we recover":

1. **Secret leakage.** `.env.secrets` (repo root, plaintext) holds ~20 private
   keys and API tokens, and the local Claude permission settings allow
   `Read(*)`, `cat`, `curl`, `node -e` — so any session, including one
   prompt-injected via fetched web content, can read and exfiltrate them.
   Leak recovery = rotation, but some keys are effectively *not* rotatable
   (ENS owner; contract-admin keys, see §contract audit).
2. **Secret loss.** Gitignored secrets exist only in the working tree; an
   allowed `rm` or `git clean -fdx` could destroy them.
   *Status: mitigated — Adam already keeps an offline backup of `.env.secrets`.*
3. **Quiet integrity corruption.** Plausible-looking committed changes to
   trust roots (`VITE_DEFAULT_TRUSTED_ATTESTERS`, `VITE_DEFAULT_NUDGERS` in
   `deployments/<network>.env`), malicious npm deps, contract tweaks before
   deploy. Recoverable via git *if noticed* — detection is the gap, not backup.
4. **External-account destruction.** Cloudflare global API key (can delete
   zones/DNS), Render API key (delete services, inject env vars), Pinata JWT
   (unpin everything), OpenRouter/X/YouTube keys (spend money, get banned).
   All recoverable but painful; scoping the tokens shrinks the blast radius.
5. **Git history destruction.** Two remotes (GitHub + GitLab) already provide
   redundancy, but `git push` is allowlisted and a force-push could trash
   both unless branches are protected.
6. **Indexer/local data loss.** Non-issue by design: chain is the source of
   truth, Ponder DB and local IPFS are derived/ephemeral.

## Secrets inventory: two buckets

Verified against `render.yaml.template` (the complete list of what deployed
services consume) and `grep` over the scripts.

| Bucket | Secrets | Proper home |
|---|---|---|
| **Service secrets** — needed by the running app | Agent wallet keys (implication-attester, content-attester, beat-agent, implication-graph-nudger, bridge-creator, explorer-curator, recurring-pledge-scheduler), `VERIFIER_PRIVATE_KEY`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`, `X_API_BEARER_TOKEN`, RPC URLs | Render dashboard (`sync: false` entries). Local copies fine — these are rotatable, low-stakes hot keys with small balances. |
| **Operator secrets** — only for occasional maintenance/setup, never consumed by deployed services | `DEPLOYER_PRIVATE_KEY`, `ENS_OWNER_PRIVATE_KEY`, all 11 `IPNS_PRIVATE_KEY_*`, `PINATA_JWT`, `CLOUDFLARE_API_KEY`, `RENDER_API_KEY` | Outside the repo tree (e.g. `~/.secrets/commonality/`), sourced on demand by the scripts that need them. ENS owner key (and mainnet contract-admin key) fully cold — hardware wallet / separate machine. |

Key facts:

- `ENS_OWNER_PRIVATE_KEY` is used only by `scripts/update-ens.sh`,
  `scripts/create-ens-subdomains.sh`, `scripts/lib/setup-testnet-naming.js`,
  `scripts/lib/update-ens-contenthash.js`. Routine UI releases publish via
  **IPNS** and never touch ENS, so this key is needed only for naming
  setup/changes. It can go fully cold.
- `deployments/operator-addresses.env` contains public operational addresses (not secrets), including
  `CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS`.

## Contract audit (June 2026)

What a compromised key could actually do onchain:

- **Permissionless (no owner powers at all):** Beliefs, Implications,
  alignment-attestations, nudger, subjectiv, marketplace contracts.
- **No direct drain anywhere.** `AssuranceContract.withdraw()` pays only the
  designated recipient; `ChannelEscrow.withdraw()` pays only the verified
  channel owner (`ChannelEscrow.sol:102`). No `selfdestruct`, no
  upgradeability, no pause.
- **One indirect drain path:** the deployer owns `ChannelVerifier`, and
  `setTrustedVerifier()` (`ChannelVerifier.sol:55`) is `onlyOwner`. A
  compromised owner installs an attacker verifier → forges channel-ownership
  verifications → withdraws *other users'* escrowed funds from
  `ChannelEscrow`. Related owner powers in the same trust-root family:
  `ChannelRegistry.setVerifier()/setFactoryAuthorization()/setVetoWindowDuration()`,
  `DelegatableNotes.setPrimaryMarketFactoryAuthorization()/setSecondaryMarketFactoryAuthorization()/setRecurringPledgeRegistry()`,
  `ProspectiveContentTokens.setPrimaryMarket()`. (`ContentRegistry`'s
  ownership is already transferred to the factory at deploy time,
  `hardhat/scripts/deploy.js:280`.)
- **`PremintingERC20.mint()` is `onlyOwner`** — infinite mint of the payment
  token. Testnet-only concern (USDZZZ); mainnet must use real USDC, at which
  point this disappears. Treat "payment token is a real stablecoin, not ours"
  as a mainnet precondition.
- **No recovery from owner-key compromise:** these contracts are
  `Ownable2Step` but not upgradeable/pausable, so an attacker can
  `transferOwnership` away permanently; the only fix is redeploy + migrate.
  Conclusion: **"deployer" and "contract admin" must be separate roles.**
  Once admin ownership lives on a key that never touches this machine, the
  deployer key really is just gas money, and its compromise is fully
  recoverable (rotate, refund).

## To-do list

Tagged with [task tiers](./task-tiers.md). Items marked **(Adam)** need human
hands (hardware, dashboards, account access) and should just be surfaced in
`inbox.md` when an LLM gets to them.

### Secrets handling

- [ ] (Tell) Split `.env.secrets` into the two buckets above: keep service
      secrets where the local stack expects them; move operator secrets to a
      directory outside the repo tree (e.g. `~/.secrets/commonality/`), and
      update the scripts that consume them (`setup-env.sh`, `update-ens.sh`,
      `publish-ipns.sh`, `deploy-testnet*.sh`, `generate-render-secrets.mjs`,
      etc.) to source from there. Update `workflow/deployment.md` and
      `.env.secrets.example` accordingly.
- [ ] (Tell) Tighten `.claude/settings.local.json`: add `permissions.deny`
      rules for the secrets paths; remove `curl:*`, `rm:*`, `node -e:*`, and
      `sudo chown:*` from the allowlist (accepting more permission prompts as
      the cost). Note: deny rules are a speed bump, not a guarantee — the
      real fix is the bucket split above. (USER'S NOTE: honestly, don't even bother, it's not real security, I'm just going to get into the habit of tapping "okay" without really examining.)
- [x] (Tell) Rename `deployments/wallets.env` to `deployments/operator-addresses.env`
      and fix the references.
- [ ] **(Adam)** Move `ENS_OWNER_PRIVATE_KEY` to cold storage after the
      bucket split; confirm the offline backup of all operator secrets is
      current and restorable.

### Onchain blast radius

- [x] (Ask) Add a post-deploy step to `hardhat/scripts/deploy.js` that
      transfers ownership of deployed admin-controlled contracts to a configurable
      `CONTRACT_ADMIN_ADDRESS`, distinct from the deployer. The script now
      initiates `Ownable2Step` transfer for `ChannelVerifier` and
      `ChannelRegistry`, and directly transfers `DelegatableNotes` ownership.
      `ProspectiveContentTokens` are per-project tokens, not deployed by this
      script; the current test payment token is `FreeERC20` and has no owner.
- [x] (Tell) Add `hardhat/scripts/accept-admin-ownership.js` so Adam can run the
      manual `Ownable2Step` accept phase without hand-crafting transactions.
      Usage after a non-local deploy:
      ```bash
      ./scripts/accept-admin-ownership.sh base-sepolia
      ```
      Keys are read automatically from the operator secrets file. The helper
      verifies that `CONTRACT_ADMIN_PRIVATE_KEY` derives `CONTRACT_ADMIN_ADDRESS`,
      calls `ChannelVerifier.acceptOwnership()` and `ChannelRegistry.acceptOwnership()`,
      and verifies `DelegatableNotes.owner()` already equals the admin address.
      The admin account needs a little network ETH for gas.
- [ ] **(Adam)** Add the new admin address to `deployments/operator-addresses.env`
      as `CONTRACT_ADMIN_ADDRESS` before the next non-local deploy, then run the
      accept script above after deploy. (Use a hardware wallet now; consider a
      Safe multisig before mainnet.)
- [x] (Tell) Document in `workflow/deployment.md` mainnet preconditions:
      real-stablecoin payment token (no project-owned mintable test token), admin
      ownership on cold key/Safe, deployer key holds gas money only.

### External accounts

- [ ] **(Adam)** Replace the global `CLOUDFLARE_API_KEY` with a scoped API
      token (DNS-edit on the specific zones only); scope the Render and
      Pinata tokens as narrowly as their dashboards allow; set an OpenRouter
      spend limit.

### Detection (verifier checks — see [using-verifier workflow](../verifier/README.md))

- [x] (Ask) Add gating verifier checks for: (a) drift in the trusted-attester
      /nudger lists in `deployments/<network>.env` vs. a recorded baseline;
      (b) onchain owner of `ChannelVerifier`/`ChannelRegistry`/
      `DelegatableNotes` still equals the expected admin address;
      (c) new entries in `package-lock.json` dependencies since last review.
      Implemented as `security.trust-roots`, `security.onchain-owners`, and
      `security.package-lock-dependencies`; all are wired into `facet.security`.
- [x] (Tell) Add an advisory verifier check on agent-wallet balances/nonces
      (unexpected spend or activity). Implemented as
      `security.agent-wallet-activity`, also wired into `facet.security`.

### Git / repo durability

- [ ] **(Adam)** Enable branch protection (no force-push, no deletion) on
      `master` and `dev` at both GitHub and GitLab.
- [ ] (Tell) Set up a periodic off-machine backup of the working tree
      including untracked files (restic or borg), excluding `node_modules`
      and other regenerable artifacts; document the restore procedure.
