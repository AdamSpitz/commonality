# Civility backlog

Civility is the noninflammatory vertical on top of content funding. The site
today is mostly that machinery with Civility copy. These items are the gap
between that and a board of posts that passed the civility check, plus a way
to put money on the property itself.

Untagged items are **Ask**. See [task autonomy tiers](../workflow/task-tiers.md).
When an item is done, delete it.

The general "pick a property, see its board" surface lives in
[`content-funding/TODO.md`](../content-funding/TODO.md). Civility should be one
property on that surface, not a one-off list.

----

- **Browse attested items, not only contracts.** Cause boards list assurance
  contracts. A content item can be *included* in a contract, but nothing shows
  the items themselves: posts that passed a check, whether or not someone has
  already wrapped them in a contract. Build a browsable item list. Useful
  scopes:
  - Items that are not already in a contract. Cap what is shown (age or
    another bound) so the list stays finite. Each viewer needs a way to hide
    items they do not want to see again.
  - Items from one channel.
  - Items from a set of channels the viewer follows.
  Civility's first cut is that list filtered to items a trusted attester has
  marked noninflammatory. The same surface is what Content Funding needs for
  any property, and later for work items in general. Content items have not
  been generalized to work items yet; when they are, this UI is the browser
  for them too. See
  [Structured fundable work](../specs/product/structured-fundable-work.md).

- **Finish "Explore fundable content."** The landing-page link currently opens
  the same X / YouTube / Substack creator directory as Content Funding. It
  should open the attested-item board above (the civility property), not a
  channel index.

- **Finish "put money on the property."** Donors can fund a specific channel
  or piece. There is no Civility screen for pledging toward noninflammatory
  content as a kind — the cause-pool path the docs describe — including
  delegating the picks. Build that screen so the landing-page promise is a
  flow, not a paragraph.
