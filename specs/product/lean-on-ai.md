# Lean on AI

(I dunno whether the "product manager" role is the right level of abstraction for this kind of thinking. Could go lower, could go higher.)

The idea of conceptspace and the implication graph was an early insight we had when working on this project, but now that we're designing the attesters and finders and nudgers and so on, it's becoming more interesting and more fleshed-out.

You know Greenspun's Tenth Rule? ("Any sufficiently complicated C or Fortran program contains an ad-hoc, informally-specified, bug-ridden, slow implementation of half of Common Lisp.") This insight is like that, but for LLMs. Don't build half-baked heuristics into your app, trying to be intelligent; just use LLMs.

Of course you probably can't afford to use LLMs for every interaction in your app, so there's a place for hints and indexes and caches and so on. But their role is to filter the info you need to give to the LLM, or to cache the results of the thinking done by the LLM, etc.

Or you use smarter AI and then record its result so that you can pass that to a dumber AI (or conventional code).

In this app:
  - We want to represent people's interests and beliefs and so on. Don't try to invent some kind of data format for these; just use plain natural language, then let LLMs read them.
  - We want to notice when different users are saying the same thing in different ways. Don't require the users to notice this themselves, and don't try to bake any metadata into the statements; just let LLMs look at the statements and say "yup, those are the same". (And don't try to bake in transitivity or any other clever shortcuts; that'll be vulnerable to tricks in a way that just asking an LLM won't be.)
    - And then cache the resulting judgment. It's a lot of volume, but we only ever have to have the LLM examine any pair once.
  - nudgers:
    - explorer:
    - bridge-creator
