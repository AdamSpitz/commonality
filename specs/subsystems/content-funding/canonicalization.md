# Canonicalization

Rules for turning platform URLs and identities into stable canonical IDs before hashing, registering, or claiming.

## Why this is first-class

The uniqueness guarantees in [content-registry.md](content-registry.md) are only as good as the canonicalization rules that feed them. If the same tweet can appear as both `twitter:12345` and `https://x.com/user/status/12345`, or if a channel can be claimed under two different IDs, then the system's scarcity and ownership guarantees become fuzzy in exactly the places where they need to feel obvious.

So canonicalization is not a UI convenience layer. It is a core protocol boundary:

- Content must be normalized before hashing into a content ID.
- Channels must be normalized before claim checks or escrow lookups.
- Off-chain services must speak the same canonical forms as the contracts and SDK.


## Principles

1. **Use platform-stable identifiers for channels.** Numeric/opaque IDs, not handles. Handles change; IDs don't. The handle is display metadata.
2. **Content IDs should be derivable from URLs without API calls** where possible. This keeps canonicalization a pure function for the common case.
3. **Strip noise.** Tracking params, fragments, and domain aliases are not part of identity.
4. **Reject ambiguous inputs.** Never silently collapse two things into one, and never silently split one thing into two. When canonicalization is uncertain, the system should stop and say so.
5. **Handles and display names are metadata, not identity.** They can be stored alongside canonical IDs for UX, but they are not part of the hash.


## Content canonical forms

### Twitter/X

**Canonical form:** `twitter:<tweetId>`

The tweet ID is the numeric status ID, stable since Twitter's inception.

| Input URL | Canonical form |
|---|---|
| `https://twitter.com/alice/status/18347` | `twitter:18347` |
| `https://x.com/alice/status/18347` | `twitter:18347` |
| `https://x.com/alice/status/18347?s=20&t=abc` | `twitter:18347` |
| `https://twitter.com/alice/status/18347#m` | `twitter:18347` |

**Normalization rules:**
- Accept both `twitter.com` and `x.com` domains
- Extract the numeric status ID from the URL path
- Drop all query parameters and fragments
- Reject URLs that do not contain a numeric status ID (e.g., profile URLs, search URLs)

### YouTube

**Canonical form:** `youtube:<videoId>`

The video ID is the 11-character alphanumeric string present in all YouTube URL formats.

| Input URL | Canonical form |
|---|---|
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | `youtube:dQw4w9WgXcQ` |
| `https://youtu.be/dQw4w9WgXcQ` | `youtube:dQw4w9WgXcQ` |
| `https://www.youtube.com/shorts/dQw4w9WgXcQ` | `youtube:dQw4w9WgXcQ` |
| `https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s` | `youtube:dQw4w9WgXcQ` |

**Normalization rules:**
- Accept `youtube.com`, `www.youtube.com`, and `youtu.be` domains
- Accept `watch?v=`, `youtu.be/`, `shorts/`, and `embed/` URL formats
- Extract the video ID; drop all other query parameters and fragments
- Reject URLs that do not contain a video ID (e.g., channel pages, playlist pages without a current video)

### Substack

**Canonical form:** `substack:<publication>/<slug>`

The publication is the Substack subdomain (e.g., `example` from `example.substack.com`). The slug is the post's URL slug.

| Input URL | Canonical form |
|---|---|
| `https://example.substack.com/p/my-post` | `substack:example/my-post` |
| `https://example.substack.com/p/my-post?utm_source=twitter` | `substack:example/my-post` |
| `https://customdomain.com/p/my-post` (where customdomain.com is example's custom domain) | `substack:example/my-post` |

**Normalization rules:**
- For `*.substack.com` URLs, extract subdomain as publication and slug from `/p/<slug>`
- For custom domains, resolve to the underlying Substack publication subdomain (this requires a lookup — see note below)
- Drop all query parameters and fragments
- Reject URLs that are not post URLs (e.g., publication home pages, about pages)

**Note on custom domains:** Resolving a custom domain to its Substack publication name requires either a DNS/redirect check or a Substack API call. This is an unavoidable cost for custom-domain URLs. For `*.substack.com` URLs, canonicalization is a pure function.

**Stability note:** Substack post slugs rarely change, but they *can* be edited by the author. We accept this small stability risk in exchange for URL-derivability. If this becomes a real problem in practice, we can migrate to Substack's internal numeric post IDs (available via API).

### IPFS

**Canonical form:** `ipfs:<cidV1>`

CIDs are inherently canonical (content-addressed). Normalize to CIDv1 using the existing patterns in `sdk/src/utils/cid-types.ts`.

| Input | Canonical form |
|---|---|
| `ipfs:QmXyz...` (CIDv0) | `ipfs:<cidV1 equivalent>` |
| `ipfs:bafyXyz...` (CIDv1) | `ipfs:bafyXyz...` |
| `https://ipfs.io/ipfs/QmXyz...` | `ipfs:<cidV1 equivalent>` |
| `0x...` (hex CID) | `ipfs:<cidV1 equivalent>` |

**Normalization rules:**
- Accept CIDv0 (`Qm...`), CIDv1 (`bafy...`), hex (`0x...`), and gateway URLs
- Normalize everything to CIDv1
- Strip gateway domain and path prefix for gateway URLs


## Channel canonical forms

### Twitter/X

**Canonical form:** `twitter:uid:<numericUserId>`

The numeric user ID is stable across handle changes. The `@handle` is display metadata only.

**Why not handles:** If `@alice` renames to `@bob`, a handle-based channel ID breaks. Worse, a different person could later take `@alice` and be confused with the original channel. Numeric IDs avoid this entirely.

**Resolution:** The handle-to-numeric-ID mapping is resolved via the Twitter API during channel claiming. The backend already makes Twitter API calls for tweet-based verification, so this adds no new infrastructure. Once resolved, the numeric ID is stored and the handle becomes metadata.

### YouTube

**Canonical form:** `youtube:channel:<channelId>`

The channel ID is the `UC`-prefixed stable identifier, not the custom handle (`@username`). Same rationale as Twitter: handles change, channel IDs don't.

### Substack

**Canonical form:** `substack:<publication>`

The publication subdomain slug (e.g., `example` from `example.substack.com`). Less stable than a numeric ID, but Substack doesn't expose stable publication IDs in URLs, and subdomain changes are rare enough to accept the risk.

### IPFS

Deferred. IPFS has no native concept of "creator." When IPFS content needs a channel, it will likely use an Ethereum-address-based channel or be associated with a channel from another platform.


## Open question: should content IDs embed channel IDs?

The current design uses minimal content IDs (e.g., `twitter:<tweetId>`) with content-to-channel membership verified separately at contract creation time. An alternative is self-describing content IDs (e.g., `twitter:<userId>:<tweetId>`) where membership is derivable from the canonical form.

**Trade-offs:**

| | Minimal (`twitter:<tweetId>`) | Embedded (`twitter:<userId>:<tweetId>`) |
|---|---|---|
| URL → lookup | Pure function (parse tweet ID, hash, done) | Requires API call to resolve author's numeric ID |
| Contract creation | Backend verifies tweet belongs to creator | UI concatenates known creator ID + tweet ID |
| Membership check | Off-chain verification at creation time | Derivable from the canonical form |
| Coupling | Content and channel representations are independent | Content IDs depend on channel representation |

Decision deferred. Both approaches work; the right answer depends on how the system evolves and which operations turn out to be most common.


## MVP artifacts

1. A shared SDK canonicalization library used by UI, backend services, and data ingestion
2. A normalization test corpus with real-world URL variants and edge cases per platform
3. A strict "reject, don't guess" policy for unrecognized URL formats
4. Per-platform documentation of which URL patterns are accepted and which are rejected


## Product rule

When canonicalization is uncertain, the system should stop and say so. Wrongly collapsing two things together is bad, but silently splitting one thing into two markets is worse.
