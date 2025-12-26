# Implication Attester AI specs

From the point of view of the rest of the Conceptspace system, it doesn't matter whether the ImplicationAttestation events are done by humans or AIs; they're just Ethereum accounts.

So we can just have the Implication Attester AI be a separate artifact, with its own API (e.g. for asking it "could you please look at S1 and S2 and publish an attestation if you think S1 -> S2?"), deployed somewhere different from the indexer and the UI; I don't think there's any need for them to be coupled too tightly. (And it'd be fine for other people to make their own, if they want to.)

AI recommendations for implementation approach:
  - Start with a simple Node.js/TypeScript API service (built using Express, just because it's popular and good enough).
  - Single endpoint: POST /evaluate-implication. Accepts two statement IDs, fetches their content from IPFS, evaluates whether S1 -> S2 (with a confidence score), and publishes an ImplicationAttestation event (using viem) if confidence exceeds a threshold (e.g., 0.8).
  - Uses viem for the blockchain stuff.
  - Uses an LLM (use OpenRouter, at least at first, so we can try different models; we can switch to directly calling whichever specific API later if we want to) to do the evaluation.
  - Holds an Ethereum private key to sign transactions.
  - Deploy to Render (we can switch later if we want).
  
Later enhancements: add batch processing (cron job to evaluate new statements against top N statements), event-driven automation (watch for new DirectSupport events), and admin UI for reviewing attestations.
