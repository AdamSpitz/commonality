# Documentation

## To do

  - Update/clarify/organize/flesh-out the specs/documentation:
    - In the `specs` directory, there's lots of stuff: there's a `motivation` subdirectory for trying to explain the goals of this system and how we think it might gain traction and what particular use cases might be and so on; there's high-level specs for how the system should work; there's medium-level specs for technical details about how the system should work; maybe some other categories too, I dunno. I want to maybe try to tease apart those different kinds of things, with the goal of making documentation for several kinds of audiences:
      - "Founder" (either me or an LLM assisting me in that role), trying to figure out the entire big picture of what my goals are and what's realistic and what to build and how to build it and so on. For this, the `motivation` stuff is important. High-level specs are important. Medium-level technical specs are somewhat less important although I still need to be able to look it over.
      - "Product manager" (is that the right term?) (either me or an LLM assisting me in that role), trying to turn the overall vision into a high-level product spec. This role isn't about trying to think through the societal implications, it's just about trying to figure out what we need to build.
      - (What's this role called?) Trying to turn the high-level specs into medium-level specs. Involves making technical decisions, etc.
      - Dev (probably LLM) implementing the code. (Needs technical details. Less need for high-level specs, though having *some* context is probably useful.) A lot of the documentation here is in the form of the project's main README.md and also various other .md files throughout the code base; that's fine and good.
      - User (or LLM whose role is to assist the user). Needs to understand: what is this system *for*? What can I do with it? What might I *want* to do with it? How do I do it? How do I trust that it's safe to use? Etc.
      - What other roles have I forgotten?


In particular, the thing I need to do right now is create documentation for the user (or for an LLM assisting the user). It doesn't need to be complete or polished; I just want to take a first crack at it because I want to figure out whether we can tell a compelling story of "here's this cool system we built, here's why you might want to use it, here's what some typical use cases might be, here's how you can get started."

Okay, see specs/user-docs.md.
