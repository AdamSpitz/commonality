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
- [x] StatementRenderer.tsx - Has comprehensive unit tests (31 tests covering all render states, formats, and edge cases)
- [x] CreateStatementForm.tsx - Has comprehensive unit tests (28 tests covering wallet states, form validation, submission workflow, error handling, and callbacks)
- [x] StatementSuggestions.tsx - Has comprehensive unit tests (25 tests covering loading states, error handling, empty state, suggestions display, navigation, and API integration)
- [x] StatementPage.tsx - Has comprehensive unit tests (29 tests covering loading, errors, content errors, successful rendering, wallet states, data refetching, API integration, and state transitions)
- [x] BrowseStatementsPage.tsx - Has comprehensive unit tests (37 tests covering loading, errors, empty state, successful rendering, sort toggle, date formatting, API integration, and state transitions)
- [x] UserProfilePage.tsx - Has comprehensive unit tests (38 tests covering loading, errors, wallet states, own profile vs other profile, address display, tabs, beliefs/disbeliefs/indirect support rendering, navigation, API integration, and data refetching)
- [x] HomePage.tsx - Has comprehensive unit tests (21 tests covering disconnected state, connected state, address display, quick actions, profile links, form toggle, statement creation callback, and address-dependent links)

### 📝 Need unit tests

#### Components (Priority: High)
- None remaining!

#### Pages (Priority: Medium)
- [ ] SettingsPage.tsx - User settings management

## Test Writing Sequence

Suggested order (dependencies first, high-value features prioritized):

1. ~~**StatementRenderer**~~ - ✅ Complete (31 tests)
2. ~~**CreateStatementForm**~~ - ✅ Complete (28 tests)
3. ~~**StatementSuggestions**~~ - ✅ Complete (25 tests)
4. ~~**StatementPage**~~ - ✅ Complete (29 tests)
5. ~~**BrowseStatementsPage**~~ - ✅ Complete (37 tests)
6. ~~**UserProfilePage**~~ - ✅ Complete (38 tests)
7. ~~**HomePage**~~ - ✅ Complete (21 tests)
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
