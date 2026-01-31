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
- [x] SettingsPage.tsx - Has comprehensive unit tests (40 tests covering initial rendering, empty state, localStorage loading/persistence, adding attesters, validation errors, removing attesters, success/error message dismissal, count pluralization, address display, whitespace handling, and mixed case handling)

### 📝 Need unit tests

All components and pages now have comprehensive unit tests!

## Test Writing Sequence

Suggested order (dependencies first, high-value features prioritized):

1. ~~**StatementRenderer**~~ - ✅ Complete (31 tests)
2. ~~**CreateStatementForm**~~ - ✅ Complete (28 tests)
3. ~~**StatementSuggestions**~~ - ✅ Complete (25 tests)
4. ~~**StatementPage**~~ - ✅ Complete (29 tests)
5. ~~**BrowseStatementsPage**~~ - ✅ Complete (37 tests)
6. ~~**UserProfilePage**~~ - ✅ Complete (38 tests)
7. ~~**HomePage**~~ - ✅ Complete (21 tests)
8. ~~**SettingsPage**~~ - ✅ Complete (40 tests)

## E2E Test Scenarios

### ✅ Tracer Bullet (Initial Setup)
- [x] Basic app loading and routing (browse-statements.spec.ts) - 2 tests
  - Verifies React app renders without crashing
  - Validates routing between pages works

### 🔲 Future E2E Tests

Once ready to test with a running backend, add E2E tests for:

1. **Core workflow:** Connect wallet → Create statement → Express belief
2. **Discovery workflow:** Browse statements → View statement → Express belief
3. **Social workflow:** View user profile → See their beliefs → View related statements

## Testing Infrastructure

- ✅ Vitest + Testing Library installed
- ✅ Mocking pattern established (see BeliefControls.test.tsx)
- ✅ Playwright E2E framework installed and configured
- ✅ Initial E2E "tracer bullet" test created (e2e/browse-statements.spec.ts)
- ✅ npm scripts added: `npm run test:e2e` and `npm run test:e2e:ui`
- 🔲 CI/CD integration (run tests on every commit)

## Running Tests

### Unit Tests
```bash
npm run test          # Run all unit tests once
npm run test:watch    # Run unit tests in watch mode
```

### E2E Tests
```bash
npm run test:e2e      # Run E2E tests headless
npm run test:e2e:ui   # Run E2E tests with Playwright UI
```

## Next Steps for Implementation

All unit tests complete! Next priorities:
1. Expand E2E test coverage for critical user workflows (once backend is running)
2. Set up CI/CD integration for automated testing
