# Delegatable Notes system

A "delegatable notes" smart contract allows users to delegate their funding decisions to someone they trust.

e.g. Alice is happy to put $20/month towards this cause, but she doesn't have time to evaluate all the different potential fundable projects herself; she decides to let her friend Bob do that for her, because she trusts his judgment on this topic and he's more willing than she is to watch the funding portal and figure out which projects are worth funding.

(So you can think of Bob as a "nano-trustee", entrusted to make some decisions on Alice's behalf.)

## Composition

Delegation decisions are composable (i.e. Bob can then further delegate to Charlie).

## Revocation

Delegation decisions are revocable at any point along the chain (i.e. Bob can then cancel his delegation to Charlie, or Alice can can cancel her delegation to Bob which then of course also cancels the subdelegation to Charlie).

## Transparency

The funding website is transparent about this for the purpose of social recogition (i.e. the site shows "Alice has contributed 5% of this project's funds; the full delegation chain was Alice -> Bob -> Charlie").

## Spending

For now, the only real action that a note's owner can take (besides the delegation/revocation stuff) is trading the note's tokens (which were contributed by the original note creator and are now being held by the DelegatableNotes smart contract) for some other token. There are some design decisions to make here:
  - Does this result in a *new* note being created (containing the purchased tokens) with an identical delegation chain (e.g. the original chain was Alice -> Bob -> Charlie, and now it's a new note chain that is also Alice -> Bob -> Charlie, so that Charlie has delegated-control of the newly-purchased tokens)? So Charlie can do multi-step trades or whatever, without bothering Alice or Bob with the details (although of course Alice and/or Bob can be notified if they want to be, and they can cancel the delegation if they want to).
  - Or do the purchased tokens go directly into Alice's wallet? (I suspect that this is probably a more common use case.)
  - Or does the contract allow either option, and Charlie can choose when he decides to make the trade? (i.e. "I'd like to keep delegated-control because I plan to take further actions using the newly-purchased tokens" or "I have no intention of taking further actions with these newly-purchased tokens; I relinquish my delegated-control".)

## Splitting/merging

This is just a bookkeeping issue, but it's fine for the owner of a note to split it (actually, split the entire delegation chain) into multiple notes (with an identical delegation chain but lower amounts, summing to the original note's amount). And also to merge notes (if they have identical delegation chains and token types). i.e. It's fine to delegate or spend only part of a note's amount.

## Intention

There is a way for the creator of a note to attest that the note is intended to be used to support a particular cause (i.e. statement ID).

This is implemented as a separate smart contract called NoteIntent, which allows making attestations. (So the original money provider can say, "Hey, I just made a note with noteId N; I'm declaring here that I intend for this money to be used for cause C." Which is at least a little bit decoupled from the core DelegatableNotes contract. DelegatableNotes is intended to be a pure financial primitive; the idea of imbuing the notes with intent is an optional separate thing that can be layered on top of it.)

Anyway, because of these intent attestations, the existence of notes intended to be used to support a particular cause might help bring into existence projects aligned with that cause (because potential project creators can see on the funding portal website "there's a total of $N/month available for projects that are aligned with this cause"). (Notice that this means that it might even make sense for Alice to create a note but not delegate it - even if she intends to make her funding decisions herself, she might want to make it publically known that this money is available to be put towards this cause.)

### Many kinds of projects

Note that "a project aligned with this cause" can include many kinds of things: technical projects, but also journalism, etc. If someone wants to earmark a note for a particular kind of project supporting a cause (e.g. journalism), I think that should be doable by creating a statement S2 of the form "I want to support journalism projects for statement S1" (because the implication system should identify that support for S2 implies support for S1).

## Commission for trustees

Eventually, make it possible for the person whose money it is to specify "the person I delegate to can take an N% commission (as a fee for managing the money)", and also for a delegate to further pass on some of this commission to whoever he delegates to. This could incentivize people to take on this role (so that we're not just expecting people to do it altruistically because they believe in the cause). (Let's not implement this right now. It doesn't seem necessary for the MVP, and it's adding complexity to the contract.)
