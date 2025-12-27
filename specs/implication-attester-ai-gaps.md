# Implication Attester AI - Specification Gaps Analysis

**Status**: Ready for MVP implementation with minor clarifications needed

## Summary

The specification in [implication-attester-ai.md](implication-attester-ai.md) is quite detailed and provides a solid foundation for implementing an MVP. However, there are several areas that need clarification before implementation can proceed with full confidence.

## What's Well-Specified ✅

1. **Overall Architecture**: Clear separation from the main system, standalone service with REST API
2. **Tech Stack**: Node.js/TypeScript, Express, OpenRouter for LLM access, Render deployment
3. **Core Functionality**: The main `/evaluate-implication` endpoint is well-defined with detailed request/response schemas
4. **LLM Prompt**: Excellent - detailed prompt with evaluation criteria, examples, and conservative decision-making guidelines in [implication-attester-ai-prompt.md](implication-attester-ai-prompt.md)
5. **Payment System**: x402 payment flow with cost-plus pricing formula is clearly specified
6. **Error Handling**: Comprehensive error response schemas for various failure modes
7. **SDK Integration**: Clear expectation to use existing SDK for blockchain interactions and IPFS operations
8. **Reference Expansion**: Good guidance on handling statement references up to depth 10
9. **Smart Contract Interface**: The `Implications` contract is already implemented and well-documented

## What Needs Clarification ❓

### 1. IPFS Gateway/API Configuration

**Issue**: The spec mentions reading statements from IPFS and uploading explanations, but doesn't specify configuration details.

**Questions**:
- Which IPFS gateway to use for reading? (The SDK uses `process.env.IPFS_GATEWAY`)
- Which IPFS API to use for uploading explanations? (The SDK uses `process.env.IPFS_API`)
- Should these be environment variables? What are recommended values for production?
- Fallback strategy if IPFS is slow/unavailable?
- Timeout values for IPFS operations?

**Recommendation**: Add an environment variables section specifying:
```
IPFS_GATEWAY=https://ipfs.io/ipfs  (or use a pinning service's gateway)
IPFS_API=https://ipfs-api-url/  (or use a pinning service API)
IPFS_TIMEOUT_MS=10000
```

### 2. Indexer Connection Details

**Issue**: The spec says "check the indexer using our sdk code" to see if attestation already exists, but doesn't specify connection details.

**Questions**:
- GraphQL endpoint URL (environment variable?)
- Which specific SDK query to use? (Looks like `getImplication` from `sdk/src/queries/conceptspace-queries.ts:206`)
- Should the service create its own GraphQL client or use the SDK's?
- Does the GraphQL client need authentication?

**Recommendation**: Specify:
```
GRAPHQL_ENDPOINT=https://indexer-url/graphql
```

And clarify that the service should use `getImplication(client, attesterAddress, fromStatementId, toStatementId)` from the SDK.

### 3. Blockchain Connection Configuration

**Issue**: Need to specify how the service connects to the blockchain.

**Questions**:
- RPC endpoint URL for the L2 blockchain (environment variable?)
- Which network/chain ID?
- Gas price fetching strategy (use viem's built-in or external oracle?)
- Contract addresses for the `Implications` contract (environment variable?)
- What about the ABI? (Presumably from SDK's `abis.ts`)

**Recommendation**: Specify:
```
ETHEREUM_RPC_URL=https://l2-rpc-url
CHAIN_ID=??? (which L2 are we using?)
IMPLICATIONS_CONTRACT_ADDRESS=0x...
GAS_PRICE_MULTIPLIER=1.2  (safety margin for gas price volatility)
```

### 4. Private Key Management

**Issue**: Spec says "Just use an environment variable for now" but lacks security warnings and funding requirements.

**Questions**:
- Should there be explicit security warnings about this approach?
- Should the spec mention that this account needs to be funded with ETH for gas?
- Any recommendations for key rotation or monitoring?

**Recommendation**: Add explicit notes:
- "⚠️ WARNING: Storing private keys in environment variables is acceptable for MVP but NOT production-ready. Plan for proper key management (HSM, KMS, etc.) before mainnet deployment."
- "This Ethereum account must be funded with sufficient ETH to pay for gas costs of attestation transactions."
- "Monitor the account balance and set up alerts when it drops below a threshold."

### 5. LLM Model Selection

**Issue**: Spec mentions using OpenRouter "so we can try different models" but doesn't specify defaults.

**Questions**:
- Default model for MVP (e.g., `anthropic/claude-3-haiku` for cost-effectiveness?)
- How to estimate ~1000 input + ~200 output tokens mentioned in pricing section?
- Fallback if primary model is unavailable?
- Should model be configurable via environment variable?

**Recommendation**: Specify:
```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3-haiku  (or claude-3.5-sonnet for better quality)
OPENROUTER_FALLBACK_MODEL=openai/gpt-4o-mini  (optional)
ESTIMATED_INPUT_TOKENS=1000  (adjust based on testing)
ESTIMATED_OUTPUT_TOKENS=200
```

### 6. x402 Payment Implementation Details

**Issue**: The spec describes the payment flow but doesn't specify implementation details.

**Questions**:
- How to validate the `X-Payment-Proof` header (transaction hash verification)?
- Should we verify the transaction on-chain before proceeding?
- Payment expiry handling (spec mentions `expiresAt` - how long? 15 minutes?)
- What happens if payment is received but LLM call fails afterward? (Refund? Credit?)
- Should there be a payment verification endpoint?
- Where are payment IDs stored? (In-memory map? Database?)

**Recommendation**: Clarify the payment verification flow:
1. Generate payment ID and amount, store in memory with expiry (15 minutes)
2. Return 402 with payment details
3. Client pays and includes tx hash in `X-Payment-Proof` header
4. Service verifies transaction on-chain (correct amount, correct recipient, confirmed)
5. Proceed with processing if valid

Or: Consider simpler flow for MVP - skip payment verification initially and add it later.

### 7. Statement Reference Expansion Details

**Issue**: Spec says to expand references up to depth 10 and provide context to LLM, but format is unclear.

**Questions**:
- Exact formatting of the `{references_context}` section in the prompt?
- How to handle IPFS fetch failures for referenced statements?
- Should there be a timeout for the entire reference expansion process?
- Maximum total size limit after expansion (to avoid hitting LLM context limits)?
- Should references be recursively expanded or just one level?

**Recommendation**: Provide example showing:
```markdown
## Statement S1
{
  "statementType": "statement",
  "content": "I support {ref:0} and {ref:1}",
  "references": [
    { "statementId": "bafyaaa...", "label": "universal healthcare" },
    { "statementId": "bafybbb...", "label": "free college" }
  ]
}

## References for S1
[0] (universal healthcare): "I believe healthcare is a human right"
[1] (free college): "I support free public college tuition"

## Statement S2
{
  "statementType": "statement",
  "content": "I support universal healthcare"
}
```

And specify:
- Expand references recursively up to depth 10
- Skip failed IPFS fetches (show "[ref:X] (failed to load)")
- Total timeout: 30 seconds for all reference expansion
- If total content exceeds 50k chars after expansion, truncate with warning

### 8. Rate Limiting Configuration

**Issue**: Spec mentions "10 requests per minute per IP address" but no implementation guidance.

**Questions**:
- Implementation approach (which middleware? express-rate-limit?)
- Should authenticated/paid requests have different limits?
- In-memory or Redis-backed?
- Should there be different limits for different endpoints?

**Recommendation**: Specify:
```
RATE_LIMIT_WINDOW_MS=60000  (1 minute)
RATE_LIMIT_MAX_REQUESTS=10
```

And recommend: "Use express-rate-limit middleware with in-memory store (acceptable for single-instance MVP; switch to Redis for multi-instance deployment)."

### 9. Health Check Details

**Issue**: The `/health` endpoint is well-specified, but implementation details are unclear.

**Questions**:
- How to fetch ETH balance? (Use viem's `getBalance`?)
- How to get current ETH/USD price? (Which oracle? Coinbase API? Manual override acceptable for MVP?)
- What threshold triggers `lowBalanceWarning`? (e.g., < 0.1 ETH?)
- How to determine IPFS gateway availability? (Simple ping or actual fetch attempt?)
- How to determine blockchain connectivity? (Try fetching latest block number?)
- Cache duration for these checks? (Don't query blockchain/price on every health check)

**Recommendation**: Specify:
```
ETH_USD_PRICE=3000  (manual override acceptable for MVP)
LOW_BALANCE_THRESHOLD_ETH=0.1
HEALTH_CHECK_CACHE_MS=30000  (cache health check results for 30 seconds)
```

### 10. Deployment Environment Variables

**Issue**: No comprehensive list of all required environment variables.

**Recommendation**: Add a complete environment variables reference:

```bash
# Ethereum Configuration
ETHEREUM_PRIVATE_KEY=0x...              # Private key for attester account (⚠️ SECURITY RISK FOR MVP ONLY)
ETHEREUM_RPC_URL=https://...            # L2 RPC endpoint
CHAIN_ID=???                            # Network chain ID
IMPLICATIONS_CONTRACT_ADDRESS=0x...     # Address of deployed Implications contract

# IPFS Configuration
IPFS_GATEWAY=https://ipfs.io/ipfs       # Gateway for reading statement content
IPFS_API=https://...                    # API endpoint for uploading explanations
IPFS_TIMEOUT_MS=10000                   # Timeout for IPFS operations

# Indexer Configuration
GRAPHQL_ENDPOINT=https://...            # GraphQL endpoint for querying existing attestations

# LLM Configuration
OPENROUTER_API_KEY=sk-or-...            # OpenRouter API key
OPENROUTER_MODEL=anthropic/claude-3-haiku  # Default model to use
ESTIMATED_INPUT_TOKENS=1000             # For cost estimation
ESTIMATED_OUTPUT_TOKENS=200             # For cost estimation

# Payment Configuration (x402)
X402_PAYMENT_ADDRESS=0x...              # Address to receive payments (can be same as attester address)
SERVICE_MARGIN_PERCENT=20               # Markup percentage
ETH_USD_PRICE=3000                      # Manual price or fetch from oracle
GAS_PRICE_MULTIPLIER=1.2                # Safety margin for gas volatility
PAYMENT_EXPIRY_MINUTES=15               # How long payment requests are valid

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000              # Rate limit window (1 minute)
RATE_LIMIT_MAX_REQUESTS=10              # Max requests per window per IP

# Health Check
LOW_BALANCE_THRESHOLD_ETH=0.1           # When to warn about low balance
HEALTH_CHECK_CACHE_MS=30000             # Cache health check results

# Server Configuration
PORT=3000                               # HTTP server port
NODE_ENV=production                     # Environment (development/production)

# Optional: Email Notifications
ALERT_EMAIL=admin@example.com           # Email for low balance / error alerts
SMTP_HOST=smtp.gmail.com                # For sending alert emails
SMTP_USER=...
SMTP_PASS=...
```

### 11. Error Notification Strategy

**Issue**: Spec mentions "send the maintainer an email, if you haven't done so in the past hour" but doesn't specify how.

**Questions**:
- Email service to use? (SendGrid? SMTP? Just console.error for MVP?)
- What email address?
- What events trigger notifications? (Out of ETH, out of LLM credits, service errors)
- Rate limiting on notifications?

**Recommendation**: For MVP, specify:
- "Use console.error logging for MVP. Email notifications can be added later."
- Or: "Use simple SMTP with nodemailer for email alerts (optional for MVP)."

### 12. Statement Content Validation

**Issue**: No specification of how to validate statement JSON structure.

**Questions**:
- Should we validate that fetched statements match the schema in `specs/statements.md`?
- What if a statement has an unknown `statementType`?
- Maximum content length enforcement?
- Handling malformed JSON from IPFS?

**Recommendation**: Specify:
- Validate fetched statements against the schema (must have `statementType` and `content`)
- Reject if statement is malformed or exceeds size limits
- For unknown `statementType`, proceed anyway (LLM can handle it)

### 13. Conservative Threshold Implementation

**Issue**: Spec says "Only proceed with attestation if `decision: true` AND `confidence: high` OR `medium`" but the LLM response schema has confidence as a field.

**Questions**:
- Should the service enforce this threshold, or is it already baked into the LLM prompt?
- If the LLM returns `decision: true, confidence: low`, what should the service do?
  - Still create attestation but record decision as false?
  - Don't create attestation at all?
  - Return an error?

**Recommendation**: Clarify that:
- Service should enforce the threshold: `if (decision && (confidence === 'high' || confidence === 'medium'))`
- If threshold not met, create attestation with `decision: false` and include explanation
- Return response showing `decision: false` (not an error - this is valid behavior)

### 14. Idempotency Handling

**Issue**: Spec mentions checking if attestation already exists and setting `alreadyAttested: true`, but doesn't specify whether to create a new transaction.

**Questions**:
- If attestation already exists, should we:
  - Return the existing attestation details (no new transaction)?
  - Create a duplicate transaction anyway?
  - Return 409 Conflict?
- How to handle if the existing attestation has a different decision than what the LLM would return now?

**Recommendation**: Specify:
- If attestation already exists, return success with `alreadyAttested: true` and existing attestation details (no new transaction, no charge)
- This is idempotent behavior - same request returns same result
- Client can check `/status/:attester/:from/:to` endpoint first to avoid unnecessary requests

## Recommendations for Next Steps

1. **Create an environment variables specification** - Document all required env vars with example values (see section 10 above)
2. **Clarify IPFS and indexer connection details** - Specify exact endpoints and configuration
3. **Define x402 payment verification flow** - How exactly to verify the payment proof header (or skip for MVP)
4. **Specify LLM model and token estimation** - Choose default model and estimation strategy
5. **Document reference expansion format** - Show example of how `{references_context}` should look in the prompt
6. **Add deployment guide** - Step-by-step instructions for deploying to Render with all env vars

## Can We Proceed with Implementation?

**Yes**, with one of these approaches:

### Option A: Implementation with Documented Assumptions
I write the implementation plan making reasonable assumptions about the gaps above, documenting each assumption clearly. You review and correct any incorrect assumptions.

**Pros**: Faster to start; assumptions might be 90% correct
**Cons**: May need revisions if assumptions are wrong

### Option B: Clarify Gaps First, Then Implement
You provide clarifications for the key gaps above (especially sections 1-6), then I write the implementation plan with full confidence.

**Pros**: Higher confidence in correctness; fewer revisions needed
**Cons**: Requires more upfront specification work

### Option C: Interactive Implementation Planning
I start writing the implementation plan and use the `AskUserQuestion` tool to clarify ambiguities as I encounter them during planning.

**Pros**: Balances speed with accuracy; clarifies only what's needed
**Cons**: Requires interactive back-and-forth

**Recommendation**: I suggest **Option A** - I'll write the implementation plan with reasonable assumptions, clearly documenting each one. Most of these gaps have obvious "good enough for MVP" answers, and we can refine them during implementation or after getting the MVP working.
