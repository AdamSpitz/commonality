# Third-party signing

This isn't anything real yet, just an idea I'm toying with

# My initial prompt

I want to try to think through some ideas about how to get Commonality to play nicely with other systems when it comes to "signing statements" (or similar things).

We've already got thoughts about playing nicely with the rest of the world when it comes to identity and project funding (see the "beneficiary ID" stuff), but (correct me if I'm wrong) I don't think we've done this for simple statement-signing.

I'm thinking about stuff like: if there's some third-party site that (say) collects signatures on a petition, can we (a) show their numbers on our Tally pages, and (b) give them the ability to show their signers a cause board with fundable projects they might care about? (I suppose there's nothing stopping them from simply linking to a particular cause board; there's no real need for their signers to sign the cause board's statements.)

Can we make it easy for them (and give them a good reason) to use Commonality in the first place, so that they build their petition on top of Ethereum accounts and Commonality "statements" right off the bat?

Can we make it easy for them to switch partway through?

Can we make it easy for them to feed their list of signers into our onchain contracts?

Can we make it so that they don't have to do anything at all, and we just count them?

If the third party doesn't require its signers to use real unique IDs (e.g. what if it's just a name, maybe not even a full legal name, just "John S." or whatever), is there anything we can do with that?

In general our philosophy is:
  - Simply present the info honestly. (i.e. There's no major problem with having lower-quality info, as long as we're honest about how it's presented. Make it clear that this user is "someone who signed his name as John S. on whatever-petition.com" and don't pretend that we're confident it's a separate unique human or whatever.)
  - Allow people to "claim" their ID by proving ownership of both that ID and an Ethereum account. So he ends up with linked IDs. (In the future maybe we can do some sort of ZK thing to be more privacy-preserving.) (And maybe we add some notion of letting some centralized party vouch for a claim, for kinds of IDs that aren't so easy to verify ownership of? I dunno.)

The point is that we can probably incorporate third-party "signatures" by simply treating "user identified as U within third-party site S" as a "beneficiary ID" (maybe a claimable ID or vouched-for ID, if that's actually possible for that type of ID). (I think we need a better name for our "beneficiary ID" system; it's not just project beneficiaries.)

Other than the "can this be verifiably claimed or do we need some centralized party to vouch for the link?" problem, it's not like this is substantially *worse* than Ethereum addresses for the purpose of counting up unique human signers; there's already nothing stopping anyone from creating a million sock-puppet Ethereum addresses. In the long run, if we want that, we'll need the world to settle on some sort of unique-human-ID system (or combination of systems) that can be safely linked up with onchain IDs.

What this would buy us, I'm hoping, is that I wouldn't need to present Commonality as a *competitor* to whatever people are currently doing. I don't want to say "switch to our system", I want to say "just do this tiny thing to connect your system to our system, and then you get these amazing benefits." Plus maybe also "if you're just starting out, don't bother building your own engine or database, just do the signing via Commonality; you can still make your own branded website, but the underlying rails will be onchain and play nicely with the rest of the world rather than being siloed."

And the benefits are something like:
  - Aggregating signers across many such different sites (so we can see "1000 people signed this one, 14000 people signed that one"), including eventually deduplication once we can do ID-linking to a unique-human-ID system.
  - Connection to the fundable-projects ecosystem.

Does this make any sense? Are these potential benefits actually real and worthwhile? Help me figure out what I actually want here.


# Opus's response

Yes, it makes sense. I'd change two things in how you're framing it, and I'd be careful about one of the benefits.

## Change 1: A third-party signature is a claim by the site, not by the signer

You're right that a "U on site S" ID is no easier to fake than an Ethereum address when it comes to counting unique people. Sock puppets are free in both cases. But the two differ in who is vouching. With an Ethereum signature, the signer cryptographically agreed to the exact text. With a third-party list, the only evidence is that **S says** these people signed **S's version** of the text. S could inflate the list, the wording may differ from our statement, and the signers never agreed to anything with us.

So the data you'd collect looks like this:

> *Source S says (evidence E, as of date D) that [a count / an entry "John S."] supports [text T], which we map to statement X with [exact / close] fidelity.*

Seen that way, this is the same problem as your "On the record" idea. Both are kinds of **external support**, with different levels of evidence:

| Evidence level      | Example                                      |
| ------------------- | -------------------------------------------- |
| Inferred from posts | "These 3 tweets express roughly X"           |
| Reported count      | "petition.com shows 14,000 signatures"       |
| Listed entry        | "'John S.' appears on the petition.com list" |
| Attested feed       | S signs a list or Merkle root of its signers |
| Native signature    | Signed on-chain by the account holder        |

They could all share one model: an external ID, evidence, a mapping to a statement, and a panel kept apart from the signer tallies. Earlier I argued against summing follower counts into the tally header. The same applies here: never add these numbers to direct or indirect signers.

## Change 2: Only track individual entries when you can do something with them

An entry for "John S." can't be deduplicated or claimed. In practice it's the same as adding 1 to S's count, so storing it individually just looks more rigorous than it is. Keep individual entries only when there's a real path to claiming or deduplicating them:

- **Names that are already public and identifying**, like open-letter signers listed with their affiliations. These carry real weight, and the person can claim the entry later, either by signing natively or through a vouch.
- **Salted hashed emails or IDs published by a cooperating S.** The user claims by proving they control the email. This gives deduplication without S handing over its list.
- **Everything else:** store a count attributed to S.

On naming, `beneficiaryId` is already wrong for this. Something like **external ID** or **handle** fits better (`x:uid:…`, `dns:…`, `site:petition.com/123#<hash>`). The mechanism (namespace, canonical ID, a verifier per namespace) carries over as-is. Namespaces where only a vouch is possible fit in as "verifier = trusted signer," which the MVP proof format already has.

## Are the benefits real?

**Aggregation across sites.** This is real for viewers and for the cause, and weaker for each individual site. Big platforms like Change.org make money from the signer list and want lock-in, so they won't cooperate. A small campaign or coalition might, because a combined number across the movement helps them. The strongest pitch is the implication graph: "your 14k plus 20 related petitions all roll up under this broader statement." Nobody else offers that.

**Connection to funding.** Real, but as you said, they can just link to a cause board. The carrot that actually works is **making the organizer a beneficiary** on that board, so their signers can fund *them*. Otherwise the cause board looks like it's competing for their donors.

**"Don't build your own engine."** I'd be most skeptical here. Petition organizers mostly want three things: the email list for follow-up, no friction at signing, and spam control. A wallet, even an embedded one, adds friction, and on-chain signing doesn't give them the email list. This only wins for groups that value public, verifiable, portable signatures: **open letters, scientists' or professionals' declarations, coalition statements.** That's a real niche, but it isn't petitions in general.

**Switching partway.** This comes for free once the evidence levels exist. The old list becomes one attested or reported batch, and new signers come in natively.

**Feeding signer lists into the contracts.** Anchor one Merkle root or signed feed per batch. Don't write one record per signer on-chain. It's cheaper, and it doesn't make a third party's list permanent, which matters because petition lists often fall under GDPR.

## What I think you want

1. **Now (design only):** rename `beneficiaryId` and define "external support" with the evidence levels above, merged with the On-the-record proposal.
2. **First build, needing nothing from third parties:** an "Elsewhere" panel on Tally pages. An importer, run by a beat agent, finds petitions and open letters on a topic, maps them to statements through public-statement mapping, and shows per-source counts with links and dates. Open letters with named signers get individual entries, and those signers can claim them.
3. **When a real partner asks:** attested feeds with salted hashed IDs, plus "organizer as beneficiary."
4. **Only on demand:** a native signing widget or SDK for groups building open letters.

The pitch then becomes: "We already show your petition on the map. Claim it, add your signed feed, and your signers get counted across the movement and can fund you." It's an upgrade to what they already do, not something to switch to.

**Questions for you to decide:**
- Is the main goal a better map for Commonality viewers, or adoption by third parties? The first only needs step 2.
- Do you want to commit to open letters as the first target over petitions?
- Should I record this as a spec next to `public-statement-mapping/`?

