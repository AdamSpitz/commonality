# Add a mediator to your cause

A mediator watches the context you choose and proposes bridge triples: one statement for each of two founder-named sides, plus common ground both imply. Supporters see its suggestions only after opting in.

## Scaffold the instance

```bash
npm run scaffold --workspace=@commonality/bridge-creator -- \
  --founding-statement "Your cause's founding statement" \
  --name "Your cause mediator" \
  --output ../../my-mediator.json
```

The generated `provisional-v1` artifact intentionally contains obvious blanks. In particular, **Commonality does not supply a default strategy prompt**. Write the policy and mediation judgment you intend to operate under, name `side_a` and `side_b`, add a few complete `side-a` / `side-b` / `common-ground` anchor clusters, and configure inspectable context sources.

The artifact names the environment variable containing the signer key; it never contains the key. Set that secret only in the runtime environment, then start with:

```bash
BRIDGE_CREATOR_MEDIATOR_CONFIG_PATH=./my-mediator.json \
OPENROUTER_API_KEY=... ETHEREUM_RPC_URL=... \
NUDGE_PUBLICATIONS_CONTRACT_ADDRESS=... MY_MEDIATOR_PRIVATE_KEY=... \
npm start --workspace=@commonality/bridge-creator
```

Set `signer_private_key_env` to `MY_MEDIATOR_PRIVATE_KEY` in the artifact for that example. Other chain, IPFS, model, scheduling, and state settings remain operational environment variables rather than founder policy.

Review reflected anchors with the same artifact:

```bash
npm run anchors --workspace=@commonality/bridge-creator -- --config ./my-mediator.json list-proposed
npm run anchors --workspace=@commonality/bridge-creator -- --config ./my-mediator.json approve <anchor-id>
```

## Publish the reusable UI blocks

A cause record may advertise the mediator's signer address, public service URL, name, and description. The reusable bridge display reads `GET /anchors?featured=true` and accepts founder labels plus an optional bundled fallback; the opt-in block creates the existing Tally `?addNudger=…` link from that cause-owned identity. Public mediator endpoints enable browser CORS by default (`BRIDGE_CREATOR_CORS_ORIGINS` can restrict origins). CSM keeps its bundled reference anchors when no service is deployed or a configured service is temporarily unavailable. Do not present a founder mediator without both its address and service URL.

## Honest v1 limitation

Without a live beat-agent context source, this is an **anchors-only mediator**. It can still expose curated featured bridges, but it cannot honestly claim to react to current cause activity. Add and rehearse a beat-agent before making that claim.

## Provisional schema

`provisional-v1` is deliberately provisional for one revision. The first live founder/CSM rehearsal may show that a knob should move or disappear. Do not build a registry or long-lived compatibility promise around this initial artifact yet.
