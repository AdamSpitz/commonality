# Founder-authored Commonality UI checks

`commonality.md` is the spec. It stays in Adam's words. Nothing in this directory should rewrite it.

When a `##` or `###` heading is added:

1. `coverage.founder-ui` goes red until `verifier/coverage/founder-ui.json` has a matching id.
2. The sidecar either names existing test files (`disposition: "tests"`) or says `untested-on-purpose` with a reason. It must not paraphrase the heading.
3. Ask to update the tests when a heading should move from untested to a Vitest or Playwright proof.
4. `review.founder-e2e.commonality` (manual) judges whether the product matches the verbatim brief.
5. `review.founder-ui-thoroughness` (manual, advisory) asks the inverse: surfaces not written up, headings with no conventional test, and bindings that do not seem to exercise the paragraph.
