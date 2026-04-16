# Security and Abuse Prevention

Thoughts on potential threats:
  - **Standard web security**: Sanitize all markdown (use DOMPurify or equivalent), validate JSON strictly, use CSP headers, handle IPFS failures gracefully
  - **Sybil/spam mitigation**: L2 gas costs + UI filtering (sort by trending/supporters) + eventual unique-human verification
  - **Graph attacks**: No transitive graph traversal, so circular references aren't a concern; limit reference expansion depth to 3-5 levels for statement content display; users can switch attesters
  - **Funding scams**: Accept as inevitable; rely on transparency + retroactive funding incentives + social reputation
  - **Smart contract security**: Before mainnet, must implement comprehensive testing, have AI do a basic audit, and get professional audit

