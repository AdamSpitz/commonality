# Decoupling intendedStatementId from DelegatableNotes

Does it make sense to remove intendedStatementId from the DelegatableNotes contract's notes?

It'd be nice to decouple DelegatableNotes from the idea of statements/causes. Creates a clearer separation between the financial primitive (DelegatableNotes) and the political/content layer (statements).

But I do still want *some* way for people to declare that there's some money available for a particular purpose. The idea is to incentivize the creation of projects aligned with that purpose, and maybe also to create a documentation trail (albeit a fuzzy one) so that we can at least see onchain that "huh, this money was intended for cause C but then it was spent on project P, which doesn't seem to match that intended purpose."

This intended-use system doesn't exactly need to be coupled with the DelegatableNotes system; it was originally implemented that way just because it was kinda convenient. (We had the DelegatableNotes system, which escrows the money and also implements the delegation functionality; it was easy to attach an intendedStatementId field to each note.)

But maybe we could use some kind of attestation system, where the original money provider can just say "hey, I just made a note with noteId N; I'm declaring here that I intend for this money to be used for cause C." Which is at least a little bit decoupled from the core DelegatableNotes contract.

Or maybe DelegatableNotes could be written so that when each note is created, its creator specifies "here's the contract and function that you call when you're ready to spend the note, and here are the args you need to pass in" (which obviously needs to be written very carefully to avoid smart-contract vulnerabilities), and then the whole "intended use" system can simply be a middleware that can be tacked onto any action to have it emit an event saying "this is intended for statement S" before going on to do whatever the actual action is.

I kinda like that last idea, if it can be done safely.

Does that make sense to you?
