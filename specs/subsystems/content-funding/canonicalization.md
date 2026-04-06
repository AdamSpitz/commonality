# Canonicalization

Rules for turning platform URLs and identities into stable canonical IDs before hashing, registering, or claiming.

## Scope

This system supports a fixed list of platforms: **Twitter/X**, **YouTube**, and **Substack**. That's it for MVP.

This is a deliberate choice, not a limitation we're working around. Channel claiming requires platform-specific ownership verification (see [channel-claiming.md](channel-claiming.md)), so we can never support arbitrary platforms anyway. These three cover the content types that matter most for the [noninflammatory content](noninflammatory-content/) use case and can be expanded later.

## The two problems

Canonicalization serves two goals that are related but separable:

1. **ID format**: What is the canonical identifier for a content item or channel? This is the core of this document.
2. **Duplicate detection**: What happens when the same real-world content ends up registered under two different IDs? This is mostly a non-problem if the ID format is right (see [Duplicates](#duplicates) below), and any remaining edge cases can be handled later via a flagging mechanism.

## Principles

1. **Content IDs combine a URL-derived component with an API-resolved channel prefix.** The content-specific part (tweet ID, video ID, slug) is extracted from the URL as a pure function. The channel prefix (numeric user ID, channel ID) requires a one-time API call — the same call used for channel claiming. Once resolved, the result is cached (see [Resolving channel prefixes](#resolving-channel-prefixes)). Substack is the exception: the publication subdomain is already in the URL, so no API call is needed.
2. **Channel IDs use the platform's numeric/opaque stable ID.** Resolved via API at claim time, then cached. Handles change; numeric IDs don't.
3. **Strip noise.** Tracking params, fragments, and domain aliases are not part of identity.
4. **Reject ambiguous inputs.** When canonicalization is uncertain, the system should stop and say so. Never silently collapse two things into one, and never silently split one thing into two.
5. **Handles and display names are metadata, not identity.** They can be stored alongside canonical IDs for UX, but they are not part of the hash.


## Content canonical forms

### Twitter/X

**Canonical form:** `twitter:uid:<numericUserId>:<tweetId>`

The tweet ID is the numeric status ID from the URL. The user ID is the author's stable numeric ID, resolved via the Twitter API — the same lookup used for channel claiming. The URL alone gives the tweet ID; the user ID requires a one-time API call at contract-creation time.

| Input URL | Canonical form |
|---|---|
| `https://twitter.com/alice/status/18347` | `twitter:uid:12345678:18347` |
| `https://x.com/alice/status/18347` | `twitter:uid:12345678:18347` |
| `https://x.com/alice/status/18347?s=20&t=abc` | `twitter:uid:12345678:18347` |
| `https://twitter.com/alice/status/18347#m` | `twitter:uid:12345678:18347` |

**Normalization rules:**
- Accept both `twitter.com` and `x.com` domains
- Extract the numeric status ID from the URL path
- Resolve the author's numeric user ID via the Twitter API (the same call used in channel claiming)
- Drop all query parameters and fragments
- Reject URLs that do not contain a numeric status ID (e.g., profile URLs, search URLs)

### YouTube

**Canonical form:** `youtube:channel:<channelId>:<videoId>`

The video ID is the 11-character alphanumeric string from the URL. The channel ID is the `UC`-prefixed stable identifier for the uploading channel, resolved via the YouTube API. The URL alone gives the video ID; the channel ID requires a one-time API call at contract-creation time.

| Input URL | Canonical form |
|---|---|
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | `youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ` |
| `https://youtu.be/dQw4w9WgXcQ` | `youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ` |
| `https://www.youtube.com/shorts/dQw4w9WgXcQ` | `youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ` |
| `https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s` | `youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw:dQw4w9WgXcQ` |

**Normalization rules:**
- Accept `youtube.com`, `www.youtube.com`, and `youtu.be` domains
- Accept `watch?v=`, `youtu.be/`, `shorts/`, and `embed/` URL formats
- Extract the video ID; drop all other query parameters and fragments
- Resolve the uploading channel's `UC`-prefixed channel ID via the YouTube API
- Reject URLs that do not contain a video ID (e.g., channel pages, playlist pages without a current video)

### Substack

**Canonical form:** `substack:<publication>/<slug>`

The publication is the Substack subdomain (e.g., `example` from `example.substack.com`). The slug is the post's URL slug.

| Input URL | Canonical form |
|---|---|
| `https://example.substack.com/p/my-post` | `substack:example/my-post` |
| `https://example.substack.com/p/my-post?utm_source=twitter` | `substack:example/my-post` |
| `https://customdomain.com/p/my-post` (custom domain) | See note below |

**Normalization rules:**
- For `*.substack.com` URLs, extract subdomain as publication and slug from `/p/<slug>`
- Drop all query parameters and fragments
- Reject URLs that are not post URLs (e.g., publication home pages, about pages)

**Custom domains:** A custom domain URL can't be canonicalized without a lookup to determine the underlying Substack publication. The system should reject custom-domain URLs and ask the user to provide the `*.substack.com` URL instead. If this turns out to be too annoying in practice, we can add a resolver later.

**Channel prefix:** The publication subdomain is already the leading component of the content ID (`substack:example/my-post` → channel `substack:example`). Substack content IDs have always embedded their channel identity; no format change is needed here.

**Stability note:** Substack post slugs can technically be edited by the author, but this is rare. We accept this small risk in exchange for not needing API calls. If it becomes a real problem, we can migrate to Substack's internal numeric post IDs (available via API).


## Channel canonical forms

Channels use the platform's stable numeric/opaque ID, not handles. This requires an API call to resolve, but that happens at claim time anyway (we're already verifying ownership), so it adds no new infrastructure. Once resolved, the numeric ID is cached and the handle becomes metadata.

### Twitter/X

**Canonical form:** `twitter:uid:<numericUserId>`

The numeric user ID is stable across handle changes. If `@alice` renames to `@bob`, the channel ID doesn't change. Resolved via Twitter API during the claiming flow.

### YouTube

**Canonical form:** `youtube:channel:<channelId>`

The channel ID is the `UC`-prefixed stable identifier, not the custom handle (`@username`). Resolved via YouTube API during claiming.

### Substack

**Canonical form:** `substack:<publication>`

The publication subdomain slug (e.g., `example` from `example.substack.com`). Less stable than a numeric ID, but Substack doesn't expose stable publication IDs in URLs, and subdomain changes are rare enough to accept the risk.


## Resolving channel prefixes

Constructing a content ID for Twitter or YouTube requires knowing the author's stable channel ID — information that isn't in the URL. The backend that handles channel verification (see [channel-claiming.md](channel-claiming.md)) already resolves platform handles to stable numeric IDs via the platform API. The same service exposes this as a lookup endpoint for the UI to use during contract creation.

**Caching.** The backend caches resolved mappings (e.g., `@alice` → `twitter:uid:12345678`, video `dQw4w9WgXcQ` → `youtube:channel:UCuAXFkgsw1L7xaCfnd5JJOw`). This is a standard optimization — the Twitter API call for a given user ID only needs to happen once. The trust model is the same as channel verification: clients already trust this backend to sign verification proofs, so trusting it for author resolution introduces no new assumption.

**Why not use on-chain events as the cache?** The `ContentItemRegistered` events contain plaintext canonical IDs, which do map content items to channels. But these events could contain false entries from attackers who bypassed the UI and submitted fabricated content IDs (see [Invalid content IDs](#invalid-content-ids-from-malicious-contract-creation)). A fabricated entry like `twitter:uid:<attacker>:18347` would pollute a cache derived from events. The backend cache is populated exclusively from the backend's own platform API calls, so it's not vulnerable to this.

**Substack** doesn't need resolution — the publication subdomain is in the URL, so content IDs can be constructed client-side without a backend call.


## Content IDs embed channel IDs

Content IDs include the creator's channel identifier as a structural prefix: `twitter:uid:<userId>:<tweetId>`, `youtube:channel:<channelId>:<videoId>`, `substack:<publication>/<slug>`. The channel ID is always the leading component, separated by `:` for Twitter and YouTube, and by `/` for Substack.

This embeds content-to-channel membership into the ID itself. A malicious actor cannot register Alice's real content under Bob's channel — they would need Alice's content IDs, and those embed Alice's channel prefix. Attempting to use them as Bob's content would require changing the prefix, producing a *different* content ID that doesn't correspond to any real tweet or video.

### On-chain enforcement via construction

The factory enforces channel-to-content binding by *constructing* content IDs from components, not by parsing assembled strings. The caller passes the channel canonical ID and the content-specific suffixes as separate parameters:

```solidity
function createContract(
    string calldata channelCanonicalId,  // e.g., "twitter:uid:12345678"
    string[] calldata contentSuffixes,   // e.g., ["18347", "29451"]
    uint256[] calldata supplies,
    uint256[] calldata prices,
    uint256 threshold,
    uint256 deadline
) external payable returns (address);
```

The factory then:

1. Hash `channelCanonicalId` and verify it matches the supplied channel ID hash (checked against the channel registry for creator-controlled channels)
2. For each suffix, construct the full canonical ID: `string.concat(channelCanonicalId, platformSeparator, contentSuffixes[i])`
3. Hash each full canonical ID to produce the content ID (`keccak256`)
4. Check the content registry for uniqueness and register each content ID
5. Emit `ContentItemRegistered` with both the hash and the plaintext canonical ID

The separator is fixed per platform deployment (`:` for Twitter/YouTube, `/` for Substack) — each platform has its own factory, so this is a deployment-time constant.

This is gas-efficient (no string parsing, just concatenation and hashing) and enforces channel membership by construction: the factory *cannot* produce a content ID that doesn't embed the supplied channel prefix.

### Invalid content IDs from malicious contract creation

An attacker who bypasses the UI could still submit a fabricated content ID — e.g., `twitter:uid:<attacker_uid>:18347` where tweet 18347 was actually written by Alice. The factory won't revert (the prefix matches the supplied channel), but the content ID is simply wrong: it will never be the canonical ID for any real tweet. Alice's real content ID (`twitter:uid:<alice_uid>:18347`) remains free and can still be registered.

The UI catches this at creation time by fetching the tweet and verifying the author matches the supplied channel. Contracts created via a non-malicious UI will always have valid content IDs. If someone bypasses the UI and creates a contract with an invalid content ID, the contract is unlikely to reach threshold (nobody will fund content they can verify is fake), and contributors can reclaim funds if it doesn't.


## Duplicates

Canonicalization handles the mechanical cases: same URL with different query params, `twitter.com` vs `x.com`, `youtu.be` vs `youtube.com` — these all resolve to the same canonical ID, so the content registry rejects the second registration automatically.

But the interesting duplicate problem is not one canonicalization can solve. What if a creator posts the same (or very similar) text as a new tweet and tries to sell content tokens for both? What about cross-platform reposts? These are content-level duplicates, not URL-level duplicates, and no ID format can detect them.

This requires a social solution: people notice, and they stop funding it. The same way that the broader content funding system relies on social consensus about what's worth funding, it relies on social consensus to not reward obvious duplication. This is not a problem for canonicalization to solve.


## MVP artifacts

1. A shared SDK canonicalization library used by UI, backend services, and data ingestion
2. Per-platform URL parsers: Twitter/X, YouTube, Substack
3. A normalization test corpus with real-world URL variants and edge cases per platform
4. A strict "reject, don't guess" policy for unrecognized URL formats


## Product rule

When canonicalization is uncertain, the system should stop and say so. Wrongly collapsing two things together is bad, but silently splitting one thing into two markets is worse.
