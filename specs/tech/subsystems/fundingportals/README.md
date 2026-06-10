# Cause boards / funding portals

A cause board (historically called a funding portal in code and older docs) is a statement-anchored view that helps donors fund projects aligned with a cause.

## Current status

The implementation still uses the `fundingportal` package/path name in several places, but user-facing copy should prefer **cause board**. Treat `fundingportal` as a technical/internal name until the code paths are renamed.

## Product role

- The donor starts from a cause/statement.
- Alignment attestations connect projects to that cause.
- Delegatable funding lets a donor fund the cause while a trusted delegate chooses concrete projects.
- The board displays aligned projects, available funding, and leaderboards so a user can decide where to contribute.

## Main implementation surfaces

- UI components: `ui/src/fundingportal/`
- Product boundary: `specs/product/ui-domains.md` under **Aligning — cause-based funding**
- Related tests: `ui/test-plan.md` under **Cause board**

## Naming note

Older docs, routes, and code may still say `portal` or `fundingportal` (for example `/portal/:cid`). That is legacy/internal terminology unless the product docs explicitly say otherwise.
