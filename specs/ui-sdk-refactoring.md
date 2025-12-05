# UI-SDK Refactoring Analysis

This document analyzes complexity in the UI code that should be moved to the SDK, and identifies refactoring opportunities that would simplify the UI.

## Executive Summary

The UI code is generally well-structured, but there are several significant areas where complexity could be moved to the SDK to make the UI simpler and more maintainable. The current SDK provides excellent low-level primitives, but lacks higher-level abstractions for common workflows and data fetching patterns.

## Significant Complexity That Should Move to the SDK

### 1. (done)

### 2. (done)

### 3. (done) **Created Statements List Management** (High Priority)

**Current Issue:** [ui/src/conceptspace/components/CreateStatementForm.tsx:107-133](../ui/src/conceptspace/components/CreateStatementForm.tsx) has complex logic for managing the "created-statements" list:

```typescript
const existingRef = await getUserRef(graphqlClient, address, 'created-statements')
let newStatementList: string[]

if (existingRef?.value) {
  try {
    const existingData = JSON.parse(existingRef.value)
    newStatementList = Array.isArray(existingData.statements)
      ? [...existingData.statements, statementCid]
      : [existingRef.value, statementCid]  // Migration fallback for old format
  } catch {
    // Handle parse errors - old format or corrupted data
    newStatementList = [existingRef.value, statementCid]
  }
} else {
  newStatementList = [statementCid]
}

const listData = { statements: newStatementList, version: 1 }
const listCid = await uploadToIPFS(listData)
await updateRef(clients, mutableRefUpdaterContract, 'created-statements', listCid)
```

**Problems:**
- Complex parsing with multiple error cases
- Migration logic mixed with business logic
- Format versioning concerns in UI code
- This pattern would be repeated for any list management (saved statements, favorites, etc.)
- No atomicity - if `updateRef` fails, IPFS upload is wasted

**SDK Solution Needed:**

```typescript
// New SDK function in sdk/src/actions/mutable-refs.ts
export async function addToCreatedStatements(
  clients: TestClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  statementCid: string
): Promise<Hash>

// More general solution
export async function appendToUserList(
  clients: TestClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  listName: string,
  itemCid: string,
  options?: { deduplicate?: boolean }
): Promise<Hash>
```

**Benefits:**
- All list management complexity hidden
- Versioning and migration handled internally
- Could add deduplication, ordering, limits
- Reusable for favorites, bookmarks, etc.
- Better error messages

### 4. **Complete Statement Creation Workflow** (Medium Priority)

**Current Issue:** [ui/src/conceptspace/components/CreateStatementForm.tsx:65-146](../ui/src/conceptspace/components/CreateStatementForm.tsx) orchestrates a multi-step workflow:

1. Upload content to IPFS → get CID
2. Sign the statement via Beliefs contract → get txHash
3. Update the created-statements list → get txHash

**Problems:**
- If step 3 fails, steps 1-2 have already happened (no rollback)
- Complex error handling at each step
- Progress tracking implemented in UI
- No way to resume if interrupted
- Repeated pattern for any multi-step workflow

**SDK Solution Needed:**

```typescript
// New SDK function in sdk/src/actions/conceptspace.ts
export async function createAndSignStatement(
  clients: TestClients,
  contracts: {
    beliefs: BeliefsContract,
    mutableRefUpdater: MutableRefUpdaterContract
  },
  statementData: StatementContent,
  options?: {
    onIPFSUpload?: (cid: string) => void,
    onSigned?: (txHash: Hash) => void,
    addToCreatedList?: boolean  // default: true
  }
): Promise<{
  cid: string,
  signTxHash: Hash,
  updateListTxHash?: Hash
}>
```

**Benefits:**
- Single atomic operation from UI perspective
- Better error recovery (could track which steps completed)
- Progress callbacks for UI updates
- Consistent workflow across different statement creation contexts
- Could add transaction batching in the future

### 5. **Statement Reference Template Processing** (Medium Priority)

**Current Issue:** [ui/src/conceptspace/components/StatementRenderer.tsx:71-86](../ui/src/conceptspace/components/StatementRenderer.tsx) has template processing logic:

```typescript
const processContent = (text: string): string => {
  if (!content.references || content.references.length === 0) {
    return text
  }

  let processedText = text
  content.references.forEach((ref, index) => {
    const placeholder = `{ref:${index}}`
    const label = ref.label || `Statement ${index + 1}`
    const link = `[${label}](/statement/${ref.statementId})`
    processedText = processedText.replace(placeholder, link)
  })

  return processedText
}
```

**Problems:**
- Template processing logic embedded in UI component
- Hardcoded output format (markdown links)
- Not reusable across different renderers (future mobile app, CLI, email notifications, etc.)
- No escaping/sanitization

**SDK Solution Needed:**

```typescript
// New SDK utility in sdk/src/utils/statement-rendering.ts
export function processStatementReferences(
  content: StatementContent,
  format: 'markdown' | 'html' | 'plain',
  options?: {
    linkFormatter?: (ref: Reference, format: string) => string,
    baseUrl?: string  // For absolute URLs in email, etc.
  }
): string

// Example usage:
// Markdown: "[Label](/statement/abc123)"
// HTML: "<a href='/statement/abc123'>Label</a>"
// Plain: "Label (Statement abc123)"
```

**Benefits:**
- Reusable across all platforms
- Support for different output formats
- Centralized template processing rules
- Could add features like reference validation, preview generation, etc.
- Easier to update reference format globally

## Recommended SDK Refactoring/Improvements

### 1. **Unified Data Fetching Pattern** (Medium Priority)

**Current State:**

The SDK has three layers of query functions:
- Direct indexer queries ([sdk/src/queries/](../sdk/src/queries/))
- GraphQL server ([sdk/src/graphql-server/](../sdk/src/graphql-server/))
- GraphQL-based queries ([sdk/src/graphql-queries/](../sdk/src/graphql-queries/))

The UI often needs to orchestrate multiple queries for a single page. For example, `StatementPage.tsx` makes 4 separate calls:
1. `getStatement(executor, id)`
2. `getUserBelief(executor, id, userAddress)` (if authenticated)
3. `getIndirectSupporterCount(executor, id)`
4. Manual IPFS fetch for content

**Recommendation:**

Add a **higher-level data fetching layer** with page-oriented query functions:

```typescript
// New functions in sdk/src/graphql-queries/page-data.ts
export async function getStatementPageData(
  executor: GraphQLExecutor,
  statementId: string,
  userAddress?: string,
  options?: {
    includeContent?: boolean,
    includeSuggestions?: boolean,
    includeMetrics?: boolean
  }
): Promise<StatementPageData>

export async function getUserProfileData(
  executor: GraphQLExecutor,
  userAddress: string,
  options?: {
    includeIndirectSupport?: boolean,
    limit?: number,
    offset?: number
  }
): Promise<UserProfileData>

export async function getBrowseStatementsData(
  executor: GraphQLExecutor,
  options: BrowseOptions
): Promise<BrowseStatementsData>
```

**Benefits:**
- Reduces number of parallel queries UI needs to manage
- Could optimize by batching related queries
- Single error boundary for page data
- Easier to add caching/memoization
- Clear API surface for each page

### 2. **React Integration Layer** (Optional but High Impact)

**Current State:**

The SDK provides raw query functions but no React integration. Every UI component reimplements:
- Loading states (`const [loading, setLoading] = useState(true)`)
- Error handling (`const [error, setError] = useState<string>()`)
- Data fetching in `useEffect`
- Cache invalidation after mutations

**Recommendation:**

Add an optional React hooks package:

```typescript
// New package: @commonality/sdk-react (optional peer dependency)
import {
  useStatement,
  useUserBelief,
  useStatementContent,
  useMutation
} from '@commonality/sdk-react'

// Example usage in StatementPage.tsx
function StatementPage({ id }: { id: string }) {
  const { address } = useAccount()

  // All fetching, caching, error handling automatic
  const { data: statement, loading, error, refetch } = useStatement(id, {
    includeContent: true,
    includeMetrics: true
  })

  const { data: userBelief } = useUserBelief(id, address)

  const { mutate: believe, isPending } = useMutation({
    mutationFn: () => believeStatement(clients, beliefsContract, id),
    onSuccess: () => {
      refetch()  // Auto-invalidate queries
    }
  })

  if (loading) return <Loading />
  if (error) return <Error message={error} />

  return <div>{statement.content.text}</div>
}
```

**Implementation:**

Built on `@tanstack/react-query`:
- Automatic caching with smart invalidation
- Loading/error states
- Optimistic updates
- Request deduplication
- Polling/real-time updates
- SSR support

**Benefits:**
- Dramatically simplifies UI code
- Consistent data fetching patterns
- Better performance (caching, deduplication)
- Industry-standard patterns
- Optional - doesn't affect non-React users

### 3. **Contract Configuration Management** (Low Priority)

**Current State:**

Every component that does transactions repeats this pattern:

```typescript
const BELIEFS_CONTRACT_ADDRESS = import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}` | undefined
const MUTABLE_REF_UPDATER_CONTRACT_ADDRESS = import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS as `0x${string}` | undefined

const beliefsContract: BeliefsContract = {
  address: BELIEFS_CONTRACT_ADDRESS,
  abi: BeliefsAbi,
}

const mutableRefUpdaterContract: MutableRefUpdaterContract = {
  address: MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
  abi: MutableRefUpdaterAbi,
}
```

**Recommendation:**

```typescript
// New SDK export in sdk/src/config.ts
export interface SDKConfig {
  contracts: {
    beliefs: BeliefsContract,
    implications: ImplicationsContract,
    mutableRefUpdater: MutableRefUpdaterContract,
    // ... all other contracts
  },
  graphqlUrl: string,
  ipfsGateway?: string,
  rpcUrl: string
}

export function createSDKConfig(
  env: 'development' | 'production' | 'custom',
  overrides?: Partial<SDKConfig>
): SDKConfig

// Usage in UI
const config = createSDKConfig('development', {
  contracts: {
    beliefs: {
      address: import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS,
      abi: BeliefsAbi
    }
  }
})
```

**Benefits:**
- Single source of truth for configuration
- Type-safe contract addresses
- Easy environment switching
- Could include deployment info, block numbers, etc.

### 4. **Batch Query Optimization** (Medium Priority)

**Current State:**

Several UI components have N+1 query patterns:

```typescript
// UserProfilePage.tsx - fetches indirect supporters for each belief
const supporters = await Promise.all(
  beliefs.map(b => getIndirectSupporters(executor, b.id))
)

// Future code might fetch multiple statements
const statements = await Promise.all(
  ids.map(id => getStatement(executor, id))
)
```

**Recommendation:**

```typescript
// New functions in sdk/src/graphql-queries/
export async function getStatementsBatch(
  executor: GraphQLExecutor,
  statementIds: string[]
): Promise<Statement[]>

export async function getIndirectSupportersBatch(
  executor: GraphQLExecutor,
  statementIds: string[]
): Promise<Map<string, IndirectSupporter[]>>

// Could also add DataLoader pattern for automatic batching
import { createStatementLoader } from '@commonality/sdk'
const loader = createStatementLoader(executor)
const statements = await Promise.all(ids.map(id => loader.load(id)))
// Automatically batches into single query
```

**Benefits:**
- Single database query instead of N
- Significant performance improvement
- Automatic with DataLoader pattern
- Reduces indexer load

### 5. **IPFS Gateway Abstraction** (Low Priority)

**Current State:**

IPFS gateway URL is hardcoded in UI components:

```typescript
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs'
```

**Recommendation:**

```typescript
// In SDK config
export interface IPFSConfig {
  gateway: string,
  timeout?: number,
  retries?: number,
  fallbackGateways?: string[]
}

// SDK provides IPFS utilities
export async function fetchFromIPFS<T>(
  cid: string,
  config: IPFSConfig
): Promise<T>

// Automatic fallback to alternative gateways if primary fails
```

**Benefits:**
- Centralized gateway configuration
- Automatic retry with fallback gateways
- Could add caching layer
- Easier to switch providers

## React-Specific Patterns to Extract

While these aren't SDK concerns, they could be shared UI utilities in `ui/src/shared/hooks/`:

### 1. **Custom Hooks for SDK Integration**

```typescript
// ui/src/shared/hooks/useGraphQLExecutor.ts
export function useGraphQLExecutor(): GraphQLExecutor {
  return useMemo(() => {
    const url = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:42069/graphql'
    return createGraphQLExecutor(url)
  }, [])
}

// ui/src/shared/hooks/useContracts.ts
export function useContracts() {
  return useMemo(() => ({
    beliefs: {
      address: import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS as `0x${string}`,
      abi: BeliefsAbi
    },
    // ... other contracts
  }), [])
}

// ui/src/shared/hooks/useBlockchainClients.ts
export function useBlockchainClients(): TestClients | null {
  const { address } = useAccount()
  const walletClient = useWalletClient()
  const publicClient = usePublicClient()

  if (!address || !walletClient.data || !publicClient) return null

  return {
    walletClient: walletClient.data as any,
    publicClient: publicClient as any,
    account: address
  }
}
```

### 2. **Context Providers**

```typescript
// ui/src/shared/context/SDKContext.tsx
export const SDKProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const executor = useGraphQLExecutor()
  const contracts = useContracts()

  return (
    <SDKContext.Provider value={{ executor, contracts }}>
      {children}
    </SDKContext.Provider>
  )
}

export function useSDK() {
  return useContext(SDKContext)
}
```

## Performance Issues Identified

### N+1 Query Pattern in UserProfilePage

**File:** [ui/src/conceptspace/pages/UserProfilePage.tsx](../ui/src/conceptspace/pages/UserProfilePage.tsx)

**Issue:** Lines 92-104 fetch indirect supporters for each belief separately:

```typescript
await Promise.all(
  userBeliefs.map(async (statement) => {
    const supporters = await getIndirectSupporters(executor, statement.id)
    // Filter and process...
  })
)
```

If a user has 50 beliefs, this makes 50 separate GraphQL queries.

**Solution:** Implement `getUserIndirectSupport()` as described in Priority #2 above.

## Current SDK Strengths

The exploration revealed the SDK is already well-designed in several areas:

1. **Clean separation** between queries and actions
2. **Type-safe** throughout with comprehensive TypeScript interfaces
3. **Good documentation** in code comments
4. **Consistent patterns** across subsystems (Conceptspace, Pubstarter, Delegation, etc.)
5. **GraphQL layer** provides flexibility for different clients
6. **Test utilities** like `waitForSync`, `TEST_PRIVATE_KEYS`
7. **Some high-level functions already exist**: `getStatementSuggestions` already implements complex implication-based suggestion logic

## Implementation Priority

### Phase 1: Critical Path (Immediate Impact)
1. `getStatementWithContent()` - Eliminates most common IPFS fetching pattern
2. `getUserIndirectSupport()` - Fixes performance issue, simplifies complex UI logic
3. `addToCreatedStatements()` - Simplifies statement creation flow

### Phase 2: Workflow Improvements
4. `createAndSignStatement()` - Better UX for multi-step operations
5. `processStatementReferences()` - Reusable across platforms
6. Higher-level page data fetchers

### Phase 3: Developer Experience
7. React hooks package (`@commonality/sdk-react`)
8. Batch query optimization
9. Contract configuration management

### Phase 4: Polish
10. IPFS gateway abstraction
11. Additional batch operations
12. Caching strategies

## Notes for AI Implementers

- The SDK deliberately stays low-level and client-agnostic. Higher-level functions should be additive, not replace existing primitives.
- Maintain backward compatibility - existing UI code should continue working.
- All new SDK functions should have integration tests in `integration-tests/`.
- Consider adding examples to `sdk/README.md` when adding new major features.
- The React hooks package should be optional - core SDK should have zero React dependencies.

## Conclusion

The current SDK provides excellent low-level primitives for blockchain interactions and data fetching. However, adding higher-level abstractions for common workflows (IPFS content fetching, multi-step transactions, complex filtering) would significantly simplify the UI code.

**Most impactful improvements:**
1. IPFS content integration with GraphQL queries
2. Optimized user indirect support filtering
3. Multi-step workflow helpers
4. Optional React integration layer

These changes would make the UI code more maintainable, reduce duplication, and create clearer separation between business logic (in SDK) and presentation (in UI).
