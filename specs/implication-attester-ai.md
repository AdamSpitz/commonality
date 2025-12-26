# Implication Attester AI specs

From the point of view of the rest of the Conceptspace system, it doesn't matter whether the ImplicationAttestation events are done by humans or AIs; they're just Ethereum accounts.

So we can just have the Implication Attester AI be a separate artifact, with its own API (e.g. for asking it "could you please look at S1 and S2 and publish an attestation if you think S1 -> S2?"), deployed somewhere different from the indexer and the UI; I don't think there's any need for them to be coupled too tightly. (And it'd be fine for other people to make their own, if they want to.)

AI recommendations for implementation approach:
  - Start with a simple Node.js/TypeScript API service (built using Express, just because it's popular and good enough).
  - Hold an Ethereum private key to sign transactions. (Just use an environment variable for now.)
  - Use the "sdk" code (in the top level of this repo) for reading statements, making attestations, etc. (If there are any user actions or queries that aren't already part of the sdk code, we can add them to the sdk code.)
  - Single endpoint: POST /evaluate-implication. Accepts two statement IDs, fetches their content from IPFS, evaluates whether S1 -> S2, publishes an ImplicationAttestation event (using our sdk code) recording its decision, and produces a return structure containing both a boolean indicating its overall decision and also a written explanation for why or why not. (Record the explanation in IPFS, and include its CID in the onchain attestation event.) Oh, make the return structure include the transaction hash too, so it's easy for the caller to see for himself.
  - Use an LLM (use OpenRouter, at least at first, so we can try different models; we can switch to directly calling whichever specific API later if we want to) to do the evaluation.
  - Use x402 to require payments. (I'm open to suggestions regarding how to make sure the payment is sufficient to cover the cost of the transaction and the LLM work and so on.) (If this service does run out of LLM credits or ETH or whatever, just return an error and maybe send the maintainer an email, if you haven't done so in the past hour, and assume that the maintainer will top it up.)
  - Oh, and before doing the work, check the indexer (using our sdk code) to see whether this attester has already attested to this particular (S1, S2) pair. If it has, the return structure can include a boolean flag saying "this was already done".
  - Deploy to Render (we can switch later if we want).

Later enhancements: add batch processing (cron job to evaluate new statements against top N statements), event-driven automation (watch for new DirectSupport events), and admin UI for reviewing attestations.


## More detail

### Reading statements

Later on we can tweak the actual prompt/instructions sent to the LLM to evaluate if S1 -> S2. For now, if you are an AI reading this, feel free to suggest a prompt and I'll include it in this file. (Err on the side of being conservative - it's better to have false negatives than false positives. We don't want to let people falsely claim support for S2 by making it vague. Whereas it's no big deal if the LLM rejects the implication - the user can always just write a clearer S2. Still, don't be too pedantic or picky - the whole point of this system is to allow a statement S2 to claim "hey, a bunch of people support S1, so they probably support me too", so if we reject any statement that's even slightly different then there's no point in having this system.)

Don't give the LLM any info about the support numbers for the statements; just show it the content of the statements.

If a statement includes references to other statements, read those too and provide the LLM with a structure containing all of the transitively-referenced statements. (Limit to a depth of, say, 10, though, for now.)

If it's not obvious what the different statementType values mean, give the LLM a brief explanation. I expect it to be mostly self-explanatory, though.


## 