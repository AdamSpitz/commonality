# Platform API Service

Backend service that resolves platform identities, validates content ownership, and handles channel verification. This is the "backend thingy" referenced in TODO.md — the single service behind the platform API calls described in sibling docs [canonicalization.md](canonicalization.md#resolving-channel-prefixes) and [channel-claiming.md](channel-claiming.md#mvp-tweet-based-verification).

## What this service does

Three things, all built on the same platform API credentials:

1. **Channel prefix resolution** — resolve a platform handle or content URL to the stable channel ID needed for [content ID construction](canonicalization.md#content-ids-embed-channel-ids). Called by the UI during contract creation.
2. **Content validation** — verify that a piece of content exists and was authored by the claimed channel. Called by the UI during contract creation to catch mismatches before on-chain submission.
3. **Channel verification** — the [tweet-based proof flow](channel-claiming.md#mvp-tweet-based-verification) for channel claiming. Issue challenges, check the platform for the proof, sign `ChannelClaimProof`s.

## Endpoints

### `POST /resolve/channel`

Resolve a platform handle to a stable channel ID.

```
Request:  { platform: "twitter" | "youtube", handle: "@alice" | "UCxyz..." }
Response: { channelId: "twitter:uid:12345678", handle: "@alice", displayName: "Alice" }
```

For Twitter, resolves `@handle` → numeric user ID via the Users API. For YouTube, resolves `@handle` or custom URL → `UC`-prefixed channel ID via the YouTube Data API. Not needed for Substack (the publication subdomain is in the URL).

Results are cached indefinitely (stable IDs don't change). The handle→ID mapping is updated if we see a different handle resolve to the same ID.

### `POST /resolve/content`

Given a content URL, resolve the author's channel prefix and validate ownership.

```
Request:  { url: "https://x.com/alice/status/18347" }
Response: {
  platform: "twitter",
  channelId: "twitter:uid:12345678",
  contentSuffix: "18347",
  canonicalId: "twitter:uid:12345678:18347",
  metadata: { authorHandle: "@alice", text: "...", createdAt: "..." }
}
```

This does two things in one call:
1. Extracts the content-specific part from the URL (pure function — uses the same [canonicalization rules](canonicalization.md#content-canonical-forms) as the SDK)
2. Fetches the content via the platform API to resolve the author's stable ID and confirm the content exists

The UI calls this for each URL entered in the [create contract form](ui.md#create-contract-page). The response tells the UI whether the resolved author matches the channel the contract is being created for.

**Per-platform behavior:**

| Platform | API call | What it resolves |
|---|---|---|
| Twitter/X | `GET /2/tweets/:id?expansions=author_id&user.fields=id,username` | Tweet existence + author's numeric user ID |
| YouTube | `GET /youtube/v3/videos?id=:videoId&part=snippet` | Video existence + `snippet.channelId` |
| Substack | None — the publication subdomain is in the URL | N/A (validated client-side) |

### `POST /verify/challenge`

Issue a verification challenge for channel claiming.

```
Request:  { platform: "twitter" | "youtube" | "substack", handle: "@alice" | "UCxyz..." | "publication-name", claimantAddress: "0x..." }
Response: { nonce: "abc123...", channelId: "twitter:uid:12345678", postTemplate: "Claiming my funded content on @commonality — supporters pooled $340 for my housing thread https://... #commonality-abc123", deadline: 1720000000 }
```

Resolves the handle to a stable ID (reusing `/resolve/channel` internally), generates a nonce, and returns a human-readable post template containing the nonce. The nonce and associated data are stored server-side with a TTL (e.g., 30 minutes for Twitter/YouTube, 60 minutes for Substack to account for RSS propagation delay).

### `POST /verify/confirm`

Check that the verification post was published and sign a `ChannelClaimProof`.

```
Request:  { nonce: "abc123..." }
Response: { proof: { channelId, claimant, nonce, deadline, verifierSignature } }
```

The service:
1. Looks up the pending challenge by nonce
2. Checks the platform for a post containing the nonce:
   - **Twitter:** searches the user's recent tweets (Twitter recent search API or user timeline)
   - **YouTube:** checks the specified video's description via the YouTube Data API
   - **Substack:** fetches `https://<publication>.substack.com/feed` and searches RSS entries for the nonce
3. If found, signs the `ChannelClaimProof` with the service's Ethereum key
4. Submits the on-chain verification transaction on the creator's behalf (the service pays gas — this is user acquisition spend)
5. Returns the proof (and optionally the tx hash)

If the post isn't found, returns an error suggesting the user try again.

## Platform API costs and quotas

### Twitter/X

X moved to [pay-per-use pricing](https://postproxy.dev/blog/x-api-pricing-2026/) in February 2026. No free tier for new developers.

| Operation | X API cost | When it happens |
|---|---|---|
| User lookup (handle → ID) | $0.01 | Channel resolution, once per handle (cached) |
| Tweet lookup | $0.005 | Content validation during contract creation |
| Recent search / timeline read | $0.005 | Checking for verification tweets |

**Deduplication:** X doesn't charge for repeat reads of the same post within a 24-hour UTC window, so re-validating the same tweet during a contract creation session is free after the first call.

**Cost projection:** At MVP scale (say, 100 contract creations/month with ~5 content items each, plus 20 channel verifications/month), the X API cost is roughly:
- 100 channel resolutions (many cached): ~$1
- 500 tweet lookups: ~$2.50
- 20 verification searches: ~$0.10
- **Total: ~$4/month**

This is negligible. The pay-per-use model is actually favorable for our use case — low volume, bursty reads, with natural caching. We don't need streaming or archive search.

### YouTube

The [YouTube Data API v3](https://developers.google.com/youtube/v3/determine_quota_cost) is free with a quota of 10,000 units/day.

| Operation | Quota cost | When it happens |
|---|---|---|
| `videos.list` (video lookup) | 1 unit | Content validation during contract creation |
| `channels.list` (channel lookup) | 1 unit | Channel resolution |
| `search.list` | 100 units | Not needed for our use case |

At MVP scale, we use a handful of units per day. The free quota is more than sufficient. No API billing to configure.

### Substack

Substack has [no official API](https://iam.slys.dev/p/no-official-api-no-problem-how-i). But publications expose a public RSS feed at `<publication>.substack.com/feed`, which is enough for verification.

- **Channel resolution:** Not needed — the publication subdomain is already in the URL ([canonicalization.md](canonicalization.md#substack)).
- **Content validation:** The UI can validate Substack URLs client-side (check URL format, confirm the path matches `/p/<slug>`). Optionally, the service can fetch the Substack post page to confirm it exists (a simple HTTP GET, no API key needed).
- **Channel verification:** Post-based proof via RSS feed. The creator publishes a short post containing a nonce; the service fetches the RSS feed and searches for it. See [channel-claiming.md](channel-claiming.md#mvp-substack-post-based-verification) for the full flow.

| Operation | Cost | When it happens |
|---|---|---|
| RSS feed fetch | Free (public HTTP GET) | Checking for verification post |
| Post page fetch | Free (public HTTP GET) | Optional content existence check |

No API keys needed. No rate limits. The RSS feed is standard XML.

## Architecture

### Stack

Express service, same as the [content attesters](content-attesters.md). Deployed alongside the existing services in the docker-compose setup.

- **Runtime:** Node.js + Express
- **Platform SDKs:** Twitter API v2 client, Google APIs Node.js client (for YouTube)
- **Ethereum:** ethers.js for signing `ChannelClaimProof`s and submitting verification transactions
- **Cache:** In-process Map for the MVP, backed by a persistent store (SQLite or the existing Postgres) if the service restarts frequently enough for cold-cache costs to matter

### Ethereum key management

The service holds an Ethereum private key for two purposes:
1. Signing `ChannelClaimProof`s (the on-chain `ChannelRegistry` trusts this key as a verifier)
2. Submitting verification transactions on behalf of creators (paying gas)

This is the same trust model as the [implication attester](../conceptspace/implication-attester-ai.md) — a service with an Ethereum key that signs attestations. The key should be funded with enough ETH to cover gas for channel verifications (which are infrequent and cheap).

### Caching strategy

**What's cached:**
- Handle → stable channel ID mappings (indefinite TTL — these don't change)
- Content lookups (short TTL, e.g., 1 hour — content can be deleted)
- Pending verification challenges (TTL matching the challenge deadline, e.g., 30 minutes)

**Why a server-side cache instead of on-chain events:** The [canonicalization spec explains this](canonicalization.md#resolving-channel-prefixes) — on-chain `ContentItemRegistered` events could be polluted by attackers who bypass the UI and submit fabricated content IDs. The server-side cache is populated exclusively from verified platform API calls.

### Rate limiting

The service should rate-limit by caller to prevent API cost abuse:
- `/resolve/*` endpoints: generous limit (e.g., 60/minute per IP) — these are called during normal UI usage
- `/verify/*` endpoints: tight limit (e.g., 5/minute per IP) — these involve Twitter API searches and gas spend

### Error handling

Platform APIs go down. When they do:
- Channel resolution failures: return a clear error; the UI disables contract creation for that platform until resolution works again
- Content validation failures: return a clear error; the UI shows "couldn't verify this URL" and blocks submission
- Verification tweet not found: return "not found yet, try again" — don't sign a proof on failure

Never guess or fabricate a resolution. This aligns with the [canonicalization principle](canonicalization.md#principles): "When canonicalization is uncertain, the system should stop and say so."

## What this service is NOT

- **Not a content fetcher for display.** The UI can embed tweets/videos directly using platform embed widgets. This service resolves *identities*, not *content for rendering*.
- **Not an indexer.** It doesn't watch for on-chain events. The [event cache and fold architecture](indexer.md) handles that separately.
- **Not an attester.** Content quality evaluation is a separate service ([content-attesters.md](content-attesters.md)) with different prompts and a different trust model.

## Future work

- **Additional platforms.** Each new platform needs: a URL parser (in the shared SDK), a channel resolver (in this service), and a verification method. The service is structured per-platform, so adding one doesn't affect the others.
- **Substack custom domain resolution.** If users find it too annoying to convert custom-domain URLs to `*.substack.com` URLs manually, add a resolver that fetches the custom domain page and extracts the underlying publication subdomain.
