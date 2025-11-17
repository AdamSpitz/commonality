# Implication Resolution Algorithm

(AI-generated, but seems about right to me.)

## Overview

The implication resolution algorithm determines which users indirectly support a given statement by tracing through the implication graph. When a user believes statement S1, and there's an implication attestation that S1 → S2, we can infer that the user probably also believes S2.

This algorithm is central to the Concept Space's goal of reducing coordination overhead: users don't all need to sign the exact same wording of an idea. Instead, they can sign different statements that are semantically related, and the system will aggregate support across all related statements.

## Core Algorithm

Given:
- A target statement S
- A set of trusted attesters A (user-configurable)

Find: All users who indirectly support S

### Basic Approach

```
function findIndirectSupporters(targetStatement, trustedAttesters):
    1. Find all statements that imply targetStatement
       - This is a graph traversal problem
       - Need to handle transitive implications (S1 → S2 → S3 means S1 → S3)

    2. For each implying statement:
       - Get the set of direct supporters

    3. Return the union of all supporter sets
```

### Step 1: Finding Implying Statements

This is a reverse graph traversal starting from the target statement:

```
function findImplyingStatements(targetStatement, trustedAttesters):
    visited = new Set()
    implyingStatements = new Set()
    queue = [targetStatement]

    while queue is not empty:
        current = queue.dequeue()

        if current in visited:
            continue
        visited.add(current)

        # Find all statements that directly imply current
        for each attestation (from → to) where:
            - to == current
            - attestation.attester in trustedAttesters
        do:
            implyingStatements.add(from)
            queue.enqueue(from)

    return implyingStatements
```

### Step 2: Collecting Direct Supporters

For each statement found in step 1, query the Beliefs contract:

```
function getDirectSupporters(statementId):
    # Query all DirectSupport events where:
    # - statementId matches
    # - beliefState == BELIEVES (1)
    # Then filter to only the most recent belief state for each user

    supporters = new Set()

    for each user who has emitted DirectSupport events for statementId:
        latestBelief = getMostRecentBeliefState(user, statementId)
        if latestBelief == BELIEVES:
            supporters.add(user)

    return supporters
```

### Step 3: Union of Supporter Sets

```
function findIndirectSupporters(targetStatement, trustedAttesters):
    implyingStatements = findImplyingStatements(targetStatement, trustedAttesters)

    allSupporters = new Set()

    for each statement in implyingStatements:
        supporters = getDirectSupporters(statement)
        allSupporters.union(supporters)

    return allSupporters
```

## Edge Cases & Considerations

### 1. Circular Implications

**Problem:** What if we have S1 → S2 → S3 → S1?

**Solution:** The visited set in the graph traversal prevents infinite loops. Circular implications are actually semantically valid (if S1 ↔ S2, they're equivalent statements), so we simply treat all statements in a cycle as mutually implying each other.

**Implementation:** The visited set naturally handles this - we'll discover all statements in the cycle and include all their supporters.

### 2. Conflicting Attestations

**Problem:** What if different trusted attesters disagree?
- Attester A says: S1 → S2
- Attester B says: S1 does NOT imply S2

**Current approach:** We only have positive attestations. There's no way to attest "S1 does NOT imply S2". Therefore, this isn't currently an issue.

**Future consideration:** If we add negative attestations, we'd need a conflict resolution strategy:
- Majority rule among trusted attesters?
- User-configurable weighting of attesters?
- Conservative approach (exclude if any trusted attester objects)?

For now, the solution is simple: users can configure which attesters they trust. If they don't trust an attester who makes bad implications, they simply don't include that attester in their trusted set.

### 3. Self-Implication

**Problem:** What if someone attests S1 → S1?

**Solution:** The smart contract explicitly prevents this (see [Implications.sol:42-44](../contracts/conceptspace/Implications.sol#L42-L44)). This is enforced at the contract level.

### 4. No Opinion vs. Absence of Opinion

**Problem:** If a user has never expressed any opinion about a statement, their belief state is NO_OPINION (0). But this is also what they can explicitly set if they want to retract a previous belief.

**Solution:** For counting supporters, we only count users who have explicitly set BELIEVES (1). Both "never expressed an opinion" and "explicitly set to NO_OPINION" are treated the same way: they're not counted as supporters.

This is correct behavior - we want explicit support, not assumed support.

### 5. Disbelief

**Problem:** What if a user believes S1, and S1 → S2, but the user has explicitly set DISBELIEVES for S2?

**Current approach:** We only count indirect support based on the implying statements. If a user believes S1 which implies S2, we'll show them as an indirect supporter of S2, even if they've explicitly disbelieved S2.

**UI transparency:** This is why the transparency requirements are important. The UI should show:
- "17 people directly support this statement"
- "118 people support related statements that imply this one (they may not have explicitly endorsed this specific wording)"

**Future refinement:** We could subtract users who have explicitly disbelieved the target statement from the indirect supporters count. This would make the count more accurate, though it adds complexity.

### 6. Implication Depth

**Problem:** Should we limit how many hops we traverse in the implication graph?

**Current approach:** No limit. We traverse the entire graph.

**Rationale:**
- Implications should be high-quality (created by trusted AI attesters)
- If S1 → S2 → S3 → S4, and all implications are valid, then S1 → S4 is also valid
- Performance concerns are addressed through indexing (see below)

**Future consideration:** If the graph becomes very large and contains weak implications, we might want to:
- Limit depth (e.g., max 5 hops)
- Weight implications by strength (requires schema change)
- Use confidence scoring

## Performance Considerations

### Indexing Strategy

The indexer should precompute and cache certain data structures:

1. **Reverse implication map**: For each statement, maintain a list of statements that directly imply it, organized by attester
   ```
   reverseImplications: Map<statementId, Map<attester, Set<fromStatementId>>>
   ```

2. **Direct supporters cache**: For each statement, maintain the current set of direct supporters
   ```
   directSupporters: Map<statementId, Set<userAddress>>
   ```

3. **Transitive closure** (optional, for large graphs): Precompute the full transitive closure for each attester
   ```
   transitiveClosure: Map<attester, Map<targetStatement, Set<implyingStatements>>>
   ```

### Query-Time Computation

Given the spec's requirement (line 157): "For now, let's only store direct support, and we'll compute indirect support on the fly"

**Why compute on the fly?**
- Users can configure which attesters they trust
- Different users may get different results for the same statement
- Precomputing for all possible combinations of trusted attesters is impractical

**Optimization:**
- Use the reverse implication map to quickly find direct implications
- Use BFS with visited set for transitive implications
- Use the direct supporters cache to avoid requerying the blockchain

**Typical performance:**
- If implication graph has moderate branching factor (say, 10 statements imply a typical statement)
- And moderate depth (say, 3-5 hops on average)
- Then we're looking at traversing maybe 10-100 statements per query
- With proper indexing, this should be fast enough

### Scaling Considerations

If the graph becomes very large:

1. **Materialized views**: Precompute transitive closures for popular attester sets
2. **Caching**: Cache query results with TTL
3. **Graph database**: The spec mentions potentially using AWS Neptune with Gremlin for graph queries - this could handle very large implication graphs efficiently
4. **Approximate counts**: For very popular statements, show approximate counts ("~10K supporters") instead of exact counts

## Algorithm Complexity

- **Time complexity**: O(V + E) where V is number of statements in transitive closure, E is number of implications
  - With visited set, each statement is processed at most once
  - For each statement, we look up its direct implications (O(1) with proper indexing)

- **Space complexity**: O(V) for the visited set and queue

In practice, for most statements:
- V is likely to be small to medium (10-1000 statements)
- E is similar magnitude
- Therefore, performance should be acceptable for real-time computation

## Example Walkthrough

Suppose we have:
```
Statements:
  S1: "Climate change is real"
  S2: "Anthropogenic climate change is real"
  S3: "We should reduce CO2 emissions"
  S4: "We should transition to renewable energy"

Implications (from trusted attester AI):
  S2 → S1  (more specific implies more general)
  S3 → S1  (action implies belief)
  S4 → S3  (specific action implies general action)
  S4 → S1  (direct implication, also transitive via S3)

Beliefs:
  Alice: BELIEVES S2
  Bob: BELIEVES S3
  Charlie: BELIEVES S4
  David: BELIEVES S1
```

Query: Who supports S1?

**Step 1:** Find implying statements
- Start with S1
- S2 directly implies S1 → add S2 to queue
- S3 directly implies S1 → add S3 to queue
- S4 directly implies S1 → add S4 to queue
- Process S2: nothing implies S2
- Process S3: S4 implies S3 → add S4 (already in queue/visited)
- Process S4: nothing implies S4
- Result: implyingStatements = {S2, S3, S4}

**Step 2:** Get direct supporters
- S2 supporters: {Alice}
- S3 supporters: {Bob}
- S4 supporters: {Charlie}

**Step 3:** Union
- Indirect supporters of S1: {Alice, Bob, Charlie}
- Direct supporters of S1: {David}

**UI Display:**
- "1 person directly supports this statement"
- "3 people support related statements that imply this one"
- Total: 4 people show some form of support

## Future Enhancements

1. **Weighted implications**: Some implications might be stronger than others
2. **Confidence scoring**: Compute a confidence level for indirect support
3. **Negative attestations**: Allow attesters to say "S1 does NOT imply S2"
4. **Probabilistic reasoning**: Instead of boolean "implies/doesn't imply", use probabilities
5. **User feedback loop**: Let users flag bad implications to improve the AI attester
6. **Implication explanations**: Store reasoning for why S1 → S2
7. **Multi-attester consensus**: Only count implications that multiple attesters agree on
