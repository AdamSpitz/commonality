# UI testing

The UI is written using Vite and React.

## Testing Stack

- **Unit tests:** Vitest + Testing Library
- **E2E tests:** Playwright

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
