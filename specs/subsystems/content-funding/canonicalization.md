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

1. **Content IDs are derived from the URL without API calls.** The content ID is the platform prefix plus whatever stable identifier the platform puts in the URL. This keeps canonicalization a pure function.
2. **Channel IDs use the platform's numeric/opaque stable ID.** Resolved via API at claim time, then cached. Handles change; numeric IDs don't.
3. **Strip noise.** Tracking params, fragments, and domain aliases are not part of identity.
4. **Reject ambiguous inputs.** When canonicalization is uncertain, the system should stop and say so. Never silently collapse two things into one, and never silently split one thing into two.
5. **Handles and display names are metadata, not identity.** They can be stored alongside canonical IDs for UX, but they are not part of the hash.


## Content canonical forms

### Twitter/X

**Canonical form:** `twitter:<tweetId>`

The tweet ID is the numeric status ID, stable since Twitter's inception. It's always present in the URL.

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
| `https://customdomain.com/p/my-post` (custom domain) | See note below |

**Normalization rules:**
- For `*.substack.com` URLs, extract subdomain as publication and slug from `/p/<slug>`
- Drop all query parameters and fragments
- Reject URLs that are not post URLs (e.g., publication home pages, about pages)

**Custom domains:** A custom domain URL can't be canonicalized without a lookup to determine the underlying Substack publication. The system should reject custom-domain URLs and ask the user to provide the `*.substack.com` URL instead. If this turns out to be too annoying in practice, we can add a resolver later.

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


## Content IDs do not embed channel IDs

Content IDs are minimal: `twitter:<tweetId>`, not `twitter:<userId>:<tweetId>`. Content-to-channel membership is verified separately at contract creation time by the backend.

This keeps content IDs derivable from URLs as a pure function (no API calls), keeps the content and channel ID schemes independent, and avoids coupling content registration to channel resolution.


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
