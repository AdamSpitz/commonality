# Organizer contact and inbound citations

How a cause organizer is identified, how a mediator may optionally reach
them, and how inbound bridge citations show up — without CauseStarter
becoming a directory or a message hub.

The frozen “why” is [ADR 0011](../decisions/0011-organizer-contact-is-pull.md).
This file is the living “what.”

## Rule

Commonality never delivers a message. It may display:

1. A **name / handle / contact URI** the organizer already published.
2. **Public citations** of that organizer’s own causes (bridge clusters that
   name the cause as a natural parent).

Empty contact means “don’t ping me.” Showing citations is not a privacy
breach: the cluster document already names its parents.

## What we render

### Identity (`AddressDisplay`)

Cause and bridge-cluster pages show the organizer / mediator address through
the shared `AddressDisplay` component (`getUserSocialData`): ENS name when
present, otherwise a verified Twitter handle, otherwise the hex address
(tooltip keeps the address when a name is shown). CauseStarter must not
invent a second address widget.

### Optional `contactUrl` on the roster

Organizers may set one public URI on the cause roster extras:

- Allowed schemes: `https:`, `http:`, `mailto:`.
- Omitted entirely when empty, so contact-less roster CIDs stay
  byte-identical to pre-field publications (same pattern as `mediator`).
- Not required. Not a Commonality inbox.

Typical values: a personal site, an X/Farcaster profile, a public mailbox.
A mediator who wants to talk copies their cluster link there themselves.

### Inbound citations

The cause page **Bridges** section lists clusters that quote this cause as a
natural parent:

- **Visitor:** published clusters only.
- **Organizer (editing):** those plus unpublished drafts on this device.

v1’s source of truth is clusters **this client already knows**: the local
bridge store, plus any published cluster page the client has loaded (that
load *remembers* the cluster so a later visit to the parent cause can list
it). We do not crawl the global ref table to find citations.

A future indexer query “clusters whose extras.parents contain this
`(owner, slug)`” would still be a lens on one cause, not a directory. Do
not implement that by `getRefsByName` / unfiltered `DataPublished` scans.

## What we do not build

- In-app DMs, notification email, unread counts we host.
- A people or cause directory so mediators can *search* for organizers
  ([ADR 0008](../decisions/0008-operated-surfaces-are-lenses.md)).
- Mandatory contact or ENS.
- A “send this organizer a ping” transaction whose payload is a message.

## Copy

Visitor create-a-bridge helper text should say that authorship is the
mediator’s, that Commonality does not notify the organizer, and that
citations are public on this page. It must not imply we will message them.
