# Policy-list starter profile example

`civility-starter-root.json` is the concrete operator-profile fixture for the Civility reference integration. It subscribes to the repository-hosted example list over HTTPS and pins its canonical sha256, so changing the URL's bytes cannot silently change an active policy. That raw GitHub URL is live on `dev`, so a clean cold-start resolution reaches the shared layer. It also attaches the pinned `civility-starter-exceptions.json` file to that layer. The exception exempts only the matching entry from this layer; it is not a global allowlist.

The entries are conspicuous test identities, not a moderation dataset and not production policy.

## Select and activate the profile

Review the root's sources, action map, and `onError` behavior before adopting it. Resolve every pinned artifact and atomically activate the resulting bundle with:

```sh
npm run policy-lists:resolve --workspace=@commonality/sdk -- examples/policy-lists/civility-starter-root.json ../tmp/civility-policy-bundle.json
```

Inspect the active layers and a decision by passing the exact canonical subject JSON:

```sh
npm run policy-lists:inspect --workspace=@commonality/sdk -- ../tmp/civility-policy-bundle.json
npm run policy-lists:inspect --workspace=@commonality/sdk -- ../tmp/civility-policy-bundle.json '{"type":"cid","value":"bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m"}'
```

The output names the enforced bundle digest, sequence, layer and exception status, pinned hashes, and lookup provenance. Record the digest that is being deployed; the UI and operator-controlled serving surface must report the same digest.

## Adopt a maintained-list update

When the HTTPS maintainer publishes new bytes:

1. Download them without changing the active root and review them as untrusted input.
2. Strictly validate the document and calculate the sha256 of its RFC 8785 canonical bytes. Resolving a temporary copy of the root against a separate candidate bundle is the simplest validation path.
3. Inspect representative additions and removals. Automatic diff acceptance is intentionally not part of this pinned starter profile.
4. Change the layer's `contentHash` only after approving those exact bytes, run `policy-lists:resolve`, and deploy the newly activated bundle.
5. Confirm that the reported browser and serving digests equal the resolver's digest.

Until the pin is changed, different bytes at the URL fail resolution and the closed layer retains its last-known-good artifact.

## Add or remove a scoped exception

Edit `civility-starter-exceptions.json`, strictly validate and canonically hash the new document, then update only the attached exception's `contentHash`. Resolve and inspect the result before deployment. Removing an entry restores the shared layer's assertion; removing the whole `except` object removes this layer's exception list. An exception never overrides another layer.

## Roll back safely

Keep previously deployed root inputs, not an old generated bundle. Restore the approved pins/files in the root and run the resolver again so it creates a new, higher-sequence bundle. Activation rejects replaying an older bundle sequence even when its contents were formerly valid.

## Publish the resolved bundle (testnet)

For testnet the resolved bundle is committed to this directory as
`civility-policy-bundle.json` and served from its raw GitHub URL on `dev`. That URL
is recorded once in `deployments/base-sepolia.env` as `POLICY_BUNDLE_URL`, which
feeds both the platform API (via `render.yaml`, regenerated with
`node scripts/generate-render-yaml.mjs`) and the Civility UI's
`VITE_POLICY_BUNDLE_URL` (via `scripts/setup-env.sh`).

To publish an update, resolve into the tracked file and commit it:

```sh
npm run policy-lists:resolve --workspace=@commonality/sdk -- \
  examples/policy-lists/civility-starter-root.json \
  examples/policy-lists/civility-policy-bundle.json
```

Each resolve mints a higher `sequence`; activation refuses to load an older one, so
publish bundles in the order they were resolved. The committed bundle must be
reachable at its URL **before** any service is pointed at it: the platform API and a
testnet Civility UI both fail closed on a bundle they cannot load.

Note that this puts the bundle and the maintainer's shared list on the same origin,
so GitHub write access controls both. The layer's `contentHash` pin still constrains
the list; the bundle itself is unpinned. A separate operator-controlled origin is the
right move before mainnet.

Publish the resolved bundle at a stable operator-controlled URL and set
`VITE_POLICY_BUNDLE_URL` for the Civility UI. Civility validates and atomically loads
that bundle before rendering; refresh failures retain the last-known-good evaluator
with `stale` status. A testnet or mainnet Civility cold start without a valid bundle
refuses to render; local development may start with `unavailable` status. Civility
does not consult the legacy `VITE_DISPLAY_DENYLIST_URL`, so every policy decision is
attributable to the activated bundle digest.

This starter machinery reduces dataset and integration work; it does not transfer policy ownership. The operator still chooses the profile and pins, receives reports, handles appeals, and owns incident response. The maintainer supplies example list bytes only. Mutable unpinned following, automatic diff holds, richer alerts, registry publication, admission policy, and money screening remain outside this starter profile.
