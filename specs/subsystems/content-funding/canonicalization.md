# Canonicalization

Rules for turning platform URLs and identities into stable canonical IDs before hashing, registering, or claiming.

## Why this is first-class

The uniqueness guarantees in [content-registry.md](content-registry.md) are only as good as the canonicalization rules that feed them. If the same tweet can appear as both `twitter:12345` and `https://x.com/user/status/12345`, or if a channel can be claimed as both `twitter:@username` and `x:@username`, then the system's scarcity and ownership guarantees become fuzzy in exactly the places where they need to feel obvious.

So canonicalization is not a UI convenience layer. It is a core protocol boundary:

- Content must be normalized before hashing into a content ID.
- Channels must be normalized before claim checks or escrow lookups.
- Off-chain services must speak the same canonical forms as the contracts and SDK.

## MVP artifacts

We should explicitly build:

- A canonical ID spec for each supported platform
- A shared SDK canonicalization library used by UI, backend services, and data ingestion
- A normalization test corpus with real-world URL variants and edge cases
- A policy for what to reject rather than guess

## Content canonicalization

Examples of the kind of normalization rules we need:

- Twitter/X posts:
  - Accept `twitter.com` and `x.com` URLs
  - Normalize to `twitter:<tweetId>`
  - Drop tracking query params and fragments
  - Reject URLs that do not unambiguously identify a single tweet
- Substack posts:
  - Normalize to the publication's canonical post URL
  - Drop tracking params
  - Decide whether custom domains normalize to the custom domain or the `substack.com` origin, and do it consistently
- YouTube:
  - Normalize watch/share/short URLs to `youtube:<videoId>`
- IPFS:
  - Normalize gateway URLs to `ipfs:<cid>`

The important property is not human prettiness; it is that every supported item has one obvious canonical string.

## Channel canonicalization

Channel IDs need the same discipline:

- Normalize case and platform aliases
- Decide whether the canonical form is handle-based, numeric-ID-based, or both
- Preserve only the information needed to identify the creator on that platform

For MVP Twitter/X claiming, `twitter:@username` is probably good enough if we are comfortable with rename edge cases. If not, we should canonicalize to the stable account ID and treat the handle as display metadata.

## Product rule

When canonicalization is uncertain, the system should stop and say so. Wrongly collapsing two things together is bad, but silently splitting one thing into two markets is worse.
