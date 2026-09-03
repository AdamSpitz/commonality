# Fundable-projects boards / funding portals

A **fundable-projects board** (historically a funding portal in code, then
briefly called a cause board) is a statement-anchored list of aligned work
donors might fund. **Cause board** now means the organizer publication; see
[cause-page-not-a-club.md](../../../product/cause-page-not-a-club.md).

## Current status

The implementation still uses the `fundingportal` package/path name in several places. Treat `fundingportal` as a technical/internal name until the code paths are renamed.

## Product role

- The donor starts from a cause/statement.
- Alignment attestations connect projects to that cause.
- Delegatable funding lets a donor fund the cause while a trusted delegate chooses concrete projects.
- The board displays aligned projects, available funding, and leaderboards so a user can decide where to contribute.

## Main implementation surfaces

- UI components: `ui/src/fundingportals/`
- Product boundary: `specs/product/ui-domains.md` under **Aligning — cause-based funding**
- Related tests: `ui/test-plan.md` under **Fundable-projects board**

## Naming note

Older docs, routes, and code may still say `portal` or `fundingportal` (for example `/portal/:cid`). That is legacy/internal terminology unless the product docs explicitly say otherwise.
