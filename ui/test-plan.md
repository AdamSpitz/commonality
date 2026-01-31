# Conceptspace UI Test Plan

## Testing Strategy

### Unit Tests (Vitest + Testing Library)
**Purpose:** Test individual components in isolation, mocking external dependencies
**When to use:** For components with logic, state management, conditional rendering

### E2E Tests (Playwright recommended)
**Purpose:** Test complete user workflows across multiple pages/components
**When to use:** For critical user journeys that span multiple components

**Recommendation:** Start with comprehensive unit tests for all components, then add E2E tests for the most critical user flows. This gives us:
- Fast feedback during development (unit tests)
- Confidence that the whole system works together (E2E tests)
- Good coverage without excessive test maintenance burden

## Component Test Coverage Status

### ✅ Already tested
- [x] BeliefControls.tsx - Has comprehensive unit tests
- [x] SupportMetrics.tsx - Has test file (need to verify coverage)

### 📝 Need unit tests

#### Components (Priority: High)
- [ ] CreateStatementForm.tsx - Complex form with validation, IPFS upload
- [ ] StatementRenderer.tsx - Core component for displaying statements
- [ ] StatementSuggestions.tsx - Related statements feature

#### Pages (Priority: Medium)
- [ ] HomePage.tsx - Entry point, likely simple routing/layout
- [ ] StatementPage.tsx - Shows statement details + BeliefControls + SupportMetrics
- [ ] BrowseStatementsPage.tsx - List view with filtering/searching
- [ ] UserProfilePage.tsx - User's beliefs and activity
- [ ] SettingsPage.tsx - User settings management

## Test Writing Sequence

Suggested order (dependencies first, high-value features prioritized):

1. **StatementRenderer** - Core component used everywhere
2. **CreateStatementForm** - Critical feature, complex logic
3. **StatementSuggestions** - Related to core feature
4. **StatementPage** - Integration of multiple components
5. **BrowseStatementsPage** - Discovery feature
6. **UserProfilePage** - User-specific views
7. **HomePage** - Likely simple, test last
8. **SettingsPage** - Lower priority UX feature

## E2E Test Scenarios (Future)

Once unit tests are solid, add E2E tests for:

1. **Core workflow:** Connect wallet → Create statement → Express belief
2. **Discovery workflow:** Browse statements → View statement → Express belief
3. **Social workflow:** View user profile → See their beliefs → View related statements

## Testing Infrastructure

- ✅ Vitest + Testing Library installed
- ✅ Mocking pattern established (see BeliefControls.test.tsx)
- 🔲 E2E framework not yet added (recommend Playwright when needed)
- 🔲 CI/CD integration (run tests on every commit)

## Next Steps for Implementation

The `one-tasker` skill should pick tasks from the test writing sequence above, one component at a time, following the pattern established in BeliefControls.test.tsx.
