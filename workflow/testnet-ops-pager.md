# Testnet ops pager

Built. Do not build a dashboard. The script is `scripts/testnet-ops-pager.mjs`. GitHub Actions runs it every 15 minutes (`.github/workflows/testnet-ops-pager.yml`) and opens or comments on an `ops-pager` issue only when a probe flips. Optional `OPS_PAGER_NTFY_TOPIC` posts to ntfy as well. State is the previous run's `pager-state` artifact, not a committed file.

A page of green dots will not get opened. The failure this is for is the opposite of a crash: the process stays up while the work stops. After the monthly-capacity backoff in `sdk/src/utils/rpc-budget.ts`, Render looks healthy while Alchemy is refusing calls. `commonality-alignment-trust-bootstrap`, `commonality-coherence-badge-worker`, and `commonality-published-data-ipfs-mirror` log once, leave their cursors unmoved, and sleep from 1 minute up to 6 hours. "HTTP up" is not a signal for them.

The verifier already probes a lot of the public edge (`verifier/checks/testnet/`: DNS, HTTP, RPC, indexer, app config, contracts) and `operations.indexer-lag` measures lag. None of that pages anyone, and none of it notices a Render service Render itself has suspended. `workflow/deployment.md` still leaves monitoring unchecked. This pager is the alert. A dashboard is what to add later only if the pager is noisy and the reason is hard to see.

## What to build

One script, run every 15 minutes from a GitHub Action or the existing verifier cron. It reads secrets from the places that already exist:

- `RENDER_API_KEY` from gitignored `.env.render`
- the Alchemy URL already used for the indexer (`PONDER_RPC_URL_84532` / `BASE_SEPOLIA_RPC_URL`)

Commit neither secret. Write the previous result to a small gitignored state file. Send mail or ntfy only when a probe changes between ok and not ok. Silence means nothing new. The first red message is the alert. One message when the last failure clears is the all-clear.

## Probes

Each probe is pass or fail with one sentence of why.

1. **Render suspend.** List the Commonality services. Fail if any `suspended` is not `not_suspended`. This is the check that would have named the three crash-looped workers.
2. **Alchemy.** One `eth_blockNumber` on the indexer RPC URL. Fail on a monthly-capacity 429 (`Monthly capacity limit exceeded` / `upgrade your scaling policy`). Do not retry that in a loop. A burst 429 (compute units per second, no monthly-capacity body) can be noted and retried once a minute later so it does not page. Do not fall back to `https://sepolia.base.org`. That endpoint prunes history and must not become the indexer RPC.
3. **Indexer lag.** `https://commonality-indexer.onrender.com/status` block versus the Alchemy head. Fail if the lag is more than about 10 minutes. A lag of a few blocks is normal (the hosted poll interval is a few seconds) and must not page.
4. **Public edges that users hit.** `https://testnet.commonality.works/config.json` returns 200 and chain `84532`. Platform API `/health` (`https://commonality-platform-api.onrender.com/health`) and cause-assist `/health` (`https://commonality-cause-assist.onrender.com/health`) return 200.
5. **Private IPFS.** `commonality-published-data-ipfs` has no public URL. Probe it through Render: not suspended, and the latest deploy is `live`. Do not open a public Kubo port to make a status page.

## Leave alone

- Do not add HTTP health servers to the three workers for this. Their pause is invisible on purpose; Alchemy and indexer lag are the outside signals.
- Do not scrape Render logs.
- Do not build a web UI.
- Do not call the Render API from inside a worker to unsuspend it.

## Message

The red message lists the failed probe names and the one-line reasons. When the cause is a suspended service, say to resume it in the Render dashboard. When the cause is a monthly-capacity 429, say to raise the Alchemy cap or wait for the billing period, and say not to wipe worker disks or bump start blocks. When every previously failing probe is ok again, send one recovery line.
