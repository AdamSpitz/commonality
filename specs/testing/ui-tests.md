# UI testing

The UI is written using Vite and React.

## Testing Stack

- **Unit tests:** Vitest + Testing Library (installed ✅)
- **E2E tests:** Playwright (recommended, not yet installed)

## Strategy

**Both unit and E2E tests are valuable:**

1. **Unit tests** - Fast, isolated component testing
   - Test components in isolation with mocked dependencies
   - Run on every file save during development
   - Primary defense against regressions
   - Already have a good pattern established in BeliefControls.test.tsx

2. **E2E tests** - Full user workflow testing
   - Test complete user journeys across multiple pages
   - Catch integration issues that unit tests miss
   - Slower, so we write fewer of them
   - Focus on critical paths: wallet connection → create statement → express belief

**Recommended approach:** Write comprehensive unit tests first (in progress), then add E2E tests for the 3-5 most critical user workflows.

## AI-Automated Testing

AI can write and maintain:
- ✅ Unit tests (fully automatable)
- ✅ E2E tests (fully automatable with Playwright)
- ⚠️  Visual regression tests (possible but requires baseline images)

Manual testing still valuable for:
- UX/design review
- Accessibility (though AI can write automated a11y tests)
- Performance feel
- Initial exploration of new features

See [ui/test-plan.md](../../ui/test-plan.md) for the current test coverage status and implementation plan.
