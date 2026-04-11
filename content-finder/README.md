# Content Finder

This service watches a queue of candidate content submissions, resolves each content URL through the [platform-api-service](../platform-api-service/README.md), and submits them to the [content-attester](../content-attester/README.md).

It is the first content-specific implementation on top of [finder-core](../finder-core/README.md). Unlike the implication finder, which can discover candidates directly from on-chain statement activity, the content finder currently starts from explicit submissions. That keeps the service useful now while leaving room for future source adapters that watch channels, feeds, or paid submission APIs.

## How it works

Each poll cycle:

1. Loads the submission queue from `SUBMISSIONS_FILE_PATH`.
2. Skips items already processed in the persisted state file.
3. Resolves each content URL through the platform API to get a stable canonical content ID.
4. Submits the resolved content to the content attester in batches.
5. Marks successfully submitted items as processed in the state file.

## Submission file

`SUBMISSIONS_FILE_PATH` points to a JSON file containing an array like:

```json
[
  {
    "contentUrl": "https://x.com/alice/status/123",
    "statementCid": "bafy...",
    "declaredPerspective": "optional perspective string"
  }
]
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `PLATFORM_API_URL` | Yes | — | Base URL of the platform API service |
| `ATTESTER_URL` | Yes | — | Base URL of the content attester |
| `ATTESTER_FINDER_KEY` | Yes | — | Finder API key sent as `X-Finder-Key` |
| `SUBMISSIONS_FILE_PATH` | No | `./content-finder-submissions.json` | JSON file containing candidate submissions |
| `STATE_FILE_PATH` | No | `./content-finder-state.json` | JSON file containing processed submissions |
| `POLL_INTERVAL_MS` | No | `30000` | Poll interval in milliseconds |

## Future extensions

The intended next step is to add more submission sources on top of the same core flow:

- channel-watch adapters that discover fresh posts from specific channels
- paid APIs that accept ad hoc content or channel watch requests
- ranking/filtering stages before final attester submission
