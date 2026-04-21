# Content Submission

How do content items get into the content-finder pipeline?

## Current state

The content finder reads from a local JSON file (`SUBMISSIONS_FILE_PATH`). Each entry is:

```json
{
  "contentUrl": "https://x.com/alice/status/123",
  "statementCid": "bafy...",
  "declaredPerspective": "optional"
}
```

This is fine for seeding and for operator-managed queues, but there's no user-facing way to submit content. That limits the pipeline to what the platform operator manually adds.

## What we want

Anyone — a content creator, a fan, a funder, a community member — should be able to say "please evaluate this post/video/article against this statement." The content finder processes the queue, the content attester evaluates it, and the result is an on-chain attestation.

This is just a CRUD feature: a place to submit entries, a place for the content finder to read them.

## Approach: a submissions endpoint in the platform-api-service

The platform-api-service already handles content-related work (resolving URLs, validating ownership, channel verification). It's the right place to host a submission queue.

### API

**`POST /content-submission`**

Submit a content item for evaluation:

```json
{
  "contentUrl": "https://x.com/alice/status/123",
  "statementCid": "bafy...",
  "declaredPerspective": "optional perspective string"
}
```

The service validates the input (must be a recognizable content URL and a valid CID), deduplicates against already-queued items, and appends to the persistent queue.

Returns `201 Created` on success. Returns `409 Conflict` if the exact `(contentUrl, statementCid, declaredPerspective)` combination is already in the queue.

**`GET /content-submission`**

Returns the current queue as a JSON array (the same format as the JSON file). This is the endpoint the content finder polls instead of reading a local file.

Rate-limit both endpoints — submissions especially, to prevent spam. Require no authentication for now (the content attester is the gatekeeper that decides whether the content actually aligns with the statement; a bad submission just wastes attester compute, which is cheap).

### Content finder change

Add a `submissionsApiUrl` config option. When set, the content finder polls `GET /content-submission` instead of reading the local file. The local file path remains the fallback for operator-managed deployments.

### Storage

For now: a JSON file on the platform-api-service's filesystem (same pattern as the current content finder). Simple and consistent with the rest of the service's in-process approach.

Later, if multiple content-finder instances run or submissions need to survive service restarts more robustly: a proper database table. Not needed yet.

## UI

A minimal form in the content-funding UI:

- URL field (content URL)
- Statement selector (CID picker or search-by-text)
- Optional perspective field
- Submit button

Live under the content-funding surface, probably accessible from a statement's detail page ("Submit a piece of content for this statement"). Also accessible from the content-finder's own settings/admin panel if one exists.

The form calls `POST /content-submission` directly from the browser. No auth needed (see above).

## Spam / abuse

Since submissions are unauthenticated:

- Deduplication prevents re-queuing the same item multiple times.
- The content attester is the real gatekeeper — it evaluates each submission independently, and a bad submission produces a false attestation at worst (which users can flag or simply not trust).
- Rate limiting by IP keeps bulk spam manageable.
- The queue can be cleared manually by the operator if it gets polluted.

Later, if abuse is a real problem: require a small stake or a signed statement from the submitter.

## What this is not

This spec is only about the submission queue — how items get *into* the content-finder pipeline. It doesn't change the content attester, the evaluation logic, or the on-chain attestation model. Those are already specced.
