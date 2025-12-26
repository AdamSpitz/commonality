# Implication Attester AI specs

From the point of view of the rest of the Conceptspace system, it doesn't matter whether the ImplicationAttestation events are done by humans or AIs; they're just Ethereum accounts.

So we can just have the Implication Attester AI be a separate artifact, with its own API (e.g. for asking it "could you please look at S1 and S2 and publish an attestation if you think S1 -> S2?"), deployed somewhere different from the indexer and the UI; I don't think there's any need for them to be coupled too tightly. (And it'd be fine for other people to make their own, if they want to.)

AI recommendations for implementation approach:
  - Start with a simple Node.js/TypeScript API service (built using Express, just because it's popular and good enough).
  - Hold an Ethereum private key to sign transactions. (Just use an environment variable for now.)
  - Use the "sdk" code (in the top level of this repo) for reading statements, making attestations, etc. (If there are any user actions or queries that aren't already part of the sdk code, we can add them to the sdk code.)
  - Single endpoint: POST /evaluate-implication. Accepts two statement IDs, fetches their content from IPFS, evaluates whether S1 -> S2, publishes an ImplicationAttestation event (using our sdk code) recording its decision, and produces a return structure containing both a boolean indicating its overall decision and also a written explanation for why or why not. (Record the explanation in IPFS, and include its CID in the onchain attestation event.) Oh, make the return structure include the transaction hash too, so it's easy for the caller to see for himself.
  - Use an LLM (use OpenRouter, at least at first, so we can try different models; we can switch to directly calling whichever specific API later if we want to) to do the evaluation.
  - Require ETH payments via x402 standard flow.
    - Cost-plus pricing: (estimated_gas_cost + llm_cost) * 1.20 margin
    - Recalculate every 5 minutes based on current gas prices
    - Accept ETH payments via x402 standard flow
    - See below for more details.
    - If this service does run out of LLM credits or ETH or whatever, just return an error and maybe send the maintainer an email, if you haven't done so in the past hour, and assume that the maintainer will top it up.
  - Oh, and before doing the work, check the indexer (using our sdk code) to see whether this attester has already attested to this particular (S1, S2) pair. If it has, the return structure can include a boolean flag saying "this was already done".
  - Deploy to Render (we can switch later if we want).

Later enhancements: add batch processing (cron job to evaluate new statements against top N statements), event-driven automation (watch for new DirectSupport events), and admin UI for reviewing attestations.


## More detail

### Reading statements

Later on we can tweak the actual prompt/instructions sent to the LLM to evaluate if S1 -> S2. For now, if you are an AI reading this, feel free to suggest a prompt and I'll include it in this file. (Err on the side of being conservative - it's better to have false negatives than false positives. We don't want to let people falsely claim support for S2 by making it vague. Whereas it's no big deal if the LLM rejects the implication - the user can always just write a clearer S2. Still, don't be too pedantic or picky - the whole point of this system is to allow a statement S2 to claim "hey, a bunch of people support S1, so they probably support me too", so if we reject any statement that's even slightly different then there's no point in having this system.) (Okay, I've got a suggested prompt down below in this file.)

Don't give the LLM any info about the support numbers for the statements; just show it the content of the statements.

If a statement includes references to other statements, read those too and provide the LLM with a structure containing all of the transitively-referenced statements. (Limit to a depth of, say, 10, though, for now.)

If it's not obvious what the different statementType values mean, give the LLM a brief explanation. I expect it to be mostly self-explanatory, though.


### Suggested prompt

**Prompt Template:**

```markdown
You are evaluating whether statement S1 logically implies statement S2 for a social coordination system.

# Context
Users sign statements to express beliefs. If S1 implies S2, then users who signed S1 should reasonably be counted as indirect supporters of S2.

# Evaluation Criteria
S1 implies S2 if and only if:
1. Anyone who believes S1 would reasonably believe S2
2. S2 does NOT add significant new claims beyond what's in S1
3. S2 does NOT change the meaning or intent of S1 in any substantive way

# Important Guidelines
- Be CONSERVATIVE: When in doubt, say NO. False positives are worse than false negatives.
- Reject if S2 is vague and could be interpreted multiple ways
- Reject if S2 adds ANY controversial claims not present in S1
- Reject if S2 uses different framing that changes emotional valence
- Accept minor clarifications, formatting differences, or removal of redundancy
- Accept if S2 is strictly MORE GENERAL than S1 (S1 is a specific case of S2)

# Statements to Evaluate

## Statement S1 (Source)
{statement_s1_content}

## Statement S2 (Target)
{statement_s2_content}

{references_context}

# Task
Evaluate whether S1 → S2 (S1 implies S2).

Respond with a JSON object:
{
  "decision": true or false,
  "confidence": "high" | "medium" | "low",
  "reasoning": "2-4 sentence explanation focusing on why you made this decision",
  "key_difference": "if decision is false, what's the main difference?" (optional)
}

Be concise but clear in your reasoning.
```

**Examples to Include in System Prompt:**

```markdown
# Examples

Example 1: ACCEPT
S1: "I support universal healthcare and free college tuition"
S2: "I support universal healthcare"
Decision: TRUE
Reasoning: S2 is a subset of S1's claims. Anyone supporting both would support just healthcare.

Example 2: REJECT - Adds new claim
S1: "Climate change is real"
S2: "Climate change is real and we should ban fossil fuels"
Decision: FALSE
Reasoning: S2 adds a controversial policy prescription not present in S1.

Example 3: ACCEPT - Generalization
S1: "Abortion should be legal in cases of rape or incest"
S2: "Abortion should be legal in some cases"
Decision: TRUE
Reasoning: S2 is a generalization of S1. S1 is a specific instance of S2.

Example 4: REJECT - Changes framing
S1: "We should reduce illegal immigration"
S2: "We should protect our borders from foreign invasion"
Decision: FALSE
Reasoning: Different emotional framing ("invasion") changes the statement's character.

Example 5: ACCEPT - Clarification
S1: "Democracy is good"
S2: "Democratic forms of government are beneficial"
Decision: TRUE
Reasoning: Same meaning, just more formal phrasing.

Example 6: REJECT - Vague target
S1: "I support gun background checks"
S2: "I support reasonable gun control"
Decision: FALSE
Reasoning: "Reasonable gun control" is too vague and could include policies beyond background checks.
```

**Handling References:**

When statements include references (e.g., "I support either {ref:0} or {ref:1}"), expand them up to depth 10 and provide the full context to the LLM:

```markdown
## References for S1
[0]: {content of referenced statement}
[1]: {content of referenced statement}

## References for S2
[0]: {content of referenced statement}
```

**Conservative Threshold:**
- Only proceed with attestation if `decision: true` AND `confidence: "high"` OR `"medium"`
- Reject if `confidence: "low"` even if decision is true
- This prevents edge cases from creating false implications


### Payments: Simple Cost-Plus Pricing

**Payment Calculation Formula:**

```
payment_required = (estimated_gas_cost * gas_price * ETH_to_USD)
                   + llm_api_cost
                   + service_margin
```

Where:
- `estimated_gas_cost`: ~50,000 gas for attestImplication call (measure empirically)
- `gas_price`: Fetch current gas price from the network
- `ETH_to_USD`: Use a price oracle or recent price (acceptable to be slightly stale)
- `llm_api_cost`: Estimated based on token count (input ~1000 tokens, output ~200 tokens for GPT-4 class model ≈ $0.015)
- `service_margin`: 20% markup to cover operational costs, reserve fund

**Environment Config:**

   ```
   X402_PAYMENT_ADDRESS=0x...        # Address to receive payments
   SERVICE_MARGIN_PERCENT=20          # Default 20%
   ETH_USD_PRICE=3000                # Manual override, or fetch from API
   GAS_PRICE_MULTIPLIER=1.2          # Safety margin for gas price volatility
   ```


### REST API Specification

**Endpoint:** `POST /evaluate-implication`

**Request Body:**
```typescript
{
  "fromStatementId": string,  // IPFS CID (e.g., "bafybeigdyrzt...")
  "toStatementId": string     // IPFS CID
}
```

**Success Response (200 OK):**
```typescript
{
  "alreadyAttested": boolean,        // True if this attester already attested this pair
  "decision": boolean,               // True if S1 → S2, false otherwise
  "confidence": "high" | "medium" | "low",  // LLM's confidence level
  "explanation": string,             // Human-readable reasoning (2-4 sentences)
  "explanationCid": string,          // IPFS CID of explanation (if new attestation)
  "transactionHash": string | null,  // Tx hash (null if alreadyAttested)
  "gasUsed": number | null,          // Actual gas used (null if alreadyAttested)
  "processingTime": number           // Milliseconds taken to process
}
```

**Example Success Response:**
```json
{
  "alreadyAttested": false,
  "decision": true,
  "confidence": "high",
  "explanation": "S2 is a direct subset of S1's claims. Anyone who supports universal healthcare and free college would necessarily support just universal healthcare. No new claims are added.",
  "explanationCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "transactionHash": "0x1234567890abcdef...",
  "gasUsed": 48234,
  "processingTime": 3421
}
```

**Error Responses:**

**402 Payment Required:**
```typescript
{
  "error": "payment_required",
  "message": "Payment required to process this request",
  "paymentDetails": {
    "amount": "0.000037",          // ETH
    "amountUsd": "0.11",           // USD equivalent
    "currency": "ETH",
    "address": "0x...",            // Payment address
    "paymentId": "uuid-1234",      // Unique payment identifier
    "expiresAt": "2025-01-15T10:30:00Z"  // Payment window
  }
}
```

**400 Bad Request:**
```typescript
{
  "error": "invalid_request",
  "message": "Invalid statement ID format",
  "details": {
    "field": "fromStatementId",
    "issue": "Not a valid IPFS CID"
  }
}
```

**404 Not Found:**
```typescript
{
  "error": "statement_not_found",
  "message": "Could not fetch statement content from IPFS",
  "details": {
    "statementId": "bafybei...",
    "reason": "IPFS timeout after 10s"
  }
}
```

**503 Service Unavailable:**
```typescript
{
  "error": "service_unavailable",
  "message": "Service temporarily unavailable due to insufficient funds",
  "details": {
    "reason": "eth_balance_low",
    "retryAfter": 3600  // Seconds
  }
}
```

**500 Internal Server Error:**
```typescript
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "details": {
    "errorId": "uuid-5678"  // For tracking in logs
  }
}
```

**Additional Endpoints for MVP:**

**GET /health**
```typescript
{
  "status": "healthy" | "degraded" | "unhealthy",
  "details": {
    "ethBalance": "1.234",           // ETH
    "ethBalanceUsd": "3702.00",      // USD equivalent
    "lowBalanceWarning": false,
    "llmApiAvailable": true,
    "blockchainConnected": true,
    "ipfsGatewayAvailable": true
  },
  "uptime": 86400,                    // Seconds
  "version": "0.1.0"
}
```

**GET /status/:attester/:fromStatementId/:toStatementId**
Check if an attestation already exists (useful for clients to check before paying):
```typescript
{
  "exists": boolean,
  "attestation": {
    "attester": "0x...",
    "fromStatementId": "bafybei...",
    "toStatementId": "bafybei...",
    "decision": boolean,              // Retrieved from indexer if available
    "explanationCid": "bafybei...",   // Retrieved from indexer if available
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "timestamp": "2025-01-15T10:00:00Z"
  } | null
}
```

**Request Headers:**
```
Content-Type: application/json
X-Payment-Proof: <payment_transaction_hash>  // If paying for a 402 request
```

**Rate Limiting:**
- 10 requests per minute per IP address
- Returns 429 Too Many Requests if exceeded:
```typescript
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retryAfter": 45  // Seconds
}
```



## To do

Extend Implications.sol to include `explanationCid` parameter. Also incorporate this into the hardhat unit tests, the indexer, the sdk, and the integration-tests.
