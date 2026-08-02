# Policy-list starter profile example

`civility-starter-root.json` is the concrete operator-profile fixture for the Civility reference integration. It subscribes to the repository-hosted example list over HTTPS and pins its canonical sha256, so changing the URL's bytes cannot silently change an active policy.

The entries are conspicuous test identities, not a moderation dataset and not production policy. Run the resolver with:

```sh
npm run policy-lists:resolve --workspace=@commonality/sdk -- sdk/examples/policy-lists/civility-starter-root.json tmp/civility-policy-bundle.json
```

When the maintained list changes, validate and inspect the candidate bytes, calculate their canonical hash, then deliberately update `contentHash`. Until that edit is activated, resolution failure follows the layer's ordinary last-known-good behavior.

Publish the resolved bundle at a stable operator-controlled URL and set
`VITE_POLICY_BUNDLE_URL` for the Civility UI. Civility validates and atomically loads
that bundle before rendering; refresh failures retain the last-known-good evaluator
with `stale` status, while a cold start without a valid bundle reports `unavailable`.
