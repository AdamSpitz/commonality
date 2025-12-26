# Implication Attester AI specs

From the point of view of the rest of the Conceptspace system, it doesn't matter whether the ImplicationAttestation events are done by humans or AIs; they're just Ethereum accounts.

So we can just have the Implication Attester AI be a separate artifact, with its own API (e.g. for asking it "could you please look at S1 and S2 and publish an attestation if you think S1 -> S2?"), deployed somewhere different from the indexer and the UI; I don't think there's any need for them to be coupled too tightly. (And it'd be fine for other people to make their own, if they want to.)

AI recommendations for implementation approach:
  - Start with a simple Node.js/TypeScript API service (built using Express, just because it's popular and good enough).
  - Hold an Ethereum private key to sign transactions.
  - Use the "sdk" code (in the top level of this repo) for reading statements, making attestations, etc. (If there are any user actions or queries that aren't already part of the sdk code, we can add them to the sdk code.)
  - Single endpoint: POST /evaluate-implication. Accepts two statement IDs, fetches their content from IPFS, evaluates whether S1 -> S2 (with a confidence score), and publishes an ImplicationAttestation event (using viem) if confidence exceeds a threshold (e.g., 0.8).
  - Use an LLM (use OpenRouter, at least at first, so we can try different models; we can switch to directly calling whichever specific API later if we want to) to do the evaluation.
  - Deploy to Render (we can switch later if we want).

Later enhancements: add batch processing (cron job to evaluate new statements against top N statements), event-driven automation (watch for new DirectSupport events), and admin UI for reviewing attestations.
