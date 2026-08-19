# 0011. Organizer contact is pull, not a message hub

- **Status:** Accepted
- **Date:** 2026-08-19
- **Related specs:** [`specs/product/organizer-contact.md`](../product/organizer-contact.md), [`specs/product/bridge-causes.md`](../product/bridge-causes.md), [0008](./0008-operated-surfaces-are-lenses.md), [0004](./0004-user-publishes-displayable-data.md)

## Context

A mediator can publish a bridge cluster that quotes someone else’s cause without
owning it. CauseStarter has no directory, messaging, or notifications ([ADR
0008](./0008-operated-surfaces-are-lenses.md)): the visitor-side “Create a
bridge” copy told people to share the cluster link wherever they already talk
to the organizer. That left a real gap — the organizer might never hear that a
bridge exists — and an obvious, wrong fix: host contact or DMs on Commonality,
which would make us a message hub and the takedown address for one.

The citation itself is already public: the cluster document names its natural
parents. An organizer who wants to know that someone bridged to their cause
can in principle look that up. Surfacing it in our UI is not a privacy breach.

## Decision

**Commonality never delivers a message to a cause organizer. It may display
(a) a name, handle, or contact URI the organizer already published, and (b)
public citations of that organizer’s own causes.**

1. **Pull, not push.** No inbox, notification service, or “message this
   organizer” form. Discovery of inbound bridges is a lens on a cause the
   visitor already opened (or a cluster they already loaded), not a ranked
   directory of people or causes.

2. **Optional pointer, not a mailbox.** An organizer may publish one public
   `contactUrl` on the cause roster (`https` / `http` / `mailto`). Empty means
   “don’t ping me.” ENS name and ENS-linked Twitter (via existing
   `AddressDisplay` / `getUserSocialData`) are additional pointers the
   organizer already published elsewhere. Commonality does not send mail or
   DMs; a mediator who wants to talk uses that pointer themselves.

3. **Citations are public data.** A cause page lists bridge clusters that
   name it as a natural parent. Showing that list is not messaging. v1 uses
   clusters this client already knows (this-device drafts, plus published
   clusters it has loaded and remembered). A chain-wide citation index would
   still be a *lens* (filter by this parent), not a directory, and is not
   required to ratify the rule.

4. **CauseStarter renders addresses as people.** Adopt `AddressDisplay` on
   cause and cluster pages so organizers and mediators show as ENS / Twitter
   when those records exist, with the hex address in a tooltip. That win
   stands even if nobody sets `contactUrl`.

## Alternatives considered

- **Hosted DMs / notifications / “tell the founder”** — rejected: that is a
  message hub. We become the takedown address and the operator of other
  people’s correspondence.
- **A people or cause directory so mediators can find organizers** — already
  rejected by ADR 0008. Contact does not reopen discovery.
- **Mandatory contact** — rejected: anonymous or sliver causes are allowed;
  a mediator may even author “the other side” themselves.
- **ENS as a complete notify system** — rejected: ENS is identity plus
  optional social text records, not an inbox.
- **Scanning every `RefUpdated` / `DataPublished` event to list all citing
  clusters** — rejected for v1: that is a global crawl dressed as a lens, and
  `getRefsByName` / `fetchAllRefUpdatedEvents` are the directory primitive
  0008 forbids operating. Remembering clusters this client has actually
  opened is enough to make pull real.

## Consequences

Organizers who want inbound contact publish a pointer or an ENS profile.
Mediators who want to talk use that pointer; we never send. Organizers who
want to see citations look at their own cause page (and any cluster links
they open). We do not staff an appeals process for messages.

Revisit if a real organizer cannot find inbound bridges without a crawl
(then consider an indexer query *keyed by parent cause*, still not a people
directory), or if counsel treats displaying a `mailto:` as making us the
mail intermediary (then drop `mailto` and keep `https` only).
